import { MARKETPLACE_COMMISSION } from "@/config/commercial-policy";

/**
 * Textos e regras do marketplace (spec §15). Módulo separado das server
 * actions porque um arquivo "use server" só pode exportar funções assíncronas.
 */

export const ESCROW_BLOCKED_REASON =
  "O pagamento intermediado pela Decola depende de um provedor com split e custódia, ainda não configurado. " +
  "Você pode receber propostas e combinar diretamente com o profissional; a contratação com pagamento pela plataforma será liberada quando essa integração existir.";

export function marketplaceCommissionNote(): string {
  return `A comissão da Decola sobre contratos ficará entre ${MARKETPLACE_COMMISSION.minPct}% e ${MARKETPLACE_COMMISSION.maxPct}%, registrada no contrato aceito. O percentual exato ainda está em definição comercial.`;
}

/**
 * Converte o valor digitado em REAIS para centavos. O campo é rotulado "R$",
 * então "450" significa R$ 450,00 — tratar os dígitos como centavos criaria
 * uma proposta de R$ 4,50 sem o profissional perceber.
 * Aceita "450", "450,00", "1.250,50" e "R$ 450".
 */
export function parseReaisToCents(input: string): number {
  const cleaned = input.replace(/[^\d.,]/g, "").trim();
  if (!cleaned) return 0;
  // Separador decimal é o último "," ou "." seguido de exatamente 2 dígitos.
  const decimalMatch = cleaned.match(/[.,](\d{2})$/);
  if (decimalMatch) {
    const inteiro = cleaned.slice(0, decimalMatch.index).replace(/[.,]/g, "");
    return Number(inteiro || "0") * 100 + Number(decimalMatch[1]);
  }
  return Number(cleaned.replace(/[.,]/g, "")) * 100;
}
