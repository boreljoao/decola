# Decola — Matriz de rastreabilidade

Estados (spec §0): `verificado` (testado de ponta a ponta localmente), `implementado_sem_verificacao_externa`, `bloqueado_por_configuracao`, `nao_implementado`.

Última atualização: 2026-09-09, ao fim das fases A–G. Evidências em [qa-report.md](qa-report.md).

## Núcleo do produto

| Requisito (spec) | Implementação | Status |
|---|---|---|
| Cadastro/entrar/sair com sessão server-side (§7.1) | `src/server/auth/*` — cookie httpOnly, token por hash | verificado (DevAuth); Supabase Auth: bloqueado_por_configuracao |
| Workspace, papéis e autorização por recurso (§4) | `requireWorkspace`/`assertRole` em toda ação | verificado |
| Briefing: 8 módulos, condicionais, origem da resposta (§7.2) | `features/briefing/questions.ts` | verificado (modo rápido E2E); modo completo: implementado_sem_verificacao_externa |
| Autosave com debounce, indicador e retomada (§7.1) | `saveBriefingAnswers` + wizard | verificado |
| Áudio por pergunta (§7.2) | — | nao_implementado (exige TranscriptionProvider) |
| Pipeline de geração persistente por etapas (§8.1) | `features/generation/pipeline.ts` | verificado |
| Motor determinístico honesto (D-006) | `rules-engine.ts` + `palettes.ts` | verificado (10 testes) |
| Geração por LLM com saída estruturada (§8.2) | `anthropic-provider.ts` (tool use + reparo único) | bloqueado_por_configuracao |
| PageDocument Zod; sem HTML/JS arbitrário (§8.2) | `page-document.ts` + renderer com catálogo fechado | verificado |
| Biblioteca de componentes (§8.3) | 11 tipos, 2–3 variantes cada, 6 paletas de nicho | verificado (variantes iniciais; meta de ~50 composições: parcial) |
| Fila durável: retry, dedup, lease, agendamento (§2) | `src/server/jobs` sobre Postgres | verificado (concorrência sob Postgres real: implementado_sem_verificacao_externa) |

## Edição e criativos

| Requisito | Implementação | Status |
|---|---|---|
| Preview privado desktop/mobile (§9) | `/preview` com auth, noindex, eventos desativados | verificado |
| Editor manual: texto, cor, tipografia, ordenação (§9) | `features/editor/editor.tsx` com undo/redo e preview ao vivo | verificado |
| Editor: troca de imagem, alt text, biblioteca (§9) | `ImageUploadField` em seções e logo | verificado |
| Editor por IA com patch tipado e campos protegidos (§9) | `ai-edit.ts` — preço/provas/garantias/destino revertidos por padrão | bloqueado_por_configuracao (código pronto) |
| Custo e saldo exibidos antes da operação paga (§9) | reserva → commit/release ligados ao Combustível | verificado (regra); cobrança real depende de créditos concedidos |
| Conflito de edição concorrente (§9) | comparação de `baseVersionId` no servidor | implementado_sem_verificacao_externa |
| Versões e restauração (§9) | `page_versions` + rollback versionado | verificado |
| Criativos Meta/Google/TikTok (§10) | copy validada por Zod; PNGs via satori+resvg; TikTok como roteiro identificado | verificado |
| Franquia de criativos por plano (§10) | bloqueio fora de dev quando franquia = 0 | verificado (dev) |

## Publicação e conversão

| Requisito | Implementação | Status |
|---|---|---|
| Deploy por versão imutável, swap atômico (§11.1) | `publication_deployments` | verificado |
| Host-based routing `{slug}.<root>` (D-007) | `src/proxy.ts` + `/sites/[slug]` | verificado (dev); produção exige wildcard: bloqueado_por_configuracao |
| Free: 1 página com marca Decola (§1.2) | `entitlements.ts` + badge | verificado |
| Domínio próprio com DNS/SSL (§11.2) | — | nao_implementado |
| Leads: validação, antispam, dedup, notificação (§11.3) | `/api/public/leads` + fila | verificado |
| WhatsApp: clique ≠ conversa confirmada (§11.3) | rótulo explícito nas métricas | verificado |
| Analytics first-party sem cookies (§13.1) | `/api/public/events` | verificado |
| Upload de imagem: MIME real, EXIF, SVG recusado (§16) | `validate-image.ts` | verificado (9 testes + burla no navegador) |
| Asset privado antes, público após publicar (§16) | `/api/assets/[id]` | verificado (403 → 200) |

## Receita

| Requisito | Implementação | Status |
|---|---|---|
| Catálogo versionado draft/approved (§3) | `commercial-policy.ts` | verificado |
| Pedido com snapshot imutável e idempotência (§12.1) | `orders` com chave única | verificado (8 testes) |
| Webhook: assinatura, inbox único, ordem, reembolso (§12.1) | `apply-event.ts` + `/api/webhooks/[provider]` | verificado por teste; sandbox real: bloqueado_por_configuracao |
| Adapters Stripe (cartão/assinatura) e MP (Pix) (§2.2) | capabilities honestas (sem parcelamento/recorrência Pix) | bloqueado_por_configuracao |
| Créditos: reserva/commit/release atômicos, ledger append-only (§12.2) | `credits.ts` com advisory lock | verificado (9 testes) |
| Direitos por grant, múltiplos planos, downgrade (§3.2) | `entitlements.ts` + `pagesAffectedByDowngrade` | verificado |
| Cupons (§12.3) | — | nao_implementado |

## Medição e operação

| Requisito | Implementação | Status |
|---|---|---|
| Voo Contínuo: hipótese → teste → veredito honesto (§13.2) | `experiments/` com teste z e guardrail | verificado (10 testes + gate de elegibilidade) |
| Diário de Bordo mensal idempotente (§13.3) | `reports/monthly.ts` | verificado |
| Integrações com consentimento (§14/§16) | Meta Pixel e GA por ID validado; RD Station indisponível com motivo | verificado |
| Equipe: convites com expiração e assentos (§15) | token por hash, aceite nominal | verificado |
| Marketplace: candidatura → catálogo (§15) | perfis só após aprovação | verificado; "contratar e pagar": bloqueado_por_configuracao (sem provedor de split) |
| Privacidade: exportação e exclusão (§16) | impacto exibido antes; retenção legal preservada | verificado |
| Admin: fila, pagamentos, privacidade, auditoria (§16) | somente leitura por decisão | verificado |
| API Business (§15) | — | nao_implementado |
| White-label completo (§15) | marca removida nos pagos; domínio/e-mail próprios | parcial — limitação declarada em /agencias |

## Qualidade

| Requisito | Status |
|---|---|
| Gates: lint, TS estrito, build, testes (§19.1) | verificado — 51/51 testes |
| Invariantes de isolamento entre workspaces (§19.1 item 1) | implementado (autorização por recurso); **sem teste automatizado dedicado** |
| Acessibilidade WCAG AA (§19.3) | verificado — 0 problemas em 10 rotas; 3 falhas corrigidas |
| Contraste AA (§19.3) | verificado — 1 falha real corrigida (`mist-700`) |
| QA visual 360/390/768/desktop (§19.3) | verificado |
| Lighthouse ≥95 e Core Web Vitals (§19.3) | **não medido** — exige ambiente de produção |
| SEO: metadata, canonical, noindex em privadas (§19.4) | verificado |
