import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { ApplicationReview } from "@/features/marketplace/review-ui";
import { getPlatformAdmin } from "@/server/auth/admin";
import { getDb } from "@/server/db";
import { professionalApplications, professionalProfiles } from "@/server/db/schema";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Profissionais · Administração",
  robots: { index: false },
};

const STATUS: Record<string, { label: string; tone: "warning" | "success" | "neutral" }> = {
  submitted: { label: "Aguardando revisão", tone: "warning" },
  approved: { label: "Aprovada", tone: "success" },
  rejected: { label: "Recusada", tone: "neutral" },
};

export default async function AdminProfissionaisPage() {
  const admin = await getPlatformAdmin();
  if (!admin) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24">
        <Card className="text-center">
          <h1 style={{ fontFamily: "var(--font-sora)" }} className="text-2xl font-bold">
            Acesso restrito
          </h1>
          <p className="mt-2 text-sm text-ink-600">
            Esta área é da administração da plataforma.
          </p>
          <Link href="/app" className="mt-6 inline-block">
            <Button variant="secondary">Voltar ao painel</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const db = await getDb();
  const applications = await db.query.professionalApplications.findMany({
    orderBy: [desc(professionalApplications.createdAt)],
    limit: 50,
  });
  const active = await db.query.professionalProfiles.findMany({
    orderBy: [desc(professionalProfiles.createdAt)],
  });

  const pending = applications.filter((a) => a.status === "submitted");
  const reviewed = applications.filter((a) => a.status !== "submitted");

  return (
    <div className="mx-auto grid max-w-[1000px] gap-6 px-6 py-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-600">
          <Link href="/admin" className="hover:underline">
            Administração
          </Link>{" "}
          / Profissionais
        </p>
        <h1 style={{ fontFamily: "var(--font-sora)" }} className="mt-1 text-3xl font-bold">
          Candidaturas
        </h1>
        <p className="mt-1 text-sm text-ink-600">
          {active.length} profissional(is) no catálogo · {pending.length} aguardando revisão
        </p>
      </div>

      {pending.length === 0 ? (
        <EmptyState
          title="Nenhuma candidatura aguardando"
          description="Novas candidaturas enviadas na página pública aparecem aqui para revisão."
        />
      ) : (
        pending.map((application) => (
          <Card key={application.id} className="grid gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">{application.name}</h2>
                <p className="text-sm text-ink-600">
                  {application.email}
                  {application.phone ? ` · ${application.phone}` : ""}
                </p>
                <p className="mt-1 text-sm font-medium text-electric-600">
                  {application.specialty}
                </p>
              </div>
              <Badge tone="warning">
                {application.createdAt.toLocaleDateString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                })}
              </Badge>
            </div>

            <p className="whitespace-pre-line rounded-xl bg-paper p-4 text-sm text-ink-600">
              {application.experience}
            </p>

            {application.portfolioUrl && (
              <a
                href={application.portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-electric-600 hover:underline"
              >
                Ver portfólio →
              </a>
            )}

            <ApplicationReview
              applicationId={application.id}
              hasAccount={application.profileId != null}
            />
          </Card>
        ))
      )}

      {reviewed.length > 0 && (
        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-600">
            Já revisadas
          </h2>
          <ul className="mt-3 grid gap-2">
            {reviewed.map((application) => {
              const status = STATUS[application.status] ?? STATUS.submitted;
              return (
                <li
                  key={application.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-900/10 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{application.name}</p>
                    <p className="text-xs text-ink-600">{application.specialty}</p>
                  </div>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
