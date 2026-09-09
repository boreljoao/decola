import "server-only";

/**
 * Rate limit por janela deslizante, em memória de processo.
 * Suficiente para instância única (dev e deploy single-node). Para múltiplas
 * instâncias, substituir por armazenamento compartilhado (ex.: Upstash/Redis) —
 * registrado em docs/activation-checklist.md. Defaults da spec §16.
 */

const buckets = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const list = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= limit) {
    buckets.set(key, list);
    return { allowed: false, remaining: 0 };
  }
  list.push(now);
  buckets.set(key, list);
  // higiene periódica para não crescer sem limite
  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }
  return { allowed: true, remaining: limit - list.length };
}

export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
