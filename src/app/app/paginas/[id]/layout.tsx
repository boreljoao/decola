import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectTabs } from "@/features/app-shell/nav";
import { loadProject } from "@/features/projects/queries";

const TABS = [
  { slug: "briefing", label: "Briefing" },
  { slug: "geracao", label: "Geração" },
  { slug: "preview", label: "Preview" },
  { slug: "editor", label: "Editor" },
  { slug: "criativos", label: "Criativos" },
  { slug: "publicacao", label: "Publicação" },
  { slug: "leads", label: "Leads" },
  { slug: "metricas", label: "Métricas" },
  { slug: "experimentos", label: "Voo Contínuo" },
] as const;

export default async function ProjectLayout({
  children,
  params,
}: LayoutProps<"/app/paginas/[id]">) {
  const { id } = await params;
  const data = await loadProject(id);
  if (!data) notFound();

  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-600">
          <Link href="/app" className="hover:underline">
            Minhas páginas
          </Link>{" "}
          / {data.project.name}
        </p>
        <h1
          style={{ fontFamily: "var(--font-sora)" }}
          className="mt-1 text-2xl font-bold"
        >
          {data.project.name}
        </h1>
      </div>
      <ProjectTabs projectId={id} tabs={TABS} />
      <div>{children}</div>
    </div>
  );
}
