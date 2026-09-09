import { describe, expect, it } from "vitest";
import { parseReaisToCents } from "@/features/marketplace/policy";

/**
 * Conversão de valor em reais para centavos.
 *
 * Bug real que este teste tranca: o campo é rotulado "Valor (R$)", mas o
 * código tratava os dígitos como centavos — quem digitasse 450 criaria uma
 * proposta de R$ 4,50.
 */
describe("valor da proposta", () => {
  it("interpreta número inteiro como reais", () => {
    expect(parseReaisToCents("450")).toBe(45000);
    expect(parseReaisToCents("1")).toBe(100);
  });

  it("aceita centavos com vírgula ou ponto", () => {
    expect(parseReaisToCents("450,00")).toBe(45000);
    expect(parseReaisToCents("450.50")).toBe(45050);
    expect(parseReaisToCents("0,99")).toBe(99);
  });

  it("aceita separador de milhar", () => {
    expect(parseReaisToCents("1.250,50")).toBe(125050);
    expect(parseReaisToCents("1.250")).toBe(125000);
    expect(parseReaisToCents("12.500,00")).toBe(1250000);
  });

  it("ignora símbolo de moeda e espaços", () => {
    expect(parseReaisToCents("R$ 450")).toBe(45000);
    expect(parseReaisToCents("  R$ 1.250,50  ")).toBe(125050);
  });

  it("devolve zero para entrada vazia ou sem dígitos", () => {
    expect(parseReaisToCents("")).toBe(0);
    expect(parseReaisToCents("abc")).toBe(0);
    expect(parseReaisToCents("R$")).toBe(0);
  });
});
