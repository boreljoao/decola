# DECOLA — PROMPT MESTRE DE EXECUÇÃO INTEGRAL

**Versão 2.0 · Produto, design, engenharia, IA, receita e operação**

Este documento substitui o megaprompt v1.0 e consolida o Documento Fundamental v2.1 em uma especificação executável. As decisões novas estão identificadas como decisões desta versão; valores comerciais ainda não definidos ficam configuráveis e bloqueiam apenas a venda correspondente, nunca todo o desenvolvimento.

**Como usar:** cole o documento inteiro na IA de desenvolvimento ou coloque-o no repositório como `DECOLA_MASTER_SPEC.md` e peça: “Execute integralmente esta especificação. Comece pela inspeção do projeto, registre as decisões e implemente as fases em sequência. Não encerre na etapa de planejamento”. O documento é autocontido; os arquivos originais podem ser anexados como contexto histórico.

---

# INÍCIO DO PROMPT

## 0. Missão e contrato de execução

Você é responsável pela implementação da **Decola**, uma plataforma brasileira que transforma um briefing profundo em uma landing page personalizada, criativos de anúncio e uma operação contínua de medição e melhoria.

Atue com o rigor combinado de liderança de produto, direção de arte, engenharia full-stack, engenharia de IA, qualidade e operação. **Entregue software funcional e conectado, com acabamento visual excepcional e critérios verificáveis.** Um plano, uma landing page isolada, telas estáticas ou adapters vazios não encerram esta tarefa.

A experiência completa é:

**Conhecer → cadastrar → responder → gerar página e anúncios → visualizar → ajustar → publicar → receber visitas e leads → medir → testar melhorias → acompanhar resultados → renovar ou ampliar o plano.**

### Regras de trabalho

1. Inspecione o repositório, instruções locais, dependências, infraestrutura disponível e alterações existentes antes de modificar. Preserve trabalho do usuário. Em projeto existente, adapte a arquitetura sem reescrever tudo por preferência pessoal.
2. Registre um plano e uma matriz de rastreabilidade; em seguida implemente. Tome decisões técnicas reversíveis autonomamente. Pergunte somente quando uma informação externa indispensável impedir uma ação concreta.
3. Execute em fases internas para controlar complexidade. Não peça autorização para passar de fase quando a implementação já estiver autorizada. Respeite os limites de acesso e publicação do ambiente.
4. Nenhuma funcionalidade pode ser considerada pronta só porque a UI existe. Conecte interface, autorização, validação, persistência, processamento, feedback, observabilidade e teste do comportamento relevante.
5. Não use TODOs, `setTimeout` de sucesso, saldos fictícios ou dados de demonstração como implementação de produção. Seeds e simuladores são permitidos exclusivamente em modo de demonstração explicitamente identificado.
6. Não invente credenciais, domínios, preços pendentes, clientes, depoimentos, métricas, resultados de testes ou disponibilidade de serviços. Não prometa que um prompt elimina dependências externas.
7. Se uma integração não puder ser ativada, implemente o adapter real até o limite possível, validação da configuração, testes de contrato com fixtures e instruções exatas para ativação. Marque-a como **implementada, aguardando configuração** ou **não implementada**, conforme a realidade. Continue as demais frentes.
8. Não simplifique silenciosamente requisitos centrais para caber em uma resposta. Se o contexto acabar, mantenha um checkpoint com arquivos, decisões, testes, pendências e próxima ação para retomar sem reconstruir.
9. Não faça compras, registre domínios, dispare campanhas ou publique anúncios como consequência implícita de construir o produto. A integração pode ficar pronta sem movimentar dinheiro real ou contatar terceiros durante o desenvolvimento.
10. A especificação orienta o produto; regras do ambiente, segurança e instruções explícitas do usuário continuam valendo.

### Definição de pronto

Cada requisito deve terminar em um destes estados: `verificado`, `implementado_sem_verificacao_externa`, `bloqueado_por_configuracao` ou `nao_implementado`. Para os três últimos, informe dependência, impacto e próxima ação. Não declare “100% pronto para produção” enquanto existir bloqueio em um caminho comercial habilitado.

## 1. Produto, posicionamento e decisões de escopo

### 1.1 Essência

- Público inicial: pequenos negócios brasileiros de estética e beleza, saúde, serviços locais, gastronomia e infoprodutores iniciantes.
- Diferenciais: briefing profundo, composição original com biblioteca proprietária, página e anúncios coerentes, ajustes simples, integração com WhatsApp e Pix, melhoria contínua baseada em dados.
- Uma landing page tem **um objetivo primário**: WhatsApp, lead, agendamento, compra ou download.
- A Decola reduz a necessidade de o cliente aprender design. Nunca promete vendas garantidas ou melhora mensal inevitável.
- Marca: confiante, direta, brasileira e compreensível por quem cuida de um negócio.
- Vocabulário: publicar = **Decolar**; otimização = **Voo Contínuo**; relatório = **Diário de Bordo**; créditos = **Combustível**. Sempre que necessário, acompanhe a metáfora com a função concreta.
- Manifesto: “Você não precisa aprender design. Você precisa ser bem perguntado. E nunca mais voar sozinho depois da decolagem.”

### 1.2 Decisões explícitas desta versão

| Tema | Decisão executável |
|---|---|
| Gerador | Faz parte do produto. Implementar briefing → IA → documento estruturado → render → preview. Eliminar a exclusão do gerador presente no v1. |
| Free | Adotar a visão do Documento Fundamental: 1 página publicada em subdomínio, com marca Decola, sem domínio próprio nem Voo Contínuo. O upgrade acontece ao remover marca, conectar domínio ou acessar recursos pagos; não ao tentar a primeira publicação gratuita. |
| Criativos | Incluídos no escopo funcional inicial, com Meta como primeira saída de imagem e copy. Google recebe anúncios de texto adequados ao formato; TikTok não pode receber um PNG apresentado como vídeo pronto. |
| Voo Contínuo | Implementar coleta, elegibilidade, hipótese, variante, experimento e relatório. Sem tráfego suficiente, mostrar “aguardando dados”; nunca simular melhoria. |
| Editor manual | Entregar texto, imagem, cores e ordenação de seções; não um canvas genérico de design. |
| Marketplace | Entregar candidatura, aprovação, catálogo, solicitação, proposta, contratação, entrega e avaliação. Pagamento intermediado só fica disponível com provedor e fluxo de repasse compatíveis e configurados. |
| Business e Agência | Modelar recursos avançados e construir os fluxos descritos. Enquanto um benefício anunciado estiver indisponível, vender sob consulta ou ocultar a contratação automática. |
| Vitalício | Licença de uma página estática por R$ 297, com hospedagem anual separada. Não significa hospedagem eterna gratuita. Checkout depende de definir e exibir o custo anual e as condições. |
| Infraestrutura | Aplicação modular única e workers duráveis; não criar microserviços e monorepo apenas para aparentar escala. |

Essas decisões substituem trechos contraditórios do megaprompt anterior. O roadmap histórico não autoriza deixar como placeholder uma capacidade que esta versão manda implementar. As entregas avançadas podem ser habilitadas após seus próprios critérios de aceite, sem bloquear o núcleo já verificado.

## 2. Arquitetura e decisões técnicas

Para projeto novo, adote:

