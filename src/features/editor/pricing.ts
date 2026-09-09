/**
 * Custo em Combustível de uma edição por IA (spec §9/§12.2).
 *
 * Política exibida ao usuário ANTES da operação: o crédito é consumido ao
 * ENTREGAR uma proposta válida. Descartar uma proposta válida não devolve o
 * crédito; erro do motor libera a reserva sem cobrança.
 *
 * Módulo separado das server actions porque um arquivo "use server" só pode
 * exportar funções assíncronas.
 */
export const AI_EDIT_CREDIT_COST = 1;
