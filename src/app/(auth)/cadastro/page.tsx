import type { Metadata } from "next";
import { SignUpForm } from "@/features/auth/auth-forms";
import { getAuthProvider } from "@/server/auth";

export const metadata: Metadata = { title: "Criar conta" };

export default async function CadastroPage(props: PageProps<"/cadastro">) {
  const searchParams = await props.searchParams;
  const provider = getAuthProvider();
  const next =
    typeof searchParams.next === "string" ? searchParams.next : undefined;
  return (
    <div>
      <h1
        style={{ fontFamily: "var(--font-editorial)" }}
        className="auth-title"
      >
        Crie sua conta
      </h1>
      <p className="mt-2 mb-6 text-sm text-ink-600">
        Comece grátis: responda o briefing e veja sua página nascer.
      </p>
      <SignUpForm
        passwordLogin={provider.capabilities.passwordLogin}
        next={next}
      />
    </div>
  );
}
