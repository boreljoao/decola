# Decola — Próximas ações concretas

Checkpoint de 2026-09-09, ao fim das fases A–G. Só pendências reais; nada aqui transfere trabalho já implementável.

## 1. Decisões que só o negócio pode tomar

Cada item bloqueia apenas o que depende dele — o resto do produto funciona.

| Decisão | O que destrava |
|---|---|
| Registrar o domínio de produção | Publicação em subdomínio real com SSL wildcard; hoje tudo roda em `*.localhost` e nenhum domínio é inventado |
| Créditos por plano, preço dos pacotes, custo por ação | Remove o aviso "em definição comercial" da tela de Combustível e fecha a política de cobrança da edição por IA |
| Valor anual de hospedagem do Vitalício | Libera o checkout do Vitalício (hoje bloqueado com motivo exibido) |
| Comissão exata do marketplace (15–20%) | Fecha o contrato de profissionais |
| Contrato e preço do plano Agência | Tira o "sob consulta" |
| Benefícios do white-label | Define até onde vai a promessa em /agencias |

## 2. Criar contas e configurar (docs/activation-checklist.md)

Supabase (banco + auth + storage), Stripe, Mercado Pago, Resend, Anthropic. Sem elas o produto roda em modo de desenvolvimento identificado; com elas, cada capability liga sozinha.

## 3. Código pendente, por prioridade

### Alta — completam promessas já visíveis na interface
1. **Domínio próprio** (§11.2): verificação DNS por TXT, emissão de SSL e os estados `pending_verification → verified → ssl_pending → active`. Hoje os planos pagos anunciam domínio próprio e a funcionalidade não existe.
2. **Cupons** (§12.3): reserva transacional com expiração, escopo e limite. Nada na UI promete cupom hoje, mas o catálogo comercial pressupõe.
3. **Teste automatizado de isolamento entre workspaces** (§19.1 item 1): a autorização existe em toda ação, mas não há teste provando que o workspace A não alcança dados do B. É o teste mais importante que falta.

### Média — completam fases já iniciadas
4. **Áudio no briefing** (§7.2): exige `TranscriptionProvider`; o texto continua funcionando sem ele.
5. **Marketplace completo** (§15): solicitação → proposta → contrato → entrega → avaliação. As tabelas existem; falta a UI do fluxo e o repasse (que depende de provedor com split).
6. **API Business** (§15): chaves com hash, escopos, rate limit e OpenAPI.
7. **Jornada E2E do briefing de 8 módulos** no navegador e **teste de conflito com duas abas**.

### Baixa — evolução
8. Ampliar o catálogo de componentes rumo às ~50 composições (§8.3).
9. `ImageProvider` por IA para criativos com fundo fotográfico (hoje é composição tipográfica real).
10. Gestão centralizada de workspaces para agências.

## 4. Antes de ir a produção

- [ ] Rodar Lighthouse nas páginas públicas e registrar em `docs/qa-report.md` (meta ≥95, ainda não medido).
- [ ] Exercitar os invariantes de crédito/pagamento contra Postgres real com conexões paralelas — PGlite serializa e esconderia uma corrida.
- [ ] Fazer uma transação sandbox em Stripe e Mercado Pago de ponta a ponta.
- [ ] Configurar o cron do `POST /api/jobs/drain` com `JOB_DRAIN_TOKEN`.
- [ ] Trocar o rate limiter in-memory por armazenamento compartilhado se houver mais de uma instância.
- [ ] Revisão jurídica de termos, privacidade e cookies (as três estão marcadas como minuta).
- [ ] Definir o e-mail remetente verificado no Resend.
