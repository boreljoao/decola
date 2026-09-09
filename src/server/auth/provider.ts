import "server-only";

/**
 * Fronteira de autenticação (decisão D-004).
 * A Decola nunca armazena hash de senha próprio: senhas pertencem ao provedor
 * (Supabase Auth). O DevAuthProvider é passwordless e recusado em produção.
 */

export type AuthProviderKind = "dev" | "supabase";

export interface AuthUser {
  /** id do profile (= id do usuário no provedor quando Supabase). */
  profileId: string;
  email: string;
  displayName: string | null;
  platformAdmin: boolean;
}

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; code: AuthErrorCode; message: string };

export type AuthErrorCode =
  | "invalid_credentials"
  | "email_in_use"
  | "email_not_found"
  | "email_not_confirmed"
  | "rate_limited"
  | "provider_error"
  | "not_configured";

export interface SignUpInput {
  email: string;
  password?: string;
  displayName?: string;
}

export interface SignInInput {
  email: string;
  password?: string;
}

export interface AuthProvider {
  readonly kind: AuthProviderKind;
  /** Capabilities reais do adapter no ambiente atual. */
  readonly capabilities: {
    passwordLogin: boolean;
    emailVerification: boolean;
    passwordRecovery: boolean;
    oauthGoogle: boolean;
  };
  signUp(input: SignUpInput): Promise<AuthResult>;
  signIn(input: SignInInput): Promise<AuthResult>;
  signOut(): Promise<void>;
  /** Usuário da requisição atual (via cookies) ou null. */
  getUser(): Promise<AuthUser | null>;
}
