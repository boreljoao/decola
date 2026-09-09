import type { Metadata } from "next";
import { Card } from "@/components/ui";
import { DangerZone, ExportDataButton } from "@/features/privacy/privacy-ui";
import { describeDeletionImpact } from "@/features/privacy/service";
import { getAuthProvider, requireWorkspace } from "@/server/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Minha conta" };

export default async function ContaPage() {
  const ctx = await requireWorkspace();
  const impact = await describeDeletionImpact(ctx.user.profileId);
  const provider = getAuthProvider();

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div>
        <h1 style={{ fontFamily: "var(--font-sora)" }} className="text-3xl font-bold">
          Minha conta
        </h1>
        <p className="mt-1 text-sm text-ink-600">
          Seus dados, sua exportação e o encerramento da conta.
        </p>
      </div>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-600">
          Dados de acesso
        </h2>
        <dl className="mt-4 grid gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-600">E-mail</dt>
            <dd className="font-medium">{ctx.user.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-600">Nome</dt>
            <dd className="font-medium">{ctx.user.displayName ?? "—"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-600">Workspace atual</dt>
            <dd className="font-medium">{ctx.workspaceName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-600">Autenticação</dt>
            <dd className="font-medium">
              {provider.kind === "supabase"
                ? "Supabase Auth (e-mail e senha)"
                : "Modo de desenvolvimento (sem senha)"}
            </dd>
          </div>
        </dl>
        {!provider.capabilities.passwordRecovery && (
          <p className="mt-4 rounded-lg bg-warning-600/10 px-3 py-2 text-xs text-warning-600">
            Troca e recuperação de senha ficam disponíveis quando o Supabase
            Auth estiver configurado neste ambiente.
          </p>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-600">
          Exportar meus dados
        </h2>
        <p className="mt-2 mb-4 text-sm text-ink-600">
          Gera um arquivo com seu perfil, briefings, páginas e os contatos
          recebidos nas suas páginas.
        </p>
        <ExportDataButton />
      </Card>

      <Card className="border-danger-600/30">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-danger-600">
          Excluir minha conta
        </h2>
        <div className="mt-3 grid gap-2 text-sm text-ink-600">
          <p>Ao excluir, isto acontece:</p>
          <ul className="ml-5 grid list-disc gap-1">
            <li>
              {impact.publishedPages.length > 0
                ? `${impact.publishedPages.length} página(s) publicada(s) saem do ar: ${impact.publishedPages.join(", ")}.`
                : "Nenhuma página publicada será afetada."}
            </li>
            <li>
              {impact.leadCount > 0
                ? `${impact.leadCount} contato(s) recebido(s) serão apagados — exporte antes se quiser guardá-los.`
                : "Nenhum contato recebido a apagar."}
            </li>
            <li>
              Você sai de {impact.workspacesOwned} workspace(s) próprio(s) e{" "}
              {impact.workspacesShared} compartilhado(s).
            </li>
            {impact.hasPaidHistory && (
              <li className="font-medium text-ink-900">
                Registros de pagamento são mantidos pelo prazo exigido por lei,
                desvinculados do seu perfil. Não podemos apagá-los.
              </li>
            )}
          </ul>
        </div>
        <div className="mt-5">
          <DangerZone email={ctx.user.email} />
        </div>
      </Card>
    </div>
  );
}
