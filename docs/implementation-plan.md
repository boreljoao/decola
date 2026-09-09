# Decola — Plano de implementação

Fonte: `DECOLA_MASTER_SPEC.md` (megaprompt v2.0). Decisões em `docs/decisions.md`. Status por requisito em `docs/requirements-matrix.md`.

## Fase A — Inspeção e decisões ✅
- Inspeção: projeto novo (nenhum código legado). Ambiente: Windows 11, Node v24.21.0 portátil, sem Docker, sem credenciais externas (Supabase/Stripe/MP/Resend/LLM).
- Decisões D-001…D-013 registradas.

## Fase B — Fundação e fatia vertical (prioridade absoluta)
1. Config e validação de env no boot (`src/config`), modos `demo/development/test/production`.
2. Tokens de design (Tailwind v4 `@theme`), fontes locais (Sora + Inter via next/font), layout base.
3. Banco: schema Drizzle (identidade, produto, páginas, leads, analytics, jobs), factory PGlite/Postgres, migrations.
4. Auth: fronteira `AuthProvider` (Dev + Supabase), sessões server-side, `/entrar`, `/cadastro`, workspace pessoal.
5. Fila durável Postgres (`JobProvider`): leases, retry exponencial c/ jitter, dedup, agendamento.
6. Briefing modo rápido: contrato de perguntas tipado, autosave com revisões, retomada.
7. Motor de geração: pipeline persistente por etapas, `PageDocument` (Zod versionado), `RulesGenerationProvider` determinístico + `AnthropicGenerationProvider` (aguardando chave).
8. Biblioteca de componentes: 10 tipos-base com variantes estruturais; renderer com catálogo permitido (sem HTML arbitrário).
9. Preview autorizado + publicação Free: deployment imutável, swap atômico, host `{slug}.localhost` em dev, marca Decola no Free.
10. Leads: persistência server-side validada, antispam, notificação via outbox/fila; analytics first-party com consentimento.

**Gate da fase:** jornada nova conta → briefing → geração → preview → publicar Free → visitar página pública → enviar lead → ver lead no painel, verificada de ponta a ponta localmente.

## Fase C — Experiência completa
- Briefing completo (8 módulos) + condicionais por nicho; áudio (aguarda provider de transcrição).
- Reveal com etapas reais; editor manual (texto, imagem, cores, ordenação) com versões e undo; editor por IA com patch tipado (custo/saldo exibidos).
- Criativos Meta (imagem quadrada/vertical + copy) e Google (texto com limites validados); TikTok = roteiro identificado.

## Fase D — Receita
- Catálogo comercial versionado (`commercial-policy` draft/approved), snapshot em pedidos.
- Checkout Stripe (cartão/assinatura) e Mercado Pago (Pix) — adapters prontos, ativação por env; webhook inbox idempotente; grants/entitlements; ledger de créditos append-only; cupons com reserva transacional.
- Downgrade/cancelamento/atraso conforme §3.2.

## Fase E — Aquisição e retenção
- Home de marketing completa (§5.2), `/precos`, `/como-funciona`, `/exemplos`, SEO, páginas legais.
- Diário de Bordo (relatório mensal idempotente), Voo Contínuo (elegibilidade → hipótese → experimento → avaliação honesta).

## Fase F — Operação e expansão
- Admin, equipes/convites, marketplace (candidatura → contrato; pagamento intermediado bloqueado sem provedor de split), API Business.

## Fase G — Verificação
- Testes de invariantes (§19.1), QA visual multi-viewport, Lighthouse, `docs/qa-report.md` com resultados reais.

## Ordem de execução real
B1→B10 em sequência (cada item termina conectado, não só UI), depois E-home (valor demonstrável), depois C, D, E-resto, F, G contínuo.
