"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import {
  acceptProposalAction,
  closeRequestAction,
  createServiceRequestAction,
  submitProposalAction,
  type RequestResult,
} from "./requests";

export function NewRequestForm({
  projects,
}: {
  projects: Array<{ id: string; name: string }>;
}) {
  // A própria ação revalida a rota; não é preciso refresh manual aqui.
  const [state, action, pending] = useActionState<RequestResult, FormData>(
    createServiceRequestAction,
    { ok: false },
  );

  return (
    <form action={action} className="grid gap-4">
      <Field label="O que você precisa?">
        <Input
          name="title"
          required
          minLength={5}
          maxLength={120}
          placeholder="Ex.: Revisar os textos da minha página"
        />
      </Field>
      <Field
        label="Detalhes"
        hint="Quanto mais claro o pedido, melhores as propostas."
      >
        <Textarea name="description" required rows={4} minLength={20} maxLength={2000} />
      </Field>
      {projects.length > 0 && (
        <Field label="Página relacionada (opcional)">
          <Select name="projectId" defaultValue="">
            <option value="">Nenhuma em específico</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {state.error && (
        <p role="alert" className="text-sm font-medium text-danger-600">
          {state.error}
        </p>
      )}
      <div>
        <Button type="submit" variant="commercial" disabled={pending}>
          {pending ? "Publicando…" : "Publicar solicitação"}
        </Button>
      </div>
      <p className="text-xs text-ink-600">
        Sua solicitação fica visível para profissionais aprovados. Seus dados de
        cobrança e outras páginas não são compartilhados.
      </p>
    </form>
  );
}

export function ProposalActions({
  proposalId,
  alreadyContracted,
}: {
  proposalId: string;
  alreadyContracted: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (alreadyContracted) return null;

  return (
    <div className="grid justify-items-start gap-1">
      <Button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await acceptProposalAction(proposalId);
            if (!result.ok) setError(result.error ?? "Falha.");
            router.refresh();
          })
        }
      >
        {pending ? "Registrando…" : "Aceitar esta proposta"}
      </Button>
      {error && (
        <p role="alert" className="text-xs font-medium text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function CloseRequestButton({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await closeRequestAction(requestId);
          router.refresh();
        })
      }
    >
      Encerrar solicitação
    </Button>
  );
}

export function ProposalForm({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState<RequestResult, FormData>(
    submitProposalAction,
    { ok: false },
  );

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="requestId" value={requestId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Valor (R$)" hint="Somente números. Ex.: 350">
          <Input name="price" required inputMode="numeric" placeholder="350" />
        </Field>
        <Field label="Prazo (dias)">
          <Input
            name="deliveryDays"
            required
            type="number"
            min={1}
            max={180}
            placeholder="7"
          />
        </Field>
      </div>
      <Field label="O que está incluído" hint="Seja específico sobre o escopo.">
        <Textarea name="scope" required rows={4} minLength={20} maxLength={2000} />
      </Field>
      {state.error && (
        <p role="alert" className="text-sm font-medium text-danger-600">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="text-sm font-medium text-success-600">
          Proposta enviada. Você é avisado se ela for aceita.
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando…" : "Enviar proposta"}
        </Button>
      </div>
    </form>
  );
}
