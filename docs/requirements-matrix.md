# Decola — Matriz de rastreabilidade

Estados (spec §0, Definição de pronto): `verificado` (testado de ponta a ponta localmente), `implementado_sem_verificacao_externa`, `bloqueado_por_configuracao`, `nao_implementado`.

Última atualização: 2026-09-09, após a Fase B completa (fatia vertical) + páginas públicas da Fase E.

| Requisito (spec) | Implementação | Verificação | Status |
|---|---|---|---|
| Cadastro/entrar/sair com sessão server-side (§7.1) | `src/server/auth/*`, `src/features/auth/*` | Jornada manual E2E no navegador (cadastro → dashboard → sair) | verificado (DevAuth); Supabase Auth: bloqueado_por_configuracao |
| Workspace pessoal + memberships + papéis (§4) | `profile-service.ts`, `requireWorkspace`/`assertRole` | Criação no cadastro; toda ação valida workspace no servidor | verificado |
| Criação de projeto + briefing (§7) | `features/projects`, `features/briefing` | E2E manual | verificado |
| Contrato de perguntas com condicionais, modos e origem (§7.2) | `features/briefing/questions.ts` | Testes unitários (4) + E2E (condicional WhatsApp apareceu/oculta) | verificado (modo rápido); modo completo (8 módulos): nao_implementado |
| Autosave com debounce, indicador e retomada (§7.1) | `saveBriefingAnswers` + wizard | E2E: "✓ Salvo" + retomada na pergunta certa após navegação | verificado |
| Áudio por pergunta (§7.2) | — | — | nao_implementado (exige TranscriptionProvider) |
| Pipeline de geração persistente por etapas (§8.1) | `features/generation/pipeline.ts`, tabelas `generation_jobs/steps` | E2E: 4 etapas concluídas e reuso por revisão | verificado |
| Motor determinístico honesto (D-006) | `rules-engine.ts` | 7 testes unitários (determinismo, provas nunca inventadas, inferência registrada) + E2E | verificado |
| Geração por LLM com saída estruturada (§8.2) | `anthropic-provider.ts` (tool use + validação + reparo único) | Teste de contrato via schema; sem chamada real | bloqueado_por_configuracao (ANTHROPIC_API_KEY) |
| PageDocument Zod versionado; sem HTML/JS arbitrário (§8.2) | `page-document.ts` + renderer com catálogo fechado | 3 testes de validação (protocolos, ids, coerência de conversão) | verificado |
| Biblioteca de componentes: 10 tipos-base (§8.3) | `features/pages/renderer.tsx` — 11 tipos, 2–3 variantes estruturais cada | Render E2E em 2 paletas/nichos + 3 fixtures de demo | verificado (variantes iniciais; meta de 50 composições/5 nichos: parcial — presets de copy/paleta para 5 nichos + `outro` existem, catálogo de variantes segue em expansão) |
| Fila durável: retries, dedup, agendamento, leases (§2) | `src/server/jobs` (Postgres-backed) | E2E (generate_page, send_email); dedup por chave única | verificado (invariantes de concorrência sob Postgres real: implementado_sem_verificacao_externa) |
| Preview desktop/mobile privado (§9) | `/app/paginas/[id]/preview` (auth + noindex, eventos desativados) | E2E | verificado |
| Editor manual (§9) | — | — | nao_implementado |
| Editor por IA com patch/custo (§9) | — | — | nao_implementado |
| Criativos Meta/Google/TikTok (§10) | — | — | nao_implementado |
| Publicação: versão imutável, entitlement, slug, swap atômico (§11.1) | `features/pages/actions.ts`, `publication_deployments` | E2E: publicou, republicou; histórico registrado | verificado |
| Host-based routing `{slug}.<root>` (D-007) | `src/proxy.ts` + `/sites/[slug]` | E2E em `studio-ana-lima.localhost:3000` | verificado (dev); produção exige wildcard domain: bloqueado_por_configuracao |
| Free: 1 página com marca Decola (§1.2/§3) | `entitlements.ts` + badge no renderer | Limite testado no código; badge visível | verificado |
| Domínio próprio com verificação DNS/SSL (§11.2) | — | — | nao_implementado |
| Leads: validação, antispam, dedup, notificação assíncrona (§11.3) | `/api/public/leads` + fila + EmailProvider | E2E: lead persistido, listado no painel, e-mail gravado no outbox dev | verificado |
| WhatsApp: normalização + wa.me + evento de clique ≠ conversa (§11.3) | `conversion-utils.ts` + métricas com nota explícita | E2E: link com DDI 55 e evento registrado | verificado |
| Analytics first-party com contrato de eventos (§13.1) | `/api/public/events` + beacon sem cookies | E2E: page_view/whatsapp_click/form_submit_success contados separadamente | verificado |
| Voo Contínuo (§13.2) | — | — | nao_implementado |
| Diário de Bordo mensal (§13.3) | — | — | nao_implementado |
| Catálogo comercial versionado com draft/approved (§3) | `src/config/commercial-policy.ts` | Preços na home/preços derivam do catálogo; vendas pagas desabilitadas com motivo | verificado (estrutura); venda paga: nao_implementado (Fase D) |
| Pagamentos Stripe/MP, webhooks, ledger, cupons (§12) | SDKs instalados; fluxo não construído | — | nao_implementado (Fase D) |
| E-mail transacional (§17) | `EmailProvider` (Resend + transporte dev identificado) | E2E dev; Resend | dev: verificado; Resend: bloqueado_por_configuracao |
| Home §5.2 + como-funciona + exemplos + preços + legal | `src/app/(marketing)` | Inspeção visual desktop; promessas restritas a capabilities ativas | verificado (desktop); QA multi-viewport completo pendente |
| Exemplos honestos gerados pelo motor real (§5.2.9) | `features/demo/fixtures.ts` + páginas | Renderização E2E | verificado |
| Segurança: headers, rate limit, honeypot, validação Zod server-side (§16) | `next.config.ts`, `rate-limit.ts`, rotas | Testes manuais; rate limiter é in-memory (single-node) | implementado_sem_verificacao_externa |
| Marketplace, equipes, API Business, admin (§15/§16) | — | — | nao_implementado (Fase F) |
| Gates: lint, TS estrito, build, testes (§19.1) | ESLint ✅, `tsc --noEmit` ✅, `next build` ✅, vitest 14/14 ✅ | Executados em 2026-09-09 | verificado |
