import type { Metadata } from "next";
import Link from "next/link";
import {
  DevModeNotice,
  PasswordResetRequestForm,
} from "@/features/auth/auth-forms";
import { getAuthProvider } from "@/server/auth";

export const metadata: Metadata = { title: "Recuperar senha" };
// O provedor é escolhido pelo ambiente de runtime, nunca no build.
export const dynamic = "force-dynamic";

export default function RecuperarSenhaPage() {
  const provider = getAuthProvider();
  return (
    <div>
      <h1
        style={{ fontFamily: "var(--font-editorial)" }}
        className="auth-title"
      >
        Recuperar senha
      </h1>
      <p className="mt-2 mb-6 text-sm text-ink-600">
        Informe o e-mail da conta. Enviamos um link para você criar uma senha
        nova.
      </p>
      {provider.capabilities.passwordRecovery ? (
        <PasswordResetRequestForm />
      ) : (
        <DevModeNotice />
      )}
      <p className="mt-6 text-center text-sm text-ink-600">
        Lembrou?{" "}
        <Link className="font-semibold text-electric-600" href="/entrar">
          Entrar
        </Link>
      </p>
    </div>
  );
}