- Next.js com App Router, React e TypeScript estrito; escolha versões estáveis mutuamente compatíveis e fixe-as no lockfile. Consulte a documentação oficial antes de integrar SDKs; não use exemplos obsoletos por memória.
- Tailwind, tokens CSS centralizados, componentes acessíveis e Motion/Framer Motion para movimentos pontuais. Evite dependências redundantes.
- Supabase PostgreSQL, Supabase Auth e Storage. Drizzle para schema, migrations e queries parametrizadas no servidor. Se o projeto já tiver Prisma corretamente implantado, preserve-o.
- Sessões administradas pelo servidor com cookies seguros e fluxo compatível com o SDK escolhido; não exponha tokens de sessão em localStorage. Não implemente um segundo banco de senhas: autenticação e recuperação pertencem ao provedor.
- Stripe para cartão e assinatura; Mercado Pago para Pix avulso. Modele recorrência Pix apenas se uma capacidade real do provedor e da conta for validada; caso contrário, renovação por nova cobrança com comunicação explícita.
- Resend para e-mails transacionais, Sentry para erros e tracing, logs estruturados com redaction.
- Fila durável com retries, deduplicação e agendamento: escolha um serviço compatível com a infraestrutura, como Inngest ou Trigger.dev, e implemente um adapter único. Não rode geração longa dentro do tempo de uma requisição web nem use tarefa solta em memória como fila.
- LLM, imagem e transcrição por interfaces server-side com um provedor real inicial para cada capacidade necessária; modelos, limites e timeouts configurados fora da UI.
- Vercel para a aplicação quando compatível com o ambiente. Publicação de páginas por `PublishingProvider`, com DNS/SSL e CDN verificados. Em infraestrutura imposta pelo projeto, use o mecanismo suportado e documente adaptações.

### 2.1 Módulos

Estruture `src/app`, `src/components/ui`, `src/features/{auth,onboarding,briefing,generation,pages,editor,creatives,publishing,analytics,experiments,billing,credits,marketplace,admin}`, `src/server/{db,auth,jobs,integrations,security}`, `src/config`, `emails`, `tests` e `docs`.

Cada feature separa apresentação, schemas, domínio e acesso a dados. Route handlers e ações de servidor são finos. Regra de negócio vive em serviços testáveis. Imports de segredos e SDKs administrativos devem ser `server-only`. Divida por responsabilidade, sem limites arbitrários de linhas que fragmentem a leitura.

### 2.2 Fronteiras obrigatórias

- `PaymentProvider`: capabilities, checkout, consulta, cancelamento, reembolso, verificação de webhook e normalização de eventos.
- `GenerationProvider`: resposta estruturada, estimativa/registro de uso e classificação de falhas.
- `ImageProvider` e `TranscriptionProvider`: geração/transcrição, status, cancelamento quando suportado e artefato persistido.
- `JobProvider`: enfileirar, agendar, deduplicar, retentar, consultar e cancelar logicamente.
- `PublishingProvider`: publicar versão, consultar status, reverter, despublicar, verificar domínio e certificado.
- `EmailProvider`: renderizar/enviar, deduplicar e tratar resultado.
- `IntegrationProvider`: conectar, validar, desconectar, enviar dados e registrar tentativas.

Adapters retornam resultados tipados, erros classificáveis e capabilities. Não suponha que todos os provedores suportam parcelamento, recorrência, split ou estorno parcial.

## 3. Fonte única de regras comerciais

Crie catálogo versionado de produtos e entitlements. UI, checkout, autorização, workers e relatórios devem consultar a mesma regra. Registre no pedido um snapshot imutável da oferta aceita. Preços em centavos BRL; datas em UTC e apresentação em pt-BR/America-Sao_Paulo.

| Plano | Preço de referência | Direitos mínimos |
|---|---:|---|
| Free | R$ 0 | 1 página publicada, subdomínio, marca Decola, preview, editor manual básico e franquia de teste configurável. |
| Start | R$ 49/mês | 1 página, domínio próprio, sem marca, Voo Contínuo elegível por tráfego, 2 criativos/mês e créditos mensais configuráveis. |
| Pro | R$ 129/mês | Até 5 páginas, recursos Start, A/B avançado, relatórios e prioridade; franquias adicionais configuráveis. |
| Business | R$ 349/mês | Sem limite comercial de quantidade de páginas, com limites técnicos antiabuso transparentes; multiusuário, white-label parcial e API. |
| Agência | Sob consulta | Revenda e gestão de clientes; contratação comercial até definição de contrato e preço. |
| Vitalício | R$ 297 único | 1 licença de página estática; hospedagem anual separada, sem otimização ou recarga mensal. |

### 3.1 Valores ainda não decididos pelo negócio

As fontes não definem quantidade de créditos por plano, preço dos pacotes 50/150/400, custo de cada ação, franquias extras do Pro/Business, valor anual da hospedagem, benefícios completos do white-label nem comissão exata entre 15% e 20%.

Represente essas decisões em `commercial-policy` com `draft/approved`, campos tipados e validação. Forneça fixtures explícitas para demo e testes. **Não invente números como se fossem decisões do fundador.** Em produção, desabilite somente a oferta cujo preço ou benefício essencial esteja incompleto, explique a indisponibilidade e mantenha operantes os demais fluxos.

### 3.2 Cobrança e direitos

- Anual, se habilitado: 10 vezes a mensalidade por 12 meses; Start R$ 490, Pro R$ 1.290, Business R$ 3.490. Mostrar total cobrado e equivalente mensal, sem confundir cobrança anual com parcelamento.
- Cartão recorrente e Pix de período pré-pago concedem o mesmo direito pelo período quitado, mas têm ciclos de cobrança distintos.
- Upgrade: mostrar prévia real do valor e prorrata quando suportada. Downgrade e cancelamento: efetivos no fim do período pago por padrão, com confirmação clara.
- Atraso: política configurada de tolerância de 7 dias como default técnico desta versão; suspenda novos jobs pagos durante inadimplência, comunique impacto e não apague conteúdo.
- Fim dos direitos pagos: preservar rascunhos; permitir selecionar a página elegível para Free, recolocar marca e remover benefícios pagos. Não manter domínio próprio ativo indefinidamente sem direito. Mostrar antes do downgrade quais páginas serão pausadas.
- Reembolso e chargeback: recalcular direitos e créditos associados com eventos compensatórios; conteúdo não é apagado automaticamente.
- Limites contam recursos definidos explicitamente: páginas publicadas, jobs simultâneos, armazenamento e assentos. Não contar versões como novas páginas.
- Vitalício deve ser um grant/licença separado da assinatura, permitindo ao mesmo workspace possuir ambos.

## 4. Modelo de dados e isolamento

Use `workspace` como fronteira de propriedade desde o início. Cadastros individuais ganham workspace pessoal; equipes usam o mesmo modelo. Separe perfil comercial, papel no workspace e privilégio administrativo.

| Domínio | Entidades mínimas |
|---|---|
| Identidade | `profiles`, `workspaces`, `memberships`, `invitations`, `consents` |
| Produto | `projects`, `briefings`, `briefing_revisions`, `assets`, `generation_jobs`, `generation_steps` |
| Páginas | `pages`, `page_versions`, `publication_deployments`, `domains`, `page_redirects` |
| Biblioteca | `component_definitions`, `component_versions`, `component_embeddings`, `component_performance` |
| Criativos | `creative_sets`, `creative_versions`, `creative_assets` |
| Receita | `product_catalog_versions`, `orders`, `order_items`, `subscriptions`, `entitlement_grants`, `payments`, `refunds`, `webhook_inbox` |
| Créditos | `credit_accounts`, `credit_lots`, `credit_reservations`, `credit_ledger` |
| Promoção | `coupons`, `coupon_reservations`, `coupon_redemptions`, `waitlist` |
| Medição | `analytics_events`, `analytics_daily`, `leads`, `experiments`, `experiment_variants`, `experiment_assignments`, `monthly_reports` |
| Marketplace | `professional_profiles`, `applications`, `service_requests`, `proposals`, `contracts`, `deliveries`, `reviews`, `disputes`, `payouts` |
| Operação | `integration_connections`, `outbox_events`, `email_deliveries`, `audit_log`, `privacy_requests`, `api_keys` |

