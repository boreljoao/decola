import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DEMO_FIXTURES } from "@/features/demo/fixtures";
import { hashAnswers } from "@/features/generation/pipeline";
import { generatePageDocument } from "@/features/generation/rules-engine";
import { PageRenderer } from "@/features/pages/renderer";

export const metadata: Metadata = { title: "Exemplo de página" };

export default async function ExemploPage(
  props: PageProps<"/exemplos/[slug]">,
) {
  const { slug } = await props.params;
  const fixture = DEMO_FIXTURES.find((f) => f.slug === slug);
  if (!fixture) notFound();

  const doc = generatePageDocument({
    briefingRevisionId: fixture.revisionId,
    answersHash: hashAnswers(fixture.answers),
    answers: fixture.answers,
  });

  return (
    <div>
      <div className="sticky top-[57px] z-30 border-b border-white/10 bg-night-900/90 px-4 py-2.5 text-center text-sm text-mist-300 backdrop-blur">
        Demonstração com negócio fictício ({fixture.nicheLabel}) — composta pelo
        motor real da Decola.{" "}
        <Link href="/cadastro" className="font-semibold text-ember-400 hover:underline">
          Crie a sua →
        </Link>
      </div>
      <PageRenderer
        doc={doc}
        pageId={fixture.revisionId}
        preview
        showBadge
      />
    </div>
  );
}
