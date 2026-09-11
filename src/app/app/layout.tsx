import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, HelpCircle, LogOut } from "lucide-react";
import { AppNav } from "@/features/app-shell/nav";
import { Brand } from "@/components/brand";
import { env } from "@/config/env";
import { signOutAction } from "@/features/auth/actions";
import { getCurrentUser, requireWorkspace } from "@/server/auth";

export const dynamic = "force-dynamic";
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?next=/app");
  const ctx = await requireWorkspace();
  const devMode =
    env().mode !== "production" && !env().capabilities.supabaseAuth;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace-content">
        Pular para o conteúdo
      </a>
      <aside className="workspace-sidebar">
        <div className="workspace-logo">
          <Brand href="/app" />
        </div>
        <p className="workspace-caption">SEU ESPAÇO DE CRIAÇÃO</p>
        <AppNav />
        <div className="workspace-help">
          <HelpCircle size={20} strokeWidth={1.4} aria-hidden="true" />
          <p>
            Uma mão para
            <br />o próximo passo.
          </p>
          <Link href="/contato" className="text-link">
            Fale com a Decola <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-header">
          <div className="workspace-identity">
            <span className="workspace-avatar" aria-hidden="true">
              {ctx.workspaceName.charAt(0).toUpperCase()}
            </span>
            <div>
              <span>Meu espaço</span>
              <p>{ctx.workspaceName}</p>
            </div>
          </div>
          <div className="workspace-header-actions">
            <Link href="/" className="text-link">
              Ver site <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
            <form action={signOutAction}>
              <button type="submit" className="workspace-signout">
                <LogOut size={16} aria-hidden="true" />
                <span>Sair</span>
              </button>
            </form>
          </div>
        </header>
        {devMode && (
          <p className="workspace-dev-note">
            Ambiente de desenvolvimento · autenticação simplificada e
            integrações locais.
          </p>
        )}
        <main
          id="workspace-content"
          tabIndex={-1}
          className="workspace-content"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
