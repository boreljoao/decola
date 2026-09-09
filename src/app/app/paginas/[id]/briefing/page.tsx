import { notFound } from "next/navigation";
import { BriefingWizard } from "@/features/briefing/wizard";
import type { BriefingAnswers } from "@/features/briefing/questions";
import { loadBriefingWithDraft, loadProject } from "@/features/projects/queries";

export default async function BriefingPage(
  props: PageProps<"/app/paginas/[id]/briefing">,
) {
  const { id } = await props.params;
  const data = await loadProject(id);
  if (!data) notFound();
  const briefingData = await loadBriefingWithDraft(id);
  if (!briefingData) notFound();

  const initialAnswers = (briefingData.draft?.answers ?? {}) as BriefingAnswers;

  // pré-preenche nicho e nome a partir da criação do projeto
  if (!initialAnswers["oferta.nicho"]) {
    initialAnswers["oferta.nicho"] = {
      value: data.project.niche,
      origin: "user",
    };
  }
  if (!initialAnswers["identidade.nome"]) {
    initialAnswers["identidade.nome"] = {
      value: data.project.name,
      origin: "user",
    };
  }

  return (
    <BriefingWizard
      projectId={id}
      mode={briefingData.briefing.mode}
      initialAnswers={initialAnswers}
    />
  );
}
