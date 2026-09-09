/**
 * Escopos da API (spec §15). Módulo puro para poder ser importado tanto pelo
 * cliente quanto pelo servidor — `service.ts` é server-only.
 */

export const API_SCOPES = [
  "pages:read",
  "metrics:read",
  "leads:read",
  "leads:write",
] as const;

export type ApiScope = (typeof API_SCOPES)[number];

export const SCOPE_LABELS: Record<ApiScope, string> = {
  "pages:read": "Listar páginas",
  "metrics:read": "Consultar métricas agregadas",
  "leads:read": "Listar contatos recebidos",
  "leads:write": "Criar contatos",
};
