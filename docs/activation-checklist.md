# Decola — Checklist de ativação de integrações

Formato (spec §20): integração → variáveis → configuração externa → webhook/callback → teste executado → estado → bloqueio.

Estado em 2026-09-14. Cada capability é calculada por **configuração válida + adapter implementado + direitos do usuário** — nada aparece disponível na interface sem os três.

| Integração | Variáveis | Configuração externa | Webhook/callback | Teste executado | Estado | Bloqueio |
|---|---|---|---|---|---|---|
| Banco (Supabase Postgres) | `DATABASE_URL` ou `POSTGRES_URL` (integração da Vercel) | Conectar o Supabase pela aba Storage da Vercel | — | 12 migrations aplicadas por `scripts/migrate-on-deploy.mjs` contra Postgres de protocolo real (idempotência, fallback direta → pooler, falha sem vazar senha); RLS em 46/46 tabelas; 149 testes | implementada, aguardando configuração | Supabase não conectado |
| Supabase Auth | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` ou a chave publishable | Site URL e Redirect URLs `<APP_URL>/**`; **Confirm email** desligado até haver SMTP próprio; MFA para admin | `GET /auth/callback` (PKCE e `token_hash`) | Cadastro com e sem confirmação, callback, recuperação e redefinição cobertos por testes com cliente simulado; rotas verificadas no navegador; sessão renovada no proxy | implementada, aguardando configuração | Sem projeto Supabase para teste real |
| Supabase Storage | `SUPABASE_SERVICE_ROLE_KEY` ou `SUPABASE_SECRET_KEY` | Nenhuma: o bucket privado `decola-assets` é criado no primeiro upload | — | Adapter local testado E2E; limite de 4 MB no navegador e no servidor; criação do bucket não exercitada contra Supabase real | implementada, aguardando configuração | Sem projeto Supabase |
| Geração por IA (Anthropic) | `ANTHROPIC_API_KEY`, `GENERATION_MODEL` | Chave em console.anthropic.com | — | Saída validada pelo mesmo Zod do renderer; reparo único; sem chamada real | implementada, aguardando configuração | Sem chave |
| Edição por IA | idem acima | idem | — | Proteção de campos comerciais coberta por código; reserva/commit de crédito testados | implementada, aguardando configuração | Sem chave |
| E-mail (Resend) | `RESEND_API_KEY`, `EMAIL_FROM` | Verificar domínio remetente | Bounce/complaint (a implementar) | Transporte de dev testado E2E (lead, convite, candidatura) | implementada, aguardando configuração | Sem domínio verificado |
| Stripe (cartão/assinatura) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Conta Stripe; webhook para `/api/webhooks/stripe` | `POST /api/webhooks/stripe` | 8 testes de evento normalizado (replay, fora de ordem, reembolso); **sem transação sandbox** | implementada, aguardando configuração | Sem conta |
| Mercado Pago (Pix) | `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET` | Credenciais de produção; webhook para `/api/webhooks/mercadopago` | `POST /api/webhooks/mercadopago` | Assinatura HMAC implementada conforme manifesto do MP; **sem transação sandbox** | implementada, aguardando configuração | Sem conta |
| Publicação | `PUBLISH_ROOT_DOMAIN` (opcional) | Sem domínio: nenhuma, páginas em `<APP_URL>/p/<slug>`. Com domínio: wildcard DNS `*.dominio` + certificado | — | Modo por caminho verificado E2E (publicar, visitar, medir, lead deduplicado); subdomínio verificado E2E em `*.localhost` | **funcional por caminho**; subdomínio aguardando domínio | Domínio não registrado (só para subdomínio) |
| Domínio próprio do cliente | `PUBLISH_ROOT_DOMAIN`, `APP_URL` | Adicionar cada domínio ao projeto na plataforma de deploy (emite SSL) | — | Normalização coberta por 7 testes; verificação DNS real por TXT; indisponível com o motivo enquanto a publicação é por caminho | implementada, aguardando configuração | Exige domínio de publicação |
| Fila (drain em produção) | `JOB_DRAIN_TOKEN` + `CRON_SECRET` (mesmo valor) | Nenhuma para o fluxo normal (`after()` na própria requisição); o cron diário do `vercel.json` pega retentativas | — | Drain testado E2E (geração, criativos, e-mails); cron chama por GET | implementada; cron aguardando o token | — |
| Meta Pixel | — (ID por workspace na UI) | Nenhuma no servidor | — | Validação de formato + carregamento só após consentimento | **implementada e funcional** | — |
| Google Analytics 4 | — (ID por workspace na UI) | Nenhuma no servidor | — | idem | **implementada e funcional** | — |
| RD Station | — | OAuth do provedor | — | — | não implementada | Exige OAuth; declarado na UI com o motivo |
| API Business | — (chaves criadas na UI) | Nenhuma | — | 3 endpoints verificados por curl com chave real; idempotência e isolamento | **implementada e funcional** (exige plano Business) | — |
| Marketplace: repasse/escrow | — | Provedor com split e onboarding de recebedores | — | — | não implementada | Sem provedor; declarado na UI |
| Sentry | `SENTRY_DSN` | Criar projeto | — | — | não implementada (SDK não instalado) | Decisão de ativação |
| Rate limit distribuído | — | Redis/Upstash | — | Limiter in-memory testado | não implementada | Só necessário com mais de uma instância |
| Transcrição de áudio | `OPENAI_API_KEY` | Chave em platform.openai.com (usa a API de transcrição por HTTP, sem SDK) | — | Gravação, upload validado e storage privado testados E2E; sem a chave o áudio é guardado e reproduzível, e a UI diz que a transcrição não está ativa | implementada, aguardando configuração | Sem chave |

## Passo a passo mínimo para produção

Detalhado, com o porquê de cada item, em [deploy.md](deploy.md):

1. **Conectar o Supabase** pela aba Storage da Vercel (só Production). As variáveis entram sozinhas; o app aceita os nomes da integração.
2. **No Supabase**: Site URL e Redirect URLs do domínio do app; desligar *Confirm email* até configurar SMTP próprio.
3. **Redeploy**: as migrations rodam no build.
4. **Admin**: marcar `platform_admin` na própria conta pelo SQL Editor.
5. **Opcional por capability**: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY` + `EMAIL_FROM`, Stripe, Mercado Pago, `JOB_DRAIN_TOKEN` + `CRON_SECRET`, `PUBLISH_ROOT_DOMAIN`.

Sem banco e Supabase Auth, o boot de produção **falha de propósito** (`src/config/env.ts`) — nunca há fallback silencioso para modo de desenvolvimento.

## Antes de vender de verdade

- [ ] Uma transação sandbox completa em Stripe e em Mercado Pago (nenhuma foi executada).
- [ ] Definir os valores pendentes do catálogo comercial (`docs/next-actions.md`).
- [ ] Revisão jurídica de termos, privacidade e cookies — as três estão marcadas como minuta.
- [ ] Rodar os invariantes de crédito/cupom contra Postgres real com conexões paralelas.
