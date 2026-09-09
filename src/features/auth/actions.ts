"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getAuthProvider } from "@/server/auth";

export interface AuthFormState {
  error?: string;
}

const emailSchema = z.string().trim().toLowerCase().email("Informe um e-mail válido.");

function safeNext(raw: unknown): string {
  // Proteção contra open redirect: apenas caminhos internos.
  const value = typeof raw === "string" ? raw : "";
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return "/app";
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { error: email.error.issues[0].message };
  const displayName = String(formData.get("nome") ?? "").trim() || undefined;
  const password = String(formData.get("senha") ?? "") || undefined;

  const provider = getAuthProvider();
  const result = await provider.signUp({
    email: email.data,
    password,
    displayName,
  });
  if (!result.ok) return { error: result.message };
  redirect(safeNext(formData.get("next")));
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { error: email.error.issues[0].message };
  const password = String(formData.get("senha") ?? "") || undefined;

  const provider = getAuthProvider();
  const result = await provider.signIn({ email: email.data, password });
  if (!result.ok) return { error: result.message };
  redirect(safeNext(formData.get("next")));
}

export async function signOutAction(): Promise<void> {
  await getAuthProvider().signOut();
  redirect("/");
}
