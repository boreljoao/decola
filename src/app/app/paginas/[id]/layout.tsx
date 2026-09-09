import Link from "next/link";
import { notFound } from "next/navigation";
import { loadProject } from "@/features/projects/queries";

const TABS = [
  { slug: "briefing", label: "Briefing" },
  { slug: "geracao", label: "Geração" },
  { slug: "preview", label: "Preview" },
  { slug: "publicacao", label: "Publicação" },
  { slug: "leads", label: "Leads" },
  { slug: "metricas", label: "Métricas" },
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
      <nav
        aria-label="Etapas do projeto"
        className="flex flex-wrap gap-1 border-b border-ink-900/10"
      >
        {TABS.map((tab) => (
          <Link
            key={tab.slug}
            href={`/app/paginas/${id}/${tab.slug}`}
            className="rounded-t-lg px-4 py-2.5 text-sm font-medium text-ink-600 hover:bg-ink-900/5 hover:text-ink-900"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      <div>{children}</div>
    </div>
  );
}
