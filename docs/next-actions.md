# Decola — Próximas ações concretas

Checkpoint de 2026-09-09 (fim da Fase C: briefing completo, editor manual+IA, criativos — sobre a Fase B/fatia vertical e o marketing da Fase E). Somente pendências reais; nada aqui transfere trabalho já autorizado e implementável — é a ordem de retomada.

## Decisões que só o negócio pode tomar (bloqueiam apenas o que dependem delas)

1. Registrar o domínio de produção (define `PUBLISH_ROOT_DOMAIN`/`APP_URL`; hoje os exemplos usam localhost e nenhum domínio é inventado).
2. Valores pendentes do `commercial-policy` (spec §3.1): créditos por plano, preços dos pacotes 50/150/400, custo por ação, franquias Pro/Business, hospedagem anual do Vitalício, benefícios white-label, comissão exata 15–20%.
3. Criar contas: Supabase, Stripe, Mercado Pago, Resend, Anthropic (ver docs/activation-checklist.md).

## Fase C — o que ficou de fora desta rodada

1. **Jornada E2E do briefing completo (8 módulos, ~20min)** não foi percorrida manualmente no navegador — só testada por unidade e via um módulo isolado. Antes de anunciar "modo completo" publicamente, rodar a jornada inteira uma vez.
2. **Upload de logo/imagens**: não existe `StorageProvider`. O editor manual hoje só edita texto, cor, tipografia e ordem — não troca imagens. Precisa de: adapter filesystem (dev) + Supabase Storage (prod), validação de MIME real/dimensões/tamanho (spec §16, limite 5MB), e um campo de imagem no `SECTION_FIELDS` do editor.
3. **Custo/crédito da edição por IA**: a UI hoje diz "sem cobrança nesta fase" — correto e honesto, mas fica pendente até o sistema de créditos (Fase D) existir para mostrar saldo/reserva real antes da operação.
4. **Conflito de edição concorrente**: a detecção via `baseVersionId` está no código mas nunca foi exercitada com duas abas abertas ao mesmo tempo — vale um teste manual ou automatizado.
5. **ImageProvider por IA**: os criativos Meta hoje usam só composição tipográfica (satori+resvg) sobre a paleta da página. Se um provedor de imagem por IA for adicionado depois, os criativos podem ganhar fundo fotográfico — não é bloqueio, é evolução.

## Fase D — receita (ordem interna)

1. Tabelas: orders, subscriptions, entitlement_grants, payments, webhook_inbox, credit_* (schema §4 da spec).
2. `PaymentProvider` Stripe (checkout + webhook verificado + inbox idempotente) → grants → `getWorkspacePlan` real (hoje sempre retorna Free).
3. Mercado Pago Pix avulso; reconciliação; downgrade/cancelamento (§3.2).
4. Sistema de créditos (Combustível): reserva/consumo/liberação atômicos — desbloqueia custo exibido na edição por IA e franquia real de criativos por plano.
5. Só então habilitar botões de contratação em /precos (hoje: "Contratação em breve" com motivo) e a franquia de criativos fora do modo dev.

## Dívidas técnicas conhecidas

- Testes de invariantes com banco (isolamento entre workspaces, concorrência da fila, dedup de criativos) — rodar contra PGlite in-memory no vitest.
- QA visual sistemático em 360/390/768/1024/1440 + teclado/contraste (spec §19.3) — feito apenas spot-check desktop e mobile na Fase B; editor e criativos ainda não passaram por QA visual dedicado.
- Lighthouse ≥95 nas páginas públicas — ainda não medido; registrar em docs/qa-report.md quando rodar.
- Rotas §6 ainda não criadas: /blog, /profissionais, /agencias, /contato, /cookies, /app/conta e afins — criar junto com as fases C–F.
- Renomear `verificar-email`/`recuperar-senha` (fluxos chegam com Supabase Auth ativo).
- Rate limiter é in-memory (single-node) — trocar por armazenamento compartilhado ao escalar para múltiplas instâncias.
