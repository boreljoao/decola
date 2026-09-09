# Decola — subir para o GitHub e colocar no ar

Guia operacional. O que está aqui foi verificado no código; o que depende de
conta externa está marcado como **você faz** — não invento credencial, domínio,
projeto Supabase nem resultado de teste que não rodou.

---

## 1. O que vai (e o que não vai) para o Git

Vão os 220+ arquivos de código, as 11 migrations em `drizzle/`, a documentação e
`.env.example`.

**Não vai `.data/`** — e isso é proposital. Essa pasta tem ~60 MB e contém o
Postgres embarcado (PGlite) do desenvolvimento, os uploads, os áudios e a caixa
de saída de e-mails locais. Colocar isso no repositório publicaria dados de
teste e arquivos binários que mudam a cada execução.

O banco viaja como **schema**, não como arquivo: `drizzle/0000_*.sql` até
`drizzle/0010_*.sql` recriam as ~40 tabelas em qualquer Postgres. Quem clonar o
repositório roda `npm run dev` e ganha um banco novo, vazio, já migrado.

Se você quiser levar os dados de desenvolvimento para outra máquina, copie a
pasta `.data/` por fora do Git (pen drive, zip, drive) — ela é auto-contida.

---

## 2. Banco de produção (Supabase) — **você faz**

1. Crie um projeto em [supabase.com](https://supabase.com) (o plano gratuito
   atende para começar). Região: **South America (São Paulo)** — o `vercel.json`
   já fixa as funções em `gru1`, então os dois ficam no mesmo continente.
2. Anote, em *Project Settings → Database*, a **connection string do pooler**
   (a que tem `pooler` no host e porta `6543`). Serverless abre e fecha conexão
   a cada requisição; sem pooler o Postgres esgota o limite de conexões.
3. Em *Project Settings → API*, anote `Project URL`, `anon key` e
   `service_role key`. **A service_role é segredo de backend** — ela nunca pode
   ir para variável com prefixo `NEXT_PUBLIC_`.
4. Em *Storage*, crie um bucket **privado** chamado `decola-assets`.
5. Em *Authentication*, habilite e-mail/senha e cadastre o redirect
   `https://<seu-dominio>/auth/callback`.

### Aplicar as migrations

Com a connection string em mãos, na raiz do projeto:

```bash
DATABASE_URL="postgres://...:6543/postgres" npm run db:migrate
```

No PowerShell:

```bash
$env:DATABASE_URL="postgres://...:6543/postgres"; npm run db:migrate
```

Isso aplica as 11 migrations. É idempotente — rodar de novo não duplica nada.

---

## 3. Segredos próprios

Duas variáveis não vêm de serviço nenhum, você gera:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Rode duas vezes: um valor para `SESSION_SECRET`, outro para `JOB_DRAIN_TOKEN`.

---

## 4. Variáveis na Vercel

Em *Project → Settings → Environment Variables*, ambiente **Production**:

| Variável | Valor | Sem ela |
|---|---|---|
| `DATABASE_URL` | pooler do Supabase | **boot falha de propósito** |
| `SESSION_SECRET` | hex de 32 bytes | **boot falha de propósito** |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | **boot falha de propósito** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key | **boot falha de propósito** |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role | uploads não persistem no Storage |
| `APP_URL` | `https://<seu-dominio>` | links de e-mail e callbacks quebram |
| `PUBLISH_ROOT_DOMAIN` | `<seu-dominio>` | páginas publicadas sem endereço |
| `JOB_DRAIN_TOKEN` | hex de 32 bytes | cron de retentativa não autentica |
| `CRON_SECRET` | **mesmo valor** de `JOB_DRAIN_TOKEN` | idem |
| `ANTHROPIC_API_KEY` | console.anthropic.com | geração cai no motor determinístico (funciona, e a UI diz isso) |
| `OPENAI_API_KEY` | platform.openai.com | áudio grava e toca, mas não transcreve |
| `RESEND_API_KEY` + `EMAIL_FROM` | resend.com | e-mails não saem |
| `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` | Stripe | cartão indisponível |
| `MERCADOPAGO_ACCESS_TOKEN` + `MERCADOPAGO_WEBHOOK_SECRET` | Mercado Pago | Pix indisponível |

As cinco primeiras são obrigatórias: `src/config/env.ts` derruba o boot de
produção sem elas, sem fallback silencioso para modo de desenvolvimento. As
demais controlam *capabilities* — a interface declara o que está indisponível e
por quê, em vez de fingir que funciona.

`CRON_SECRET` duplica `JOB_DRAIN_TOKEN` porque a Vercel injeta o header
`Authorization: Bearer $CRON_SECRET` nos crons, e a rota valida contra
`JOB_DRAIN_TOKEN`.

---

## 5. Fila em produção

Cada enfileiramento chama `after(() => kickDrain())` — o job roda depois da
resposta, na mesma invocação serverless. Geração de página, criativos e e-mails
funcionam **sem depender de cron**.

O cron em `vercel.json` (`/api/jobs/drain`, diário) é a rede de segurança: pega
retentativas com backoff e jobs agendados. A frequência diária é o que o plano
Hobby oferece; em plano pago, troque o `schedule` para `*/5 * * * *` — confirme
o limite do seu plano antes. Alternativa gratuita: um agendador externo
(cron-job.org) chamando `POST /api/jobs/drain` com
`Authorization: Bearer <JOB_DRAIN_TOKEN>`.

---

## 6. Domínio e páginas publicadas

O produto publica cada página em `{slug}.<PUBLISH_ROOT_DOMAIN>` — o roteamento
por host está em `src/proxy.ts` e foi verificado E2E em `*.localhost`.

Para isso valer em produção você precisa de:

- um domínio registrado (**você faz** — não registro domínio por conta própria);
- DNS wildcard `*.dominio` apontando para a Vercel;
- certificado wildcard.

**Ponto a confirmar antes de contar com isso:** domínio wildcard na Vercel pode
exigir plano pago. Verifique em *Project → Settings → Domains* ao adicionar
`*.seudominio.com`. Se não estiver disponível no seu plano, o caminho é o
domínio próprio por cliente (já implementado: cada domínio é adicionado
individualmente ao projeto, com verificação por TXT).

Enquanto não houver domínio, o app roda normalmente na URL `*.vercel.app` e as
páginas ficam acessíveis pelo preview interno — o que **não** funciona é o
endereço público por subdomínio.

---

## 7. Depois do primeiro deploy

- [ ] Abrir `/` e conferir que a home renderiza.
- [ ] Criar conta e chegar em `/app` (valida Supabase Auth e sessão).
- [ ] Criar projeto → briefing → gerar → publicar (valida banco, fila e storage).
- [ ] Enviar um lead pela página publicada e ver em *Leads* (valida rota pública).
- [ ] Conferir em *Logs* da Vercel que não há erro de boot.

Se o deploy falhar logo no início com mensagem sobre variável ausente, é o
guard-rail funcionando: falta uma das cinco obrigatórias do passo 4.

---

## 8. O que continua bloqueado (honestidade sobre estado)

Nada disso é resolvido por deploy — está registrado em
[activation-checklist.md](activation-checklist.md) e
[next-actions.md](next-actions.md):

- Nenhuma transação sandbox foi executada em Stripe ou Mercado Pago.
- Repasse/escrow do marketplace não tem provedor: a interface declara isso.
- Termos, privacidade e cookies são **minuta**, sem revisão jurídica.
- Valores comerciais pendentes do catálogo continuam pendentes.
- Sentry não está instalado (SDK ausente), só a variável está prevista.
