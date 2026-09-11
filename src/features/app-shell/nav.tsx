"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CreditCard,
  LayoutGrid,
  Menu,
  Plus,
  Plug,
  Settings,
  Store,
  Users,
} from "lucide-react";
import { useRef } from "react";
import { cx } from "@/components/ui";

const LINKS = [
  { href: "/app", label: "Minhas páginas", icon: LayoutGrid, exact: true },
  { href: "/app/criar", label: "Criar página", icon: Plus },
  { href: "/app/diario-de-bordo", label: "Diário de Bordo", icon: BookOpen },
  { href: "/app/marketplace", label: "Marketplace", icon: Store },
  { href: "/app/integracoes", label: "Integrações", icon: Plug },
  { href: "/app/equipe", label: "Equipe", icon: Users },
  { href: "/app/cobranca", label: "Cobrança", icon: CreditCard },
  { href: "/app/conta", label: "Minha conta", icon: Settings },
];

export function AppNav() {
  const pathname = usePathname();
  const mobile = useRef<HTMLDetailsElement>(null);
  const links = LINKS.map((link) => {
    const active = link.exact
      ? pathname === link.href
      : pathname.startsWith(link.href);
    return (
      <Link
        key={link.href}
        href={link.href}
        aria-current={active ? "page" : undefined}
        onClick={() => {
          if (mobile.current) mobile.current.open = false;
        }}
      >
        <link.icon size={18} strokeWidth={1.6} aria-hidden="true" />
        {link.label}
      </Link>
    );
  });
  return (
    <div className="workspace-navigation">
      <nav className="workspace-desktop-nav" aria-label="Principal">
        {links}
      </nav>
      <details
        className="workspace-mobile-nav"
        ref={mobile}
        key={pathname}
        onKeyDown={(e) => {
          if (e.key === "Escape" && mobile.current) {
            mobile.current.open = false;
            mobile.current.querySelector("summary")?.focus();
          }
        }}
      >
        <summary>
          <Menu size={18} aria-hidden="true" />
          <span>Navegação</span>
        </summary>
        <nav aria-label="Principal no celular">{links}</nav>
      </details>
    </div>
  );
}

export function ProjectTabs({
  projectId,
  tabs,
}: {
  projectId: string;
  tabs: ReadonlyArray<{ slug: string; label: string }>;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label="Etapas do projeto" className="project-tabs">
      {tabs.map((tab) => {
        const href = "/app/paginas/" + projectId + "/" + tab.slug;
        const active = pathname === href;
        return (
          <Link
            key={tab.slug}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cx("project-tab", active && "project-tab-active")}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
