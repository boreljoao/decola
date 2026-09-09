import "server-only";
import { processCreativeSet } from "@/features/creatives/process";
import { processGenerationJob } from "@/features/generation/pipeline";
import { sendEmail } from "@/server/integrations/email";
import { registerJobHandler } from "./index";

/**
 * Registro central de handlers da fila. Importado por todo caminho que
 * enfileira ou drena jobs (ações de servidor, endpoint de drain, worker).
 */

let registered = false;

export function registerAllJobHandlers(): void {
  if (registered) return;
  registered = true;

  registerJobHandler("generate_page", processGenerationJob);
  registerJobHandler("generate_creatives", processCreativeSet);

  registerJobHandler("send_email", async (payload) => {
    const result = await sendEmail({
      to: String(payload.to),
      template: String(payload.template),
      subject: String(payload.subject),
      html: String(payload.html),
      workspaceId: payload.workspaceId ? String(payload.workspaceId) : undefined,
      dedupKey: payload.dedupKey ? String(payload.dedupKey) : undefined,
    });
    if (!result.ok) throw new Error(result.error);
  });
}
