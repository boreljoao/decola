import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { env } from "@/config/env";
import { getDb } from "@/server/db";
import { memberships, workspaces } from "@/server/db/schema";
import { DevAuthProvider } from "./dev-auth";
import { SupabaseAuthProvider } from "./supabase-auth";
import type { AuthProvider, AuthUser } from "./provider";

export type { AuthProvider, AuthUser } from "./provider";

let provider: AuthProvider | undefined;

export function getAuthProvider(): AuthProvider {
  if (!provider) {
    provider = env().capabilities.supabaseAuth
      ? new SupabaseAuthProvider()
      : new DevAuthProvider();
  }
  return provider;
}

/** Usuário atual (cacheado por requisição). */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  return getAuthProvider().getUser();
});

export class UnauthorizedError extends Error {
  constructor(message = "Sessão necessária.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Sem permissão para esta operação.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export interface WorkspaceContext {
  user: AuthUser;
  workspaceId: string;
  workspaceSlug: string;
  workspaceName: string;
  role: "owner" | "admin" | "editor" | "viewer";
}

/**
 * Autorização por recurso (spec §4): valida a associação do usuário ao
 * workspace no servidor em toda operação — UUID não é controle de acesso.
 */
export async function requireWorkspace(
  workspaceId?: string,
): Promise<WorkspaceContext> {
  const user = await requireUser();
  const db = await getDb();

  const rows = await db
    .select({
      workspaceId: memberships.workspaceId,
      role: memberships.role,
      slug: workspaces.slug,
      name: workspaces.name,
    })
    .from(memberships)
    .innerJoin(workspaces, eq(memberships.workspaceId, workspaces.id))
    .where(eq(memberships.profileId, user.profileId));

  const target = workspaceId
    ? rows.find((r) => r.workspaceId === workspaceId)
    : rows[0];

  if (!target) {
    throw new ForbiddenError("Você não participa deste workspace.");
  }

  return {
    user,
    workspaceId: target.workspaceId,
    workspaceSlug: target.slug,
    workspaceName: target.name,
    role: target.role,
  };
}

const ROLE_ORDER = { viewer: 0, editor: 1, admin: 2, owner: 3 } as const;

export function assertRole(
  ctx: WorkspaceContext,
  minimum: keyof typeof ROLE_ORDER,
): void {
  if (ROLE_ORDER[ctx.role] < ROLE_ORDER[minimum]) {
    throw new ForbiddenError(
      `Esta operação exige papel ${minimum} ou superior.`,
    );
  }
}
