import "server-only";

/**
 * Fronteira de autenticação (decisão D-004).
 * A Decola nunca armazena hash de senha: senha e recuperação pertencem ao
 * provedor (Supabase Auth), como a spec exige. O DevAuthProvider é
 * passwordless e recusado em produção.
 */

export type AuthProviderKind = "dev" | "supabase";

export interface AuthUser {
  /** id do profile (= id do usuário no provedor quando Supabase). */
  profileId: string;
  email: string;
  displayName: string | null;
  platformAdmin: boolean;
}

export type AuthErrorCode =
  | "invalid_credentials"
  | "email_in_use"
  | "email_not_found"
  | "email_not_confirmed"
  | "weak_password"
  | "same_password"
  | "link_invalid"
  | "session_required"
  | "rate_limited"
  | "provider_error"
  | "not_configured";

export interface AuthFailure {
  ok: false;
  code: AuthErrorCode;
  message: string;
}

export type AuthResult = { ok: true; user: AuthUser } | AuthFailure;

/**
 * Cadastro pode terminar sem sessão: com confirmação de e-mail ligada no
 * provedor, a conta existe mas só entra depois do link.
 */
export type SignUpResult =
  | AuthResult
  | { ok: true; pendingConfirmation: true; email: string };

export type AuthActionResult = { ok: true } | AuthFailure;

export interface SignUpInput {
  email: string;
  password?: string;
  displayName?: string;
}

export interface SignInInput {
  email: string;
  password?: string;
}

/** Como o provedor devolve a pessoa de um link de e-mail. */
export interface EmailLinkParams {
  /** Fluxo PKCE: código trocado pela sessão. */
  code?: string;
  /** Link com hash do token (templates de e-mail personalizados). */
  tokenHash?: string;
  type?: string;
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
  signUp(input: SignUpInput): Promise<SignUpResult>;
  signIn(input: SignInInput): Promise<AuthResult>;
  signOut(): Promise<void>;
  /** Usuário da requisição atual (via cookies) ou null. */
  getUser(): Promise<AuthUser | null>;
  /** Reenvia o link de confirmação de cadastro. */
  resendConfirmation(email: string): Promise<AuthActionResult>;
  /** Envia o link de redefinição. Nunca revela se o e-mail tem conta. */
  requestPasswordReset(email: string): Promise<AuthActionResult>;
  /** Troca a senha da sessão atual — aberta pelo link de recuperação. */
  updatePassword(password: string): Promise<AuthActionResult>;
  /** Conclui o retorno de um link do provedor e abre a sessão. */
  completeEmailLink(params: EmailLinkParams): Promise<AuthActionResult>;
}
