import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { getWorkspacePlan } from "@/features/billing/entitlements";
import { getDb } from "@/server/db";
import { apiKeys } from "@/server/db/schema";

/**
 * Chaves de API (spec §15): exibidas uma vez, guardadas por hash, escopos
 * mínimos, expiração/revogação e auditoria. A API aplica os MESMOS
 * entitlements e o mesmo isolamento do app.
 */

export { API_SCOPES, SCOPE_LABELS, type ApiScope } from "./scopes";
import type { ApiScope } from "./scopes";

const PREFIX = "dk_live_";

export function hashKey(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

/** Gera a chave; o segredo em claro só existe neste retorno. */
export function generateKey(): { secret: string; prefix: string; hash: string } {
  const random = randomBytes(24).toString("base64url");
  const secret = `${PREFIX}${random}`;
  return {
    secret,
    prefix: `${PREFIX}${random.slice(0, 6)}`,
    hash: hashKey(secret),
  };
}

export type AuthResult =
  | { ok: true; workspaceId: string; keyId: string; scopes: ApiScope[] }
  | {
      ok: false;
      status: 401 | 403;
      code: string;
      message: string;
    };

/**
 * Autentica a requisição pelo cabeçalho Authorization e confere o escopo.
 * Verifica também o entitlement: se o workspace perdeu o plano com API, a
 * chave para de funcionar — a API não é uma porta lateral aos direitos.
 */
export async function authenticateApiRequest(
  request: Request,
  requiredScope: ApiScope,
): Promise<AuthResult> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();

  if (!token || !token.startsWith(PREFIX)) {
    return {
      ok: false,
      status: 401,
      code: "missing_credentials",
      message: "Envie sua chave em Authorization: Bearer dk_live_...",
    };
  }

  const db = await getDb();
  const candidate = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.keyHash, hashKey(token)),
  });

  if (!candidate) {
    return {
      ok: false,
      status: 401,
      code: "invalid_key",
      message: "Chave inválida.",
    };
  }

  // Comparação em tempo constante mesmo já tendo achado pelo hash.
  const provided = Buffer.from(hashKey(token), "hex");
  const stored = Buffer.from(candidate.keyHash, "hex");
  if (provided.length !== stored.length || !timingSafeEqual(provided, stored)) {
    return {
      ok: false,
      status: 401,
      code: "invalid_key",
      message: "Chave inválida.",
    };
  }

  if (candidate.revokedAt) {
    return {
      ok: false,
      status: 401,
      code: "revoked_key",
      message: "Esta chave foi revogada.",
    };
  }
  if (candidate.expiresAt && candidate.expiresAt <= new Date()) {
    return {
      ok: false,
      status: 401,
      code: "expired_key",
      message: "Esta chave expirou.",
    };
  }

  const scopes = (candidate.scopes as ApiScope[]) ?? [];
  if (!scopes.includes(requiredScope)) {
    return {
      ok: false,
      status: 403,
      code: "insufficient_scope",
      message: `Esta chave não tem o escopo ${requiredScope}.`,
    };
  }

  // O direito de usar a API vem do plano, não da existência da chave.
  const plan = await getWorkspacePlan(candidate.workspaceId);
  if (!plan.entitlements.api) {
    return {
      ok: false,
      status: 403,
      code: "plan_without_api",
      message: `A API faz parte do plano Business. Plano atual: ${plan.name}.`,
    };
  }

  await db
    .update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, candidate.id));

  return {
    ok: true,
    workspaceId: candidate.workspaceId,
    keyId: candidate.id,
    scopes,
  };
}
