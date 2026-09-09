"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireWorkspace, assertRole } from "@/server/auth";
import { getDb } from "@/server/db";
import { briefings, projects } from "@/server/db/schema";

export interface CreateProjectState {
  error?: string;
}

const createSchema = z.object({
  name: z.string().trim().min(2, "Dê um nome ao projeto.").max(80),
  niche: z.enum([
    "estetica_beleza",
    "saude",
    "servicos_locais",
    "gastronomia",
    "infoprodutos",
    "outro",
  ]),
  mode: z.enum(["rapido", "completo"]),
});

export async function createProjectAction(
  _prev: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    niche: formData.get("niche"),
    mode: formData.get("mode") ?? "rapido",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const ctx = await requireWorkspace();
  assertRole(ctx, "editor");
  const db = await getDb();

  const [project] = await db
    .insert(projects)
    .values({
      workspaceId: ctx.workspaceId,
      name: parsed.data.name,
      niche: parsed.data.niche,
      createdBy: ctx.user.profileId,
    })
    .returning();

  await db.insert(briefings).values({
    projectId: project.id,
    workspaceId: ctx.workspaceId,
    mode: parsed.data.mode,
  });

  redirect(`/app/paginas/${project.id}/briefing`);
}
