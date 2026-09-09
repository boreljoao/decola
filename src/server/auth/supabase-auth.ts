import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/config/env";
import { ensureProfile } from "./profile-service";
import type {
  AuthProvider,
  AuthResult,
  AuthUser,
  SignInInput,
  SignUpInput,
} from "./provider";

/**
 * Adapter real do Supabase Auth (@supabase/ssr, cookies gerenciados no servidor).
 * Estado: implementada_aguardando_configuracao — ativa quando
 * NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY existirem.
 * Ver docs/activation-checklist.md.
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
        "Supabase Auth não configurado (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).",
      );
    }
  }

  private async client() {
    const store = await cookies();
    const e = env();
    return createServerClient(
      e.NEXT_PUBLIC_SUPABASE_URL!,
      e.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => store.getAll(),
          setAll: (all) => {
            for (const { name, value, options } of all) {
              store.set(name, value, options);
            }
          },
        },
      },
    );
  }

  async signUp(input: SignUpInput): Promise<AuthResult> {
    if (!input.password) {
      return {
        ok: false,
        code: "invalid_credentials",
        message: "Informe uma senha para criar a conta.",
      };
    }
    const supabase = await this.client();
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        data: { display_name: input.displayName },
        emailRedirectTo: `${env().APP_URL}/auth/callback`,
      },
    });
    if (error || !data.user) {
      return {
        ok: false,
        code: error?.code === "user_already_exists" ? "email_in_use" : "provider_error",
        message: error?.message ?? "Falha ao criar a conta.",
      };
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
      const code =
        error?.code === "email_not_confirmed"
          ? "email_not_confirmed"
          : "invalid_credentials";
      return {
        ok: false,
        code,
        message:
          code === "email_not_confirmed"
            ? "Confirme seu e-mail antes de entrar."
            : "E-mail ou senha incorretos.",
      };
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
}
