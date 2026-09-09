import "server-only";
import { and, eq } from "drizzle-orm";
import { requireWorkspace, type WorkspaceContext } from "@/server/auth";
import { getDb } from "@/server/db";
import {
  briefingRevisions,
  briefings,
  generationJobs,
  pages,
  projects,
} from "@/server/db/schema";

/** Carrega um projeto validando a fronteira de workspace no servidor. */
export async function loadProject(projectId: string): Promise<{
  project: typeof projects.$inferSelect;
  ctx: WorkspaceContext;
} | null> {
  const db = await getDb();
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  });
  if (!project) return null;
  const ctx = await requireWorkspace(project.workspaceId);
  return { project, ctx };
}

export async function loadBriefingWithDraft(projectId: string) {
  const db = await getDb();
  const briefing = await db.query.briefings.findFirst({
    where: eq(briefings.projectId, projectId),
  });
  if (!briefing) return null;
  const draft = await db.query.briefingRevisions.findFirst({
    where: and(
      eq(briefingRevisions.briefingId, briefing.id),
      eq(briefingRevisions.revision, 0),
    ),
  });
  return { briefing, draft };
}

export async function loadLatestGenerationJob(projectId: string) {
  const db = await getDb();
  const all = await db.query.generationJobs.findMany({
    where: eq(generationJobs.projectId, projectId),
  });
  return all.sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  )[0] ?? null;
}

export async function loadPageForProject(projectId: string) {
  const db = await getDb();
  return (
    (await db.query.pages.findFirst({
      where: eq(pages.projectId, projectId),
    })) ?? null
  );
}