### Invariantes

- Toda entidade privada tem `workspace_id` e relações que impedem vinculação a recursos de outro workspace; use constraints compostas quando apropriado.
- `profiles.id` referencia a identidade do Auth; não duplique `password_hash`.
- Papéis: owner, admin do workspace, editor e viewer. Profissional é perfil aprovado com acesso por contrato, não superusuário. Admin da plataforma é privilégio separado, auditado e protegido por MFA.
- RLS e políticas de Storage testadas. ORM com conexão privilegiada pode contornar RLS: adote contexto de usuário suportado ou camada obrigatória de autorização e transações com contexto explícito. Não diga “RLS protege” quando a conexão utilizada faz bypass.
- Chave de serviço fica restrita a operações autorizadas de backend. Dashboard nunca consulta tabelas de cobrança, grants ou ledger com permissão arbitrária de escrita.
- UUID não é controle de acesso. Valide workspace e papel no servidor em cada operação, inclusive exportação, download, jobs, preview e ações administrativas.
- Índices por FKs e padrões reais de consulta; paginação no servidor; unicidade de host/slug, evento de provedor, concessão por período e chave de operação.
- Ledger financeiro e de créditos é append-only. Corrigir com reversões referenciadas, nunca editar histórico.
- `created_at`, `updated_at`, versões e autoria em entidades mutáveis. Soft delete não substitui exclusão/anonimização efetiva quando prevista.

## 5. Design: excelência visual com linguagem própria

### 5.1 Direção de arte

Crie a sensação de **clareza, energia e controle**. A Decola deve ter uma assinatura visual reconhecível na página se formando diante do usuário, na trajetória do projeto e no produto mostrado em escala real.

- Marketing: fundo céu noturno `#0A0E1A`, superfícies frias, azul elétrico para interação, âmbar para ação comercial. Use cores finais ajustadas ao contraste.
- Dashboard: fundo claro, superfícies bem delimitadas, texto escuro, hierarquia limpa e cor reservada para status/ação.
- Títulos em Sora ou Space Grotesk, corpo em Inter; no máximo duas famílias, fontes locais, pesos limitados e números tabulares.
- Tokens semânticos de cor, tipografia, espaço, radius, elevação, foco, motion e breakpoints. Não distribua hexadecimais e estilos conflitantes pelo projeto.
- Grid de 12 colunas em desktop, 8 em tablet, 4 em mobile. Container máximo entre 1200–1280 px; gutters responsivos; tipografia fluida com limites.
- Navegação, margens e alinhamentos devem resistir a textos longos em português, preços maiores e nomes de empresa reais.
- Use metáfora de voo com parcimônia: trajetórias finas, avanço e luminosidade. Evite foguetes e emojis em todo elemento, glassmorphism excessivo e repetição de cards sem necessidade.

### 5.2 Composição da home

1. Navbar sticky discreta: Como funciona, Exemplos, Preços, Profissionais, Blog; Entrar e Decolar grátis. Menu mobile acessível, sem esconder o CTA principal.
2. Barra promocional somente com campanha ativa e validade real; fechar persiste a preferência. Nunca contador reiniciado por visitante.
3. Hero assimétrico: mensagem direta à esquerda e uma demonstração legível do produto à direita. Título sugerido: **“Seu negócio pronto para receber clientes. Da primeira pergunta à página no ar.”** Sub: “Transforme o que você sabe sobre o seu negócio em uma página e anúncios com a sua identidade. Depois, acompanhe o que funciona e continue melhorando.”
4. CTA principal “Decolar grátis”; secundário “Ver uma página nascendo”. O slogan histórico pode aparecer como assinatura de marca, sem promessa mensurável de vendas garantidas.
5. Demonstração: mostrar briefing, composição de uma landing page e criativos alinhados. Demo identificada, navegável e feita com componentes reais do produto. Sem modal vazio ou vídeo inexistente.
6. Dor: comunicação concreta sobre custo, demora e dificuldade de transformar ideias em uma página. Não publicar as estatísticas do documento estratégico sem verificar fonte, data e recorte.
7. Como funciona: responder, visualizar/ajustar, publicar/acompanhar; cada etapa mostra UI e resultado.
8. Briefing como diferencial: exemplos de perguntas sobre oferta, percepção e público, com explicação visual do impacto na página.
9. Exemplos por nicho: páginas completas com personalidades diferentes; exemplos fictícios sinalizados como demonstração e sem depoimentos inventados.
10. Página + anúncio: apresentar as duas peças lado a lado e evidenciar coerência da campanha.
11. Voo Contínuo: explicar observar → formular hipótese → testar → manter ou reverter. Não insinuar melhora sem dados.
12. Ajustes por IA, manualmente ou com profissional; CTAs coerentes com o que está ativo.
13. Preços resumidos, FAQ e CTA final. Usar “Recomendado para começar” no Start; “Mais escolhido” somente com evidência real.
14. Footer com links funcionais, contato verdadeiro e dados da empresa quando fornecidos. Ausência de dados não autoriza inventar CNPJ, endereço ou certificação.

### 5.3 Movimento e interação

Hero monta uma página com transform/opacity, sem bloquear renderização; pausar fora da viewport e limitar repetição. Reveal real só acompanha etapas concluídas. `prefers-reduced-motion` recebe composição estática elegante. Transições rápidas, foco preservado e skeletons que não deslocam layout.

Todo componente contempla: padrão, hover, foco, disabled, loading e erro quando aplicável. Toda tela contempla: vazio, preenchido, carregando, falha, acesso negado e recurso indisponível. Estados vazios orientam a próxima ação com texto específico.

## 6. Mapa de rotas e navegação

| Área | Rotas mínimas | Responsabilidade |
|---|---|---|
| Marketing | `/`, `/como-funciona`, `/exemplos`, `/exemplos/[slug]`, `/precos` | Explicar, demonstrar e converter. |
| Conteúdo | `/blog`, `/blog/[slug]` | MDX confiável, busca/listagem, metadata e conteúdo editorial verdadeiro. |
| Comercial | `/profissionais`, `/agencias`, `/contato` | Candidaturas e solicitações persistidas, com retorno ao usuário. |
| Legal | `/termos`, `/privacidade`, `/cookies` | Políticas coerentes com o produto e preferências de privacidade. |
| Auth | `/entrar`, `/cadastro`, `/verificar-email`, `/recuperar-senha`, `/redefinir-senha`, callback OAuth | Fluxos completos, incluindo expiração e falha. |
| App | `/app`, `/app/paginas`, `/app/criar` | Resumo e próxima ação; onboarding evita dashboard vazio. |
| Projeto | `/app/paginas/[id]/briefing`, `/geracao`, `/preview`, `/editor`, `/criativos`, `/publicacao`, `/metricas`, `/experimentos`, `/leads` | Usar o prefixo completo do projeto para cada subrota. |
| Conta | `/app/combustivel`, `/app/cobranca`, `/app/equipe`, `/app/integracoes`, `/app/conta`, `/app/diario-de-bordo` | Gestão persistente de consumo, membros e operação. |
| Marketplace | `/app/marketplace`, `/app/marketplace/solicitacoes/[id]` | Descoberta, negociação, contrato e entrega. |
| Profissional | `/pro`, `/pro/projetos/[id]`, `/pro/financeiro` | Trabalho atribuído e repasses autorizados. |
| Admin | `/admin` e subrotas por domínio | Gestão de usuários, catálogo, geração, pagamentos, profissionais, privacidade e auditoria. |
| Público gerado | Host de publicação + slug/domínio verificado | Somente versão publicada; sem acesso ao estado privado do app. |

