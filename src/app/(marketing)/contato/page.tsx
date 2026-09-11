import type { Metadata } from "next";
import { Reveal } from "@/components/marketing/reveal";
import { ContactForm } from "@/features/marketplace/forms";

export const metadata: Metadata = {
  title: "Contato",
  description: "Fale com a equipe da Decola.",
};

export default function ContatoPage() {
  return (
    <main className="interior-page relative mx-auto w-full max-w-2xl px-5 py-16 sm:px-8">
      <Reveal>
        <h1
          style={{ fontFamily: "var(--font-editorial)" }}
          className="page-heading text-balance text-4xl font-bold tracking-tight"
        >
          Fale com a Decola
        </h1>
        <p className="mt-4 text-lg text-ink-600">
          Dúvida sobre a plataforma, sugestão ou problema com sua página?
          Escreva aqui — sua mensagem fica registrada e respondemos no e-mail
          informado.
        </p>
      </Reveal>

      <Reveal delay={0.05}>
        <div className="mt-10 gradient-border rounded-2xl bg-card p-7 sm:p-9">
          <ContactForm kind="contato" />
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <p className="mt-8 text-sm text-ink-600">
          A Decola está em desenvolvimento e ainda não divulga endereço
          comercial nem telefone de atendimento — quando existirem, aparecem
          aqui e no rodapé. Não inventamos dados de contato.
        </p>
      </Reveal>
    </main>
  );
}
