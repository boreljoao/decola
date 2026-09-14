import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { __resetEnvForTests } from "@/config/env";

/**
 * Lógica do adapter com um cliente Supabase simulado. Isto não prova que o
 * Supabase real responde assim — só que, dadas essas respostas, o adapter
 * decide certo. A verificação contra o projeto real está em docs/deploy.md.
 */

const mocks = vi.hoisted(() => ({
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn(),
    resend: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    verifyOtp: vi.fn(),
  },
  ensureProfile: vi.fn(),
  cookieWrites: [] as Array<{ name: string; options: Record<string, unknown> }>,
  setAll: undefined as
    | undefined
    | ((all: Array<{ name: string; value: string; options: object }>) => void),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    config: { cookies: { setAll: typeof mocks.setAll } },
  ) => {
    mocks.setAll = config.cookies.setAll;
    return { auth: mocks.auth };
  },
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [],
    set: (name: string, _value: string, options: Record<string, unknown>) =>
      mocks.cookieWrites.push({ name, options }),
  }),
}));

vi.mock("@/server/auth/profile-service", () => ({
  ensureProfile: mocks.ensureProfile,
}));

const { SupabaseAuthProvider } = await import("@/server/auth/supabase-auth");

const KEYS = ["APP_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const key of KEYS) saved[key] = process.env[key];
  process.env.APP_URL = "https://decola-ruby.vercel.app";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://projeto-teste.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "chave-publica-de-teste";
  __resetEnvForTests();
  vi.clearAllMocks();
  mocks.cookieWrites.length = 0;
  mocks.ensureProfile.mockImplementation(async (input: { id?: string; email: string }) => ({
    profileId: input.id ?? "perfil",
    email: input.email,
    displayName: null,
    platformAdmin: false,
  }));
});

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  __resetEnvForTests();
});

describe("cadastro", () => {
  it("sem sessão (confirmação ligada) fica pendente e não cria perfil", async () => {
    mocks.auth.signUp.mockResolvedValue({
      data: { user: { id: "u1" }, session: null },
      error: null,
    });

    const result = await new SupabaseAuthProvider().signUp({
      email: "ana@exemplo.com",
      password: "senha-segura-1",
    });

    expect(result).toEqual({ ok: true, pendingConfirmation: true, email: "ana@exemplo.com" });
    expect(mocks.ensureProfile).not.toHaveBeenCalled();
  });

  it("o link de confirmação volta pela rota de callback do app", async () => {
    mocks.auth.signUp.mockResolvedValue({ data: { user: { id: "u1" }, session: null }, error: null });

    await new SupabaseAuthProvider().signUp({ email: "ana@exemplo.com", password: "senha-segura-1" });

    const options = mocks.auth.signUp.mock.calls[0][0].options;
    expect(options.emailRedirectTo).toBe(
      "https://decola-ruby.vercel.app/auth/callback?next=%2Fapp",
    );
  });

  it("com sessão, entra direto e cria o perfil com o id do provedor", async () => {
    mocks.auth.signUp.mockResolvedValue({
      data: { user: { id: "u2" }, session: { access_token: "t" } },
      error: null,
    });

    const result = await new SupabaseAuthProvider().signUp({
      email: "bia@exemplo.com",
      password: "senha-segura-1",
    });

    expect(result.ok && "user" in result && result.user.profileId).toBe("u2");
  });

  it("senha curta é recusada antes de chamar o provedor", async () => {
    const result = await new SupabaseAuthProvider().signUp({ email: "c@exemplo.com", password: "123" });

    expect(result).toMatchObject({ ok: false, code: "weak_password" });
    expect(mocks.auth.signUp).not.toHaveBeenCalled();
  });
});

describe("recuperação de senha", () => {
  it("não revela se o e-mail tem conta quando o provedor recusa", async () => {
    mocks.auth.resetPasswordForEmail.mockResolvedValue({ error: { code: "user_not_found" } });

    const result = await new SupabaseAuthProvider().requestPasswordReset("x@exemplo.com");

    expect(result).toEqual({ ok: true });
  });

  it("mostra o limite de envio, que não revela nada", async () => {
    mocks.auth.resetPasswordForEmail.mockResolvedValue({
      error: { code: "over_email_send_rate_limit" },
    });

    const result = await new SupabaseAuthProvider().requestPasswordReset("x@exemplo.com");

    expect(result).toMatchObject({ ok: false, code: "rate_limited" });
  });

  it("trocar a senha exige a sessão aberta pelo link", async () => {
    mocks.auth.getUser.mockResolvedValue({ data: { user: null } });

    const result = await new SupabaseAuthProvider().updatePassword("senha-nova-123");

    expect(result).toMatchObject({ ok: false, code: "session_required" });
    expect(mocks.auth.updateUser).not.toHaveBeenCalled();
  });
});

describe("retorno do link de e-mail", () => {
  it("troca o código PKCE pela sessão", async () => {
    mocks.auth.exchangeCodeForSession.mockResolvedValue({ error: null });

    const result = await new SupabaseAuthProvider().completeEmailLink({ code: "abc" });

    expect(result).toEqual({ ok: true });
    expect(mocks.auth.exchangeCodeForSession).toHaveBeenCalledWith("abc");
  });

  it("aceita token_hash de template personalizado", async () => {
    mocks.auth.verifyOtp.mockResolvedValue({ error: null });

    await new SupabaseAuthProvider().completeEmailLink({ tokenHash: "h", type: "recovery" });

    expect(mocks.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "h", type: "recovery" });
  });

  it("link expirado vira mensagem de link inválido", async () => {
    mocks.auth.exchangeCodeForSession.mockResolvedValue({ error: { code: "otp_expired" } });

    const result = await new SupabaseAuthProvider().completeEmailLink({ code: "velho" });

    expect(result).toMatchObject({ ok: false, code: "link_invalid" });
  });

  it("link sem código nem token é recusado", async () => {
    const result = await new SupabaseAuthProvider().completeEmailLink({});

    expect(result).toMatchObject({ ok: false, code: "link_invalid" });
  });
});

describe("cookie de sessão", () => {
  it("é gravado httpOnly, secure e SameSite=Lax, seja qual for a opção do provedor", async () => {
    mocks.auth.getUser.mockResolvedValue({ data: { user: null } });
    await new SupabaseAuthProvider().getUser();

    mocks.setAll?.([
      { name: "sb-projeto-auth-token", value: "x", options: { httpOnly: false, sameSite: "none" } },
    ]);

    expect(mocks.cookieWrites[0].options).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
  });
});
