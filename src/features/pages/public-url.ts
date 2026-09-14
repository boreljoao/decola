import "server-only";
import { env } from "@/config/env";

/**
 * Único lugar que decide o endereço público de uma página publicada
 * (decisão D-014). Antes, seis arquivos montavam `{slug}.<domínio>` por conta
 * própria.
 *
 * - `subdomain` → `{slug}.<PUBLISH_ROOT_DOMAIN>`: o desenho da spec (§3, Free
 *   "em subdomínio"). Exige DNS wildcard.
 * - `path` → `<host do app>/p/{slug}`: enquanto não há domínio com wildcard.
 *   Sem ele, publicar em `*.vercel.app` gerava um endereço que não resolvia, e
 *   o ciclo publicar → visitar → lead não fechava.
 */

function protocol(): "https" | "http" {
  return env().APP_URL.startsWith("https") ? "https" : "http";
}

function appHost(): string {
  return new URL(env().APP_URL).host;
}

/** Endereço sem protocolo — o que aparece para o usuário e no histórico. */
export function publicPageAddress(slug: string): string {
  const e = env();
  if (e.publishing === "subdomain") return `${slug}.${e.PUBLISH_ROOT_DOMAIN}`;
  return `${appHost()}/p/${slug}`;
}

export function publicPageUrl(slug: string): string {
  return `${protocol()}://${publicPageAddress(slug)}`;
}

/** Partes fixas em volta do slug, para o formulário mostrar antes de publicar. */
export function publicAddressPattern(): { prefix: string; suffix: string } {
  const e = env();
  if (e.publishing === "subdomain") {
    return { prefix: "", suffix: `.${e.PUBLISH_ROOT_DOMAIN}` };
  }
  return { prefix: `${appHost()}/p/`, suffix: "" };
}
