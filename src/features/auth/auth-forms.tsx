"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Field, Input } from "@/components/ui";
import {
  signInAction,
  signUpAction,
  type AuthFormState,
} from "./actions";

/** Formulários de entrada/cadastro. Modo dev é identificado (decisão D-004). */

export function DevModeNotice() {
  return (
    <p className="rounded-xl bg-warning-600/10 px-4 py-3 text-xs font-medium text-warning-600">
      Ambiente de desenvolvimento: login por e-mail, sem senha. Em produção, a
      autenticação usa Supabase Auth com verificação de e-mail e recuperação de
      senha.
    </p>
  );
}

export function SignUpForm({
  passwordLogin,
  next,
}: {
  passwordLogin: boolean;
  next?: string;
}) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    signUpAction,
    {},
  );
  return (
    <form action={action} className="grid gap-4">
      {!passwordLogin && <DevModeNotice />}
      <Field label="Seu nome">
        <Input name="nome" autoComplete="name" placeholder="Como podemos te chamar" />
      </Field>
      <Field label="E-mail">
        <Input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="voce@exemplo.com.br"
        />
      </Field>
      {passwordLogin && (
        <Field label="Senha" hint="Mínimo de 8 caracteres.">
          <Input name="senha" type="password" required minLength={8} autoComplete="new-password" />
        </Field>
      )}
      {next && <input type="hidden" name="next" value={next} />}
      {state.error && (
        <p role="alert" className="text-sm font-medium text-danger-600">
          {state.error}
        </p>
      )}
      <Button type="submit" variant="commercial" disabled={pending}>
        {pending ? "Criando conta…" : "Decolar grátis"}
      </Button>
      <p className="text-center text-sm text-ink-600">
        Já tem conta?{" "}
        <Link className="font-semibold text-electric-600" href="/entrar">
          Entrar
        </Link>
      </p>
    </form>
  );
}

export function SignInForm({
  passwordLogin,
  next,
}: {
  passwordLogin: boolean;
  next?: string;
}) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    signInAction,
    {},
  );
  return (
    <form action={action} className="grid gap-4">
      {!passwordLogin && <DevModeNotice />}
      <Field label="E-mail">
        <Input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="voce@exemplo.com.br"
        />
      </Field>
      {passwordLogin && (
        <Field label="Senha">
          <Input name="senha" type="password" required autoComplete="current-password" />
        </Field>
      )}
      {next && <input type="hidden" name="next" value={next} />}
      {state.error && (
        <p role="alert" className="text-sm font-medium text-danger-600">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
      <p className="text-center text-sm text-ink-600">
        Ainda não tem conta?{" "}
        <Link className="font-semibold text-electric-600" href="/cadastro">
          Decolar grátis
        </Link>
      </p>
    </form>
  );
}
