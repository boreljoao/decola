import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { Badge, Card, EmptyState } from "@/components/ui";
import { loadPageForProject, loadProject } from "@/features/projects/queries";
import { getDb } from "@/server/db";
import { leads } from "@/server/db/schema";

export const dynamic = "force-dynamic";

const LEAD_STATUS: Record<string, { label: string; tone: "info" | "warning" | "success" }> = {
  novo: { label: "Novo", tone: "info" },
  em_atendimento: { label: "Em atendimento", tone: "warning" },
  concluido: { label: "Concluído", tone: "success" },
};

export default async function LeadsPage(
  props: PageProps<"/app/paginas/[id]/leads">,
) {
  const { id } = await props.params;
  const data = await loadProject(id);
  if (!data) notFound();

  const page = await loadPageForProject(id);
  if (!page) {
    return (
      <EmptyState
        title="Sem página, sem leads ainda"
        description="Publique sua página para começar a receber contatos aqui."
      />
    );
  }

  const db = await getDb();
  const rows = await db.query.leads.findMany({
    where: eq(leads.pageId, page.id),
    orderBy: [desc(leads.createdAt)],
    limit: 200,
  });

  if (rows.length === 0) {
    return (
      <EmptyState
        title="Nenhum contato recebido ainda"
        description={
          page.status === "live"
            ? "Sua página está no ar. Assim que alguém preencher o formulário, o contato aparece aqui e você recebe um aviso por e-mail."
            : "Publique sua página para começar a receber contatos."
        }
      />
    );
  }

  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-ink-900/10 text-xs uppercase tracking-wide text-ink-600">
            <th className="px-5 py-3.5 font-semibold">Recebido</th>
            <th className="px-5 py-3.5 font-semibold">Nome</th>
            <th className="px-5 py-3.5 font-semibold">Contato</th>
            <th className="px-5 py-3.5 font-semibold">Mensagem</th>
            <th className="px-5 py-3.5 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((lead) => {
            const d = lead.data as Record<string, string | undefined>;
            const status = LEAD_STATUS[lead.status] ?? LEAD_STATUS.novo;
            return (
              <tr key={lead.id} className="border-b border-ink-900/5">
                <td className="tabular whitespace-nowrap px-5 py-3.5 text-ink-600">
                  {lead.createdAt.toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-5 py-3.5 font-medium">{d.nome ?? "—"}</td>
                <td className="px-5 py-3.5">
                  {[d.telefone, d.email].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="max-w-[280px] truncate px-5 py-3.5 text-ink-600">
                  {d.mensagem ?? "—"}
                </td>
                <td className="px-5 py-3.5">
                  <Badge tone={status.tone}>{status.label}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
