import { describe, expect, it } from "vitest";
import {
  MAX_IMAGE_BYTES,
  stripJpegMetadata,
  validateImage,
} from "@/features/assets/validate-image";

/** PNG mínimo válido com IHDR declarando as dimensões pedidas. */
function makePng(width: number, height: number): Buffer {
  const buf = Buffer.alloc(24);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
  buf.write("IHDR", 12, "ascii");
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

/** JPEG mínimo: SOI + APP1(EXIF) opcional + SOF0 com dimensões + SOS. */
function makeJpeg(
  width: number,
  height: number,
  options: { withExif?: boolean } = {},
): Buffer {
  const parts: Buffer[] = [Buffer.from([0xff, 0xd8])];

  if (options.withExif) {
    const exifPayload = Buffer.from("Exif\0\0SEGREDO-GPS-DO-USUARIO", "ascii");
    const app1 = Buffer.alloc(4 + exifPayload.length);
    app1[0] = 0xff;
    app1[1] = 0xe1;
    app1.writeUInt16BE(2 + exifPayload.length, 2);
    exifPayload.copy(app1, 4);
    parts.push(app1);
  }

  const sof = Buffer.alloc(11);
  sof[0] = 0xff;
  sof[1] = 0xc0;
  sof.writeUInt16BE(9, 2); // comprimento do segmento
  sof[4] = 8; // precisão
  sof.writeUInt16BE(height, 5);
  sof.writeUInt16BE(width, 7);
  parts.push(sof);

  parts.push(Buffer.from([0xff, 0xda, 0x00, 0x02, 0x00, 0x11, 0x22]));
  return Buffer.concat(parts);
}

function makeWebp(width: number, height: number): Buffer {
  const buf = Buffer.alloc(30);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(22, 4);
  buf.write("WEBP", 8, "ascii");
  buf.write("VP8 ", 12, "ascii");
  buf.writeUInt16LE(width, 26);
  buf.writeUInt16LE(height, 28);
  return buf;
}

describe("validação de imagem por conteúdo real", () => {
  it("aceita PNG e lê as dimensões do cabeçalho", () => {
    const result = validateImage(makePng(800, 600));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.info).toMatchObject({
        mime: "image/png",
        width: 800,
        height: 600,
        extension: "png",
      });
    }
  });

  it("aceita JPEG e WebP", () => {
    const jpeg = validateImage(makeJpeg(1024, 768));
    expect(jpeg.ok).toBe(true);
    if (jpeg.ok) expect(jpeg.info.mime).toBe("image/jpeg");

    const webp = validateImage(makeWebp(640, 480));
    expect(webp.ok).toBe(true);
    if (webp.ok) expect(webp.info).toMatchObject({ width: 640, height: 480 });
  });

  it("REJEITA SVG mesmo com content-type de imagem (pode carregar script)", () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
      "utf8",
    );
    const result = validateImage(svg);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("svg_rejected");
  });

  it("REJEITA SVG com prólogo XML antes da tag", () => {
    const svg = Buffer.from(
      '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>',
      "utf8",
    );
    const result = validateImage(svg);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("svg_rejected");
  });

  it("REJEITA arquivo que não é imagem, mesmo com extensão de imagem", () => {
    const html = Buffer.from("<html><script>alert(1)</script></html>", "utf8");
    const result = validateImage(html);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unsupported_type");
  });

  it("rejeita arquivo vazio e acima do limite de 5 MB", () => {
    const empty = validateImage(Buffer.alloc(0));
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.reason).toBe("empty");

    const huge = Buffer.alloc(MAX_IMAGE_BYTES + 1);
    makePng(100, 100).copy(huge, 0);
    const tooLarge = validateImage(huge);
    expect(tooLarge.ok).toBe(false);
    if (!tooLarge.ok) expect(tooLarge.reason).toBe("too_large");
  });

  it("rejeita dimensões fora dos limites", () => {
    const tiny = validateImage(makePng(8, 8));
    expect(tiny.ok).toBe(false);
    if (!tiny.ok) expect(tiny.reason).toBe("too_small");

    const wide = validateImage(makePng(7000, 100));
    expect(wide.ok).toBe(false);
    if (!wide.ok) expect(wide.reason).toBe("too_wide");
  });

  it("rejeita PNG truncado (cabeçalho válido, conteúdo corrompido)", () => {
    const truncated = makePng(0, 0);
    const result = validateImage(truncated);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("corrupt");
  });
});

describe("remoção de metadados privados", () => {
  it("remove EXIF do JPEG mantendo a imagem legível", () => {
    const withExif = makeJpeg(400, 300, { withExif: true });
    expect(withExif.toString("latin1")).toContain("SEGREDO-GPS-DO-USUARIO");

    const result = validateImage(withExif);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.sanitized.toString("latin1")).not.toContain(
        "SEGREDO-GPS-DO-USUARIO",
      );
      // continua sendo um JPEG válido e com as mesmas dimensões
      const revalidated = validateImage(result.sanitized);
      expect(revalidated.ok).toBe(true);
      if (revalidated.ok) {
        expect(revalidated.info).toMatchObject({ width: 400, height: 300 });
      }
    }
  });

  it("stripJpegMetadata é seguro para entrada que não é JPEG", () => {
    const png = makePng(100, 100);
    expect(stripJpegMetadata(png)).toEqual(png);
  });
});
