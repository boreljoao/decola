import "server-only";
import { randomBytes } from "node:crypto";
import { promises as dns } from "node:dns";
import { eq } from "drizzle-orm";
import { env } from "@/config/env";
import { getDb } from "@/server/db";
import { domains } from "@/server/db/schema";

/**
 * Domínio próprio (spec §11.2).
 *
 * Honestidade do fluxo: a Decola NÃO "configura tudo" — o cliente precisa
 * editar o DNS dele. Mostramos os registros exatos, verificamos de verdade por
 * consulta DNS e só ativamos após a verificação. A emissão de SSL pertence à
 * plataforma de deploy; enquanto ela não estiver configurada, o estado para em
 * `ssl_pending` com o motivo à vista, em vez de anunciar "ativo".
 */

export type NormalizeResult =
  | { ok: true; host: string }
  | { ok: false; error: string };

/** Normaliza e recusa entradas que não são um hostname válido de site. */
export function normalizeHost(input: string): NormalizeResult {
  let value = input.trim().toLowerCase();
  value = value.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  value = value.replace(/:\d+$/, "");
  value = value.replace(/\.$/, "");

  if (!value) return { ok: false, error: "Informe o endereço do domínio." };
  if (value.length > 253) {
    return { ok: false, error: "O domínio é longo demais." };
  }
  if (value.startsWith("www.")) {
    // O apex é o registro canônico; www vira redirecionamento.
    value = value.slice(4);
  }
  const pattern =
    /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
  if (!pattern.test(value)) {
    return {
      ok: false,
      error:
        "Endereço inválido. Use um domínio como seunegocio.com.br (sem http:// e sem barra).",
    };
  }
  // Impede apontar para o próprio domínio de publicação da Decola.
  const root = env().PUBLISH_ROOT_DOMAIN.split(":")[0].toLowerCase();
  if (value === root || value.endsWith(`.${root}`)) {
    return {
      ok: false,
      error: "Este endereço pertence à Decola. Informe o seu próprio domínio.",
    };
  }
  return { ok: true, host: value };
}

export function generateVerificationToken(): string {
  return `decola-verificacao=${randomBytes(16).toString("hex")}`;
}

export interface DnsInstructions {
  txt: { name: string; value: string };
  target: { type: "CNAME" | "A"; name: string; value: string };
  note: string;
}

/** Registros exatos que o cliente precisa criar no provedor de DNS dele. */
export function dnsInstructions(host: string, token: string): DnsInstructions {
  const publishRoot = env().PUBLISH_ROOT_DOMAIN.split(":")[0];
  return {
    txt: { name: `_decola.${host}`, value: token },
    target: { type: "CNAME", name: host, value: publishRoot },
    note:
      "Crie os dois registros no painel do seu provedor de domínio. A propagação " +
      "costuma levar de alguns minutos a algumas horas — a verificação pode ser " +
      "repetida quantas vezes for preciso.",
  };
}

export type VerificationResult =
  | { ok: true }
  | { ok: false; reason: string; found?: string[] };

/**
 * Verificação real por consulta DNS ao registro TXT `_decola.<host>`.
 * Sem token publicado, o domínio não avança — não existe atalho.
 */
export async function verifyDomainOwnership(
  host: string,
  expectedToken: string,
): Promise<VerificationResult> {
  try {
    const records = await dns.resolveTxt(`_decola.${host}`);
    const flattened = records.map((parts) => parts.join(""));
    if (flattened.includes(expectedToken)) return { ok: true };
    return {
      ok: false,
      reason:
        "O registro TXT existe, mas o valor não confere com o token desta verificação.",
      found: flattened.slice(0, 3),
    };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOTFOUND" || code === "ENODATA") {
      return {
        ok: false,
        reason:
          "Ainda não encontramos o registro TXT. Se você acabou de criá-lo, aguarde a propagação e tente de novo.",
      };
    }
    return {
      ok: false,
      reason: "Não foi possível consultar o DNS agora. Tente novamente em instantes.",
    };
  }
}

/** Confere se o domínio realmente aponta para a plataforma de publicação. */
export async function verifyDomainTarget(host: string): Promise<VerificationResult> {
  const publishRoot = env().PUBLISH_ROOT_DOMAIN.split(":")[0].toLowerCase();
  try {
    const cnames = await dns.resolveCname(host).catch(() => [] as string[]);
    if (cnames.some((c) => c.toLowerCase().replace(/\.$/, "").endsWith(publishRoot))) {
      return { ok: true };
    }
    return {
      ok: false,
      reason: `O domínio ainda não aponta para ${publishRoot}.`,
      found: cnames,
    };
  } catch {
    return {
      ok: false,
      reason: `Não conseguimos confirmar o apontamento para ${publishRoot}.`,
    };
  }
}

/**
 * Estado do SSL. A emissão pertence à plataforma de deploy (ex.: Vercel emite
 * automaticamente ao adicionar o domínio ao projeto). Sem essa configuração,
 * paramos em `ssl_pending` e dizemos o porquê.
 */
export function sslCapability(): { available: boolean; reason?: string } {
  const e = env();
  const isLocal = e.PUBLISH_ROOT_DOMAIN.includes("localhost");
  if (isLocal) {
    return {
      available: false,
      reason:
        "Certificado SSL é emitido pela plataforma de publicação. Neste ambiente de desenvolvimento (localhost) não há emissão automática.",
    };
  }
  return { available: true };
}

/** Resolve a página publicada a partir de um domínio próprio ativo. */
export async function resolveActiveDomain(host: string) {
  const db = await getDb();
  const record = await db.query.domains.findFirst({
    where: eq(domains.host, host.toLowerCase()),
  });
  if (!record || record.status !== "active") return null;
  return record;
}
