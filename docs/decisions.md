# Decola — Registro de decisões

> Formato: cada decisão tem contexto, decisão, consequência e status. Decisões reversíveis foram tomadas autonomamente conforme o contrato de execução (regra 2 do DECOLA_MASTER_SPEC).

## D-001 · Projeto novo, sem código legado
**Contexto:** Inspeção em 2026-09-09 não encontrou repositório Decola existente; `D:\DOCS\Documentos\boombot` contém apenas documentos (documento fundamental v2.1, megaprompts v1/v2, propostas).
**Decisão:** Criar projeto novo em `D:\DOCS\Documentos\boombot\decola` com `create-next-app`.
**Status:** aplicada.

## D-002 · Runtime Node portátil
**Contexto:** A máquina de desenvolvimento (Windows 11) não tinha Node.js; havia apenas shims globais órfãos em `%APPDATA%\npm`.
**Decisão:** Instalar Node.js v24.21.0 LTS (Krypton) como distribuição ZIP oficial em `%LOCALAPPDATA%\Programs\nodejs`, prependado ao PATH do usuário (prioridade sobre o npm global antigo). npm 11.19.0.
**Consequência:** Sem versão gerenciada por nvm/fnm; upgrade de Node é manual (trocar a pasta).
**Status:** aplicada.

## D-003 · Banco de dados: dialeto Postgres com PGlite em dev, Supabase em produção
**Contexto:** A spec exige Supabase PostgreSQL + Drizzle. Não há credenciais Supabase configuradas e não há Docker na máquina (impossível rodar `supabase start` local).
**Decisão:** Todo o schema e queries usam Drizzle com dialeto Postgres. A conexão é criada por uma factory única (`src/server/db`): com `DATABASE_URL` definido usa `postgres-js` (Supabase/Postgres real); sem `DATABASE_URL` e em `NODE_ENV !== 'production'` usa PGlite (Postgres embarcado, arquivo local em `.data/pglite`). Em produção, ausência de `DATABASE_URL` é erro de boot — nunca fallback silencioso (spec §20).
**Consequência:** Migrations idênticas nos dois modos (SQL Postgres). Ativar Supabase = definir env e rodar migrations; nenhuma mudança de código.
**Status:** aplicada.

## D-004 · Autenticação: fronteira `AuthProvider`; Supabase Auth aguardando configuração; login de desenvolvimento identificado
**Contexto:** Spec proíbe segundo banco de senhas; Supabase Auth exige projeto Supabase, inexistente neste ambiente.
**Decisão:** Criar fronteira `AuthProvider` com dois adapters: (a) `SupabaseAuthProvider` — implementação real com `@supabase/ssr`, cookies httpOnly gerenciados no servidor, estado `implementada_aguardando_configuracao`; (b) `DevAuthProvider` — apenas em `development/test/demo`, login por e-mail sem senha, banner visível de modo de desenvolvimento, sessões server-side em tabela `sessions` com cookie httpOnly assinado. Nenhum hash de senha é armazenado em nenhum modo. Em produção o DevAuthProvider é recusado no boot.
**Status:** aplicada.

## D-005 · Fila durável: engine Postgres própria atrás de `JobProvider`
**Contexto:** Spec pede fila durável (retries, dedup, agendamento) citando Inngest/Trigger.dev como exemplos; ambos exigem conta/infra externa.
**Decisão:** Implementar `JobProvider` com engine baseada no próprio Postgres: tabela `jobs` com leases (`locked_until`), retries exponenciais com jitter, chave de deduplicação única, agendamento (`run_at`) e cancelamento lógico. Worker roda in-process em dev (`npm run worker` / drain automático) e por endpoint de drain autenticado + cron em produção. A interface permite trocar por Inngest sem tocar nos call-sites.
**Consequência:** Sem dependência externa; durabilidade real (job sobrevive a restart); documentar limitação de throughput e o caminho de upgrade.
**Status:** aplicada.

## D-006 · Motor de geração: engine determinística real + provider LLM aguardando chave
**Contexto:** Não há chave de LLM configurada. Spec proíbe mock silencioso em produção e proíbe fingir IA.
**Decisão:** `GenerationProvider` com dois adapters: (a) `AnthropicGenerationProvider` — implementação real com saída estruturada (tool use / JSON schema), `implementada_aguardando_configuracao`; (b) `RulesGenerationProvider` — engine determinística honesta que sintetiza estratégia, seleciona componentes por afinidade de nicho/emoção e compõe copy a partir das respostas do briefing por templates parametrizados. Não é mock: cada briefing produz página distinta e rastreável. A UI declara qual motor gerou (`provenance.engine`). Em produção sem chave LLM, geração usa a engine determinística e o produto comunica isso; recursos vendidos como "IA" só são anunciados com provider LLM ativo (capability).
**Status:** aplicada.

