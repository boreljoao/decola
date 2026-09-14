import type { Metadata } from "next";
import { SignInForm } from "@/features/auth/auth-forms";
import { getAuthProvider } from "@/server/auth";

export const metadata: Metadata = { title: "Entrar" };

export default async function EntrarPage(props: PageProps<"/entrar">) {
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
        Bem-vindo de volta
      </h1>
      <p className="mt-2 mb-6 text-sm text-ink-600">
        Entre para acompanhar suas páginas.
      </p>
      {searchParams.aviso === "link" && (
        <p
          role="status"
          className="mb-6 rounded-xl bg-warning-600/10 px-4 py-3 text-sm text-warning-600"
        >
          Não deu para concluir pelo link: ele expirou, já foi usado ou foi
          aberto em outro navegador. Se você estava confirmando o e-mail, ele
          pode já estar confirmado — tente entrar.
        </p>
      )}
      <SignInForm
        passwordLogin={provider.capabilities.passwordLogin}
        next={next}
      />
    </div>
  );
}
