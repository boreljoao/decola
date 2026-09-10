# Decola — subir para o GitHub e colocar no ar

Guia operacional. O que está aqui foi verificado no código; o que depende de
conta externa está marcado como **você faz** — não invento credencial, domínio,
projeto Supabase nem resultado de teste que não rodou.

**Estado em 2026-09-10:** código no GitHub em
[boreljoao/decola](https://github.com/boreljoao/decola) (**público** — veja o
aviso abaixo). Projeto na Vercel criado e com deploy verde em
`https://decola-ruby.vercel.app`. Projeto Supabase: **não criado** — por isso
tudo que precisa de banco ainda responde erro. Domínio: não registrado.

### Estado verificado do deploy (2026-09-10)

Varredura das rotas públicas em `https://decola-ruby.vercel.app`, sem nenhuma
variável configurada:

| Rotas | Status | Motivo |
|---|---|---|
| `/`, `/precos`, `/como-funciona`, `/exemplos`, `/contato`, `/termos`, `/privacidade`, `/cookies` | **200** | estáticas, prerenderizadas no build |
| `/entrar`, `/cadastro`, `/app`, `/profissionais`, `/pro` | **500** | exigem banco e sessão — o guard de produção derruba de propósito |

Ou seja: o site de marketing está no ar e o produto não. Os 500 somem quando as
cinco variáveis obrigatórias do passo 4 estiverem configuradas — não são bug.

### Por que a URL do deploy às vezes pede login

A proteção da Vercel está ligada como `all_except_custom_domains`: todos os
endereços `*.vercel.app` exigem login na Vercel, **menos** o domínio de
produção. Então `decola-ruby.vercel.app` é público e
`decola-<time>.vercel.app` redireciona para o SSO. Para mostrar o preview a
outra pessoa antes de ter domínio, use o primeiro — ou desligue a proteção em
*Settings → Deployment Protection*.

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

Crie um arquivo `.env.local` na raiz do projeto com a connection string:

```
DATABASE_URL=postgres://usuario:senha@host:6543/postgres
```

O `.gitignore` já exclui `.env.local`. Colocar a senha no arquivo em vez de
passá-la na linha de comando evita que ela fique no histórico do shell.

Depois:

```bash
npm run db:migrate
```

Isso aplica as 11 migrations e cria as ~40 tabelas. É idempotente — rodar de
novo não duplica nada. Sem `DATABASE_URL` o comando para com uma mensagem
dizendo exatamente o que falta.

O mesmo `.env.local` faz o `npm run dev` local apontar para o Supabase em vez do
PGlite embarcado — útil para conferir o banco de produção, arriscado para
experimentar. Apague o arquivo para voltar ao banco local.

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
| `APP_URL` | URL real do deploy | roteamento de domínio próprio desligado; links de e-mail e callbacks quebram |
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

## 5. Criar o projeto na Vercel — **você faz**

A criação de projeto não é possível pela integração automatizada (a API
responde `403 forbidden` para essa ação no escopo disponível). Pelo painel:

1. [vercel.com/new](https://vercel.com/new) → **Import Git Repository** →
   `boreljoao/decola`.
2. Framework: **Next.js** (detectado sozinho). Não mexa em build command nem em
   output directory — o `vercel.json` do repositório já traz o que é preciso.
3. Antes de clicar em **Deploy**, abra *Environment Variables* e cole as do
   passo 4. As cinco obrigatórias precisam estar lá **antes** do primeiro
   deploy; senão o build sobe mas toda página responde erro no boot.
4. Deploy.

O *build* passa mesmo sem as variáveis — `src/config/env.ts` tem uma exceção
para `NEXT_PHASE === "phase-production-build"`, para que o build não exija
segredos. Quem falha é o *runtime*. Um deploy verde não significa app no ar.

---

## 6. Fila em produção

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

## 7. Domínio e páginas publicadas

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

## 8. Depois do primeiro deploy

- [ ] Abrir `/` e conferir que a home renderiza.
- [ ] Criar conta e chegar em `/app` (valida Supabase Auth e sessão).
- [ ] Criar projeto → briefing → gerar → publicar (valida banco, fila e storage).
- [ ] Enviar um lead pela página publicada e ver em *Leads* (valida rota pública).
- [ ] Conferir em *Logs* da Vercel que não há erro de boot.

Se o deploy falhar logo no início com mensagem sobre variável ausente, é o
guard-rail funcionando: falta uma das cinco obrigatórias do passo 4.

---

## 9. O que continua bloqueado (honestidade sobre estado)

Nada disso é resolvido por deploy — está registrado em
[activation-checklist.md](activation-checklist.md) e
[next-actions.md](next-actions.md):

- Nenhuma transação sandbox foi executada em Stripe ou Mercado Pago.
- Repasse/escrow do marketplace não tem provedor: a interface declara isso.
- Termos, privacidade e cookies são **minuta**, sem revisão jurídica.
- Valores comerciais pendentes do catálogo continuam pendentes.
- Sentry não está instalado (SDK ausente), só a variável está prevista.