## D-007 · Publicação: host-based routing no próprio app
**Contexto:** Spec exige `PublishingProvider` com subdomínio no Free e domínio próprio nos pagos.
**Decisão:** Conteúdo publicado é servido pelo próprio app em origem separada por host: middleware resolve `{slug}.<PUBLISH_ROOT_DOMAIN>` → página publicada (versão imutável). Em dev, `*.localhost:3000` resolve nativamente no navegador. Domínio próprio: entidade `domains` com verificação DNS (TXT) e estados da spec §11.2; emissão SSL depende da plataforma de deploy (Vercel wildcard/custom domains) — verificação implementada, ativação marcada conforme ambiente.
**Status:** aplicada (núcleo); domínio próprio: implementada_aguardando_configuracao.

## D-008 · Storage: fronteira com adapter local em dev e Supabase Storage em produção
**Decisão:** `StorageProvider`: dev usa filesystem privado (`.data/storage`) servido por rota autorizada; produção usa Supabase Storage (adapter real, aguardando configuração). Uploads validados por MIME real, tamanho e dimensões.
**Status:** aplicada.

## D-009 · Pagamentos: adapters Stripe e Mercado Pago aguardando configuração
**Decisão:** `PaymentProvider` com capabilities. Stripe (cartão/assinatura) e Mercado Pago (Pix avulso) implementados contra os SDKs oficiais com verificação de webhook, inbox `(provider, event_id)` única e testes de contrato com fixtures. Sem chaves: checkout indisponível com motivo exibido; nenhum fluxo de dinheiro simulado fora do modo demo identificado.
**Status:** implementada_aguardando_configuracao (progressiva).

## D-010 · E-mail: `EmailProvider` com Resend aguardando configuração e transporte de arquivo em dev
**Decisão:** Em dev/test, e-mails são renderizados e gravados em `.data/outbox-emails` (inspecionáveis), estado `dev_transport` explícito. Resend adapter real pronto para ativação.
**Status:** aplicada.

## D-011 · Versões fixadas
**Decisão:** Next.js (App Router) + React + TypeScript estrito conforme create-next-app@latest de 2026-09-09, Tailwind v4, Drizzle ORM, Zod, Motion. Versões exatas ficam no `package-lock.json` (fonte de verdade).
**Status:** aplicada.

## D-012 · Política comercial: catálogo versionado com valores pendentes tipados
**Contexto:** Spec §3.1 lista valores não decididos pelo negócio (créditos por plano, preço de pacotes, custo por ação, hospedagem anual do vitalício, comissão exata 15–20%).
**Decisão:** `commercial-policy` em código tipado com estados `draft/approved` por campo. Valores decididos (Free R$0, Start R$49, Pro R$129, Business R$349, Vitalício R$297, anual = 10× mensal) entram como `approved`. Pendentes entram como `draft` com fixture de demo identificada; em produção, oferta com campo essencial `draft` fica indisponível para venda com explicação, sem bloquear o resto.
**Status:** aplicada.

## D-013 · Escopo faseado desta implementação
**Decisão:** Ordem de entrega segue as fases A–G da spec §21. Prioridade absoluta: fatia vertical funcional (briefing → geração → preview → publicação Free → lead) antes de multiplicar telas. Marketplace, API Business, white-label e Voo Contínuo completo entram após o núcleo verificado, conforme seus próprios gates.
**Status:** em execução.

## D-014 · Publicação por caminho enquanto não há domínio com wildcard
**Contexto:** A spec publica o plano Free em subdomínio (`{slug}.<domínio>`), o que exige DNS wildcard. A produção roda em `decola-ruby.vercel.app`, sem domínio próprio: o endereço gerado não resolvia, e o ciclo publicar → visitar → lead não fechava.
**Decisão:** `env().publishing` decide o formato. `subdomain` quando `PUBLISH_ROOT_DOMAIN` foi configurado (ou fora de produção, onde `*.localhost` resolve sozinho); `path` nos demais casos, servindo em `<APP_URL>/p/<slug>`. Um único módulo (`features/pages/public-url.ts`) monta o endereço — antes eram seis. No modo por caminho a página divide origem com o painel, então pixel e analytics de terceiros não carregam, e domínio próprio fica indisponível com o motivo real (as instruções de DNS apontariam para `localhost`). Com subdomínio configurado, `/p/<slug>` redireciona para ele.
**Status:** aplicada.

