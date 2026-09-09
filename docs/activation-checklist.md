# Decola — Checklist de ativação de integrações

Formato (spec §20): integração → variáveis → configuração externa → webhook/callback → teste executado → estado → bloqueio.

| Integração | Variáveis | Configuração externa | Webhook/callback | Teste executado | Estado | Bloqueio |
|---|---|---|---|---|---|---|
| Banco (Supabase Postgres) | `DATABASE_URL` | Criar projeto Supabase; copiar connection string (pooler, porta 6543, `prepare=false` já aplicado) | — | Migrations rodam pela factory em dev e por deploy em prod (`drizzle/`) | implementada, aguardando configuração | Sem projeto Supabase criado |
| Supabase Auth | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Habilitar e-mail/senha; configurar URL de redirect `<APP_URL>/auth/callback`; templates de e-mail pt-BR | Callback OAuth (rota a criar ao ativar Google) | Adapter compila e mapeia erros; sem projeto para teste real | implementada, aguardando configuração | Sem projeto Supabase |
| Geração por IA (Anthropic) | `ANTHROPIC_API_KEY`, `GENERATION_MODEL` | Criar chave em console.anthropic.com | — | Saída validada pelo mesmo Zod do renderer; reparo único; classificação de falhas | implementada, aguardando configuração | Sem chave de API |
| E-mail (Resend) | `RESEND_API_KEY`, `EMAIL_FROM` | Verificar domínio remetente no Resend | Bounce/complaint (a implementar ao ativar) | Transporte dev grava `.data/outbox-emails` (testado E2E) | implementada, aguardando configuração | Sem conta/domínio remetente |
| Stripe (cartão/assinatura) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Conta Stripe; produtos/preços conforme `commercial-policy` | `/api/webhooks/stripe` (a criar na Fase D) | SDK instalado; fluxo de checkout não construído | não implementada (Fase D) | Fase D não iniciada |
| Mercado Pago (Pix) | `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET` | Conta MP; credenciais de produção | `/api/webhooks/mercadopago` (a criar na Fase D) | SDK instalado; fluxo não construído | não implementada (Fase D) | Fase D não iniciada |
| Publicação em subdomínio (produção) | `PUBLISH_ROOT_DOMAIN`, `APP_URL` | Domínio raiz + wildcard DNS (`*.dominio`) apontando para a plataforma de deploy; certificado wildcard (Vercel: adicionar `*.dominio` ao projeto) | — | Roteamento por host testado em dev (`*.localhost:3000`) | implementada, aguardando configuração | Domínio de produção não registrado (não inventar domínio) |
| Domínio próprio do cliente | — | — | — | — | não implementada | Depende da Fase D (benefício pago) |
| Fila (drain em produção) | `JOB_DRAIN_TOKEN` | Cron (ex.: Vercel Cron) chamando `POST /api/jobs/drain` com `Authorization: Bearer <token>` a cada minuto | — | Drain in-process testado em dev | implementada, aguardando configuração | Sem ambiente de produção |
| Sentry | `SENTRY_DSN` | Criar projeto Sentry | — | — | não implementada (SDK não instalado; logs estruturados no servidor) | Decisão de ativação |
| Rate limit distribuído | — | Redis/Upstash quando houver mais de uma instância | — | Limiter in-memory testado | não implementada (in-memory suficiente para single-node) | Multi-instância ainda não existe |
| Transcrição de áudio | — | Provedor a escolher | — | — | não implementada | Recurso de áudio do briefing (Fase C) |

## Passo a passo mínimo para produção

1. Criar projeto Supabase → preencher `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
2. Gerar `SESSION_SECRET` (`openssl rand -hex 32`) e `JOB_DRAIN_TOKEN`.
3. Aplicar migrations: `DATABASE_URL=... npx drizzle-kit migrate` (ou deixar o primeiro boot fora de produção aplicar).
4. Configurar domínio + wildcard na plataforma de deploy; definir `APP_URL` e `PUBLISH_ROOT_DOMAIN`.
5. Configurar cron do drain de jobs.
6. Opcional: `ANTHROPIC_API_KEY` (geração por IA), `RESEND_API_KEY`+`EMAIL_FROM` (e-mails reais).

Sem os itens 1–2 o boot de produção falha de propósito (validação em `src/config/env.ts`) — nunca há fallback silencioso para modo dev.
