import { describe, expect, it } from "vitest";
import { safeNext } from "@/features/auth/flow";
import { describeSupabaseError } from "@/server/auth/supabase-errors";
import { sanitizeDatabaseUrl } from "@/server/db/url";

describe("safeNext: destino depois do login", () => {
  it.each(["/app", "/app/criar", "/convite/abc?origem=email"])(
    "aceita caminho interno %s",
    (value) => {
      expect(safeNext(value)).toBe(value);
    },
  );

  it.each([
    "https://golpe.com",
    "//golpe.com",
    // barra invertida: o navegador trata /\host como //host
    "/\u005cgolpe.com",
    "javascript:alert(1)",
    "",
    "/app\u0000",
  ])("recusa %j e volta para /app", (value) => {
    expect(safeNext(value)).toBe("/app");
  });

  it("recusa valor que não é texto", () => {
    expect(safeNext(null)).toBe("/app");
    expect(safeNext(42)).toBe("/app");
  });
});

describe("erros do Supabase Auth em pt-BR", () => {
  it.each([
    ["user_already_exists", "email_in_use"],
    ["email_exists", "email_in_use"],
    ["invalid_credentials", "invalid_credentials"],
    ["email_not_confirmed", "email_not_confirmed"],
    ["weak_password", "weak_password"],
    ["over_email_send_rate_limit", "rate_limited"],
    ["over_request_rate_limit", "rate_limited"],
    ["otp_expired", "link_invalid"],
    ["bad_code_verifier", "link_invalid"],
  ])("%s vira %s", (providerCode, expected) => {
    const result = describeSupabaseError(providerCode);
    expect(result.code).toBe(expected);
    expect(result.message).not.toMatch(/[a-z]+_[a-z]+/);
  });

  it("código desconhecido ou ausente vira mensagem genérica, sem texto do provedor", () => {
    expect(describeSupabaseError("codigo_novo").code).toBe("provider_error");
    expect(describeSupabaseError(undefined).message).toMatch(/Tente de novo/);
  });
});

describe("connection string do banco", () => {
  it("remove parâmetros que o Postgres recusaria como parâmetro de sessão", () => {
    const clean = sanitizeDatabaseUrl(
      "postgres://u:senha@db.exemplo.com:6543/postgres?sslmode=require&supa=base-pooler.x&pgbouncer=true&connection_limit=1",
    );
    const url = new URL(clean);
    expect(url.searchParams.get("sslmode")).toBe("require");
    expect(url.searchParams.has("supa")).toBe(false);
    expect(url.searchParams.has("pgbouncer")).toBe(false);
    expect(url.searchParams.has("connection_limit")).toBe(false);
    expect(url.password).toBe("senha");
    expect(url.port).toBe("6543");
  });

  it("devolve intacto o que não é URL", () => {
    expect(sanitizeDatabaseUrl("não é url")).toBe("não é url");
  });
});