## D-015 · Migrations como etapa do deploy de produção
**Contexto:** Nada aplicava migrations em produção; o passo manual dependia de alguém ter a connection string na própria máquina.
**Decisão:** `vercel.json` usa `npm run vercel-build`, que roda `scripts/migrate-on-deploy.mjs` antes do `next build`. Só com `VERCEL_ENV=production` (preview de PR usaria o mesmo banco); sem banco, pula; prefere a conexão direta e cai para o pooler se ela não conectar; falha de migration derruba o build, e a Vercel mantém o deploy anterior no ar. Nunca imprime a connection string.
**Status:** aplicada.

## D-016 · Nomes da integração Supabase da Vercel e fim da exigência de `SESSION_SECRET`
**Contexto:** A integração Supabase da Vercel Marketplace injeta `POSTGRES_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` e outros — nenhum dos nomes que o app lia. Conectar a integração não ativaria nada. `SESSION_SECRET` era exigido no boot sem ser lido por fluxo algum.
**Decisão:** `config/env-source.ts` resolve aliases (o nome canônico vence) e deriva `APP_URL` de `VERCEL_PROJECT_PRODUCTION_URL`. O módulo não importa `server-only` nem lança, porque o proxy o usa em toda requisição. `SESSION_SECRET` continua aceito, mas deixou de ser obrigatório: produção exige apenas banco e Supabase Auth.
**Status:** aplicada.

## D-017 · Fluxo de autenticação completo e sessão renovada no proxy
**Contexto:** O adapter Supabase existia, mas faltavam as rotas que a spec lista (`/auth/callback`, `/verificar-email`, `/recuperar-senha`, `/redefinir-senha`): o link de confirmação caía em 404; cadastro com confirmação ligada mandava para `/app` sem sessão; e a renovação de sessão acontecia em Server Components, onde cookie não pode ser gravado — o refresh token, de uso único, seria revogado depois da primeira hora.
**Decisão:** Rotas e ações completas. Cadastro sem sessão vai para `/verificar-email`, com o e-mail pendente em cookie httpOnly (não na URL). Recuperação não revela se o e-mail tem conta. Erros traduzidos por código estável. Cookies de sessão forçados a httpOnly e SameSite=Lax — nenhum cliente Supabase roda no navegador. `proxy.ts` renova a sessão com `getClaims()`. D-004 continua valendo: a Decola não armazena hash de senha.
**Status:** aplicada e coberta por testes com cliente simulado; verificação contra projeto Supabase real pendente.

## D-018 · Limite de upload de 4 MB
**Contexto:** A Vercel recusa corpo de requisição acima de 4,5 MB com `413 FUNCTION_PAYLOAD_TOO_LARGE` antes de o código rodar. Imagem de 5 MB (default da spec) e áudio de 10 MB nunca chegariam ao servidor, e a pessoa veria um erro genérico.
**Decisão:** 4 MB para imagem e áudio, num módulo compartilhado entre navegador e servidor, com checagem antes de enviar e tratamento explícito do 413. O Supabase Storage cria o bucket privado no primeiro upload, em vez de exigir um passo manual.
**Status:** aplicada.

## D-019 · RLS ligado em todas as tabelas
**Contexto:** No Supabase, o schema `public` é exposto pela Data API. A documentação do Supabase (conferida em 2026-09-14): *"A table in an exposed schema without RLS is readable and writable by any role with a grant on it"*, e tabelas novas concedem todos os privilégios a `anon` e `authenticated`. As 46 tabelas da Decola — perfis, leads, pagamentos, auditoria — ficariam acessíveis a quem tivesse a chave pública, que o próprio Supabase chama de *publishable*. O app nunca envia essa chave ao navegador, mas segurança não pode depender do sigilo de uma chave feita para ser pública.
**Decisão:** `.enableRLS()` em todas as tabelas do schema Drizzle, que é a fonte de verdade, e migration gerada a partir dele — sem nenhuma policy. Pela Data API, nada é lido nem gravado. O app conecta ao Postgres como dono das tabelas, que não é afetado pelo RLS; a autorização continua no servidor, por workspace (spec §4). Como nenhum cliente Supabase roda no navegador, não existe consulta direta que precise de policy.
**Status:** aplicada.

