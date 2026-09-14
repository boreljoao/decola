"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, Field, Input } from "@/components/ui";
import {
  requestPasswordResetAction,
  resendConfirmationAction,
  signInAction,
  signUpAction,
  updatePasswordAction,
  type AuthFormState,
} from "./actions";

/** Formulários de autenticação. Modo dev é identificado (decisão D-004). */

export function DevModeNotice() {
  return (
    <p className="rounded-xl bg-warning-600/10 px-4 py-3 text-xs font-medium text-warning-600">
      Ambiente de desenvolvimento: login por e-mail, sem senha. Em produção, a
      autenticação usa Supabase Auth com verificação de e-mail e recuperação de
      senha.
    </p>
  );
}

function FormError({ state }: { state: AuthFormState }) {
  if (!state.error) return null;
  return (
    <p role="alert" className="text-sm font-medium text-danger-600">
      {state.error}
    </p>
  );
}

function FormNotice({ state }: { state: AuthFormState }) {
  if (!state.notice) return null;
  return (
    <p
      role="status"
      className="rounded-xl bg-success-600/10 px-4 py-3 text-sm font-medium text-success-600"
    >
      {state.notice}
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
      <FormError state={state} />
      {state.code === "email_in_use" && (
        <Link className="text-sm font-semibold text-electric-600" href="/recuperar-senha">
          Recuperar a senha dessa conta
        </Link>
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
      {passwordLogin && (
        <Link
          className="-mt-2 justify-self-end text-sm font-semibold text-electric-600"
          href="/recuperar-senha"
        >
          Esqueci minha senha
        </Link>
      )}
      {next && <input type="hidden" name="next" value={next} />}
      <FormError state={state} />
      {state.code === "email_not_confirmed" && (
        <Link className="text-sm font-semibold text-electric-600" href="/verificar-email">
          Reenviar o link de confirmação
        </Link>
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

export function ResendConfirmationForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    resendConfirmationAction,
    {},
  );
  return (
    <form action={action} className="grid gap-3">
      <FormNotice state={state} />
      <FormError state={state} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Reenviando…" : "Reenviar link"}
      </Button>
    </form>
  );
}

export function PasswordResetRequestForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    requestPasswordResetAction,
    {},
  );
  if (state.notice) return <FormNotice state={state} />;
  return (
    <form action={action} className="grid gap-4">
      <Field label="E-mail">
        <Input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="voce@exemplo.com.br"
        />
      </Field>
      <FormError state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Enviando…" : "Enviar link"}
      </Button>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    updatePasswordAction,
    {},
  );
  return (
    <form action={action} className="grid gap-4">
      <Field label="Nova senha" hint="Mínimo de 8 caracteres.">
        <Input name="senha" type="password" required minLength={8} autoComplete="new-password" />
      </Field>
      <Field label="Repita a nova senha">
        <Input
          name="confirmacao"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
      </Field>
      <FormError state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Salvar senha e entrar"}
      </Button>
    </form>
  );
}
