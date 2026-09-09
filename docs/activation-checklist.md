# Decola — Checklist de ativação de integrações

Formato (spec §20): integração → variáveis → configuração externa → webhook/callback → teste executado → estado → bloqueio.

Estado em 2026-09-09. Cada capability é calculada por **configuração válida + adapter implementado + direitos do usuário** — nada aparece disponível na interface sem os três.

| Integração | Variáveis | Configuração externa | Webhook/callback | Teste executado | Estado | Bloqueio |
|---|---|---|---|---|---|---|
| Banco (Supabase Postgres) | `DATABASE_URL` | Criar projeto Supabase; usar a connection string do pooler | — | Migrations aplicadas em PGlite (mesmo dialeto) e schema exercitado por 78 testes | implementada, aguardando configuração | Sem projeto Supabase |
| Supabase Auth | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Habilitar e-mail/senha; redirect `<APP_URL>/auth/callback`; templates pt-BR; **MFA para admin** | Callback OAuth (ao ativar Google) | Adapter compila e mapeia erros; sem projeto para teste real | implementada, aguardando configuração | Sem projeto Supabase |
| Supabase Storage | `SUPABASE_SERVICE_ROLE_KEY` | Criar bucket **privado** `decola-assets` | — | Adapter local testado E2E (upload, validação, servir com autorização) | implementada, aguardando configuração | Sem projeto Supabase |
| Geração por IA (Anthropic) | `ANTHROPIC_API_KEY`, `GENERATION_MODEL` | Chave em console.anthropic.com | — | Saída validada pelo mesmo Zod do renderer; reparo único; sem chamada real | implementada, aguardando configuração | Sem chave |
| Edição por IA | idem acima | idem | — | Proteção de campos comerciais coberta por código; reserva/commit de crédito testados | implementada, aguardando configuração | Sem chave |
| E-mail (Resend) | `RESEND_API_KEY`, `EMAIL_FROM` | Verificar domínio remetente | Bounce/complaint (a implementar) | Transporte de dev testado E2E (lead, convite, candidatura) | implementada, aguardando configuração | Sem domínio verificado |
| Stripe (cartão/assinatura) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Conta Stripe; webhook para `/api/webhooks/stripe` | `POST /api/webhooks/stripe` | 8 testes de evento normalizado (replay, fora de ordem, reembolso); **sem transação sandbox** | implementada, aguardando configuração | Sem conta |
| Mercado Pago (Pix) | `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET` | Credenciais de produção; webhook para `/api/webhooks/mercadopago` | `POST /api/webhooks/mercadopago` | Assinatura HMAC implementada conforme manifesto do MP; **sem transação sandbox** | implementada, aguardando configuração | Sem conta |
| Publicação em subdomínio | `PUBLISH_ROOT_DOMAIN`, `APP_URL` | Domínio + **wildcard DNS** `*.dominio` + certificado wildcard | — | Roteamento testado E2E em `*.localhost` | implementada, aguardando configuração | Domínio de produção não registrado |
| Domínio próprio do cliente | idem acima | Adicionar cada domínio ao projeto na plataforma de deploy (emite SSL) | — | Normalização coberta por 7 testes; verificação DNS real por TXT; para em `ssl_pending` sem plataforma | implementada, aguardando configuração | Sem plataforma de deploy configurada |
| Fila (drain em produção) | `JOB_DRAIN_TOKEN` | Cron chamando `POST /api/jobs/drain` com `Authorization: Bearer <token>` | — | Drain testado E2E (geração, criativos, e-mails) | implementada, aguardando configuração | Sem ambiente de produção |
| Meta Pixel | — (ID por workspace na UI) | Nenhuma no servidor | — | Validação de formato + carregamento só após consentimento | **implementada e funcional** | — |
| Google Analytics 4 | — (ID por workspace na UI) | Nenhuma no servidor | — | idem | **implementada e funcional** | — |
| RD Station | — | OAuth do provedor | — | — | não implementada | Exige OAuth; declarado na UI com o motivo |
| API Business | — (chaves criadas na UI) | Nenhuma | — | 3 endpoints verificados por curl com chave real; idempotência e isolamento | **implementada e funcional** (exige plano Business) | — |
| Marketplace: repasse/escrow | — | Provedor com split e onboarding de recebedores | — | — | não implementada | Sem provedor; declarado na UI |
| Sentry | `SENTRY_DSN` | Criar projeto | — | — | não implementada (SDK não instalado) | Decisão de ativação |
| Rate limit distribuído | — | Redis/Upstash | — | Limiter in-memory testado | não implementada | Só necessário com mais de uma instância |
| Transcrição de áudio | `OPENAI_API_KEY` | Chave em platform.openai.com (usa a API de transcrição por HTTP, sem SDK) | — | Gravação, upload validado e storage privado testados E2E; sem a chave o áudio é guardado e reproduzível, e a UI diz que a transcrição não está ativa | implementada, aguardando configuração | Sem chave |

## Passo a passo mínimo para produção

1. **Supabase**: criar projeto → `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; criar bucket privado `decola-assets`; habilitar MFA para contas admin.
2. **Segredos**: `SESSION_SECRET` e `JOB_DRAIN_TOKEN` (`openssl rand -hex 32`).
3. **Migrations**: `DATABASE_URL=... npx drizzle-kit migrate`.
4. **Domínio**: registrar; configurar wildcard `*.dominio` e certificado; definir `APP_URL` e `PUBLISH_ROOT_DOMAIN`.
5. **Cron**: agendar `POST /api/jobs/drain` a cada minuto com o token.
6. **Opcional por capability**: `ANTHROPIC_API_KEY` (geração e edição por IA), `OPENAI_API_KEY` (transcrição do áudio do briefing), `RESEND_API_KEY` + `EMAIL_FROM` (e-mails reais), Stripe e Mercado Pago (vendas).

Sem os itens 1–2, o boot de produção **falha de propósito** (`src/config/env.ts`) — nunca há fallback silencioso para modo de desenvolvimento.

## Antes de vender de verdade

- [ ] Uma transação sandbox completa em Stripe e em Mercado Pago (nenhuma foi executada).
- [ ] Definir os valores pendentes do catálogo comercial (`docs/next-actions.md`).
- [ ] Revisão jurídica de termos, privacidade e cookies — as três estão marcadas como minuta.
- [ ] Rodar os invariantes de crédito/cupom contra Postgres real com conexões paralelas.
