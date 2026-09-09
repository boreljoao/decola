/**
 * Validação de imagem por conteúdo real (spec §16).
 * - MIME determinado por magic bytes, NUNCA pelo content-type declarado.
 * - SVG é rejeitado (pode carregar script); nenhuma sanitização parcial.
 * - Dimensões lidas do cabeçalho do próprio arquivo.
 * - EXIF removido de JPEG (metadados privados não vão para asset público).
 * Módulo puro — sem I/O — para ser testável.
 */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB (default da spec)
export const MAX_DIMENSION = 6000;
export const MIN_DIMENSION = 16;

export type ImageMime = "image/png" | "image/jpeg" | "image/webp";

export interface ImageInfo {
  mime: ImageMime;
  width: number;
  height: number;
  extension: "png" | "jpg" | "webp";
}

export type ValidationFailure =
  | "empty"
  | "too_large"
  | "unsupported_type"
  | "svg_rejected"
  | "corrupt"
  | "too_small"
  | "too_wide";

export const FAILURE_MESSAGES: Record<ValidationFailure, string> = {
  empty: "O arquivo está vazio.",
  too_large: "A imagem precisa ter até 5 MB.",
  unsupported_type: "Formato não suportado. Envie PNG, JPEG ou WebP.",
  svg_rejected:
    "Arquivos SVG não são aceitos por segurança. Converta para PNG ou WebP.",
  corrupt: "Não foi possível ler esta imagem. O arquivo pode estar corrompido.",
  too_small: "A imagem é pequena demais (mínimo de 16×16 pixels).",
  too_wide: "A imagem é grande demais (máximo de 6000 pixels por lado).",
};

function startsWith(buf: Buffer, bytes: number[], offset = 0): boolean {
  if (buf.length < offset + bytes.length) return false;
  return bytes.every((b, i) => buf[offset + i] === b);
}

/** Dimensões de PNG: IHDR sempre nos bytes 16..24. */
function readPngSize(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 24) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

/** Dimensões de JPEG: percorre os segmentos até um SOF (0xC0–0xCF, exceto C4/C8/CC). */
function readJpegSize(buf: Buffer): { width: number; height: number } | null {
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = buf[offset + 1];
    const isSof =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    const segmentLength = buf.readUInt16BE(offset + 2);
    if (isSof) {
      return {
        height: buf.readUInt16BE(offset + 5),
        width: buf.readUInt16BE(offset + 7),
      };
    }
    if (segmentLength <= 0) return null;
    offset += 2 + segmentLength;
  }
  return null;
}

/** Dimensões de WebP (VP8/VP8L/VP8X). */
function readWebpSize(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 30) return null;
  const format = buf.toString("ascii", 12, 16);
  if (format === "VP8 ") {
    return {
      width: buf.readUInt16LE(26) & 0x3fff,
      height: buf.readUInt16LE(28) & 0x3fff,
    };
  }
  if (format === "VP8L") {
    const bits = buf.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }
  if (format === "VP8X") {
    const width = 1 + (buf.readUIntLE(24, 3) & 0xffffff);
    const height = 1 + (buf.readUIntLE(27, 3) & 0xffffff);
    return { width, height };
  }
  return null;
}

/**
 * Remove segmentos APP1 (EXIF/XMP) de um JPEG — tira geolocalização e dados de
 * câmera antes de o arquivo virar público (spec §16).
 */
export function stripJpegMetadata(buf: Buffer): Buffer {
  if (!startsWith(buf, [0xff, 0xd8])) return buf;
  const chunks: Buffer[] = [buf.subarray(0, 2)];
  let offset = 2;
  while (offset + 4 <= buf.length) {
    if (buf[offset] !== 0xff) break;
    const marker = buf[offset + 1];
    // SOS: daqui em diante são dados comprimidos — copia o resto e para.
    if (marker === 0xda) {
      chunks.push(buf.subarray(offset));
      return Buffer.concat(chunks);
    }
    const segmentLength = buf.readUInt16BE(offset + 2);
    if (segmentLength <= 0) break;
    const isMetadata = marker === 0xe1 || marker === 0xed || marker === 0xee;
    if (!isMetadata) {
      chunks.push(buf.subarray(offset, offset + 2 + segmentLength));
    }
    offset += 2 + segmentLength;
  }
  return offset >= buf.length ? Buffer.concat(chunks) : buf;
}

export function validateImage(
  buf: Buffer,
): { ok: true; info: ImageInfo; sanitized: Buffer } | { ok: false; reason: ValidationFailure } {
  if (buf.length === 0) return { ok: false, reason: "empty" };
  if (buf.length > MAX_IMAGE_BYTES) return { ok: false, reason: "too_large" };

  // SVG (com ou sem prólogo XML) é recusado explicitamente.
  const head = buf.subarray(0, 512).toString("utf8").trimStart().toLowerCase();
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) {
    return { ok: false, reason: "svg_rejected" };
  }

  let info: Omit<ImageInfo, "width" | "height"> | null = null;
  let size: { width: number; height: number } | null = null;
  let sanitized = buf;

  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    info = { mime: "image/png", extension: "png" };
    size = readPngSize(buf);
  } else if (startsWith(buf, [0xff, 0xd8, 0xff])) {
    info = { mime: "image/jpeg", extension: "jpg" };
    size = readJpegSize(buf);
    sanitized = stripJpegMetadata(buf);
  } else if (
    startsWith(buf, [0x52, 0x49, 0x46, 0x46]) &&
    buf.length > 12 &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    info = { mime: "image/webp", extension: "webp" };
    size = readWebpSize(buf);
  }

  if (!info) return { ok: false, reason: "unsupported_type" };
  if (!size || size.width <= 0 || size.height <= 0) {
    return { ok: false, reason: "corrupt" };
  }
  if (size.width < MIN_DIMENSION || size.height < MIN_DIMENSION) {
    return { ok: false, reason: "too_small" };
  }
  if (size.width > MAX_DIMENSION || size.height > MAX_DIMENSION) {
    return { ok: false, reason: "too_wide" };
  }

  return {
    ok: true,
    info: { ...info, width: size.width, height: size.height },
    sanitized,
  };
}
