import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Badge, Button, Card, EmptyState } from "@/components/ui";
import { requireWorkspace } from "@/server/auth";
import { getDb } from "@/server/db";
import { briefings, pages, projects } from "@/server/db/schema";

const STATUS_LABEL: Record<
  string,
  { label: string; tone: "neutral" | "success" | "warning" | "danger" | "info" }
> = {
  draft: { label: "Rascunho", tone: "neutral" },
  ready: { label: "Pronta para publicar", tone: "info" },
  publishing: { label: "Publicando…", tone: "warning" },
  live: { label: "No ar", tone: "success" },
  publish_failed: { label: "Falha na publicação", tone: "danger" },
  paused: { label: "Pausada", tone: "warning" },
  archived: { label: "Arquivada", tone: "neutral" },
};

export default async function AppHome() {
  const ctx = await requireWorkspace();
  const db = await getDb();

  const projectRows = await db.query.projects.findMany({
    where: eq(projects.workspaceId, ctx.workspaceId),
    orderBy: [desc(projects.createdAt)],
  });
  const pageRows = await db.query.pages.findMany({
    where: eq(pages.workspaceId, ctx.workspaceId),
  });
  const briefingRows = await db.query.briefings.findMany({
    where: eq(briefings.workspaceId, ctx.workspaceId),
  });

  const pageByProject = new Map(pageRows.map((p) => [p.projectId, p]));
  const briefingByProject = new Map(briefingRows.map((b) => [b.projectId, b]));

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            style={{ fontFamily: "var(--font-sora)" }}
            className="text-3xl font-bold"
          >
            Minhas páginas
          </h1>
          <p className="mt-1 text-sm text-ink-600">
            Crie, publique e acompanhe seus projetos em um só lugar.
          </p>
        </div>
        <Link href="/app/criar" className="action action-dark">
          Criar nova página <span aria-hidden="true">+</span>
        </Link>
      </div>

      <div className="workspace-stat-grid">
        <div className="workspace-stat">
          <p>Seus projetos</p>
          <strong>{projectRows.length}</strong>
        </div>
        <div className="workspace-stat">
          <p>Páginas no ar</p>
          <strong>
            {pageRows.filter((page) => page.status === "live").length}
          </strong>
        </div>
        <div className="workspace-stat">
          <p>Em preparação</p>
          <strong>
            {
              projectRows.filter(
                (project) =>
                  !pageByProject.has(project.id) ||
                  ["draft", "ready", "publishing", "publish_failed"].includes(
                    pageByProject.get(project.id)!.status,
                  ),
              ).length
            }
          </strong>
        </div>
      </div>

      {projectRows.length === 0 ? (
        <EmptyState
          title="Sua primeira página começa com boas perguntas"
          description="Responda o briefing rápido (cerca de 5 minutos) e veja a Decola compor uma página com a identidade do seu negócio."
          action={
            <Link href="/app/criar" className="action action-dark">
              Começar o briefing
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projectRows.map((project) => {
            const page = pageByProject.get(project.id);
            const briefing = briefingByProject.get(project.id);
            const status = page
              ? STATUS_LABEL[page.status]
              : briefing?.status === "completed"
                ? { label: "Gerando…", tone: "warning" as const }
                : { label: "Briefing em andamento", tone: "neutral" as const };
            const nextHref = page
              ? `/app/paginas/${project.id}/preview`
              : briefing?.status === "completed"
                ? `/app/paginas/${project.id}/geracao`
                : `/app/paginas/${project.id}/briefing`;
            return (
              <Card key={project.id} className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-lg font-semibold">{project.name}</h2>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </div>
                {page?.slug && page.status === "live" && (
                  <p className="truncate text-sm text-ink-600">
                    {page.slug}.
                    {process.env.PUBLISH_ROOT_DOMAIN ?? "localhost:3000"}
                  </p>
                )}
                <div className="mt-auto flex gap-2">
                  <Link href={nextHref} className="flex-1">
                    <Button variant="secondary" className="w-full">
                      {page ? "Abrir" : "Continuar"}
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