Proteja rotas no servidor. Middleware ajuda navegação, mas não é a única autorização. Preserve destino de retorno de forma validada contra open redirect. Não crie links `#` ou itens que não levam a lugar algum.

## 7. Onboarding e briefing completo

### 7.1 Entrada

Decolar grátis → cadastro por e-mail/senha, Google ou magic link → verificação conforme provedor → workspace → escolha do nicho e modo → briefing. Preserve a intenção e o rascunho quando a sessão expirar. Não crie páginas duplicadas a cada retomada.

Implementar salvamento automático com debounce, indicador “salvo”, retry e controle de versão; voltar de etapa não perde respostas. Dados sensíveis do briefing não ficam em localStorage por padrão. Falha de rede deve preservar o que ainda está em memória e comunicar o que não foi salvo.

### 7.2 Contrato de perguntas

Cada pergunta contém `id`, módulo, label, ajuda, tipo, opções, validação, condição de exibição, obrigatoriedade por modo e uso no motor. Respostas registram origem `user`, `transcribed` ou `inferred`; inferências ficam visíveis para confirmação. Campo oculto por mudança de nicho não pode contaminar o briefing final.

| Módulo | Campos e comportamento |
|---|---|
| 1. Identidade | Nome do negócio obrigatório; slogan opcional; logo opcional; história curta; tom sério↔divertido e popular↔premium. Sem logo, gerar tratamento tipográfico, sem alegar registro de marca. |
| 2. Oferta | Tipo de negócio, o que vende, oferta única da página, preço e condição de exibição, diferenciais verificáveis, garantias reais, área atendida e restrições. Não inventar desconto ou garantia. |
| 3. Público | Cliente ideal, dor principal, desejo, objeções, tentativas anteriores e consciência da solução. Perguntas com exemplos específicos por nicho. |
| 4. Emoção | Até 3 emoções ordenadas, prioridade visual do hero, intensidade de movimento, até 3 referências admiradas e 3 rejeitadas com justificativa. URLs são opcionais e não devem provocar scraping inseguro. |
| 5. Visual | Cores existentes ou escolha da IA, claro/escuro, exemplos de tipografia, densidade, imagens próprias/banco/IA e preferências de enquadramento. Registrar origem e licença dos assets. |
| 6. Conteúdo | Seções sugeridas, reordenação inicial, autoridade verificável, provas reais, perguntas frequentes, dados de contato e informações institucionais. Prova ausente implica omissão ou alternativa factual. |
| 7. Conversão | Objetivo primário, texto do CTA, WhatsApp, campos de formulário, link de agenda/checkout/download, localização, domínio e IDs de integrações. Validar cada destino conforme objetivo. |
| 8. Anúncios | Plataformas, objetivo, orçamento aproximado opcional, gestor atual, oferta e restrições de comunicação. Selecionar formatos realmente suportados e gerar copy compatível. |

Modo rápido: pedir nome, nicho, oferta, público/dor, diferencial, objetivo/destino do CTA e preferência visual. As demais respostas podem ser inferidas como sugestões, exceto preços, provas, contatos, credenciais e condições comerciais. Modo completo percorre os oito módulos; estimativas de 5/20 minutos são orientação, não cronômetro obrigatório.

Áudio por pergunta: consentimento de microfone, gravar/parar/ouvir/descartar, limite configurado, upload privado, transcrição assíncrona, revisão antes de aceitar. Permissão negada ou falha mantém a entrada por texto plenamente funcional. Defina expiração do áudio e possibilidade de exclusão.

### 7.3 Antecipação de geração

Pré-processar apenas quando houver informação suficiente e orçamento de uso. Cada job referencia a revisão do briefing e seu hash. Resposta nova invalida resultados incompatíveis. Jobs preliminares não publicam, não sobrescrevem a versão atual e não cobram novamente pelo mesmo trabalho.

Ao finalizar, valide pendências e exiba resumo editável. Inicie ou aproveite geração consistente com a revisão final. Progresso apresenta etapas reais; se exceder a estimativa, explique e permita sair/retomar. O reveal começa quando o documento necessário está válido e renderizável.

## 8. Motor de geração: IA decide, renderer monta

### 8.1 Pipeline persistente

`validar briefing → sintetizar estratégia → selecionar componentes → gerar conteúdo → compor tokens → produzir assets/criativos → validar documento → renderizar → revisar qualidade → disponibilizar preview`.

Cada etapa registra input hash, versão de prompt/modelo, duração, custo/uso, tentativas, output tipado e erro sanitizado. Retry exponencial com jitter apenas para falhas transitórias, número máximo e fila de falhas inspecionável. Reexecução reutiliza etapas válidas. Locks/leases impedem workers concorrentes de finalizar a mesma etapa duas vezes.

### 8.2 Documento de página

Defina schema Zod versionado para `PageDocument`, incluindo:

- `schemaVersion`, `pageId`, `briefingRevisionId`, `locale`, `strategy`;
- `designTokens`: cores semânticas, fontes permitidas, densidade e estilo;
- `seo`: título, descrição, OG, indexação;
- `sections[]`: id estável, tipo permitido, versão do componente, props tipadas, referências a assets;
- `primaryConversion`: tipo, destino validado e rótulo;
- `integrations`: referências a configurações autorizadas, sem segredos;
- `provenance`: campos confirmados/inferidos, origem de assets e versões do motor.

Não execute JavaScript, JSX ou HTML arbitrário do LLM. O renderer usa catálogo de componentes permitido, com props validadas. Links aceitam protocolos seguros. Rich text tem schema restrito. JSON inválido recebe reparo limitado, seguido de falha explicada se persistir.

### 8.3 Biblioteca proprietária

Criar componentes do zero, responsivos e testáveis, com metadados de função, nicho, emoções, densidade, contraste, compatibilidade e versão. Implemente os dez tipos-base: hero, dor, solução, benefícios, prova, autoridade, oferta, FAQ, contato/localização e CTA final.

Meta inicial: pelo menos 50 composições demonstráveis, cobrindo 5 nichos × 10 funções, com variantes estruturais reais e reuso consciente. Não duplique arquivos apenas para inflar a contagem; registre cobertura. Ampliação para ~150 componentes é evolução do catálogo, sem falsificar quantidade entregue.

Seleção inicial usa regras/afinidade e diversidade. Embeddings ajudam busca semântica quando configurados. Ranking por conversão só entra com amostra suficiente, contexto comparável e proteção contra viés. Sem dados, não apresente score heurístico como performance comprovada.

Auditoria de similaridade compara assinatura estrutural/visual e conteúdo dentro do catálogo disponível. Se muito próxima, variar estrutura e composição. Isso reduz repetição; não garante unicidade mundial nem substitui análise de direitos autorais.

