import Link from "next/link";
import { redirect } from "next/navigation";

// Área autenticada: sempre renderizada por requisição (sessão via cookies).
export const dynamic = "force-dynamic";
import { env } from "@/config/env";
import { signOutAction } from "@/features/auth/actions";
import { getCurrentUser, requireWorkspace } from "@/server/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?next=/app");
  const ctx = await requireWorkspace();
  const devMode = env().mode !== "production" && !env().capabilities.supabaseAuth;

  return (
    <div className="min-h-screen bg-paper text-ink-900">
      {devMode && (
        <p className="bg-night-900 px-4 py-1.5 text-center text-xs font-medium text-mist-300">
          Modo de desenvolvimento — autenticação simplificada e integrações locais
          identificadas.
        </p>
      )}
      <header className="border-b border-ink-900/10 bg-card">
        <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-8">
            <Link
              href="/app"
              style={{ fontFamily: "var(--font-sora)" }}
              className="text-lg font-bold tracking-tight"
            >
              decola<span className="text-electric-600">✦</span>
            </Link>
            <nav className="hidden items-center gap-1 sm:flex" aria-label="Principal">
              <Link
                href="/app"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-600 hover:bg-ink-900/5 hover:text-ink-900"
              >
                Minhas páginas
              </Link>
              <Link
                href="/app/criar"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-600 hover:bg-ink-900/5 hover:text-ink-900"
              >
                Criar página
              </Link>
              <Link
                href="/app/diario-de-bordo"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-600 hover:bg-ink-900/5 hover:text-ink-900"
              >
                Diário de Bordo
              </Link>
              <Link
                href="/app/marketplace"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-600 hover:bg-ink-900/5 hover:text-ink-900"
              >
                Marketplace
              </Link>
              <Link
                href="/app/cobranca"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-600 hover:bg-ink-900/5 hover:text-ink-900"
              >
                Cobrança
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/app/equipe"
              className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-ink-600 hover:bg-ink-900/5 sm:inline"
            >
              Equipe
            </Link>
            <Link
              href="/app/conta"
              className="hidden text-sm text-ink-600 hover:text-ink-900 sm:inline"
            >
              {ctx.workspaceName}
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-600 hover:bg-ink-900/5"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1240px] px-6 py-10">{children}</main>
    </div>
  );
}
