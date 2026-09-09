import type { Metadata } from "next";
import { SignInForm } from "@/features/auth/auth-forms";
import { getAuthProvider } from "@/server/auth";

export const metadata: Metadata = { title: "Entrar" };

export default async function EntrarPage(props: PageProps<"/entrar">) {
  const searchParams = await props.searchParams;
  const provider = getAuthProvider();
  const next = typeof searchParams.next === "string" ? searchParams.next : undefined;
  return (
    <div>
      <h1
        style={{ fontFamily: "var(--font-sora)" }}
        className="text-2xl font-bold"
      >
        Bem-vindo de volta
      </h1>
      <p className="mt-2 mb-6 text-sm text-mist-300">
        Entre para acompanhar suas páginas.
      </p>
      <SignInForm passwordLogin={provider.capabilities.passwordLogin} next={next} />
    </div>
  );
}