### 8.4 Segurança e qualidade de IA

Briefing, anexos e sites de referência são dados não confiáveis, nunca instruções de sistema. Não permitir que conteúdo do usuário invoque ferramentas, exponha segredos ou altere cobrança/autorização. Fetch de referência deve impedir SSRF, IPs privados, metadata endpoints, redirects perigosos e respostas excessivas.

Antes do preview, verificar: schema, links/CTA, texto completo, ausência de prova inventada, contraste, assets acessíveis, layout mobile e ausência de overflow. Copy para nichos regulados evita garantias de resultado e passa por confirmação do usuário; não afirme conformidade jurídica automática.

Falha de imagem não pode ser escondida: use asset autorizado existente ou composição tipográfica e sinalize o resultado. Não cobrar por um criativo de imagem entregue apenas como descrição textual.

## 9. Reveal, preview e edição

Reveal apresenta o resultado real; pode animar sua entrada, mas não mascarar um job ainda incompleto. Permitir pular animação, visualizar desktop/mobile, abrir preview isolado e seguir para ajustar/publicar.

Preview privado por sessão ou token assinado, revogável e com expiração; `noindex`. Não indexar briefings, rascunhos ou dados de clientes. Usar origem separada para conteúdo publicado e isolamento de iframe adequado, sem liberar permissões desnecessárias.

### Editor manual

- Texto inline com controles acessíveis e painel alternativo.
- Substituir imagem, crop/foco, alt text e biblioteca do projeto.
- Alterar tokens de cor e tipografia dentro de combinações suportadas.
- Adicionar/remover seções permitidas, reordenar com drag-and-drop e alternativa por teclado.
- Undo/redo local, autosave, revisões persistentes e aviso de conflito entre abas/usuários.
- Estado de edição separado da versão publicada; salvar não publica.

### Editor por IA

Chat contextual: “troque o título”, “deixe mais clean”, “destaque o WhatsApp”. Exibir escopo, custo estimado e saldo antes da operação cobrada. Mudanças geram patch tipado sobre uma versão-base; alterações concorrentes provocam rebase seguro ou conflito explícito.

Mostrar comparação antes/depois e permitir aplicar/descartar. Edição global é distinguida da alteração de uma seção. Não mudar preços, provas, garantias e destinos de pagamento por inferência silenciosa. Registrar histórico e permitir restaurar versões.

Definir quando o crédito é consumido: ao entregar proposta válida, se essa for a política exibida; descartar uma proposta válida não é falha técnica. Erro do motor libera a reserva sem cobrança. Nunca deixar essa regra implícita.

## 10. Criativos e campanha

Gerar 2–3 propostas iniciais coerentes com a página, respeitando a franquia aplicável. Cada proposta inclui objetivo, conceito, copy, headline, CTA e asset final quando o formato exigir.

- Meta: entregar formatos configurados e validados na documentação vigente; suportar inicialmente quadrado e vertical, área segura, preview e download individual/pacote.
- Google: saída textual estruturada com limites de campo verificados, variantes e URL de destino; não fingir que uma imagem equivale a campanha de pesquisa.
- TikTok/vídeo: se não houver adapter real, oferecer roteiro identificado como roteiro; geração de vídeo fica indisponível, sem promessa de asset pronto.
- Versionar criativos e vínculo à versão da página. Mudança de oferta alerta que anúncios existentes podem estar desatualizados.
- Exportar arquivos reais, nomes consistentes, metadados básicos e copy copiável. Remover metadados privados dos assets públicos.
- Não publicar em contas de anúncios nem gastar orçamento automaticamente. “Pronto para baixar” e “campanha publicada” são estados diferentes.

## 11. Publicação, domínios e formulários

### 11.1 Deploy por versão

`draft → ready → publishing → live`, com `publish_failed`, `paused` e `archived` tratados. Estado da página é separado do estado de geração.

Publicar cria deployment de versão imutável, verifica entitlement, reserva slug, constrói artefato e faz troca atômica da versão ativa somente após sucesso. Falha mantém a publicação anterior. Permitir rollback, despublicação e republicação idempotentes.

Nunca usar host arbitrário para consultar qualquer tenant. Domínio é normalizado e resolvido por mapeamento verificado. Evitar colisões, takeover de domínio removido e cache compartilhado entre tenants. HTML público inclui apenas conteúdo aprovado, nunca briefing integral ou dados internos.

### 11.2 Domínio próprio

Validar hostname, comprovar propriedade por DNS, mostrar registros reais fornecidos pelo provedor, monitorar propagação, emitir SSL e mostrar falha acionável. Domínio só ativa após verificação e certificado válido. Configurar canonical, redirecionamento entre hosts e cache. Não afirmar “configuramos tudo” quando o usuário ainda precisa editar DNS externo.

Estados: `pending_verification`, `verified`, `ssl_pending`, `active`, `failed`, `detached`. Ao remover, revogar associação antes de reutilização e orientar limpeza de DNS. Serviço de configuração assistida entra pelo marketplace.

### 11.3 Conversão real

- WhatsApp: normalizar telefone, validar DDI, codificar mensagem e registrar **clique no WhatsApp**. Só chamar de conversa iniciada quando uma integração autorizada confirmar isso.
- Formulário: validação server-side, antispam, persistência privada em `leads`, retorno claro de sucesso/falha, deduplicação de submissão e notificação com outbox. Nunca considerar sucesso só porque um e-mail foi tentado.
- Compra: destino HTTPS validado para checkout do próprio cliente ou integração explicitamente conectada. Pagamentos dos consumidores da landing page são separados da assinatura Decola; não receba suas vendas na conta da plataforma por acidente.
- Agendamento/download: URLs ou arquivos autorizados, estados de indisponibilidade e eventos apropriados.
- Leads: lista, detalhe, status novo/em atendimento/concluído, exportação CSV autorizada e política de retenção. Dados de formulário nunca viram evento público de analytics.

## 12. Pagamentos, webhooks, cupons e Combustível

### 12.1 Fluxo financeiro

`checkout solicitado → pedido pending → checkout/QR criado → confirmação confiável → payment paid → grants/créditos → e-mail`.

O cliente envia produto, não preço final. O servidor calcula oferta, elegibilidade, imposto/configuração quando aplicável e desconto. Idempotency key por intenção de compra impede duplicação; webhook inbox com `(provider,event_id)` único impede concessão repetida. São controles distintos.

Checkout retorna a estado “confirmando” até o servidor verificar pagamento. Query string de sucesso nunca libera benefício. Pix inclui QR real, copia e cola, validade, polling com backoff, reconexão e botão de atualizar status; expiração é confirmada com o provedor, sem apagar eventos tardios.

Verifique assinaturas conforme documentação do provedor, usando corpo original quando requerido. Grave evento validado duravelmente e responda rápido; se não conseguir persistir, retorne falha recuperável para retry. Worker normaliza, consulta o provedor quando necessário e aplica transação. Trate duplicados, eventos fora de ordem, estornos parciais/totais e reconciliação periódica.

Não conceda cartão parcelado automaticamente porque há Stripe. Renderize apenas métodos e condições suportados pela conta e pela modalidade contratada. Nota fiscal não é recibo de pagamento: sem emissor fiscal integrado, não afirmar emissão de NFS-e automática.

### 12.2 Créditos

