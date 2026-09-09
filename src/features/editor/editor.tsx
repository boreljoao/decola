"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { Badge, Button, Field, Input, Select, Textarea, cx } from "@/components/ui";
import { ImageUploadField } from "@/features/assets/image-upload";
import type {
  ImageRef,
  PageDocument,
  PageSection,
  SectionType,
} from "@/features/generation/page-document";
import { validatePageDocument } from "@/features/generation/page-document";
import {
  NICHE_PALETTES,
  contrastFor,
  type NicheKey,
} from "@/features/generation/palettes";
import { PageRenderer } from "@/features/pages/renderer";
import {
  aiEditProposalAction,
  restoreVersionAction,
  saveManualVersionAction,
} from "./actions";
import {
  ADDABLE_TYPES,
  SECTION_FIELDS,
  makeSection,
} from "./section-fields";

/**
 * Editor manual (spec §9): texto, tokens de cor/tipografia dentro de
 * combinações suportadas, ordenação e adição/remoção de seções permitidas.
 * Undo/redo local; salvar cria nova versão e NÃO publica; conflito entre abas
 * é detectado no servidor via versão-base.
 */

export interface VersionSummary {
  id: string;
  version: number;
  source: string;
  createdAt: string;
}

const SOURCE_LABEL: Record<string, string> = {
  generation: "gerada",
  manual_edit: "edição manual",
  ai_edit: "edição por IA",
  rollback: "restauração",
};

type PanelTab = "secoes" | "estilo" | "ia";

