"use server";

import { eq } from "drizzle-orm";
import { after } from "next/server";
import { requireWorkspace, assertRole } from "@/server/auth";
import { getDb } from "@/server/db";
import { generationJobs, projects } from "@/server/db/schema";
import { enqueueJob, kickDrain } from "@/server/jobs";
import { registerAllJobHandlers } from "@/server/jobs/handlers";

/** Reprocessa um job de geração que falhou. Reutiliza etapas válidas (spec §8.1). */
export async function retryGenerationAction(
  projectId: string,
): Promise<{ ok: boolean; error?: string }> {
  const db = await getDb();
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project) return { ok: false, error: "Projeto não encontrado." };
  const ctx = await requireWorkspace(project.workspaceId);
  assertRole(ctx, "editor");

  const all = await db.query.generationJobs.findMany({
    where: eq(generationJobs.projectId, projectId),
  });
  const job = all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  if (!job) return { ok: false, error: "Nenhuma geração encontrada." };
  if (job.status === "completed") return { ok: true };

  await db
    .update(generationJobs)
    .set({ status: "queued", error: null })
    .where(eq(generationJobs.id, job.id));

  registerAllJobHandlers();
  await enqueueJob({
    type: "generate_page",
    payload: { generationJobId: job.id },
    dedupKey: `generate_page:${job.id}:retry:${Date.now()}`,
  });
  after(() => kickDrain());
  return { ok: true };
}