Créditos são inteiros. `available = granted - consumed - expired - reserved`, reconciliado por ledger e lotes. Reserva atômica antes de job pago, confirmação após entrega válida, liberação após falha/cancelamento elegível; o mesmo job nunca consome duas vezes.

- Lotes distinguem teste, assinatura, compra e bônus.
- Default desta versão: assinatura expira ao fim do ciclo, compra não expira, teste é concedido uma vez; exibir regras e permitir política comercial aprovada substituir defaults.
- Reservar primeiro lotes que expiram antes. Definir tratamento de reserva que cruza o vencimento e limitar sua duração.
- Recarga mensal única por período; plano anual pode conceder mensalmente sem entregar 12 meses de crédito na primeira cobrança.
- Reembolso de pacote já usado não cria saldo disponível negativo silencioso: registre débito compensatório/pendência e bloqueie novo consumo até resolução conforme política.
- Histórico mostra operação, data, quantidade, job/pagamento associado e status, sem expor custo secreto do provedor ao cliente.
- Custo máximo por job, limites de concorrência, teto diário e alertas protegem a economia. “Ilimitado” nunca significa chamadas de IA ilimitadas.

### 12.3 Cupons

Percentual, valor fixo e trial apenas onde suportado. Escopo de produto, moeda, prazo, limite global, uma utilização por cliente/workspace segundo política, primeira compra e combinação explicitamente definidos. Normalizar código e rate-limit de tentativas.

Reserva transacional com expiração no checkout impede ultrapassar limite por concorrência. Confirmar resgate após pagamento; liberar reserva em falha/expiração. Por padrão, reembolso não restaura automaticamente uma promoção de uso único. Preço e countdown derivam da mesma campanha no servidor.

## 13. Analytics, experimentos e Diário de Bordo

### 13.1 Eventos e definições

Contrato versionado: `page_view`, `cta_click`, `whatsapp_click`, `form_submit_success`, `outbound_checkout_click`, `booking_click`, `download_success`. Eventos têm id deduplicável, página e versão publicadas, timestamp validado, sessão pseudônima quando consentida, origem/UTM sanitizada e variante atribuída quando houver.

Minimizar IP e user-agent; hash não torna dado automaticamente anônimo. Não registrar texto do formulário, telefone, e-mail ou query strings arbitrárias em eventos. Remover bots óbvios, limitar ingestão e separar tráfego de preview/admin. Sem cookies opcionais quando rejeitados; não usar fingerprinting para contornar a escolha.

Exibir visitas, visitantes/sessões quando mensuráveis, cliques e leads confirmados como métricas distintas. Definir taxa: sessões elegíveis com ao menos uma conversão primária / sessões elegíveis. Evitar múltiplos cliques inflando conversão. Compra só é conversão confirmada com evento confiável de checkout integrado.

### 13.2 Voo Contínuo

Página ativa e plano elegível → checar tráfego/consentimento → propor hipótese → validar variante → iniciar teste → coletar → avaliar → adotar, manter ou reverter → relatar.

- Um experimento ativo por página inicialmente. Atribuição estável para sessões participantes, exposição registrada e variante consistente na visita.
- Objetivo, janela, efeito mínimo detectável e critério estatístico definidos antes do início. Use biblioteca/método estatístico apropriado e documentado; não invente significância nem encerre por observar vantagem momentânea.
- Estados: `draft`, `awaiting_data`, `ready`, `running`, `paused`, `inconclusive`, `completed`, `rolled_back`.
- Sem amostra: explicar “Ainda não há visitas suficientes para comparar versões”. Sem vencedor: manter original e registrar resultado inconclusivo.
- Alterações automáticas limitadas a título, CTA e ordem de seções sem mudar fatos comerciais. Autoaplicação exige opt-in do owner; aprovação manual funciona por padrão.
- Interromper ao detectar regressão operacional, conflito com edição manual, queda de conversão conforme guardrail predefinido ou perda de entitlement. Sempre permitir rollback.
- Comparação agregada entre componentes controla contexto e incerteza; não vender correlação observacional como prova causal.

### 13.3 Relatório mensal

Job idempotente por workspace/página/mês, com período e fuso definidos. Informar visitas, conversão com denominador, leads, cliques WhatsApp, experimentos, alterações, gasto de créditos e recomendação seguinte. Percentual de melhora só aparece quando sustentado; separar pontos percentuais de variação relativa.

Gerar página persistida e e-mail com link autenticado. Para pouco tráfego, orientar aquisição/medição sem inventar avanço. “Páginas em voo”, a North Star, deve ter definição configurada e visível: página publicada com tráfego e conversão primária no período.

## 14. Integrações e configurações externas

Crie tela com status `not_connected`, `connected`, `invalid`, `degraded`, última verificação e ação de corrigir. Segredos não reaparecem em texto puro. Desconectar revoga acesso, agenda cleanup e explica impacto.

- Meta Pixel/GA: IDs validados, injeção por template permitido, carregamento condicionado ao consentimento; não aceitar scripts arbitrários colados no app.
- RD Station: adapter com autenticação, refresh quando aplicável, mapeamento de campos, envio de lead, retry e log sanitizado.
- Maps: endereço estruturado, embed autorizado e carregamento conforme preferência de privacidade; sem expor chave restrita incorretamente.
- WhatsApp: link funciona sem prometer acesso à API Business. API de mensagens é integração separada, se implementada.
- E-mail: domínio remetente validado, templates, bounce/complaint quando suportado e supressão de destinatários inválidos.
- LLM/imagem/transcrição: monitorar quota, custo e saúde; não fazer chamada paga real automaticamente só para testar credencial sem necessidade.

`.env.example` agrupa app/hosts, banco/Auth/Storage, pagamentos e webhooks, fila/cron, IA/imagem/áudio, e-mail, monitoramento, rate-limit/captcha e publicação/domínios. Documente obrigatoriedade por feature, onde obter, se é público/segredo e como validar. Validação de env no boot bloqueia recursos dependentes com erro legível.

## 15. Marketplace, equipes e API

### Marketplace funcional

Candidatura → revisão administrativa → perfil aprovado → catálogo → solicitação do cliente → proposta com preço/prazo/escopo → aceite → condição de pagamento → trabalho → entrega versionada → aceite ou disputa → repasse → avaliação de contrato concluído.

Não inventar perfis/avaliações públicos. Seeds só em demo. Sem profissionais ativos, mostrar candidatura/lista de interesse e não prometer atendimento imediato.

Profissional recebe acesso temporário apenas ao projeto contratado; não a cobrança, leads ou outros projetos por padrão. Entrega não sobrescreve produção sem autorização do owner. Revogar acesso ao encerrar contrato. Anexos e mensagens têm autorização e controles de upload.

Comissão configurável entre 15–20%, registrada no contrato aceito. Fluxo de custódia/repasse exige provedor apropriado, onboarding e capacidades verificadas. Não construir uma carteira financeira informal no banco de dados. Sem isso, solicitação e orçamento continuam funcionando, mas “contratar e pagar” permanece bloqueado com motivo.

### Equipes e Agência

Convites com expiração, token armazenado com segurança, aceite pela identidade correta, revogação e limites de assentos. Último owner não pode sair sem transferir propriedade. Profissionais e membros convidados não ganham acesso por apenas conhecer um id.

Agência administra workspaces de clientes por vínculo explícito. White-label parcial significa recursos definidos: marca visível nas páginas e relatórios conforme plano; não substituir automaticamente domínio/Auth/remetente sem infraestrutura correspondente.

### API Business

