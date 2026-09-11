"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Brand } from "@/components/brand";

const NAV = [
  { href: "/como-funciona", label: "Como funciona" },
  { href: "/exemplos", label: "Exemplos" },
  { href: "/precos", label: "Preços" },
  { href: "/profissionais", label: "Profissionais" },
] as const;

export function MarketingHeader() {
  const pathname = usePathname();
  const menu = useRef<HTMLDetailsElement>(null);
  function closeMenu() {
    if (menu.current) menu.current.open = false;
  }
  return (
    <header className="site-header">
      <div className="site-container header-inner">
        <Brand />
        <nav className="desktop-nav" aria-label="Principal">
          {NAV.map((item) => (
            <Link
              href={item.href}
              key={item.href}
              aria-current={pathname.startsWith(item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <Link href="/entrar" className="login-link">
            Entrar
          </Link>
          <Link href="/cadastro" className="action action-dark action-small">
            Começar grátis <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
          <details
            ref={menu}
            key={pathname}
            className="mobile-menu"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                closeMenu();
                menu.current?.querySelector("summary")?.focus();
              }
            }}
          >
            <summary aria-label="Menu de navegação">
              <Menu className="menu-open-icon" size={22} />
              <X className="menu-close-icon" size={22} />
            </summary>
            <nav aria-label="Navegação no celular">
              {NAV.map((item) => (
                <Link
                  href={item.href}
                  key={item.href}
                  onClick={closeMenu}
                  aria-current={
                    pathname.startsWith(item.href) ? "page" : undefined
                  }
                >
                  {item.label}
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              ))}
              <Link href="/agencias" onClick={closeMenu}>
                Para agências
              </Link>
              <Link href="/contato" onClick={closeMenu}>
                Contato
              </Link>
              <Link href="/entrar" onClick={closeMenu}>
                Entrar na minha conta
              </Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
