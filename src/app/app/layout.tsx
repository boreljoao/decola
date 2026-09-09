import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/features/app-shell/nav";

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
      <header className="sticky top-0 z-40 border-b border-ink-900/8 bg-card/85 backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-8">
            <Link
              href="/app"
              style={{ fontFamily: "var(--font-sora)" }}
              className="text-lg font-bold tracking-tight"
            >
              decola<span className="text-electric-600">✦</span>
            </Link>
            <AppNav />
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/app/equipe"
              className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-900/5 hover:text-ink-900 sm:inline"
            >
              Equipe
            </Link>
            <Link
              href="/app/conta"
              className="hidden items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-900/5 hover:text-ink-900 sm:inline-flex"
            >
              <span
                aria-hidden="true"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-electric-600/10 text-xs font-bold text-electric-700"
              >
                {ctx.workspaceName.charAt(0).toUpperCase()}
              </span>
              {ctx.workspaceName}
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink-600 transition-colors hover:bg-ink-900/5 hover:text-ink-900"
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
