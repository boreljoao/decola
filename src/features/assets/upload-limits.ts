/**
 * Limites de upload compartilhados entre o navegador (checagem antes de enviar)
 * e o servidor (validação real).
 *
 * 4 MB — abaixo do default de 5 MB da spec para imagens — porque a Vercel
 * recusa requisição acima de 4,5 MB com 413 antes de o nosso código rodar, e o
 * multipart soma cabeçalhos ao arquivo. Com o limite aplicado aqui, a pessoa
 * recebe a mensagem certa em vez de um erro genérico.
 *
 * Áudio: 180 s a 128 kbps (taxa alta para voz) somam ~2,9 MB, então 4 MB cobre
 * a duração máxima de uma resposta.
 */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
export const UPLOAD_LIMIT_LABEL = "4 MB";
