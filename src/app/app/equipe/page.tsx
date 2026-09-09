import type { Metadata } from "next";
import { and, desc, eq } from "drizzle-orm";
import { Badge, Card } from "@/components/ui";
import { getWorkspacePlan } from "@/features/billing/entitlements";
import { InviteForm, MemberActions } from "@/features/team/team-ui";
import { requireWorkspace } from "@/server/auth";
import { getDb } from "@/server/db";
import { invitations, memberships, profiles } from "@/server/db/schema";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Equipe" };

const ROLE_LABEL: Record<string, string> = {
  owner: "Proprietário",
  admin: "Administrador",
  editor: "Editor",
  viewer: "Visualizador",
};

export default async function EquipePage() {
  const ctx = await requireWorkspace();
  const db = await getDb();
  const plan = await getWorkspacePlan(ctx.workspaceId);

  const members = await db
    .select({
      profileId: memberships.profileId,
      role: memberships.role,
      email: profiles.email,
      displayName: profiles.displayName,
      since: memberships.createdAt,
    })
    .from(memberships)
    .innerJoin(profiles, eq(memberships.profileId, profiles.id))
    .where(eq(memberships.workspaceId, ctx.workspaceId));

  const pending = await db.query.invitations.findMany({
    where: and(
      eq(invitations.workspaceId, ctx.workspaceId),
      eq(invitations.status, "pending"),
    ),
    orderBy: [desc(invitations.createdAt)],
  });

  const seatsUsed = members.length + pending.length;
  const canManage = ctx.role === "owner" || ctx.role === "admin";

  return (
    <div className="grid gap-6">
      <div>
        <h1 style={{ fontFamily: "var(--font-sora)" }} className="text-3xl font-bold">
          Equipe
        </h1>
        <p className="mt-1 text-sm text-ink-600">
          {ctx.workspaceName} · {seatsUsed} de {plan.entitlements.seats}{" "}
          assento(s) do plano {plan.name}
        </p>
      </div>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-600">
          Membros
        </h2>
        <ul className="mt-4 grid gap-2">
          {members.map((member) => (
            <li
              key={member.profileId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-900/10 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {member.displayName ?? member.email}
                </p>
                <p className="truncate text-xs text-ink-600">{member.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={member.role === "owner" ? "success" : "neutral"}>
                  {ROLE_LABEL[member.role] ?? member.role}
                </Badge>
                {canManage && member.profileId !== ctx.user.profileId && (
                  <MemberActions profileId={member.profileId} />
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {pending.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-600">
            Convites pendentes
          </h2>
          <ul className="mt-4 grid gap-2">
            {pending.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-900/10 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{invite.email}</p>
                  <p className="text-xs text-ink-600">
                    {ROLE_LABEL[invite.role]} · expira em{" "}
                    {invite.expiresAt.toLocaleDateString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                    })}
                  </p>
                </div>
                {canManage && <MemberActions invitationId={invite.id} />}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {canManage && (
        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-600">
            Convidar pessoa
          </h2>
          <p className="mt-1 mb-4 text-xs text-ink-600">
            O convite é nominal: só a pessoa com o e-mail convidado consegue
            aceitá-lo, e ele expira em 7 dias.
          </p>
          <InviteForm seatsAvailable={plan.entitlements.seats - seatsUsed} />
        </Card>
      )}
    </div>
  );
}
