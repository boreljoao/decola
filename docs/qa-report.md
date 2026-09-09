# Decola — Relatório de QA

Data: 2026-09-09. Ambiente: Windows 11, Node v24.21.0, Next 16.3.4 (Turbopack), banco PGlite local, sem credenciais externas configuradas.

Regra deste documento (spec §19): **nenhum número aqui é estimado**. Cada linha registra um comando executado ou uma verificação feita no navegador. O que não foi medido está marcado como não medido.

## Gates automáticos

| Gate | Comando | Resultado |
|---|---|---|
| Lint | `npm run lint` | ✅ sem erros nem avisos |
| Tipos | `npx tsc --noEmit` (TypeScript estrito) | ✅ sem erros |
| Build de produção | `npm run build` | ✅ compila; 30 rotas geradas |
| Testes | `npx vitest run` | ✅ **51/51** em 6 arquivos |

Nenhuma regra de lint foi desligada e não há `any`, `@ts-ignore` ou cast amplo introduzido para esconder falha.

### Cobertura dos testes (o que cada arquivo prova)

| Arquivo | Testes | Invariante coberta |
|---|---:|---|
| `tests/rules-engine.test.ts` | 10 | Motor determinístico; **provas nunca inventadas**; inferências registradas em provenance; rejeição de `javascript:` e de documento incoerente |
| `tests/briefing-questions.test.ts` | 4 | Condicionais; resposta de pergunta oculta **não contamina** o briefing final; validação de telefone |
| `tests/validate-image.test.ts` | 9 | **SVG recusado** mesmo declarado como PNG; HTML disfarçado recusado; MIME por magic bytes; **EXIF removido** de JPEG |
| `tests/credits.test.ts` | 9 | `available = granted − consumed − expired − reserved`; **dois consumos concorrentes não gastam o mesmo saldo**; retry não cobra duas vezes; FEFO; recarga do mesmo período não duplica |
| `tests/payment-events.test.ts` | 8 | **Webhook repetido não duplica** direito/crédito; eventos distintos no mesmo pedido concedem uma vez; evento fora de ordem não rebaixa pedido pago; **retorno de checkout forjado não ativa plano**; reembolso revoga sem apagar conteúdo |
| `tests/statistics.test.ts` | 10 | **Experimento sem amostra nunca declara vencedor**; sem significância é inconclusivo; pontos percentuais ≠ variação relativa; guardrail de regressão |

Os testes de crédito e pagamento rodam contra **PGlite em memória aplicando as migrations reais** — o schema testado é o schema de produção.

## Jornadas verificadas de ponta a ponta no navegador

| Jornada | Resultado |
|---|---|
| Cadastro → workspace pessoal → dashboard | ✅ |
| Briefing rápido com autosave, condicionais e resumo editável | ✅ (indicador "✓ Salvo"; campo de WhatsApp apareceu só com o objetivo correspondente) |
| Geração: fila durável → 4 etapas persistidas → versão criada | ✅ |
| Preview desktop/mobile | ✅ |
| Editor manual: editar título → salvar versão 2 → preview atualizado | ✅ (salvar **não** publicou) |
| Publicação Free com slug e swap atômico | ✅ (republicação marcou a anterior como "Substituída") |
| Página pública em `studio-ana-lima.localhost:3000` | ✅ |
| Lead: envio → persistência → painel → e-mail pela fila | ✅ |
| Métricas: page_view / whatsapp_click / form_submit contados separadamente | ✅ |
| Criativos: fila → 4 PNGs reais (1080×1080 e 1080×1920) baixáveis | ✅ |
| Upload de imagem: PNG 800×600 aceito | ✅ |
| Asset privado antes de publicar, público depois | ✅ (403 sem cookie antes; 200 com cache imutável depois) |
| Equipe: limite de assentos do Free aplicado | ✅ |
| Conta: impacto de exclusão calculado com dados reais | ✅ |
| Admin negado sem privilégio, funcional com ele | ✅ |
| Candidatura de profissional persistida + e-mail | ✅ |
| Voo Contínuo: elegibilidade recusada com motivo real | ✅ (plano Free + 4 visitas) |
| Diário de Bordo sem tráfego | ✅ ("sem visitas no período — não há taxa a calcular") |

## Segurança verificada por tentativa de burla

Testes feitos enviando conteúdo malicioso contra as rotas reais:

