import { describe, expect, it } from "vitest";
import { dnsInstructions, normalizeHost } from "@/features/domains/service";

/**
 * Normalização de domínio (spec §11.2): hostname validado antes de virar
 * mapeamento. Um erro aqui permitiria apontar para host inesperado ou
 * sequestrar o domínio de publicação da própria Decola.
 */

describe("normalização de hostname", () => {
  it("aceita domínio simples e remove protocolo, barra e porta", () => {
    for (const entrada of [
      "seunegocio.com.br",
      "https://seunegocio.com.br",
      "http://seunegocio.com.br/",
      "seunegocio.com.br:443",
      "  SeuNegocio.com.br  ",
      "seunegocio.com.br.",
      "https://seunegocio.com.br/pagina?x=1",
    ]) {
      const result = normalizeHost(entrada);
      expect(result.ok, `falhou para: ${entrada}`).toBe(true);
      if (result.ok) expect(result.host).toBe("seunegocio.com.br");
    }
  });

  it("trata www como o mesmo domínio do apex", () => {
    const result = normalizeHost("www.seunegocio.com.br");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.host).toBe("seunegocio.com.br");
  });

  it("aceita subdomínio próprio do cliente", () => {
    const result = normalizeHost("promo.seunegocio.com.br");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.host).toBe("promo.seunegocio.com.br");
  });

  it("RECUSA o domínio de publicação da Decola", () => {
    // Evita que alguém sequestre o host da plataforma via domínio "próprio".
    const raiz = normalizeHost("localhost");
    expect(raiz.ok).toBe(false);

    const sub = normalizeHost("qualquer.localhost");
    expect(sub.ok).toBe(false);
    if (!sub.ok) expect(sub.error).toContain("pertence à Decola");
  });

  it("recusa entradas que não são hostname", () => {
    const invalidos = [
      "",
      "   ",
      "sem-ponto",
      "espaço no meio.com",
      "-comeca-com-hifen.com",
      "ponto..duplo.com",
      "http://",
      "192.168.0.1",
    ];
    for (const entrada of invalidos) {
      expect(normalizeHost(entrada).ok, `aceitou indevidamente: ${entrada}`).toBe(
        false,
      );
    }
  });

  it("recusa hostname longo demais", () => {
    const longo = `${"a".repeat(250)}.com`;
    expect(normalizeHost(longo).ok).toBe(false);
  });
});

describe("instruções de DNS", () => {
  it("gera TXT de posse no subdomínio _decola e alvo para a plataforma", () => {
    const instrucoes = dnsInstructions("seunegocio.com.br", "decola-verificacao=abc");
    expect(instrucoes.txt.name).toBe("_decola.seunegocio.com.br");
    expect(instrucoes.txt.value).toBe("decola-verificacao=abc");
    expect(instrucoes.target.name).toBe("seunegocio.com.br");
    // O aviso deixa claro que a propagação é do provedor do cliente.
    expect(instrucoes.note).toContain("propagação");
  });
});
