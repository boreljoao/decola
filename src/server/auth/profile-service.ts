import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { memberships, profiles, workspaces } from "@/server/db/schema";
import type { AuthUser } from "./provider";

function slugify(base: string): string {
  return (
    base
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "workspace"
  );
}

/**
 * Garante profile + workspace pessoal + membership owner (spec §4: cadastros
 * individuais ganham workspace pessoal). Idempotente por e-mail/id.
 */
export async function ensureProfile(input: {
  id?: string;
  email: string;
  displayName?: string | null;
}): Promise<AuthUser> {
  const db = await getDb();
  const email = input.email.trim().toLowerCase();

  const existing = input.id
    ? await db.query.profiles.findFirst({ where: eq(profiles.id, input.id) })
    : await db.query.profiles.findFirst({ where: eq(profiles.email, email) });

  if (existing) {
    return {
      profileId: existing.id,
      email: existing.email,
      displayName: existing.displayName,
      platformAdmin: existing.platformAdmin,
    };
  }

  return await db.transaction(async (tx) => {
    const [profile] = await tx
      .insert(profiles)
      .values({
        ...(input.id ? { id: input.id } : {}),
        email,
        displayName: input.displayName ?? null,
      })
      .returning();

    const base = slugify(input.displayName ?? email.split("@")[0]);
    let slug = base;
    for (let i = 0; i < 5; i++) {
      const clash = await tx.query.workspaces.findFirst({
        where: eq(workspaces.slug, slug),
      });
      if (!clash) break;
      slug = `${base}-${crypto.randomUUID().slice(0, 6)}`;
    }

    const [workspace] = await tx
      .insert(workspaces)
      .values({
        name: input.displayName ?? email.split("@")[0],
        slug,
        personal: true,
        createdBy: profile.id,
      })
      .returning();

    await tx.insert(memberships).values({
      workspaceId: workspace.id,
      profileId: profile.id,
      role: "owner",
    });

    return {
      profileId: profile.id,
      email: profile.email,
      displayName: profile.displayName,
      platformAdmin: profile.platformAdmin,
    };
  });
}
