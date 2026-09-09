# Decola

Plataforma brasileira que transforma um briefing profundo em uma landing page personalizada, com medição contínua de visitas, cliques e leads. Especificação completa em [DECOLA_MASTER_SPEC.md](DECOLA_MASTER_SPEC.md); estado real por requisito em [docs/requirements-matrix.md](docs/requirements-matrix.md).

## Rodando localmente

Pré-requisito: Node.js 24+ (nesta máquina: `%LOCALAPPDATA%\Programs\nodejs`, já no PATH do usuário).

```bash
npm install
npm run dev
```

Abra http://localhost:3000. **Nenhuma configuração externa é necessária em dev**: sem `DATABASE_URL`, o banco é um Postgres embarcado (PGlite) em `.data/pglite` com migrations automáticas; a autenticação usa o modo de desenvolvimento identificado (login por e-mail, sem senha); e-mails são gravados em `.data/outbox-emails`.

Jornada completa local: criar conta → briefing rápido → geração → preview → publicar → visitar `http://<slug>.localhost:3000` → enviar lead → ver leads/métricas no painel.

## Scripts

| Comando | Função |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (porta 3000) |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm test` | Testes (Vitest) |
| `npm run db:generate` | Gera migrations a partir de `src/server/db/schema.ts` |

## Produção

Configuração obrigatória e passo a passo em [docs/activation-checklist.md](docs/activation-checklist.md). Sem `DATABASE_URL`, `SESSION_SECRET` e Supabase Auth, o boot de produção falha de propósito — não existe fallback silencioso para mocks (spec §20).

## Documentação

- [docs/architecture.md](docs/architecture.md) — stack, camadas e fronteiras de provider
- [docs/decisions.md](docs/decisions.md) — decisões D-001…D-013 com contexto
- [docs/implementation-plan.md](docs/implementation-plan.md) — fases A–G
- [docs/requirements-matrix.md](docs/requirements-matrix.md) — requisito → status honesto
- [docs/activation-checklist.md](docs/activation-checklist.md) — integrações e ativação
- [docs/next-actions.md](docs/next-actions.md) — checkpoint de retomada
