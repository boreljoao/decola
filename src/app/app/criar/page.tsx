import type { Metadata } from "next";
import { CreateProjectForm } from "@/features/projects/create-form";

export const metadata: Metadata = { title: "Criar página" };

export default function CriarPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 style={{ fontFamily: "var(--font-sora)" }} className="text-3xl font-bold">
        Vamos criar sua página
      </h1>
      <p className="mt-2 text-sm text-ink-600">
        Primeiro, o essencial. Depois vem o briefing — é ele que dá identidade à
        sua página.
      </p>
      <div className="mt-8">
        <CreateProjectForm />
      </div>
    </div>
  );
}
