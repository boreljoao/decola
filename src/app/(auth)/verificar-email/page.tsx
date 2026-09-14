import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ResendConfirmationForm } from "@/features/auth/auth-forms";
import { PENDING_EMAIL_COOKIE } from "@/features/auth/flow";

export const metadata: Metadata = { title: "Confirme seu e-mail" };
export const dynamic = "force-dynamic";

export default async function VerificarEmailPage() {
  const email = (await cookies()).get(PENDING_EMAIL_COOKIE)?.value;
  return (
    <div>
      <h1
        style={{ fontFamily: "var(--font-editorial)" }}
        className="auth-title"
      >
        Confirme seu e-mail
      </h1>
      <p className="mt-2 mb-6 text-sm text-ink-600">
        {email ? (
          <>
            Enviamos um link de confirmação para <strong>{email}</strong>.
          </>
        ) : (
          "Se você acabou de se cadastrar, enviamos um link de confirmação para o seu e-mail."
        )}{" "}
        Abra o link neste mesmo navegador para entrar direto no painel.
      </p>
      {email && <ResendConfirmationForm />}
      <p className="mt-6 text-center text-sm text-ink-600">
        Já confirmou?{" "}
        <Link className="font-semibold text-electric-600" href="/entrar">
          Entrar
        </Link>
      </p>
    </div>
  );
}
