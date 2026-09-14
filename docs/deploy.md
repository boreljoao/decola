# Decola — colocar no ar

Guia operacional. O que está aqui foi verificado no código ou na documentação
do provedor, com a data; o que depende de conta externa está marcado como
**você faz** — não invento credencial, domínio, projeto nem resultado de teste
que não rodou.

**Estado em 2026-09-14**

| Parte | Estado |
|---|---|
| Código | GitHub em [boreljoao/decola](https://github.com/boreljoao/decola) — **público** (veja o aviso no fim) |
| Deploy | Verde em `https://decola-ruby.vercel.app`, com o site de marketing respondendo |
| Banco, login e storage | Prontos no código; **aguardando o Supabase ser conectado** (passo 1) |
| Domínio | Não registrado — páginas publicadas usam o endereço provisório `/p/<slug>` |

### Verificado localmente em 2026-09-14

Servidor de desenvolvimento com publicação por caminho (`PUBLISH_MODE=path`) e
login de desenvolvimento:

- Cadastro → briefing rápido (15 perguntas, incluindo a condicional do
  WhatsApp) → geração → publicação em `localhost:3000/p/<slug>`.
- A página publicada renderiza com canonical no próprio caminho e **nenhum
  script da Meta ou do Google**.
- Visitas medidas pela API pública na mesma origem. Lead enviado da própria
  página chega **uma vez** no painel — o reenvio com a mesma chave é
  deduplicado.
- `/p/<slug>` inexistente responde 404. `/auth/callback` sem parâmetros, com
  link expirado ou com `next` externo cai em `/entrar` com aviso.
- `scripts/migrate-on-deploy.mjs` contra um Postgres de protocolo real (PGlite
  via socket): 12 migrations aplicadas, segunda execução idempotente, conexão
  direta recusada caindo para o pooler, falha sem vazar senha, RLS em 46 de 46
  tabelas. Esse teste pegou um bug — a conexão recusada não caía para o pooler —,
  corrigido antes do commit.
- 149 testes, typecheck e lint limpos; `npm run vercel-build` conclui sem banco.

**Não verificado:** nada contra um projeto Supabase real — Auth, Storage e a
leitura das variáveis da integração. O adapter de Auth está coberto por testes
com cliente simulado, que provam as decisões do código, não as respostas do
Supabase. Isso só é possível depois do passo 1, e é o primeiro item da
conferência no fim deste guia.

---

## Quatro passos para o produto funcionar

### 1. Conectar o Supabase pela Vercel — **você faz**

1. Vercel → projeto **decola** → aba **Storage** → **Create Database** →
   **Supabase**.
2. Região: **South America (São Paulo)**. O `vercel.json` fixa as funções em
   `gru1`, então app e banco ficam na mesma cidade.
3. Ao conectar ao projeto, deixe marcado **só Production**. Preview são as
   branches de PR: com o banco conectado nelas, cada PR gravaria dados de teste
   no banco de produção.

A integração cria as variáveis sozinha — `POSTGRES_URL`,
`POSTGRES_URL_NON_POOLING`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` e outras. O app
aceita esses nomes (decisão D-016). **Você não copia nenhuma chave.**

### 2. Ajustar a autenticação no Supabase — **você faz**

No painel do Supabase (a Vercel tem o botão *Open in Supabase*), em
**Authentication**:

**a. URL Configuration**

- *Site URL*: `https://decola-ruby.vercel.app`
- *Redirect URLs*: `https://decola-ruby.vercel.app/**`

Sem isso, os links de confirmação e de recuperação voltam para o endereço
padrão do Supabase, que não é o seu site.

**b. Confirmação de e-mail: desligue por enquanto**

Nas configurações do provedor **Email**, desligue **Confirm email**.

Por quê: sem SMTP próprio, o Supabase só entrega e-mail para quem é membro do
time do projeto, no máximo **2 por hora**, e a própria documentação diz que
isso não serve para produção (conferido em 2026-09-14). Com a confirmação
ligada, ninguém de fora do seu time conseguiria terminar o cadastro.

O custo, para você decidir com clareza:

- a conta é criada sem provar que o e-mail pertence à pessoa;
- "Esqueci minha senha" continua só entregando para membros do time.

Para lançar de verdade, configure um SMTP próprio em **Authentication → Emails
→ SMTP Settings** (o Resend, por exemplo, funciona como SMTP do Supabase) e
volte a ligar a confirmação. O app já trata os dois modos: com confirmação
ligada, o cadastro leva para `/verificar-email`, com botão de reenvio.

### 3. Redeploy — **você faz** (ou me peça)

Variável nova só vale em deploy novo: Vercel → **Deployments** → último deploy
→ **⋯** → **Redeploy**.

No build, `scripts/migrate-on-deploy.mjs` aplica as migrations antes do
`next build` (decisão D-015). No log do build, procure:

```
[decola:migrate] migrations aplicadas via conexão direta.
```

(ou `via pooler`). Se a migration falhar, o build falha **e o deploy anterior
continua no ar** — nunca sobe código esperando um schema que não existe.

### 4. Tornar sua conta admin — **você faz**, depois de se cadastrar

Admin da plataforma aprova profissionais do marketplace e acessa `/admin`. Não
existe botão para virar admin, de propósito: decide quem tem acesso ao banco.
Crie sua conta no site e, no Supabase → **SQL Editor**, rode:

```sql
update profiles set platform_admin = true where email = 'seu-email@exemplo.com';
```

---

## O que funciona sem mais nenhuma chave

| Parte | Como |
|---|---|
| Cadastro, login, sair, recuperação de senha | Supabase Auth; sessão renovada no proxy (D-017) |
| Banco | Migrations aplicadas no deploy (D-015); RLS ligado em todas as tabelas (D-019) |
| Upload de logo, fotos e áudio | Supabase Storage; bucket privado criado no primeiro upload |
| Geração da página | Motor determinístico identificado na interface |
| Publicação | `https://decola-ruby.vercel.app/p/<slug>` (D-014) |
| Leads, métricas, Voo Contínuo, criativos | Banco + fila (`after()` na própria requisição) |

## Opcionais, por capability

Cada uma liga uma parte; sem ela, a interface diz o que está indisponível e por
quê, em vez de fingir que funciona.

| Variável | Onde obter | Sem ela |
|---|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com | geração usa o motor determinístico |
| `OPENAI_API_KEY` | platform.openai.com | áudio grava e toca, mas não transcreve |
| `RESEND_API_KEY` + `EMAIL_FROM` | resend.com (domínio remetente verificado) | e-mails do app (lead, convite) não saem; convite mostra o link para copiar |
| `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` | Stripe | cartão indisponível |
| `MERCADOPAGO_ACCESS_TOKEN` + `MERCADOPAGO_WEBHOOK_SECRET` | Mercado Pago | Pix indisponível |
| `JOB_DRAIN_TOKEN` + `CRON_SECRET` (mesmo valor) | gere com o comando abaixo | cron diário de retentativa responde 401 |
| `PUBLISH_ROOT_DOMAIN` | seu domínio, com DNS wildcard | páginas ficam no endereço provisório |

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`SESSION_SECRET` **não é mais necessário**: nenhum fluxo lia esse valor
(decisão D-016).

---

## Limites que valem saber

- **Upload de até 4 MB** para imagem e áudio. A Vercel recusa requisição acima
  de 4,5 MB antes de o código rodar (D-018).
- **Endereço provisório `/p/<slug>`**: a página divide origem com o painel,
  então Pixel da Meta e Google Analytics ficam desligados ali, e domínio
  próprio fica indisponível — as instruções de DNS apontariam para lugar
  nenhum (D-014). Os dois voltam sozinhos com `PUBLISH_ROOT_DOMAIN`.
- **Rate limit em memória**, por instância. Na Vercel cada instância conta
  separado; o login tem, além disso, os limites do próprio Supabase.
- **Cron diário** no plano Hobby. Geração, criativos e e-mails não dependem
  dele — ele só pega retentativas e jobs agendados.

---

## O que vai (e o que não vai) para o Git

Vão o código, as migrations em `drizzle/`, a documentação e `.env.example`.

**Não vai `.data/`**, de propósito: é o Postgres embarcado de desenvolvimento
(PGlite), os uploads, os áudios e a caixa de saída de e-mails locais. O banco
viaja como **schema** — quem clonar roda `npm run dev` e ganha um banco novo,
vazio, já migrado. Para levar os dados de teste para outra máquina, copie
`.data/` por fora do Git.

## Rodar migrations à mão (opcional)

O deploy já faz isso. Para aplicar a partir da sua máquina, crie `.env.local`
na raiz com:

```
DATABASE_URL=postgres://usuario:senha@host:6543/postgres
```

e rode `npm run db:migrate`. O `.gitignore` exclui `.env.local`, e a senha não
fica no histórico do shell. **Atenção:** o mesmo arquivo faz o `npm run dev`
local usar o banco de produção. Apague-o para voltar ao banco local.

## Domínio e subdomínio

Com um domínio registrado (**você faz** — não registro domínio por conta
própria), DNS wildcard `*.dominio` apontando para a Vercel e
`PUBLISH_ROOT_DOMAIN=dominio`, as páginas passam para `{slug}.dominio` — o
formato da spec — e `/p/<slug>` redireciona para lá. O roteamento por host está
em `src/proxy.ts` e foi verificado E2E em `*.localhost`.

**Confirme antes de contar com isso:** domínio wildcard na Vercel pode exigir
plano pago. Verifique em *Project → Settings → Domains* ao adicionar
`*.seudominio.com`.

## Por que outro endereço do deploy pede login

A proteção da Vercel está como `all_except_custom_domains`: todo endereço
`*.vercel.app` exige login na Vercel, **menos** o domínio de produção.
`decola-ruby.vercel.app` é público; `decola-<time>.vercel.app` redireciona para
o SSO.

---

## Conferência depois do redeploy

- [ ] `/` renderiza.
- [ ] Criar conta leva ao painel `/app` (Supabase Auth e sessão).
- [ ] Criar projeto → briefing → gerar → publicar (banco, fila e storage).
- [ ] Abrir o endereço publicado e enviar um lead; ver em *Leads*.
- [ ] Sair, entrar de novo, e usar "Esqueci minha senha" com o e-mail de um
      membro do time do Supabase.
- [ ] *Logs* da Vercel sem erro de boot.

Se toda página responder erro com "Produção exige configuração obrigatória
ausente", o Supabase não está conectado ao ambiente Production, ou o redeploy
não foi feito.

## O que continua bloqueado

Nada disso se resolve com deploy — está em
[activation-checklist.md](activation-checklist.md) e
[next-actions.md](next-actions.md):

- Nenhuma transação sandbox foi executada em Stripe ou Mercado Pago.
- Repasse/escrow do marketplace não tem provedor; a interface declara isso.
- Termos, privacidade e cookies são **minuta**, sem revisão jurídica.
- Valores comerciais pendentes do catálogo continuam pendentes.
- Sentry não está instalado (SDK ausente).

**Aviso sobre o repositório:** ele está público. Não há segredo nele — as
chaves vivem nas variáveis da Vercel —, mas a lógica de precificação, o motor
de geração e as regras de crédito ficam visíveis. Para fechar: GitHub →
*Settings → General → Change visibility → Make private*.
