"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { Badge, Button, Field, Input, cx } from "@/components/ui";
import {
  addDomainAction,
  removeDomainAction,
  verifyDomainAction,
  type DomainActionResult,
} from "./actions";
import type { DnsInstructions } from "./service";

const STATUS_LABEL: Record<
  string,
  { label: string; tone: "neutral" | "success" | "warning" | "danger" | "info" }
> = {
  pending_verification: { label: "Aguardando verificação", tone: "warning" },
  verified: { label: "Posse comprovada", tone: "info" },
  ssl_pending: { label: "Aguardando certificado", tone: "warning" },
  active: { label: "Ativo", tone: "success" },
  failed: { label: "Falhou", tone: "danger" },
  detached: { label: "Desvinculado", tone: "neutral" },
};

export interface DomainView {
  id: string;
  host: string;
  status: string;
  lastError: string | null;
  lastCheckedAt: string | null;
  instructions: DnsInstructions;
}

export function DomainManager({
  pageId,
  domain,
  customDomainAllowed,
  planName,
}: {
  pageId: string;
  domain: DomainView | null;
  customDomainAllowed: boolean;
  planName: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<DomainActionResult, FormData>(
    addDomainAction,
    { ok: false },
  );
  const [working, startWorking] = useTransition();
  const [feedback, setFeedback] = useState<DomainActionResult | null>(null);

  if (!customDomainAllowed) {
    return (
      <div className="rounded-xl bg-warning-600/10 px-4 py-3 text-sm text-warning-600">
        O plano {planName} publica em endereço Decola. Domínio próprio faz parte
        dos planos pagos.
      </div>
    );
  }

  if (!domain) {
    return (
      <form action={action} className="grid gap-3">
        <input type="hidden" name="pageId" value={pageId} />
        <Field
          label="Seu domínio"
          hint="Só o endereço, sem http:// e sem barra. Ex.: seunegocio.com.br"
        >
          <Input name="host" required placeholder="seunegocio.com.br" />
        </Field>
        {state.error && (
          <p role="alert" className="text-sm font-medium text-danger-600">
            {state.error}
          </p>
        )}
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Adicionando…" : "Conectar domínio próprio"}
          </Button>
        </div>
      </form>
    );
  }

  const status = STATUS_LABEL[domain.status] ?? STATUS_LABEL.pending_verification;
  const result = feedback ?? (state.message ? state : null);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-medium">{domain.host}</p>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>

      {domain.status !== "active" && (
        <div className="grid gap-3 rounded-xl border border-ink-900/10 bg-paper p-4">
          <p className="text-sm font-medium">
            Crie estes dois registros no painel do seu provedor de domínio:
          </p>

          <div className="grid gap-2 text-xs">
            <DnsRow
              tipo="TXT"
              nome={domain.instructions.txt.name}
              valor={domain.instructions.txt.value}
            />
            <DnsRow
              tipo={domain.instructions.target.type}
              nome={domain.instructions.target.name}
              valor={domain.instructions.target.value}
            />
          </div>

          <p className="text-xs text-ink-600">{domain.instructions.note}</p>
          <p className="text-xs font-medium text-ink-900">
            A Decola não altera o DNS por você: esses registros precisam ser
            criados no seu provedor.
          </p>
        </div>
      )}

      {domain.lastError && (
        <p className="rounded-xl bg-warning-600/10 px-4 py-3 text-sm text-warning-600">
          {domain.lastError}
        </p>
      )}

      {result?.message && (
        <p
          className={cx(
            "rounded-xl px-4 py-3 text-sm font-medium",
            result.ok
              ? "bg-success-600/10 text-success-600"
              : "bg-danger-600/10 text-danger-600",
          )}
        >
          {result.message}
        </p>
      )}
      {result?.error && (
        <p role="alert" className="rounded-xl bg-danger-600/10 px-4 py-3 text-sm font-medium text-danger-600">
          {result.error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {domain.status !== "active" && (
          <Button
            disabled={working}
            onClick={() =>
              startWorking(async () => {
                setFeedback(await verifyDomainAction(domain.id));
                router.refresh();
              })
            }
          >
            {working ? "Verificando DNS…" : "Verificar agora"}
          </Button>
        )}
        <Button
          variant="danger"
          disabled={working}
          onClick={() =>
            startWorking(async () => {
              setFeedback(await removeDomainAction(domain.id));
              router.refresh();
            })
          }
        >
          Desvincular
        </Button>
      </div>

      {domain.lastCheckedAt && (
        <p className="text-xs text-ink-600">
          Última verificação: {domain.lastCheckedAt}
        </p>
      )}
    </div>
  );
}

function DnsRow({
  tipo,
  nome,
  valor,
}: {
  tipo: string;
  nome: string;
  valor: string;
}) {
  return (
    <div className="grid gap-1 rounded-lg border border-ink-900/10 bg-card p-3 sm:grid-cols-[auto_1fr]">
      <span className="font-semibold text-ink-600">Tipo</span>
      <span className="font-mono">{tipo}</span>
      <span className="font-semibold text-ink-600">Nome</span>
      <span className="break-all font-mono">{nome}</span>
      <span className="font-semibold text-ink-600">Valor</span>
      <span className="break-all font-mono">{valor}</span>
    </div>
  );
}