Chaves exibidas uma vez, armazenadas por hash, escopos mínimos, expiração/revogação, rate limit e auditoria. Endpoints iniciais para listar páginas, consultar métricas agregadas e criar/listar leads se autorizado. Documentar em OpenAPI; a API aplica os mesmos entitlements e isolamento do app.

## 16. Segurança, privacidade e administração

### Controles de aplicação

- Validação Zod server-side em todas as entradas, parâmetros, uploads e payloads externos. Queries parametrizadas; proteção contra mass assignment.
- Autorização por recurso e papel em cada ação; MFA obrigatório para admin da plataforma, disponível aos clientes. Operações sensíveis exigem sessão recente/step-up quando suportado.
- Rate-limit distribuído: começar com login 5 tentativas/15 min por combinação e controles por IP, cadastro 3/h por IP e público 60/min por IP, ajustáveis; considerar redes compartilhadas e evitar bloqueio de conta por abuso de terceiros. Turnstile validado no servidor onde necessário.
- Mutação por cookie exige proteção CSRF apropriada, checagem de origem e método. Webhooks usam assinatura do provedor e não token CSRF de navegador.
- CSP compatível com SSR e integrações autorizadas, nonce/hashes quando necessários; testar. `nosniff`, referrer policy e permissions policy mínimas. HSTS apenas em HTTPS e conforme cobertura real; não aplicar `includeSubDomains/preload` cegamente a hosts ainda não preparados.
- Isolamento de conteúdo gerado em origem de publicação distinta; política de frames apropriada ao preview. Não quebrar o editor com `DENY` global sobre o conteúdo que ele precisa exibir.
- Upload por MIME real, tamanho e dimensões; imagens até 5 MB como default, áudio com limite próprio. Rejeitar SVG ativo ou sanitizar/converter; remover EXIF quando adequado. Originais privados, cópias públicas apenas após publicação, URLs assinadas e escopo de acesso.
- Nunca logar senha, token, dados completos de pagamento, prompt privado ou lead. Restringir captura do Sentry e aplicar redaction.

### Privacidade e dados

Consentimento real por finalidade, rejeição tão acessível quanto aceite e alteração posterior. Scripts opcionais ficam desligados antes da escolha. Registrar versão da política e escolha. Mapear subprocessadores e dados enviados a provedores de IA.

Exportação assíncrona autenticada de dados próprios, arquivo com expiração e auditoria. Exclusão: reautenticar, explicar assinatura/páginas/equipe, revogar sessões e agendar remoção/anonimização conforme política configurada. Retenção financeira/legal é separada de dados de produto; não prometer apagar registros que precisem ser preservados. Definir tratamento de backups e prazo operacional, sem apresentar o default de 30 dias como regra universal.

Termos e políticas devem refletir funcionalidades reais e os dados empresariais fornecidos. Marcar revisão jurídica pendente onde houver lacunas; não afirmar adequação legal garantida por código.

### Admin

Visões para usuários/workspaces, saúde de jobs, integrações, pagamentos/reconciliação, cupons, catálogo comercial, ledger, profissionais, solicitações de privacidade e logs. Toda alteração sensível exige motivo e auditoria; impedir edição direta de saldo/registro financeiro. Reprocessar job não deve repetir cobrança.

## 17. E-mails e operação

Implementar templates pt-BR para verificação/recuperação conforme Auth, boas-vindas, geração pronta, publicação, recibo, falha/renovação de pagamento, cancelamento, convite, contrato/entrega e Diário de Bordo.

Recuperação D+1/D+3 somente para usuário elegível que ainda não publicou, com preferência de comunicação respeitada e deduplicação. Revalidar condição no momento do envio; quem publicou não recebe mensagem dizendo que falta publicar. Separar e-mails transacionais e marketing.

Outbox na mesma transação do evento de domínio; dispatcher com retry e dead-letter. Monitorar falha de pagamento, webhook inválido, jobs travados, publicação quebrada, custos de IA, backlog e entregabilidade. Correlacionar `request_id`, `workspace_id`, `job_id` e identificadores externos sem PII.

Backups automatizados, política de retenção, restauração ensaiada em ambiente seguro, migrations com estratégia de compatibilidade, rollback de app e publicação. Healthcheck público mínimo não revela segredos; diagnóstico detalhado é administrativo.

## 18. Estados e contratos de operação

Para cada comando, definir schema de entrada, papel exigido, entitlement, idempotência, efeito persistente, evento/outbox e erros possíveis.

| Comando | Garantia principal |
|---|---|
| Salvar briefing | Controle de versão; respostas não são perdidas silenciosamente. |
| Gerar página | Job durável ligado a revisão, orçamento/reserva e resultado versionado. |
| Solicitar edição | Patch sobre versão-base, custo conhecido e conflito detectável. |
| Publicar | Direito válido e troca atômica após build bem-sucedido. |
| Criar checkout | Preço do servidor e intenção idempotente. |
| Processar pagamento | Inbox verificada e grants únicos por transação/período. |
| Consumir créditos | Reserva/commit/liberação atômicos e reconciliáveis. |
| Enviar lead | Persistência antes do sucesso e integração assíncrona recuperável. |
| Ativar experimento | Métrica/amostra/regras fixadas e variante válida. |
| Concluir contrato | Entrega autorizada, aceite/disputa e repasse conforme provedor. |

Erros usam formato consistente com código estável, mensagem pt-BR e `requestId`. Distinguir validação, não autenticado, sem permissão, recurso ausente, conflito, limite, falta de crédito, integração não configurada e falha temporária. Nunca devolver stack trace/segredo ao navegador.

## 19. Qualidade, performance e verificação

### 19.1 Gates automáticos

Lint, formatação, TypeScript estrito, build, migrations e testes críticos. Não desligar regras ou usar `any`, `@ts-ignore` e casts amplos para esconder falhas; `unknown` validado é aceitável na fronteira externa.

Testes devem verificar invariantes e comportamento, não espelhar detalhes internos. Priorize:

1. Dois workspaces não acessam páginas, assets, leads, jobs, exports, contratos ou cobrança um do outro, inclusive via ORM/worker.
2. Webhook repetido e fora de ordem não duplica crédito ou entitlement.
3. Dois consumos concorrentes não gastam o mesmo saldo; falha e retry não cobram duas vezes.
4. Cupons concorrentes respeitam limite; expiração libera reserva.
5. Retorno de checkout forjado não ativa plano; Pix expirado/tardio é reconciliado.
6. Geração com JSON inválido, timeout, revisão obsoleta e imagem indisponível termina em estado recuperável.
7. Falha de deploy preserva versão anterior; rollback recupera versão conhecida.
8. Consentimento negado impede scripts/eventos opcionais; dados de lead não vazam em analytics.
9. Experimento sem amostra nunca declara vencedor; assignment não muda arbitrariamente.
10. Downgrade, reembolso e cancelamento recalculam direitos sem apagar conteúdo.

### 19.2 E2E das jornadas

- Novo usuário → verificação em ambiente de teste → briefing rápido → geração real ou adapter de teste identificado → reveal → primeira página Free publicada → formulário gera lead real no ambiente de teste.
- Usuário Free → upgrade em sandbox → confirmação webhook → domínio/benefício habilitado.
- IA de edição → reserva → proposta válida → aplicar → nova versão → republicar → consumo único.
- Falha de geração → retry → resultado único e cobrança correta.
- Evento público elegível → dashboard agregado → experimento → relatório sem dados inventados.
- Convite aceito → permissões corretas; profissional contratado só acessa projeto autorizado.
- Exportar/excluir conta → resultado e cleanup previstos, sem afetar outro workspace.

