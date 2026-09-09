# Decola — Arquitetura

Aplicação modular única (Next.js App Router) + fila durável no Postgres. Sem microserviços (decisão da spec §1.2).

## Stack

- **Next.js 16 (App Router, Turbopack) + React 19 + TypeScript estrito**
- **Tailwind v4** com tokens semânticos em `src/app/globals.css` (`@theme`)
- **Drizzle ORM** (dialeto Postgres) — PGlite em dev, Postgres/Supabase em produção (factory única em `src/server/db`)
- **Zod** em todas as fronteiras (env, formulários, APIs públicas, PageDocument)
- **Motion** para animações de marketing (hidratação-segura via `MotionConfig reducedMotion="user"`)
- Fontes locais via `next/font`: Sora (display), Space Grotesk, Inter (corpo)

## Camadas

```
src/app/(marketing)     páginas públicas (dark, céu noturno)
src/app/(auth)          entrar/cadastro
src/app/app             dashboard autenticado (claro)
src/app/sites/[slug]    páginas publicadas (servidas por host, via proxy)
src/app/api/public      leads + eventos (first-party, rate-limited)
src/app/api/jobs/drain  processamento da fila (cron em produção)

src/features/<domínio>  briefing, generation, pages, projects, billing, demo, auth(actions)
src/server              db (schema+factory), auth (providers), jobs (fila), integrations (email), security
src/config              env validado no boot + commercial-policy (fonte única de regras comerciais)
```

## Fronteiras de provider (spec §2.2)

| Fronteira | Adapters | Seleção |
|---|---|---|
| `AuthProvider` | `SupabaseAuthProvider` (produção) / `DevAuthProvider` (dev, passwordless, identificado) | capability `supabaseAuth`; Dev recusado em produção |
| `GenerationProvider` | `AnthropicGenerationProvider` / `RulesGenerationProvider` (determinístico honesto) | capability `llmGeneration`; engine registrada em `provenance` |
| `JobProvider` | Fila Postgres própria (leases, retry exponencial c/ jitter, dedup única, agendamento) | única; interface permite swap por Inngest |
| `EmailProvider` | Resend / transporte de arquivo dev (`.data/outbox-emails`, status `dev_written`) | capability `resendEmail`; produção sem config = falha explícita |
| Publicação | Host-routing no próprio app (`{slug}.<PUBLISH_ROOT_DOMAIN>` → `/sites/[slug]`) | `src/proxy.ts`; deployments imutáveis em `publication_deployments` |

## Fluxo central (fatia vertical verificada)

briefing (revisões: rascunho = rev 0 mutável; conclusão = rev N imutável + hash)
→ `generation_jobs` (1 por revisão, unique) → fila `jobs` (dedup `generate_page:<id>`)
→ pipeline persistido em `generation_steps` (validate_briefing → generate_document → validate_document → create_version)
→ `page_versions` (documento Zod `PageDocument`) → preview autorizado
→ publicar: entitlement + slug único + deployment `building→live` + swap atômico de `published_version_id`
→ `/sites/[slug]` serve só a versão publicada; beacons first-party → `analytics_events`; formulário → `leads` + job `send_email`.

## Regras de segurança aplicadas

- Toda operação valida workspace/papel no servidor (`requireWorkspace`/`assertRole`); UUID não é autorização.
- Renderer monta apenas componentes do catálogo com props validadas; links restritos a protocolos seguros.
- Briefing/LLM: conteúdo do usuário é dado, nunca instrução; saída de LLM revalidada pelo mesmo schema.
- Sessões httpOnly; token armazenado como hash SHA-256; sem senha própria em nenhum modo.
- Rate limit (leads 10/min, eventos 60/min por IP), honeypot, dedup por chave de submissão.
- Headers: nosniff, referrer-policy, permissions-policy. CSP com nonce entra com integrações de terceiros.
- Analytics sem cookies/identificadores persistentes por padrão; leads jamais viram eventos.
