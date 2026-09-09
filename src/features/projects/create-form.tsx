"use client";

import { useActionState } from "react";
import { Button, Card, Field, Input, Select } from "@/components/ui";
import { NICHE_OPTIONS } from "@/features/briefing/questions";
import {
  createProjectAction,
  type CreateProjectState,
} from "./actions";

export function CreateProjectForm() {
  const [state, action, pending] = useActionState<CreateProjectState, FormData>(
    createProjectAction,
    {},
  );

  return (
    <Card>
      <form action={action} className="grid gap-5">
        <Field
          label="Nome do projeto"
          hint="Normalmente, o nome do seu negócio."
        >
          <Input name="name" required minLength={2} maxLength={80} placeholder="Ex.: Studio Ana Lima" />
        </Field>
        <Field label="Área de atuação">
          <Select name="niche" defaultValue="servicos_locais" required>
            {NICHE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Modo do briefing"
          hint="O modo rápido leva cerca de 5 minutos; o completo aprofunda em 8 módulos (disponível em breve nesta versão, começamos pelo rápido)."
        >
          <Select name="mode" defaultValue="rapido">
            <option value="rapido">Rápido — as perguntas essenciais</option>
          </Select>
        </Field>
        {state.error && (
          <p role="alert" className="text-sm font-medium text-danger-600">
            {state.error}
          </p>
        )}
        <Button type="submit" variant="commercial" disabled={pending}>
          {pending ? "Criando…" : "Começar o briefing"}
        </Button>
      </form>
    </Card>
  );
}