Use mocks em testes automatizados e sandbox para integrações externas. Identifique quais caminhos receberam verificação ponta a ponta com provedor e quais receberam somente teste de contrato.

### 19.3 QA visual e acessibilidade

Inspecione screenshots reais de home, preços, briefing, reveal, editor, publicação, cobrança e dashboard em 360, 390, 768, 1024 e 1440 px, além de conteúdo longo/estados de erro. Corrija overflow, truncamento crítico, sobreposição, foco, menu, contraste e alinhamento. Teste navegação por teclado, labels, erros anunciados e reduced motion. Meta WCAG AA.

Lighthouse alvo ≥95 nas páginas públicas representativas; registrar ambiente, URL e resultado medido, sem inventar nota. Metas de campo: LCP ≤2,5s, INP ≤200ms e CLS ≤0,1 no percentil 75 quando houver dados suficientes. Para laboratório, registrar condições e buscar LCP <2s no perfil escolhido, sem tratar isso como garantia para qualquer rede.

Otimizar imagens, tamanhos responsivos, fontes locais, carregamento abaixo da dobra, bundles por rota e lazy loading de editor/gráficos. Marketing não carrega SDKs de IA, editor ou painel administrativo.

### 19.4 SEO

Metadata única, canonical, OG, sitemap somente de conteúdo público, robots apropriado, páginas privadas `noindex`, lang pt-BR e 404/500 úteis. Dados estruturados apenas quando correspondem ao conteúdo elegível; FAQPage não garante resultado destacado. Não publicar posts fictícios ou números de mercado sem fonte para preencher layout.

## 20. Modos de ambiente e ativação

- `demo`: dados marcados, sandbox isolado, pagamentos simulados claramente indicados, sem envio externo real por padrão e sem afirmar publicação comercial.
- `development/test`: integrações sandbox, seeds e fixtures reprodutíveis.
- `production`: nenhum fallback silencioso para mocks; ausência de configuração resulta em recurso indisponível e diagnóstico administrativo.

Cada capability é calculada por configuração válida + adapter implementado + direitos do usuário. Feature flag controla exposição, mas não substitui autorização no servidor. Componentes comercialmente vendidos só aparecem como disponíveis após verificação do fluxo correspondente.

Crie `docs/activation-checklist.md` com: integração, variável necessária, configuração externa, webhook/callback, teste executado, estado e bloqueio. Informe URLs reais do ambiente quando existirem; use placeholders claramente nomeados somente nos exemplos de configuração.

## 21. Sequência de execução e entregáveis

### Fase A — Inspeção e decisões

Inspecionar projeto, criar `docs/implementation-plan.md`, `docs/decisions.md`, matriz de requisitos e catálogo comercial. Identificar dependências reais sem interromper trabalho independente. Resultado: caminho executável e decisões explícitas, seguido imediatamente de implementação.

### Fase B — Fundação e primeira fatia funcional

Tokens, layout, banco, workspace/Auth, autorização, Storage e fila. Entregar **um fluxo de ponta a ponta**: briefing mínimo → geração estruturada → preview → publicação Free → captura de lead. Essa fatia prova a conexão central antes de multiplicar telas.

### Fase C — Experiência completa do produto

Briefing de oito módulos/áudio, catálogo multinicho, reveal, editor manual/IA, versões e criativos. Conectar estados, retries, custos e histórico.

### Fase D — Receita e publicação avançada

Planos, checkout cartão/Pix, webhook/reconciliação, grants, ledger, cupons, e-mails, domínio/SSL, downgrade/cancelamento e licenças. Validar o caminho do dinheiro antes de permitir venda.

### Fase E — Aquisição e retenção

Home e páginas públicas com visual final, exemplos reais de demo, SEO, analytics, Diário de Bordo, Voo Contínuo e integrações. As promessas da home devem corresponder às capabilities ativas.

### Fase F — Operação e expansão contratada

Admin, equipe, marketplace, API Business, white-label parcial e gestão de clientes. Habilitar somente após os gates específicos; listar honestamente dependências comerciais/provedores.

### Fase G — Verificação e entrega

Rodar testes críticos, QA visual, desempenho e fluxos de erro; corrigir falhas; preparar preview/deploy permitido, setup e documentação de operação. Nunca publicar automaticamente para um público diferente do autorizado.

Entregar no repositório:

- Código funcional, migrations, políticas RLS/Storage, seeds de demo e lockfile.
- `.env.example`, scripts claros de dev/build/test/migrate/seed e README para subir o projeto.
- `docs/architecture.md`, `docs/decisions.md`, `docs/commercial-policy.md`, `docs/data-model.md`.
- `docs/requirements-matrix.md`: requisito → implementação → verificação → status/dependência.
- `docs/activation-checklist.md`, `docs/runbook.md`, `docs/security-and-privacy.md`.
- `docs/qa-report.md` com comandos/resultados reais e screenshots; sem métricas fabricadas.
- Documentação da API e eventos, catálogo de componentes e modelos de geração versionados.
- `docs/next-actions.md` somente com pendências concretas; não usar esse arquivo para transferir ao usuário trabalho implementável já autorizado.

## 22. Checklist final de conexão

Antes de encerrar, confirme com evidência:

- [ ] Todos os CTAs e links levam a uma ação real e coerente com sessão/plano.
- [ ] Cadastro retoma o briefing; reload não apaga respostas nem duplica recursos.
- [ ] Briefing controla conteúdo e visual; geração não devolve a mesma página genérica para todos.
- [ ] Jobs persistem, suportam retry e não dependem da aba aberta.
- [ ] Reveal usa resultado real e editor cria versões válidas.
- [ ] Criativos baixam arquivos efetivos e respeitam franquia.
- [ ] Free publica a primeira página com marca e limites consistentes.
- [ ] Checkout só libera benefícios após confirmação confiável.
- [ ] Ledger, limites e permissões funcionam sob concorrência.
- [ ] Publicação, DNS/SSL e rollback têm estados verificáveis.
- [ ] Formulário salva leads; clique WhatsApp não é reportado como conversa confirmada.
- [ ] Analytics respeita consentimento e não mistura tenants/preview/produção.
- [ ] Voo Contínuo distingue hipótese, teste, inconclusão e melhora sustentada.
- [ ] Planos, cancelamento, atraso e reembolso têm consequências claras no produto.
- [ ] Marketplace não simula contratação/escrow sem integração apropriada.
- [ ] Admin, equipe, API e exportações aplicam a mesma fronteira de acesso.
- [ ] Marketing anuncia somente benefícios disponíveis e usa provas verdadeiras.
- [ ] Mobile, teclado, erro, vazio e carregamento foram inspecionados.
- [ ] Nenhum segredo está no cliente, logs, screenshots ou documentação pública.
- [ ] Integrações bloqueadas têm motivo e instrução exata; não aparecem como concluídas.

## 23. Formato da resposta de entrega

Seja objetivo: apresente o que funciona, link de preview se disponível, testes realmente executados, bloqueios externos e passos indispensáveis para ativá-los. Distinga implementação de verificação em produção.

**Comece agora pela inspeção do projeto e pela primeira fatia funcional. Continue até completar o escopo executável. A Decola precisa permitir que um cliente real percorra a jornada inteira, com o produto sustentando cada promessa que a interface faz.**

# FIM DO PROMPT
