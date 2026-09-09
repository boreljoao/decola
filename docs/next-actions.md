# Decola — Próximas ações concretas

Checkpoint de 2026-09-09 (fim da Fase B + marketing da Fase E). Somente pendências reais; nada aqui transfere trabalho já autorizado e implementável — é a ordem de retomada.

## Decisões que só o negócio pode tomar (bloqueiam apenas o que dependem delas)

1. Registrar o domínio de produção (define `PUBLISH_ROOT_DOMAIN`/`APP_URL`; hoje os exemplos usam localhost e nenhum domínio é inventado).
2. Valores pendentes do `commercial-policy` (spec §3.1): créditos por plano, preços dos pacotes 50/150/400, custo por ação, franquias Pro/Business, hospedagem anual do Vitalício, benefícios white-label, comissão exata 15–20%.
3. Criar contas: Supabase, Stripe, Mercado Pago, Resend, Anthropic (ver docs/activation-checklist.md).

## Fase C — próxima frente de código

1. Briefing completo (8 módulos): estender `QUESTIONS` com os módulos restantes (identidade completa, público aprofundado, emoção com referências, visual com uploads, conteúdo/provas estruturadas, anúncios); modo `completo` já existe no schema.
2. Upload de logo/imagens: `StorageProvider` (filesystem dev + Supabase Storage) com validação de MIME real/dimensões.
3. Editor manual: texto inline, troca de imagem, tokens de cor, reordenação de seções — sempre criando novas `page_versions` (source `manual_edit`), separado do publicado.
4. Editor por IA: patch tipado sobre versão-base com custo exibido (exige sistema de créditos ou franquia dev).
5. Criativos: geração de copy Meta/Google a partir do PageDocument; export de imagem via composição tipográfica (sem ImageProvider ainda).

## Fase D — receita (ordem interna)

1. Tabelas: orders, subscriptions, entitlement_grants, payments, webhook_inbox, credit_* (schema §4 da spec).
2. `PaymentProvider` Stripe (checkout + webhook verificado + inbox idempotente) → grants → `getWorkspacePlan` real.
3. Mercado Pago Pix avulso; reconciliação; downgrade/cancelamento (§3.2).
4. Só então habilitar botões de contratação em /precos (hoje: "Contratação em breve" com motivo).

## Dívidas técnicas conhecidas

- `sentenceCase` no motor rebaixa maiúsculas de marca no meio do texto ("WhatsApp" → "whatsapp" dentro da seção solução) — preservar capitalização original após a primeira letra.
- Testes de invariantes com banco (isolamento entre workspaces, concorrência da fila) — rodar contra PGlite in-memory no vitest.
- QA visual sistemático em 360/390/768/1024/1440 + teclado/contraste (spec §19.3) — feito apenas spot-check desktop e mobile.
- Lighthouse ≥95 nas páginas públicas — ainda não medido; registrar em docs/qa-report.md quando rodar.
- Rotas §6 ainda não criadas: /blog, /profissionais, /agencias, /contato, /cookies, /app/conta e afins — criar junto com as fases C–F.
- Renomear `verificar-email`/`recuperar-senha` (fluxos chegam com Supabase Auth ativo).
