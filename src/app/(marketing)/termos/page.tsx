import type { Metadata } from "next";

export const metadata: Metadata = { title: "Termos de uso" };

export default function TermosPage() {
  return (
    <main className="legal-page mx-auto w-full max-w-3xl px-5 py-16 sm:px-8">
      <h1
        style={{ fontFamily: "var(--font-editorial)" }}
        className="page-heading text-3xl font-bold"
      >
        Termos de uso
      </h1>
      <p className="mt-2 text-sm text-ink-600">
        Minuta em vigor durante o período de desenvolvimento — sujeita a revisão
        jurídica antes do lançamento comercial.
      </p>
      <div className="mt-8 grid gap-5 leading-relaxed text-ink-600">
        <p>
          1. A Decola é uma plataforma que gera landing pages e materiais de
          divulgação a partir de informações fornecidas por você. O conteúdo
          publicado é de sua responsabilidade: forneça apenas informações
          verdadeiras sobre o seu negócio, ofertas, provas e credenciais.
        </p>
        <p>
          2. O plano Free permite publicar 1 página em subdomínio Decola, com a
          marca Decola visível. Planos pagos, quando disponíveis para
          contratação, têm preços e condições exibidos antes do pagamento.
        </p>
        <p>
          3. A Decola não garante volume de vendas, contatos ou resultados de
          marketing. As métricas exibidas refletem eventos reais registrados na
          sua página.
        </p>
        <p>
          4. É proibido usar a plataforma para conteúdo ilegal, enganoso, que
          infrinja direitos de terceiros ou que colete dados de forma abusiva.
          Páginas nessas condições podem ser despublicadas.
        </p>
        <p>
          5. Você pode exportar seus dados e excluir sua conta. Registros
          exigidos por obrigações legais ou fiscais podem ser retidos pelo
          período exigido em lei.
        </p>
      </div>
    </main>
  );
}
