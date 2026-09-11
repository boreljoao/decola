import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { Brand } from "@/components/brand";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-shell">
      <a href="#auth-content" className="skip-link">
        Pular para o formulário
      </a>
      <section className="auth-story">
        <Brand />
        <div>
          <span className="eyebrow">SEU PRÓXIMO CAPÍTULO</span>
          <h2>
            Tem um mundo
            <br />
            esperando pelo
            <br />
            <em>seu negócio.</em>
          </h2>
          <p>
            Comece com a sua história.
            <br />O próximo passo, a gente dá junto.
          </p>
          <span className="auth-promise">
            <Check size={16} aria-hidden="true" /> Primeira página grátis, sem
            cartão.
          </span>
        </div>
        <p className="auth-story-foot">Boas ideias merecem decolar.</p>
      </section>
      <main id="auth-content" className="auth-main">
        <div className="auth-mobile-brand">
          <Brand />
        </div>
        <Link href="/" className="text-link auth-back">
          <ArrowLeft size={15} aria-hidden="true" /> Voltar para o início
        </Link>
        <div className="auth-form-panel">
          {children}
          <p className="auth-legal">
            Ao usar a Decola, consulte nossos{" "}
            <Link href="/termos">Termos de uso</Link> e a{" "}
            <Link href="/privacidade">Política de Privacidade</Link>.
          </p>
        </div>
        <span className="auth-bottom">Feita para negócios brasileiros.</span>
      </main>
    </div>
  );
}
