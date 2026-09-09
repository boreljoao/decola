import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { acceptInviteAction } from "@/features/team/actions";
import { getCurrentUser } from "@/server/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Convite de equipe",
  robots: { index: false },
};

export default async function ConvitePage(
  props: PageProps<"/convite/[token]">,
) {
  const { token } = await props.params;
  const user = await getCurrentUser();

  // Sem sessão, guarda o destino e volta para cá depois de entrar.
  if (!user) {
    redirect(`/entrar?next=${encodeURIComponent(`/convite/${token}`)}`);
  }

  const result = await acceptInviteAction(token);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <Card className="w-full max-w-md text-center">
        {result.ok ? (
          <>
            <h1
              style={{ fontFamily: "var(--font-sora)" }}
              className="text-2xl font-bold"
            >
              Convite aceito ✦
            </h1>
            <p className="mt-2 text-sm text-ink-600">
              Você agora faz parte do workspace{" "}
              <strong>{result.workspaceName}</strong>.
            </p>
            <Link href="/app" className="mt-6 inline-block">
              <Button variant="commercial">Ir para as páginas</Button>
            </Link>
          </>
        ) : (
          <>
            <h1
              style={{ fontFamily: "var(--font-sora)" }}
              className="text-2xl font-bold"
            >
              Não foi possível aceitar
            </h1>
            <p className="mt-2 text-sm text-ink-600">{result.error}</p>
            <Link href="/app" className="mt-6 inline-block">
              <Button variant="secondary">Voltar ao painel</Button>
            </Link>
          </>
        )}
      </Card>
    </div>
  );
}
