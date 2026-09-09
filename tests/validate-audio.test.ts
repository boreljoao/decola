import { describe, expect, it } from "vitest";
import {
  MAX_AUDIO_BYTES,
  MAX_DURATION_SECONDS,
  validateAudio,
} from "@/features/audio/validate-audio";

/**
 * Mesma regra das imagens: o formato vem do CONTEÚDO, não do content-type
 * declarado. Um arquivo executável renomeado para .webm não passa.
 */

function withHeader(bytes: number[], size = 2048): Buffer {
  const buf = Buffer.alloc(size);
  Buffer.from(bytes).copy(buf, 0);
  return buf;
}

const webm = () => withHeader([0x1a, 0x45, 0xdf, 0xa3]);
const ogg = () => withHeader([0x4f, 0x67, 0x67, 0x53]);
const mp3 = () => withHeader([0x49, 0x44, 0x33]);

function mp4(): Buffer {
  const buf = Buffer.alloc(2048);
  buf.write("ftyp", 4, "ascii");
  return buf;
}

describe("validação de áudio", () => {
  it("aceita WebM, Ogg, MP4 e MP3 pelos magic bytes", () => {
    expect(validateAudio(webm(), 30)).toMatchObject({
      ok: true,
      info: { mime: "audio/webm", extension: "webm" },
    });
    expect(validateAudio(ogg(), 30)).toMatchObject({
      ok: true,
      info: { mime: "audio/ogg" },
    });
    expect(validateAudio(mp4(), 30)).toMatchObject({
      ok: true,
      info: { mime: "audio/mp4" },
    });
    expect(validateAudio(mp3(), 30)).toMatchObject({
      ok: true,
      info: { mime: "audio/mpeg" },
    });
  });

  it("RECUSA arquivo que não é áudio, ainda que nomeado como tal", () => {
    const executavel = withHeader([0x4d, 0x5a]); // cabeçalho PE do Windows
    const result = validateAudio(executavel, 10);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unsupported_type");

    const html = Buffer.from("<html><script>alert(1)</script></html>", "utf8");
    const htmlResult = validateAudio(html, 10);
    expect(htmlResult.ok).toBe(false);
  });

  it("recusa gravação vazia, longa demais ou grande demais", () => {
    const vazio = validateAudio(Buffer.alloc(0), 10);
    expect(vazio.ok).toBe(false);
    if (!vazio.ok) expect(vazio.reason).toBe("empty");

    const longo = validateAudio(webm(), MAX_DURATION_SECONDS + 1);
    expect(longo.ok).toBe(false);
    if (!longo.ok) expect(longo.reason).toBe("too_long");

    const grande = Buffer.alloc(MAX_AUDIO_BYTES + 1);
    Buffer.from([0x1a, 0x45, 0xdf, 0xa3]).copy(grande, 0);
    const grandeResult = validateAudio(grande, 30);
    expect(grandeResult.ok).toBe(false);
    if (!grandeResult.ok) expect(grandeResult.reason).toBe("too_large");
  });

  it("aceita exatamente no limite de duração", () => {
    expect(validateAudio(webm(), MAX_DURATION_SECONDS).ok).toBe(true);
  });
});
