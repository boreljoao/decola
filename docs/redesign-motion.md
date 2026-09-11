# Redesign Decola — 11/09/2026

## Direção
A referência fornecida pelo proprietário foi adaptada ao produto Decola: superfície branca, títulos em Instrument Serif, corpo em Inter, grafite e azul para hierarquia, cenário em vídeo e movimento breve. O restante do site continua rolável; a restrição de tela única do prompt de referência se aplica apenas à ideia visual da abertura.

## Implementação
- Página inicial recomposta, com vídeo, prévia interativa em React, etapas do produto, exemplos do motor existente e preços do catálogo comercial.
- Cabeçalho, menu para celular, rodapé e transições entre páginas.
- Tema claro em exemplos, como funciona, preços, agências, profissionais, contato e páginas legais. Texto legal preservado.
- Login e cadastro com composição em duas colunas e cenário estático.
- Painel com navegação lateral e menu móvel; acesso às rotas já existentes de equipe, integrações, conta, cobrança e projetos.
- Indicadores da visão geral calculados a partir dos dados existentes do workspace.
- Formulários e controles compartilhados atualizados; ações de autenticação, publicação, cobrança, marketplace e banco preservadas.
- As páginas de clientes continuam usando seu documento e seu renderer; este redesign não reescreve o conteúdo publicado por clientes.

## Mídia e fontes
Vídeo fornecido pelo usuário:
https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260319_015952_e1deeb12-8fb7-4071-a42a-60779fc64ab6.mp4

Derivado local: public/media/decola-motion.mp4 — 1600 × 900, 24 fps, cerca de 8 segundos, H.264 sem áudio, faststart, 2.666.440 bytes. Original: 18.464.460 bytes.
Poster: public/media/decola-motion-poster.jpg — 1600 × 900, 155.064 bytes.

A imagem aparece sem JavaScript. O vídeo só carrega após a hidratação, respeita movimento reduzido e economia de dados, pausa fora da área visível ou com a aba oculta, e pode ser controlado manualmente. Erro ou bloqueio de autoplay conserva a imagem.

Fontes auto-hospedadas via next/font/local e pacotes Fontsource. Sora e Space Grotesk preservadas para a biblioteca de páginas existentes.

## Validação
- Compilação Next.js completa com TypeScript, em modo demo local e Webpack.
- Suíte existente: 99 de 100 testes passaram no primeiro ciclo. O único erro foi timeout de preparação do banco em workspace-isolation; os 9 testes desse arquivo passaram na repetição isolada com limite de preparação de 30 segundos.
- 15 rotas públicas responderam HTTP 200, incluindo as 3 demonstrações do motor.
- Acesso anônimo a /app continua redirecionando para /entrar.
- Vídeo e poster responderam HTTP 200 com os tipos e tamanhos esperados.
- Não houve teste visual automatizado no navegador nem submissão de formulários ou pagamentos em produção.

A prévia local usa o fluxo de desenvolvimento do projeto. Não exige alterações nas variáveis de produção, migrações de banco ou mudança da configuração da Vercel.
