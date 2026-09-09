import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Button, EmptyState } from "@/components/ui";
import { env } from "@/config/env";
import { ManualEditor } from "@/features/editor/editor";
import { validatePageDocument } from "@/features/generation/page-document";
import { loadPageForProject, loadProject } from "@/features/projects/queries";
import { getDb } from "@/server/db";
import { pageVersions } from "@/server/db/schema";

export const dynamic = "force-dynamic";

export default async function EditorPage(
  props: PageProps<"/app/paginas/[id]/editor">,
) {
  const { id } = await props.params;
  const data = await loadProject(id);
  if (!data) notFound();

  const page = await loadPageForProject(id);
  if (!page?.currentVersionId) {
    return (
      <EmptyState
        title="Gere a página antes de editar"
        description="O editor trabalha sobre uma versão gerada a partir do seu briefing."
        action={
          <Link href={`/app/paginas/${id}/briefing`}>
            <Button>Ir para o briefing</Button>
          </Link>
        }
      />
    );
  }

  const db = await getDb();
  const version = await db.query.pageVersions.findFirst({
    where: eq(pageVersions.id, page.currentVersionId),
  });
  if (!version) notFound();

  const validation = validatePageDocument(version.document);
  if (!validation.ok) {
    return (
      <EmptyState
        title="A versão atual está inválida"
        description={validation.issues.slice(0, 3).join("; ")}
        action={
          <Link href={`/app/paginas/${id}/geracao`}>
            <Button>Gerar novamente</Button>
          </Link>
        }
      />
    );
  }

  const versions = await db.query.pageVersions.findMany({
    where: eq(pageVersions.pageId, page.id),
    orderBy: [desc(pageVersions.version)],
    limit: 20,
    columns: { id: true, version: true, source: true, createdAt: true },
  });

  return (
    <ManualEditor
      pageId={page.id}
      baseVersionId={version.id}
      baseVersionNumber={version.version}
      initialDocument={validation.document}
      aiAvailable={env().capabilities.llmGeneration}
      versions={versions.map((v) => ({
        id: v.id,
        version: v.version,
        source: v.source,
        createdAt: v.createdAt.toLocaleString("pt-BR", {
          timeZone: "America/Sao_Paulo",
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
      }))}
    />
  );
}
