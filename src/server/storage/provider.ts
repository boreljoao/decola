import "server-only";

/**
 * Fronteira de armazenamento (spec §2.2/§16).
 * - Originais ficam privados; o acesso passa sempre por autorização no servidor.
 * - `publicUrl` só existe em providers que suportam objeto público; caso
 *   contrário o app serve por rota autorizada.
 */

export type StorageProviderKind = "local" | "supabase";

export interface PutObjectInput {
  /** Caminho lógico: `workspaces/<id>/assets/<uuid>.<ext>` */
  key: string;
  body: Buffer;
  contentType: string;
}

export interface StorageProvider {
  readonly kind: StorageProviderKind;
  put(input: PutObjectInput): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

export class StorageError extends Error {
  constructor(
    public code: "not_found" | "write_failed" | "not_configured",
    message: string,
  ) {
    super(message);
    this.name = "StorageError";
  }
}
