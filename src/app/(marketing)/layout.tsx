import Link from "next/link";

const NAV = [
  { href: "/como-funciona", label: "Como funciona" },
  { href: "/exemplos", label: "Exemplos" },
  { href: "/precos", label: "Preços" },
  { href: "/profissionais", label: "Profissionais" },
] as const;

const FOOTER_COMPANY = [
  { href: "/agencias", label: "Para agências" },
  { href: "/contato", label: "Contato" },
] as const;

const FOOTER_LEGAL = [
  { href: "/termos", label: "Termos de uso" },
  { href: "/privacidade", label: "Privacidade" },
  { href: "/cookies", label: "Cookies" },
] as const;

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-night-900 text-mist-100">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-night-900/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <Link
            href="/"
            style={{ fontFamily: "var(--font-sora)" }}
            className="text-xl font-bold tracking-tight"
          >
            decola<span className="text-electric-400">✦</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-mist-300 transition-colors hover:bg-white/5 hover:text-mist-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/entrar"
              className="rounded-lg px-3 py-2 text-sm font-medium text-mist-300 transition-colors hover:text-mist-100"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="rounded-xl bg-ember-500 px-4 py-2 text-sm font-semibold text-night-950 transition-colors hover:bg-ember-400"
            >
              Decolar grátis
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-white/5">
        <div className="mx-auto grid w-full max-w-[1240px] gap-8 px-5 py-12 sm:px-8 md:grid-cols-3">
          <div>
            <p style={{ fontFamily: "var(--font-sora)" }} className="text-lg font-bold">
              decola<span className="text-electric-400">✦</span>
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-mist-500">
              Você não precisa aprender design. Você precisa ser bem perguntado.
              E nunca mais voar sozinho depois da decolagem.
            </p>
          </div>
          <nav aria-label="Produto" className="text-sm">
            <p className="font-semibold text-mist-300">Produto</p>
            <ul className="mt-3 grid gap-2 text-mist-500">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-mist-100">
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/cadastro" className="hover:text-mist-100">
                  Criar conta grátis
                </Link>
              </li>
            </ul>
          </nav>
          <div className="grid gap-6 text-sm sm:grid-cols-2">
            <nav aria-label="Empresa">
              <p className="font-semibold text-mist-300">Empresa</p>
              <ul className="mt-3 grid gap-2 text-mist-500">
                {FOOTER_COMPANY.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="hover:text-mist-100">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Legal">
              <p className="font-semibold text-mist-300">Legal</p>
              <ul className="mt-3 grid gap-2 text-mist-500">
                {FOOTER_LEGAL.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="hover:text-mist-100">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
        <div className="border-t border-white/5 py-5 text-center text-xs text-mist-700">
          © {new Date().getFullYear()} Decola. Plataforma em desenvolvimento.
        </div>
      </footer>
    </div>
  );
}
