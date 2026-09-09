# Decola — Próximas ações concretas

Checkpoint de 2026-09-09. As fases A–G da spec estão implementadas, mais domínio próprio, cupons, API Business, marketplace completo e áudio no briefing. Só pendências reais abaixo.

## 1. Decisões que só o negócio pode tomar

Cada item bloqueia apenas o que depende dele — o resto do produto funciona.

| Decisão | O que destrava |
|---|---|
| Registrar o domínio de produção | Publicação em subdomínio real com SSL wildcard; hoje tudo roda em `*.localhost` |
| Créditos por plano, preço dos pacotes, custo por ação | Remove o aviso "em definição comercial" do Combustível e fecha a cobrança da edição por IA |
| Valor anual de hospedagem do Vitalício | Libera o checkout do Vitalício (bloqueado com motivo exibido) |
| Comissão exata do marketplace (15–20%) | Fecha o contrato de profissionais |
| Contrato e preço do plano Agência | Tira o "sob consulta" |
| Benefícios do white-label | Define até onde vai a promessa em /agencias |

## 2. Criar contas e configurar

Ver [activation-checklist.md](activation-checklist.md). Supabase, Stripe, Mercado Pago, Resend, Anthropic e OpenAI (transcrição). Sem elas o produto roda em modo de desenvolvimento identificado; com elas, cada capability liga sozinha.

## 3. Código pendente

### Média
1. **Entrega e avaliação no marketplace** (§15). O ciclo vai até o aceite da proposta. Falta: entrega versionada, aceite/disputa e avaliação do contrato concluído. O repasse depende de provedor com split e segue bloqueado com motivo.
2. **Acesso do profissional ao projeto contratado** (§15): hoje o contato é liberado por e-mail. A spec prevê acesso temporário ao projeto, revogado ao encerrar o contrato.
3. **Jornada E2E do briefing de 8 módulos** no navegador e **teste de conflito com duas abas** no editor.

### Baixa
4. Ampliar o catálogo de componentes rumo às ~50 composições (§8.3).
5. `ImageProvider` por IA para criativos com fundo fotográfico (hoje é composição tipográfica real).
6. Gestão centralizada de workspaces para agências e white-label de domínio/remetente.
7. Bounce/complaint do provedor de e-mail.
8. Sentry (SDK não instalado; hoje há logs estruturados no servidor).
9. Reinstalar Motion se vier trabalho de gesto/drag/layout — foi removido porque, após a correção do reveal, nada mais o usava (ver `qa-report.md`, item 4 da acessibilidade).

## 4. Antes de ir a produção

- [ ] Rodar Lighthouse nas páginas públicas e registrar em [qa-report.md](qa-report.md) — meta ≥95, **ainda não medido**.
- [ ] Exercitar os invariantes de crédito, cupom e pagamento contra **Postgres real com conexões paralelas** — PGlite serializa e esconderia uma corrida. Os advisory locks estão corretos, mas não foram exercitados sob concorrência real.
- [ ] Fazer uma **transação sandbox** completa em Stripe e Mercado Pago.
- [ ] Configurar o cron do `POST /api/jobs/drain` com `JOB_DRAIN_TOKEN` (ele também purga áudios vencidos).
- [ ] Trocar o rate limiter in-memory por armazenamento compartilhado se houver mais de uma instância.
- [ ] **Revisão jurídica** de termos, privacidade e cookies (as três estão marcadas como minuta).
- [ ] Verificar domínio remetente no Resend.
- [ ] Habilitar MFA para contas com privilégio de administração da plataforma.
