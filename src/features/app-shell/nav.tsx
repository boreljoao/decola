"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/components/ui";

/**
 * Navegação do painel com indicação da rota ativa.
 * `aria-current="page"` faz o leitor de tela anunciar onde a pessoa está —
 * a marcação visual sozinha não comunica isso.
 */

interface NavLink {
  href: string;
  label: string;
  /** `/app` casa exatamente; as demais casam por prefixo (subrotas). */
  exact?: boolean;
}

const LINKS: NavLink[] = [
  { href: "/app", label: "Minhas páginas", exact: true },
  { href: "/app/criar", label: "Criar página" },
  { href: "/app/diario-de-bordo", label: "Diário de Bordo" },
  { href: "/app/marketplace", label: "Marketplace" },
  { href: "/app/cobranca", label: "Cobrança" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-0.5 md:flex" aria-label="Principal">
      {LINKS.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "relative rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "text-ink-900"
                : "text-ink-600 hover:bg-ink-900/5 hover:text-ink-900",
            )}
          >
            {link.label}
            {active && (
              <span
                aria-hidden="true"
                className="absolute inset-x-3 -bottom-[13px] h-0.5 rounded-full bg-electric-600"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/** Abas de etapa do projeto, com a atual destacada. */
export function ProjectTabs({
  projectId,
  tabs,
}: {
  projectId: string;
  tabs: ReadonlyArray<{ slug: string; label: string }>;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Etapas do projeto"
      className="flex flex-wrap gap-0.5 border-b border-ink-900/10"
    >
      {tabs.map((tab) => {
        const href = `/app/paginas/${projectId}/${tab.slug}`;
        const active = pathname === href;
        return (
          <Link
            key={tab.slug}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "relative rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "text-electric-700"
                : "text-ink-600 hover:bg-ink-900/5 hover:text-ink-900",
            )}
          >
            {tab.label}
            {active && (
              <span
                aria-hidden="true"
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-electric-600"
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
