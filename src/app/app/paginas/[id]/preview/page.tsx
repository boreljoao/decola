import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Button, EmptyState } from "@/components/ui";
import { validatePageDocument } from "@/features/generation/page-document";
import { PreviewFrame } from "@/features/pages/preview-frame";
import { PageRenderer } from "@/features/pages/renderer";
import { loadPageForProject, loadProject } from "@/features/projects/queries";
import { getDb } from "@/server/db";
import { pageVersions } from "@/server/db/schema";

export const dynamic = "force-dynamic";

export const metadata = { robots: { index: false } };

export default async function PreviewPage(
  props: PageProps<"/app/paginas/[id]/preview">,
) {
  const { id } = await props.params;
  const data = await loadProject(id);
  if (!data) notFound();

  const page = await loadPageForProject(id);
  if (!page?.currentVersionId) {
    return (
      <EmptyState
        title="Ainda não há versão para visualizar"
        description="Conclua o briefing e a geração para ver sua página aqui."
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

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-ink-600">
            Versão {version.version} ·{" "}
            {version.source === "generation" ? "gerada" : "editada"} ·{" "}
            {validation.document.provenance.engine === "anthropic"
              ? "motor IA"
              : "motor determinístico"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/app/paginas/${id}/briefing`}>
            <Button variant="secondary">Ajustar briefing</Button>
          </Link>
          <Link href={`/app/paginas/${id}/publicacao`}>
            <Button variant="commercial">Decolar (publicar) ✦</Button>
          </Link>
        </div>
      </div>
      <PreviewFrame>
        <PageRenderer
          doc={validation.document}
          pageId={page.id}
          pageVersionId={version.id}
          preview
          showBadge
        />
      </PreviewFrame>
    </div>
  );
}
