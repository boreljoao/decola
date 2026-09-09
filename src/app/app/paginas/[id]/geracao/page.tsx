import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Button, EmptyState } from "@/components/ui";
import {
  GenerationProgress,
  type StepView,
} from "@/features/generation/progress";
import { loadLatestGenerationJob, loadProject } from "@/features/projects/queries";
import { getDb } from "@/server/db";
import { generationSteps } from "@/server/db/schema";

export const dynamic = "force-dynamic";

const STEP_LABELS: Record<string, string> = {
  validate_briefing: "Lendo e validando o seu briefing",
  generate_document: "Compondo estratégia, seções e conteúdo",
  validate_document: "Verificando qualidade e coerência",
  create_version: "Montando a versão da sua página",
};

const STEP_ORDER = [
  "validate_briefing",
  "generate_document",
  "validate_document",
  "create_version",
];

export default async function GeracaoPage(
  props: PageProps<"/app/paginas/[id]/geracao">,
) {
  const { id } = await props.params;
  const data = await loadProject(id);
  if (!data) notFound();

  const job = await loadLatestGenerationJob(id);
  if (!job) {
    return (
      <EmptyState
        title="Nenhuma geração por aqui ainda"
        description="Conclua o briefing para a Decola compor a sua página."
        action={
          <Link href={`/app/paginas/${id}/briefing`}>
            <Button>Ir para o briefing</Button>
          </Link>
        }
      />
    );
  }

  const db = await getDb();
  const stepRows = await db.query.generationSteps.findMany({
    where: eq(generationSteps.generationJobId, job.id),
  });
  const byStep = new Map(stepRows.map((s) => [s.step, s]));

  const steps: StepView[] = STEP_ORDER.map((step) => ({
    step,
    label: STEP_LABELS[step] ?? step,
    status: (byStep.get(step)?.status ?? "pending") as StepView["status"],
  }));

  return (
    <div>
      <p className="mb-6 text-center text-sm text-ink-600">
        Motor em uso:{" "}
        <strong>
          {job.engine === "anthropic"
            ? "IA (Claude)"
            : "composição determinística Decola"}
        </strong>
        {job.engine === "rules" &&
          " — a geração por IA é ativada ao configurar a chave do provedor."}
      </p>
      <GenerationProgress
        projectId={id}
        jobStatus={job.status}
        steps={steps}
        error={job.error}
      />
    </div>
  );
}
