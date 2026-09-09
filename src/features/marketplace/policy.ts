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
