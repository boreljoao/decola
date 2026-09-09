"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button, Card, Input, Textarea, cx } from "@/components/ui";
import {
  finishBriefingAndGenerate,
  saveBriefingAnswers,
  type FinishResult,
} from "./actions";
import {
  visibleQuestions,
  type BriefingAnswers,
  type QuestionDef,
} from "./questions";

/**
 * Wizard do briefing (spec §7.1): uma pergunta por vez, autosave com debounce
 * e indicador "salvo", voltar sem perder respostas, condicionais por resposta
 * e resumo editável antes de gerar. Rascunho vive no servidor — recarregar a
 * página retoma de onde parou.
 */

type SaveState = "idle" | "saving" | "saved" | "error";

export function BriefingWizard({
  projectId,
  mode,
  initialAnswers,
}: {
  projectId: string;
  mode: "rapido" | "completo";
  initialAnswers: BriefingAnswers;
}) {
  const [answers, setAnswers] = useState<BriefingAnswers>(initialAnswers);
  const [index, setIndex] = useState(() => {
    // retoma na primeira pergunta ainda não respondida
    const qs = visibleQuestions(mode, initialAnswers);
    const firstUnanswered = qs.findIndex(
      (q) => initialAnswers[q.id]?.value == null || initialAnswers[q.id]?.value === "",
    );
    return firstUnanswered === -1 ? qs.length : firstUnanswered;
  });
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [finishState, setFinishState] = useState<FinishResult | null>(null);
  const [pending, startTransition] = useTransition();

  const questions = useMemo(
    () => visibleQuestions(mode, answers),
    [mode, answers],
  );
  const onSummary = index >= questions.length;
  const question = onSummary ? null : questions[index];

  // ── autosave com debounce e retry ────────────────────────────────────────
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestAnswers = useRef(answers);
  useEffect(() => {
    latestAnswers.current = answers;
  }, [answers]);

  const doSave = useCallback(async () => {
    setSaveState("saving");
    const result = await saveBriefingAnswers(projectId, latestAnswers.current);
    setSaveState(result.ok ? "saved" : "error");
  }, [projectId]);

  useEffect(() => {
    if (answers === initialAnswers) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void doSave(), 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [answers, doSave, initialAnswers]);

  function setValue(id: string, value: unknown) {
    setFieldError(null);
    setAnswers((prev) => ({
      ...prev,
      [id]: { value, origin: "user" },
    }));
  }

  function next() {
    if (!question) return;
    const value = answers[question.id]?.value;
    const required = question.requiredIn.includes(mode);
    if (required && (value == null || value === "" || (Array.isArray(value) && value.length === 0))) {
      setFieldError("Essa resposta é necessária para a sua página.");
      return;
    }
    if (value != null && value !== "") {
      const parsed = question.validate.safeParse(value);
      if (!parsed.success) {
        setFieldError(parsed.error.issues[0]?.message ?? "Valor inválido.");
        return;
      }
    }
    setFieldError(null);
    setIndex((i) => i + 1);
  }

  function back() {
    setFieldError(null);
    setIndex((i) => Math.max(0, i - 1));
  }

  function generate() {
    startTransition(async () => {
      const result = await finishBriefingAndGenerate(projectId, latestAnswers.current);
      // Em caso de sucesso a ação redireciona; aqui só tratamos falha.
      if (result && !result.ok) setFinishState(result);
    });
  }

  const progress = Math.min(100, Math.round((index / Math.max(questions.length, 1)) * 100));

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso do briefing"
          className="h-2 flex-1 overflow-hidden rounded-full bg-ink-900/10"
        >
          <div
            className="h-full rounded-full bg-electric-600 transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <SaveIndicator state={saveState} onRetry={() => void doSave()} />
      </div>

      {question ? (
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wider text-electric-600">
            Pergunta {index + 1} de {questions.length}
          </p>
          <h2
            style={{ fontFamily: "var(--font-sora)" }}
            className="mt-2 text-2xl font-bold leading-snug"
          >
            {question.label}
          </h2>
          {question.help && (
            <p className="mt-2 text-sm text-ink-600">{question.help}</p>
          )}
          <div className="mt-6">
            <QuestionInput
              key={question.id}
              question={question}
              value={answers[question.id]?.value}
              onChange={(v) => setValue(question.id, v)}
              onEnter={next}
            />
          </div>
          {fieldError && (
            <p role="alert" className="mt-3 text-sm font-medium text-danger-600">
              {fieldError}
            </p>
          )}
          <div className="mt-8 flex items-center justify-between">
            <Button variant="ghost" onClick={back} disabled={index === 0}>
              ← Voltar
            </Button>
            <Button onClick={next}>
              {index === questions.length - 1 ? "Revisar respostas" : "Continuar →"}
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <h2
            style={{ fontFamily: "var(--font-sora)" }}
            className="text-2xl font-bold"
          >
            Revise antes de decolar
          </h2>
          <p className="mt-2 text-sm text-ink-600">
            É com essas respostas que a Decola vai compor sua página. Ajuste o
            que precisar.
          </p>
          <dl className="mt-6 grid gap-3">
            {questions.map((q, i) => {
              const v = answers[q.id]?.value;
              const missing =
                finishState?.missing?.includes(q.id) ||
                finishState?.invalid?.some((e) => e.id === q.id);
              return (
                <div
                  key={q.id}
                  className={cx(
                    "flex items-start justify-between gap-4 rounded-xl border p-4",
                    missing
                      ? "border-danger-600/40 bg-danger-600/5"
                      : "border-ink-900/10 bg-paper",
                  )}
                >
                  <div className="min-w-0">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-ink-600">
                      {q.label}
                    </dt>
                    <dd className="mt-1 break-words text-sm">
                      {formatAnswer(q, v) || (
                        <span className="italic text-ink-400">sem resposta</span>
                      )}
                    </dd>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    className="shrink-0 text-sm font-semibold text-electric-600 hover:underline"
                  >
                    Editar
                  </button>
                </div>
              );
            })}
          </dl>
          {finishState?.error && (
            <p role="alert" className="mt-4 text-sm font-medium text-danger-600">
              {finishState.error}
            </p>
          )}
          <div className="mt-8 flex items-center justify-between">
            <Button variant="ghost" onClick={() => setIndex(questions.length - 1)}>
              ← Voltar
            </Button>
            <Button variant="commercial" onClick={generate} disabled={pending}>
              {pending ? "Preparando geração…" : "Gerar minha página ✦"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function SaveIndicator({
  state,
  onRetry,
}: {
  state: SaveState;
  onRetry: () => void;
}) {
  if (state === "idle") return <span className="w-20" aria-hidden="true" />;
  if (state === "saving")
    return <span className="w-20 text-right text-xs text-ink-600">Salvando…</span>;
  if (state === "saved")
    return (
      <span className="w-20 text-right text-xs font-medium text-success-600">
        ✓ Salvo
      </span>
    );
  return (
    <button
      type="button"
      onClick={onRetry}
      className="text-right text-xs font-medium text-danger-600 hover:underline"
    >
      Falha ao salvar — tentar de novo
    </button>
  );
}

function formatAnswer(q: QuestionDef, value: unknown): string {
  if (value == null || value === "") return "";
  if (q.type === "select" && q.options) {
    return q.options.find((o) => o.value === value)?.label ?? String(value);
  }
  if (q.type === "multiselect" && Array.isArray(value) && q.options) {
    return value
      .map((v) => q.options!.find((o) => o.value === v)?.label ?? String(v))
      .join(", ");
  }
  if (q.type === "slider") return `${value}/100`;
  return String(value);
}

function QuestionInput({
  question,
  value,
  onChange,
  onEnter,
}: {
  question: QuestionDef;
  value: unknown;
  onChange: (v: unknown) => void;
  onEnter: () => void;
}) {
  switch (question.type) {
    case "textarea":
      return (
        <Textarea
          autoFocus
          rows={4}
          value={(value as string) ?? ""}
          placeholder={question.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full text-base"
        />
      );
    case "select":
      return (
        <div role="radiogroup" className="grid gap-2.5">
          {question.options?.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={value === o.value}
              onClick={() => onChange(o.value)}
              className={cx(
                "rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                value === o.value
                  ? "border-electric-600 bg-electric-600/5 text-electric-700"
                  : "border-ink-900/15 bg-white hover:border-ink-900/30",
              )}
            >
              {o.label}
              {o.description && (
                <span className="mt-0.5 block text-xs font-normal text-ink-600">
                  {o.description}
                </span>
              )}
            </button>
          ))}
        </div>
      );
    case "multiselect": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      const max = question.maxSelections ?? Infinity;
      return (
        <div className="flex flex-wrap gap-2.5">
          {question.options?.map((o) => {
            const active = selected.includes(o.value);
            const disabled = !active && selected.length >= max;
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={active}
                disabled={disabled}
                onClick={() =>
                  onChange(
                    active
                      ? selected.filter((v) => v !== o.value)
                      : [...selected, o.value],
                  )
                }
                className={cx(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40",
                  active
                    ? "border-electric-600 bg-electric-600 text-white"
                    : "border-ink-900/15 bg-white hover:border-ink-900/30",
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      );
    }
    case "slider": {
      const v = typeof value === "number" ? value : 50;
      return (
        <div>
          <input
            type="range"
            min={question.min ?? 0}
            max={question.max ?? 100}
            value={v}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-electric-600"
            aria-label={question.label}
          />
          <div className="mt-1 flex justify-between text-xs text-ink-600">
            <span>{question.minLabel}</span>
            <span>{question.maxLabel}</span>
          </div>
        </div>
      );
    }
    default:
      return (
        <Input
          autoFocus
          type={question.type === "phone" ? "tel" : question.type === "url" ? "url" : "text"}
          value={(value as string) ?? ""}
          placeholder={question.placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onEnter();
            }
          }}
          className="w-full text-base"
        />
      );
  }
}
