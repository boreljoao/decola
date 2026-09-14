"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/config/env";
import { getAuthProvider } from "@/server/auth";
import { PENDING_EMAIL_COOKIE, PENDING_EMAIL_MAX_AGE, safeNext } from "./flow";

export interface AuthFormState {
  error?: string;
  /** Código estável do erro, para a interface oferecer a saída certa. */
  code?: string;
  /** Confirmação que não navega (ex.: link reenviado). */
  notice?: string;
}

const emailSchema = z.string().trim().toLowerCase().email("Informe um e-mail válido.");

async function rememberPendingEmail(email: string): Promise<void> {
  (await cookies()).set(PENDING_EMAIL_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    secure: env().APP_URL.startsWith("https"),
    path: "/",
    maxAge: PENDING_EMAIL_MAX_AGE,
  });
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { error: email.error.issues[0].message };
  const displayName = String(formData.get("nome") ?? "").trim() || undefined;
  const password = String(formData.get("senha") ?? "") || undefined;

  const result = await getAuthProvider().signUp({
    email: email.data,
    password,
    displayName,
  });
  if (!result.ok) return { error: result.message, code: result.code };
  if ("pendingConfirmation" in result) {
    await rememberPendingEmail(result.email);
    redirect("/verificar-email");
  }
  redirect(safeNext(formData.get("next")));
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { error: email.error.issues[0].message };
  const password = String(formData.get("senha") ?? "") || undefined;

  const result = await getAuthProvider().signIn({ email: email.data, password });
  if (!result.ok) {
    if (result.code === "email_not_confirmed") {
      await rememberPendingEmail(email.data);
    }
    return { error: result.message, code: result.code };
  }
  redirect(safeNext(formData.get("next")));
}

export async function resendConfirmationAction(): Promise<AuthFormState> {
  const email = (await cookies()).get(PENDING_EMAIL_COOKIE)?.value;
  if (!email) {
    return {
      error:
        "Não encontramos o e-mail do cadastro. Tente entrar com e-mail e senha: se ele ainda não foi confirmado, mostramos como reenviar.",
    };
  }
  const result = await getAuthProvider().resendConfirmation(email);
  if (!result.ok) return { error: result.message, code: result.code };
  return { notice: "Enviamos um novo link. Confira também a caixa de spam." };
}

export async function requestPasswordResetAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { error: email.error.issues[0].message };

  const result = await getAuthProvider().requestPasswordReset(email.data);
  if (!result.ok) return { error: result.message, code: result.code };
  return {
    notice:
      "Se existir uma conta com esse e-mail, o link chega em instantes. Confira também a caixa de spam.",
  };
}

export async function updatePasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = String(formData.get("senha") ?? "");
  const confirmation = String(formData.get("confirmacao") ?? "");
  if (password !== confirmation) {
    return { error: "As duas senhas precisam ser iguais." };
  }
  const result = await getAuthProvider().updatePassword(password);
  if (!result.ok) return { error: result.message, code: result.code };
  redirect("/app");
}

export async function signOutAction(): Promise<void> {
  await getAuthProvider().signOut();
  redirect("/");
}
