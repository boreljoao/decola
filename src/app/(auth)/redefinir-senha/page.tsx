import type { Metadata } from "next";
import Link from "next/link";
import { DevModeNotice, NewPasswordForm } from "@/features/auth/auth-forms";
import { getAuthProvider, getCurrentUser } from "@/server/auth";

export const metadata: Metadata = { title: "Criar senha nova" };
export const dynamic = "force-dynamic";

/**
 * Chega-se aqui pelo link de recuperação: a rota de callback troca o código
 * pela sessão e redireciona. Sem sessão, o link expirou ou já foi usado.
 */
export default async function RedefinirSenhaPage() {
  const provider = getAuthProvider();
  const user = provider.capabilities.passwordRecovery
    ? await getCurrentUser()
    : null;

  return (
    <div>
      <h1
        style={{ fontFamily: "var(--font-editorial)" }}
        className="auth-title"
      >
        Criar senha nova
      </h1>
      {!provider.capabilities.passwordRecovery ? (
        <div className="mt-6">
          <DevModeNotice />
        </div>
      ) : user ? (
        <>
          <p className="mt-2 mb-6 text-sm text-ink-600">
            Conta <strong>{user.email}</strong>. Escolha a nova senha.
          </p>
          <NewPasswordForm />
        </>
      ) : (
        <>
          <p className="mt-2 mb-6 text-sm text-ink-600">
            Este link expirou ou já foi usado.
          </p>
          <Link
            className="font-semibold text-electric-600"
            href="/recuperar-senha"
          >
            Pedir um novo link
          </Link>
        </>
      )}
    </div>
  );
}