export function ManualEditor({
  pageId,
  projectId,
  baseVersionId,
  baseVersionNumber,
  initialDocument,
  aiAvailable,
  versions,
}: {
  pageId: string;
  projectId: string;
  baseVersionId: string;
  baseVersionNumber: number;
  initialDocument: PageDocument;
  aiAvailable: boolean;
  versions: VersionSummary[];
}) {
  const router = useRouter();
  const [doc, setDoc] = useState<PageDocument>(initialDocument);
  const [history, setHistory] = useState<PageDocument[]>([]);
  const [future, setFuture] = useState<PageDocument[]>([]);
  const [tab, setTab] = useState<PanelTab>("secoes");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [saveMsg, setSaveMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = useMemo(
    () => JSON.stringify(doc) !== JSON.stringify(initialDocument),
    [doc, initialDocument],
  );

  const apply = useCallback(
    (updater: (d: PageDocument) => PageDocument) => {
      setDoc((current) => {
        setHistory((h) => [...h.slice(-49), current]);
        setFuture([]);
        return updater(structuredClone(current));
      });
      setSaveMsg(null);
    },
    [],
  );

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setDoc((current) => {
        setFuture((f) => [current, ...f].slice(0, 50));
        return prev;
      });
      return h.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      setDoc((current) => {
        setHistory((h) => [...h, current]);
        return next;
      });
      return f.slice(1);
    });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // Aviso ao sair com alterações não salvas (não há autosave do editor ainda).
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirty) e.preventDefault();
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function save(source: "manual_edit" | "ai_edit" = "manual_edit") {
    const check = validatePageDocument(doc);
    if (!check.ok) {
      setSaveMsg({
        kind: "error",
        text: `Corrija antes de salvar: ${check.issues.slice(0, 2).join("; ")}`,
      });
      return;
    }
    startTransition(async () => {
      const result = await saveManualVersionAction({
        pageId,
        baseVersionId,
        document: doc,
        source,
      });
      if (result.ok) {
        setSaveMsg({
          kind: "ok",
          text: `Versão ${result.version} salva. Salvar não publica — use a aba Publicação para atualizar o site.`,
        });
        router.refresh();
      } else {
        setSaveMsg({ kind: "error", text: result.error ?? "Falha ao salvar." });
      }
    });
  }

  const selected = doc.sections[selectedIdx] as PageSection | undefined;

  return (
    <div className="grid gap-6">
      {/* Barra de ações */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-900/10 bg-card px-5 py-3">
        <div className="flex items-center gap-3 text-sm text-ink-600">
          <span>
            Editando sobre a <strong>versão {baseVersionNumber}</strong>
          </span>
          {dirty ? (
            <Badge tone="warning">alterações não salvas</Badge>
          ) : (
            <Badge tone="neutral">sem alterações</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={undo} disabled={history.length === 0}>
            ↶ Desfazer
          </Button>
          <Button variant="ghost" onClick={redo} disabled={future.length === 0}>
            ↷ Refazer
          </Button>
          <Button onClick={() => save()} disabled={pending || !dirty}>
            {pending ? "Salvando…" : "Salvar nova versão"}
          </Button>
        </div>
      </div>
      {saveMsg && (
        <p
          role={saveMsg.kind === "error" ? "alert" : "status"}
          className={cx(
            "rounded-xl px-4 py-3 text-sm font-medium",
            saveMsg.kind === "ok"
              ? "bg-success-600/10 text-success-600"
              : "bg-danger-600/10 text-danger-600",
          )}
        >
          {saveMsg.text}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        {/* Painel esquerdo */}
        <div className="grid content-start gap-4">
          <div className="flex gap-1 rounded-xl bg-ink-900/5 p-1">
            {(
              [
                ["secoes", "Seções"],
                ["estilo", "Estilo"],
                ["ia", "Editar com IA"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                aria-pressed={tab === value}
                className={cx(
                  "flex-1 rounded-lg px-3 py-2 text-sm font-medium",
                  tab === value ? "bg-card shadow-sm" : "text-ink-600 hover:text-ink-900",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "secoes" && (
            <SectionsPanel
              doc={doc}
              projectId={projectId}
              selectedIdx={selectedIdx}
              onSelect={setSelectedIdx}
              apply={apply}
              selected={selected}
            />
          )}
          {tab === "estilo" && (
            <StylePanel doc={doc} projectId={projectId} apply={apply} />
          )}
          {tab === "ia" && (
            <AiPanel
              pageId={pageId}
              baseVersionId={baseVersionId}
              aiAvailable={aiAvailable}
              doc={doc}
              onApplyProposal={(proposal) =>
                apply(() => structuredClone(proposal))
              }
            />
          )}

          <VersionsPanel pageId={pageId} versions={versions} />
        </div>

        {/* Preview ao vivo */}
        <div className="min-w-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-600">
            Preview ao vivo (estado de edição — não é o publicado)
          </p>
          <div className="max-h-[75vh] overflow-y-auto rounded-2xl border border-ink-900/15 shadow-[var(--shadow-lift)]">
            <PageRenderer
              doc={doc}
              pageId={pageId}
              preview
              showBadge
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Painel de seções ─────────────────────────────────────────────────────────

function SectionsPanel({
  doc,
  projectId,
  selectedIdx,
  onSelect,
  apply,
  selected,
}: {
  doc: PageDocument;
  projectId: string;
  selectedIdx: number;
  onSelect: (i: number) => void;
  apply: (u: (d: PageDocument) => PageDocument) => void;
  selected?: PageSection;
}) {
  const [addType, setAddType] = useState<SectionType>("benefits");

  function move(index: number, delta: -1 | 1) {
    apply((d) => {
      const target = index + delta;
      if (target < 0 || target >= d.sections.length) return d;
      const list = [...d.sections];
      [list[index], list[target]] = [list[target], list[index]];
      d.sections = list;
      return d;
    });
    onSelect(Math.min(Math.max(selectedIdx + delta, 0), doc.sections.length - 1));
  }

  function remove(index: number) {
    apply((d) => {
      if (d.sections.length <= 3) return d; // schema exige mínimo de 3 seções
      d.sections = d.sections.filter((_, i) => i !== index);
      return d;
    });
    onSelect(Math.max(0, index - 1));
  }

  function add() {
    apply((d) => {
      const section = makeSection(addType, d);
      if (section) d.sections = [...d.sections, section];
      return d;
    });
  }

  return (
    <div className="grid gap-4">
      <ol className="grid gap-1.5">
        {doc.sections.map((section, i) => (
          <li
            key={section.id}
            className={cx(
              "flex items-center gap-1 rounded-xl border px-2 py-1.5",
              i === selectedIdx
                ? "border-electric-600/50 bg-electric-600/5"
                : "border-ink-900/10 bg-card",
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(i)}
              className="min-w-0 flex-1 truncate px-1.5 py-1 text-left text-sm font-medium"
            >
              {SECTION_FIELDS[section.type]?.title ?? section.type}
            </button>
            <button type="button" aria-label="Mover para cima" onClick={() => move(i, -1)} disabled={i === 0} className="rounded-md px-1.5 py-1 text-ink-600 hover:bg-ink-900/5 disabled:opacity-30">↑</button>
            <button type="button" aria-label="Mover para baixo" onClick={() => move(i, 1)} disabled={i === doc.sections.length - 1} className="rounded-md px-1.5 py-1 text-ink-600 hover:bg-ink-900/5 disabled:opacity-30">↓</button>
            <button
              type="button"
              aria-label="Remover seção"
              onClick={() => remove(i)}
              disabled={
                doc.sections.length <= 3 ||
                section.type === "hero" ||
                (section.type === "lead_form" && doc.primaryConversion.type === "lead_form")
              }
              className="rounded-md px-1.5 py-1 text-danger-600 hover:bg-danger-600/5 disabled:opacity-30"
            >
              ✕
            </button>
          </li>
        ))}
      </ol>

      <div className="flex items-center gap-2">
        <Select
          value={addType}
          onChange={(e) => setAddType(e.target.value as SectionType)}
          className="flex-1"
          aria-label="Tipo de seção para adicionar"
        >
          {ADDABLE_TYPES.map((t) => (
            <option key={t} value={t}>
              {SECTION_FIELDS[t].title}
            </option>
          ))}
        </Select>
        <Button variant="secondary" onClick={add}>
          + Adicionar
        </Button>
      </div>

      {selected && (
        <SectionForm
          key={selected.id}
          section={selected}
          projectId={projectId}
          onChange={(updated) =>
            apply((d) => {
              d.sections = d.sections.map((s, i) =>
                i === selectedIdx ? updated : s,
              );
              return d;
            })
          }
        />
      )}
    </div>
  );
}

function SectionForm({
  section,
  projectId,
  onChange,
}: {
  section: PageSection;
  projectId: string;
  onChange: (s: PageSection) => void;
}) {
  const config = SECTION_FIELDS[section.type];
  const props = section.props as Record<string, unknown>;

  function setProp(key: string, value: unknown) {
    onChange({
      ...section,
      props: { ...props, [key]: value === "" ? undefined : value },
    } as PageSection);
  }

  return (
    <div className="grid gap-4 rounded-2xl border border-ink-900/10 bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{config.title}</h3>
        {config.variants.length > 1 && (
          <Select
            value={section.variant}
            onChange={(e) =>
              onChange({ ...section, variant: e.target.value } as PageSection)
            }
            aria-label="Variante da seção"
            className="text-xs"
          >
            {config.variants.map((v) => (
              <option key={v} value={v}>
                variante: {v}
              </option>
            ))}
          </Select>
        )}
      </div>

      {config.images?.map((field) => (
        <ImageUploadField
          key={field.key}
          projectId={projectId}
          value={props[field.key] as ImageRef | undefined}
          onChange={(image) => setProp(field.key, image)}
          label={field.label}
          hint={field.hint}
        />
      ))}

      {config.simple.map((field) => (
        <Field key={field.key} label={field.label}>
          {field.kind === "textarea" ? (
            <Textarea
              rows={3}
              value={(props[field.key] as string) ?? ""}
              onChange={(e) => setProp(field.key, e.target.value)}
            />
          ) : (
            <Input
              value={(props[field.key] as string) ?? ""}
              onChange={(e) => setProp(field.key, e.target.value)}
            />
          )}
        </Field>
      ))}

      {config.lists?.map((list) => {
        const items = (props[list.key] as unknown[] | undefined) ?? [];
        const isStringList = list.itemFields.length === 0;
        return (
          <div key={list.key} className="grid gap-2">
            <p className="text-sm font-medium">{list.label}</p>
            {items.map((item, idx) => (
              <div
                key={idx}
                className="grid gap-2 rounded-xl border border-ink-900/10 bg-paper p-3"
              >
                {isStringList ? (
                  <Input
                    value={(item as string) ?? ""}
                    onChange={(e) => {
                      const next = [...items];
                      next[idx] = e.target.value;
                      setProp(list.key, next);
                    }}
                  />
                ) : (
                  list.itemFields.map((f) => (
                    <Field key={f.key} label={f.label}>
                      {f.kind === "textarea" ? (
                        <Textarea
                          rows={2}
                          value={((item as Record<string, unknown>)[f.key] as string) ?? ""}
                          onChange={(e) => {
                            const next = [...items];
                            next[idx] = {
                              ...(item as Record<string, unknown>),
                              [f.key]: e.target.value,
                            };
                            setProp(list.key, next);
                          }}
                        />
                      ) : (
                        <Input
                          value={((item as Record<string, unknown>)[f.key] as string) ?? ""}
                          onChange={(e) => {
                            const next = [...items];
                            next[idx] = {
                              ...(item as Record<string, unknown>),
                              [f.key]: e.target.value,
                            };
                            setProp(list.key, next);
                          }}
                        />
                      )}
                    </Field>
                  ))
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (items.length <= list.min) return;
                    setProp(
                      list.key,
                      items.filter((_, i) => i !== idx),
                    );
                  }}
                  disabled={items.length <= list.min}
                  className="justify-self-end text-xs font-medium text-danger-600 hover:underline disabled:opacity-30"
                >
                  Remover item
                </button>
              </div>
            ))}
            <Button
              variant="secondary"
              onClick={() =>
                items.length < list.max &&
                setProp(list.key, [
                  ...items,
                  isStringList ? "Novo item" : structuredClone(list.newItem),
                ])
              }
              disabled={items.length >= list.max}
            >
              + Item
            </Button>
          </div>
        );
      })}
    </div>
  );
}

// ── Painel de estilo ─────────────────────────────────────────────────────────

function StylePanel({
  doc,
  projectId,
  apply,
}: {
  doc: PageDocument;
  projectId: string;
  apply: (u: (d: PageDocument) => PageDocument) => void;
}) {
  const t = doc.designTokens;
  return (
    <div className="grid gap-4 rounded-2xl border border-ink-900/10 bg-card p-5">
      <ImageUploadField
        projectId={projectId}
        kind="logo"
        value={doc.logo}
        onChange={(image) =>
          apply((d) => {
            d.logo = image;
            return d;
          })
        }
        label="Logo do negócio"
        hint="Aparece no topo da página. Sem logo, mostramos o nome em tipografia."
        previewClassName="max-h-24 w-auto"
      />
      <Field label="Paleta base" hint="Combinações validadas de contraste, por segmento.">
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(NICHE_PALETTES) as NicheKey[]).map((key) => {
            const pair = NICHE_PALETTES[key];
            const palette = t.scheme === "dark" ? pair.dark : pair.light;
            const active = palette.primary === t.palette.primary && palette.bg === t.palette.bg;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  apply((d) => {
                    d.designTokens.palette =
                      d.designTokens.scheme === "dark" ? { ...pair.dark } : { ...pair.light };
                    return d;
                  })
                }
                className={cx(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-medium",
                  active ? "border-electric-600" : "border-ink-900/10 hover:border-ink-900/30",
                )}
              >
                <span
                  aria-hidden="true"
                  className="flex h-6 w-10 overflow-hidden rounded-md border border-ink-900/10"
                >
                  <span className="flex-1" style={{ background: (t.scheme === "dark" ? pair.dark : pair.light).bg }} />
                  <span className="flex-1" style={{ background: (t.scheme === "dark" ? pair.dark : pair.light).primary }} />
                  <span className="flex-1" style={{ background: (t.scheme === "dark" ? pair.dark : pair.light).accent }} />
                </span>
                {pair.label}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Tema">
        <Select
          value={t.scheme}
          onChange={(e) =>
            apply((d) => {
              const scheme = e.target.value as "light" | "dark";
              // troca o par claro/escuro da mesma família quando reconhecida
              const family = (Object.values(NICHE_PALETTES)).find(
                (p) =>
                  p.light.primary === d.designTokens.palette.primary ||
                  p.dark.primary === d.designTokens.palette.primary,
              );
              d.designTokens.scheme = scheme;
              if (family) {
                d.designTokens.palette =
                  scheme === "dark" ? { ...family.dark } : { ...family.light };
              }
              return d;
            })
          }
        >
          <option value="light">Claro</option>
          <option value="dark">Escuro</option>
        </Select>
      </Field>

      <Field
        label="Cor principal personalizada"
        hint="Substitui a cor de destaque; o contraste do texto é ajustado automaticamente."
      >
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={t.palette.primary}
            onChange={(e) =>
              apply((d) => {
                const hex = e.target.value.toUpperCase();
                d.designTokens.palette.primary = hex;
                d.designTokens.palette.primaryContrast = contrastFor(hex);
                return d;
              })
            }
            aria-label="Cor principal"
            className="h-10 w-14 cursor-pointer rounded-lg border border-ink-900/15"
          />
          <span className="tabular text-sm text-ink-600">{t.palette.primary}</span>
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Fonte dos títulos">
          <Select
            value={t.fontHeading}
            onChange={(e) =>
              apply((d) => {
                d.designTokens.fontHeading = e.target.value as typeof t.fontHeading;
                return d;
              })
            }
          >
            <option value="sora">Sora (moderna)</option>
            <option value="space-grotesk">Space Grotesk (geométrica)</option>
            <option value="inter">Inter (neutra)</option>
          </Select>
        </Field>
        <Field label="Cantos">
          <Select
            value={t.radius}
            onChange={(e) =>
              apply((d) => {
                d.designTokens.radius = e.target.value as typeof t.radius;
                return d;
              })
            }
          >
            <option value="sm">Retos</option>
            <option value="md">Suaves</option>
            <option value="lg">Arredondados</option>
            <option value="xl">Bem arredondados</option>
          </Select>
        </Field>
      </div>
      <Field label="Densidade">
        <Select
          value={t.density}
          onChange={(e) =>
            apply((d) => {
              d.designTokens.density = e.target.value as typeof t.density;
              return d;
            })
          }
        >
          <option value="compact">Compacta</option>
          <option value="regular">Equilibrada</option>
          <option value="spacious">Espaçosa</option>
        </Select>
      </Field>
    </div>
  );
}

// ── Painel de IA ─────────────────────────────────────────────────────────────

function AiPanel({
  pageId,
  baseVersionId,
  aiAvailable,
  doc,
  onApplyProposal,
}: {
  pageId: string;
  baseVersionId: string;
  aiAvailable: boolean;
  doc: PageDocument;
  onApplyProposal: (proposal: PageDocument) => void;
}) {
  const [instruction, setInstruction] = useState("");
  const [allowCommercial, setAllowCommercial] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<
    | { kind: "proposal"; document: PageDocument; changed: string[]; reverted: string[] }
    | { kind: "error"; message: string }
    | null
  >(null);

  if (!aiAvailable) {
    return (
      <div className="grid gap-2 rounded-2xl border border-ink-900/10 bg-card p-5">
        <h3 className="text-sm font-semibold">Editar com IA</h3>
        <p className="text-sm text-ink-600">
          Este recurso fica disponível quando a chave do provedor de IA
          (ANTHROPIC_API_KEY) for configurada no ambiente. A edição manual ao
          lado está completa e não depende disso.
        </p>
        <Badge tone="warning">implementada, aguardando configuração</Badge>
      </div>
    );
  }

  function askAi() {
    setResult(null);
    startTransition(async () => {
      const response = await aiEditProposalAction({
        pageId,
        baseVersionId,
        instruction,
        allowCommercialChanges: allowCommercial,
      });
      if (response.ok) {
        setResult({
          kind: "proposal",
          document: response.document,
          changed: response.changedSectionIds,
          reverted: response.protectedReverted,
        });
      } else {
        setResult({ kind: "error", message: response.message });
      }
    });
  }

  return (
    <div className="grid gap-4 rounded-2xl border border-ink-900/10 bg-card p-5">
      <h3 className="text-sm font-semibold">Editar com IA</h3>
      <Field
        label="O que você quer mudar?"
        hint="Ex.: “deixe o título mais direto”, “resuma a seção de benefícios”."
      >
        <Textarea
          rows={3}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          maxLength={1000}
        />
      </Field>
      <label className="flex items-start gap-2 text-xs text-ink-600">
        <input
          type="checkbox"
          checked={allowCommercial}
          onChange={(e) => setAllowCommercial(e.target.checked)}
          className="mt-0.5"
        />
        Permitir alterar dados comerciais (preço, provas, destino do botão). Sem
        esta permissão, esses campos são preservados automaticamente.
      </label>
      <p className="text-xs text-ink-600">
        Custo: <strong>sem cobrança nesta fase</strong> — a política de créditos
        (Combustível) entra junto com o fluxo de receita.
      </p>
      <Button onClick={askAi} disabled={pending || instruction.trim().length < 4}>
        {pending ? "Gerando proposta…" : "Gerar proposta"}
      </Button>

      {result?.kind === "error" && (
        <p role="alert" className="text-sm font-medium text-danger-600">
          {result.message}
        </p>
      )}
      {result?.kind === "proposal" && (
        <div className="grid gap-2 rounded-xl border border-electric-600/30 bg-electric-600/5 p-4">
          <p className="text-sm font-medium">
            Proposta pronta.{" "}
            {result.changed.length > 0
              ? `Seções alteradas: ${result.changed.join(", ")}.`
              : "Nenhuma seção mudou."}
          </p>
          {result.reverted.length > 0 && (
            <p className="text-xs text-ink-600">
              Preservados sem alteração: {result.reverted.join("; ")}.
            </p>
          )}
          <div className="flex gap-2">
            <Button
              onClick={() => {
                onApplyProposal(result.document);
                setResult(null);
              }}
            >
              Aplicar no editor
            </Button>
            <Button variant="ghost" onClick={() => setResult(null)}>
              Descartar
            </Button>
          </div>
          <p className="text-xs text-ink-600">
            Aplicar traz a proposta para o editor — você ainda revisa e salva.
          </p>
        </div>
      )}
      <p className="sr-only">{doc.businessName}</p>
    </div>
  );
}

// ── Painel de versões ────────────────────────────────────────────────────────

function VersionsPanel({
  pageId,
  versions,
}: {
  pageId: string;
  versions: VersionSummary[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <details className="rounded-2xl border border-ink-900/10 bg-card p-5">
      <summary className="cursor-pointer text-sm font-semibold [&::-webkit-details-marker]:hidden">
        Histórico de versões ({versions.length})
      </summary>
      <ul className="mt-3 grid gap-2">
        {versions.map((v) => (
          <li
            key={v.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-ink-900/10 px-3 py-2 text-sm"
          >
            <span>
              v{v.version} · {SOURCE_LABEL[v.source] ?? v.source} ·{" "}
              <span className="text-ink-600">{v.createdAt}</span>
            </span>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const result = await restoreVersionAction({
                    pageId,
                    versionId: v.id,
                  });
                  if (result.ok) {
                    router.refresh();
                    window.location.reload();
                  } else {
                    setError(result.error ?? "Falha ao restaurar.");
                  }
                })
              }
              className="text-xs font-semibold text-electric-600 hover:underline disabled:opacity-40"
            >
              Restaurar
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-2 text-sm font-medium text-danger-600">
          {error}
        </p>
      )}
    </details>
  );
}
