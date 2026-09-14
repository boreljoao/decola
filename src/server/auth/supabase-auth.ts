import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { env } from "@/config/env";
import { hardenAuthCookie } from "./cookies";
import { ensureProfile } from "./profile-service";
import type {
  AuthActionResult,
  AuthFailure,
  AuthProvider,
  AuthResult,
  AuthUser,
  EmailLinkParams,
  SignInInput,
  SignUpInput,
  SignUpResult,
} from "./provider";
import { describeSupabaseError } from "./supabase-errors";

const MIN_PASSWORD = 8;

function failure(code: string | undefined): AuthFailure {
  return { ok: false, ...describeSupabaseError(code) };
}

function weakPassword(): AuthFailure {
  return {
    ok: false,
    code: "weak_password",
    message: `Use uma senha com pelo menos ${MIN_PASSWORD} caracteres.`,
  };
}

/**
 * Adapter do Supabase Auth (@supabase/ssr, cookies gerenciados no servidor).
 * Ativo quando a URL do projeto e a chave pública (anon ou publishable)
 * existem — com os nomes próprios ou com os da integração da Vercel.
 *
 * A sessão é renovada no proxy (session-refresh.ts). Server Components não
 * podem gravar cookie; sem aquela etapa, o refresh token — de uso único — seria
 * reaproveitado e revogado, e a pessoa cairia deslogada depois da primeira hora.
 */
export class SupabaseAuthProvider implements AuthProvider {
  readonly kind = "supabase" as const;
  readonly capabilities = {
    passwordLogin: true,
    emailVerification: true,
    passwordRecovery: true,
    // OAuth Google exige configuração adicional no painel Supabase.
    oauthGoogle: false,
  };

  constructor() {
    if (!env().capabilities.supabaseAuth) {
      throw new Error(
        "Supabase Auth não configurado (NEXT_PUBLIC_SUPABASE_URL e chave pública).",
      );
    }
  }

  private async client() {
    const store = await cookies();
    const e = env();
    const secure = e.APP_URL.startsWith("https");
    return createServerClient(
      e.NEXT_PUBLIC_SUPABASE_URL!,
      e.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => store.getAll(),
          setAll: (all) => {
            try {
              for (const { name, value, options } of all) {
                store.set(name, value, hardenAuthCookie(options, secure));
              }
            } catch {
              // Server Component: gravar cookie não é permitido aqui. O proxy
              // já renovou a sessão antes desta renderização.
            }
          },
        },
      },
    );
  }

  /** Links de e-mail voltam pela rota de callback, que abre a sessão. */
  private callbackUrl(next: string): string {
    return `${env().APP_URL}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  async signUp(input: SignUpInput): Promise<SignUpResult> {
    if (!input.password || input.password.length < MIN_PASSWORD) {
      return weakPassword();
    }
    const supabase = await this.client();
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { display_name: input.displayName },
        emailRedirectTo: this.callbackUrl("/app"),
      },
    });
    if (error || !data.user) return failure(error?.code);

    // Com "Confirm email" ligado, a conta nasce sem sessão. O Supabase responde
    // igual quando o e-mail já tinha conta (proteção contra enumeração), então
    // não distinguimos os casos — e o perfil só nasce na primeira sessão real.
    if (!data.session) {
      return { ok: true, pendingConfirmation: true, email: input.email };
    }

    const user = await ensureProfile({
      id: data.user.id,
      email: input.email,
      displayName: input.displayName ?? null,
    });
    return { ok: true, user };
  }

  async signIn(input: SignInInput): Promise<AuthResult> {
    if (!input.password) {
      return {
        ok: false,
        code: "invalid_credentials",
        message: "Informe sua senha.",
      };
    }
    const supabase = await this.client();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });
    if (error || !data.user) {
      return failure(error?.code ?? "invalid_credentials");
    }
    const user = await ensureProfile({
      id: data.user.id,
      email: data.user.email ?? input.email,
      displayName:
        (data.user.user_metadata?.display_name as string | undefined) ?? null,
    });
    return { ok: true, user };
  }

  async signOut(): Promise<void> {
    const supabase = await this.client();
    await supabase.auth.signOut();
  }

  async getUser(): Promise<AuthUser | null> {
    const supabase = await this.client();
    const { data } = await supabase.auth.getUser();
    if (!data.user?.email) return null;
    return await ensureProfile({
      id: data.user.id,
      email: data.user.email,
      displayName:
        (data.user.user_metadata?.display_name as string | undefined) ?? null,
    });
  }

  async resendConfirmation(email: string): Promise<AuthActionResult> {
    const supabase = await this.client();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: this.callbackUrl("/app") },
    });
    return error ? failure(error.code) : { ok: true };
  }

  async requestPasswordReset(email: string): Promise<AuthActionResult> {
    const supabase = await this.client();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: this.callbackUrl("/redefinir-senha"),
    });
    // Só limite de envio vale mostrar: qualquer outro erro poderia revelar se
    // o e-mail tem conta.
    if (error && describeSupabaseError(error.code).code === "rate_limited") {
      return failure(error.code);
    }
    return { ok: true };
  }

  async updatePassword(password: string): Promise<AuthActionResult> {
    if (password.length < MIN_PASSWORD) return weakPassword();
    const supabase = await this.client();
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      return {
        ok: false,
        code: "session_required",
        message: "O link de redefinição expirou. Peça um novo.",
      };
    }
    const { error } = await supabase.auth.updateUser({ password });
    return error ? failure(error.code) : { ok: true };
  }

  async completeEmailLink(params: EmailLinkParams): Promise<AuthActionResult> {
    const supabase = await this.client();
    if (params.code) {
      const { error } = await supabase.auth.exchangeCodeForSession(params.code);
      return error ? failure(error.code) : { ok: true };
    }
    if (params.tokenHash && params.type) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash: params.tokenHash,
        type: params.type as EmailOtpType,
      });
      return error ? failure(error.code) : { ok: true };
    }
    return {
      ok: false,
      code: "link_invalid",
      message: "Este link está incompleto. Peça um novo.",
    };
  }
}
