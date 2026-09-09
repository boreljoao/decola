import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/config/env";
import {
  StorageError,
  type PutObjectInput,
  type StorageProvider,
} from "./provider";

export { StorageError } from "./provider";
export type { StorageProvider } from "./provider";

/**
 * Adapter local (dev): grava em `.data/storage/uploads`, fora do diretório
 * público — o acesso passa por rota autorizada, nunca por URL adivinhável.
 * O prefixo `.data` é literal para o build conseguir escopar o acesso a disco.
 */
class LocalStorageProvider implements StorageProvider {
  readonly kind = "local" as const;

  private resolve(key: string): string {
    // key é gerado pelo servidor (uuid + extensão validada); ainda assim,
    // normaliza e recusa qualquer tentativa de escapar da raiz.
    const root = path.join(process.cwd(), ".data", "storage", "uploads");
    const full = path.normalize(path.join(root, key));
    if (!full.startsWith(root)) {
      throw new StorageError("write_failed", "Caminho de asset inválido.");
    }
    return full;
  }

  async put({ key, body }: PutObjectInput): Promise<void> {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
  }

  async get(key: string): Promise<Buffer> {
    try {
      return await readFile(this.resolve(key));
    } catch {
      throw new StorageError("not_found", "Arquivo não encontrado.");
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.resolve(key));
    } catch {
      /* remoção idempotente */
    }
  }
}

/**
 * Adapter Supabase Storage (produção). Bucket privado; leitura sempre pelo
 * servidor com a service role, após validar workspace.
 * Estado: implementada_aguardando_configuracao.
 */
class SupabaseStorageProvider implements StorageProvider {
  readonly kind = "supabase" as const;
  private bucket = "decola-assets";

  private async client() {
    const e = env();
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(
      e.NEXT_PUBLIC_SUPABASE_URL!,
      e.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
  }

  async put({ key, body, contentType }: PutObjectInput): Promise<void> {
    const supabase = await this.client();
    const { error } = await supabase.storage
      .from(this.bucket)
      .upload(key, body, { contentType, upsert: true });
    if (error) throw new StorageError("write_failed", error.message);
  }

  async get(key: string): Promise<Buffer> {
    const supabase = await this.client();
    const { data, error } = await supabase.storage
      .from(this.bucket)
      .download(key);
    if (error || !data) {
      throw new StorageError("not_found", error?.message ?? "Não encontrado.");
    }
    return Buffer.from(await data.arrayBuffer());
  }

  async delete(key: string): Promise<void> {
    const supabase = await this.client();
    await supabase.storage.from(this.bucket).remove([key]);
  }
}

let provider: StorageProvider | undefined;

export function getStorageProvider(): StorageProvider {
  if (!provider) {
    const e = env();
    if (e.capabilities.supabaseStorage) {
      provider = new SupabaseStorageProvider();
    } else if (e.mode === "production") {
      throw new StorageError(
        "not_configured",
        "Supabase Storage não configurado — upload de imagens indisponível em produção.",
      );
    } else {
      provider = new LocalStorageProvider();
    }
  }
  return provider;
}