| Tentativa | Resultado |
|---|---|
| SVG com `<script>` declarado como `image/png` | ❌ recusado (415) — "Arquivos SVG não são aceitos por segurança" |
| HTML com script salvo como `.jpg` | ❌ recusado (415) — formato não suportado |
| Arquivo vazio como PNG | ❌ recusado (415) |
| `GET /api/assets/<id>` sem cookie, asset não publicado | ❌ 403 |
| `GET /api/creatives/<id>` sem cookie | ❌ 403 |
| `/admin` sem privilégio de plataforma | ❌ acesso negado (tela legível, sem stack trace) |

O content-type declarado pelo cliente é ignorado: vale o conteúdo real do arquivo.

## QA visual e acessibilidade

Viewports inspecionados: **360, 390, 768 e desktop**. Sem overflow horizontal, sem sobreposição e sem truncamento crítico nas telas verificadas (home, preços, cadastro, briefing, editor, criativos, publicação, cobrança, equipe, conta, Diário de Bordo, página publicada).

### Auditoria de acessibilidade (executada no DOM real)

10 rotas auditadas: `/`, `/precos`, `/profissionais`, `/contato`, `/app`, `/app/cobranca`, `/app/equipe`, `/app/conta`, `/app/integracoes`, `/app/diario-de-bordo`.

**Resultado: 0 problemas** — nenhuma imagem sem `alt`, nenhum campo sem rótulo, nenhum botão ou link sem nome acessível, exatamente um `h1` por rota.

Três problemas foram **encontrados e corrigidos** nesta rodada:

1. `input[type=file]` do upload sem rótulo → passou a `aria-hidden` + fora da ordem de foco (o botão visível é o controle real).
2. Campo de item de lista no editor sem rótulo → ganhou `aria-label` com o nome da lista e o índice.
3. Dois `h1` no editor (o da página e o do preview) → o preview virou região rotulada "Pré-visualização da página em edição".

### Contraste (WCAG AA)

Todos os pares de cor calculados por luminância relativa:

| Par | Contraste | AA texto normal |
|---|---:|---|
| Texto principal no dashboard | 15.89:1 | ✅ |
| Texto secundário no dashboard | 7.53:1 | ✅ |
| Botão primário (branco sobre azul) | 6.11:1 | ✅ |
| Botão comercial (escuro sobre âmbar) | 9.12:1 | ✅ |
| Erro sobre branco | 5.35:1 | ✅ |
| Sucesso sobre branco | 5.29:1 | ✅ |
| Marketing: texto principal | 17.16:1 | ✅ |
| Marketing: texto secundário | 12.04:1 | ✅ |
| Marketing: texto terciário | 6.64:1 | ✅ |
| Marketing: texto de apoio (`mist-700`) | **3.34 → 4.92:1** | ✅ após correção |

Uma falha real foi encontrada e corrigida: `--color-mist-700` estava em 3.34:1 (reprovava AA para texto normal) e passou a `#73819f`, com 4.92:1.

Movimento respeita `prefers-reduced-motion` (via `MotionConfig reducedMotion="user"` e regra global no CSS).

## O que NÃO foi medido

Registrado explicitamente para não passar impressão errada:

- **Lighthouse / Core Web Vitals**: não executado. A meta da spec (≥95 e LCP ≤2,5s) permanece não verificada — exige ambiente de produção com domínio real.
- **Invariantes de concorrência sob Postgres real**: os testes rodam em PGlite, que serializa transações. A proteção contra reserva concorrente usa `pg_advisory_xact_lock`, correta para Postgres, mas **não exercitada com conexões paralelas reais**.
- **Fluxo de pagamento com provedor real**: Stripe e Mercado Pago têm adapters implementados e testes de contrato sobre eventos normalizados, mas nenhuma transação sandbox foi executada (sem credenciais).
- **Envio real de e-mail**: verificado apenas pelo transporte de desenvolvimento (`.data/outbox-emails`).
- **Publicação em domínio de produção com SSL/wildcard**: verificada apenas em `*.localhost`.
- **Jornada completa do briefing de 8 módulos** no navegador: o contrato está coberto por testes de unidade e o modo rápido foi percorrido inteiro, mas os 8 módulos não foram preenchidos manualmente de ponta a ponta.
- **Teste de conflito de edição com duas abas simultâneas**: a detecção existe no código (comparação de `baseVersionId`), sem exercício manual.

## Comandos para reproduzir

```bash
npm run lint
npm run typecheck
npm test
npm run build
```
