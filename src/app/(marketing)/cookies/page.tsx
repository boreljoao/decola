import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cookies" };

export default function CookiesPage() {
  return (
    <main className="legal-page mx-auto w-full max-w-3xl px-5 py-16 sm:px-8">
      <h1
        style={{ fontFamily: "var(--font-editorial)" }}
        className="page-heading text-3xl font-bold"
      >
        Política de cookies
      </h1>
      <p className="mt-2 text-sm text-ink-600">
        Minuta em vigor durante o desenvolvimento — sujeita a revisão jurídica
        antes do lançamento comercial.
      </p>

      <div className="mt-8 grid gap-6 leading-relaxed text-ink-600">
        <section>
          <h2 className="text-lg font-semibold text-ink-900">
            No site da Decola
          </h2>
          <p className="mt-2">
            Usamos um cookie estritamente necessário para manter você conectado
            à sua conta. Ele não serve para publicidade e não é compartilhado.
            Sem ele, não é possível entrar no painel.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-900">
            Nas páginas criadas com a Decola
          </h2>
          <p className="mt-2">
            A contagem de visitas e cliques é{" "}
            <strong>first-party e sem cookies</strong>: registramos o evento sem
            identificador persistente e sem rastrear a pessoa entre sites. Por
            isso ela funciona mesmo quando o visitante recusa cookies opcionais.
          </p>
          <p className="mt-3">
            Se o dono da página conectar ferramentas de terceiros (Meta Pixel ou
            Google Analytics), esses scripts{" "}
            <strong>só são carregados depois do aceite explícito</strong> do
            visitante. Antes da escolha, eles ficam desligados; recusar é tão
            fácil quanto aceitar, no mesmo aviso.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-900">
            Como mudar sua escolha
          </h2>
          <p className="mt-2">
            A preferência fica salva no seu navegador. Limpar os dados do site
            faz o aviso aparecer novamente, permitindo uma nova escolha. Quando
            a política muda de versão, perguntamos de novo.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-900">
            O que não fazemos
          </h2>
          <p className="mt-2">
            Não usamos fingerprinting nem qualquer técnica para contornar a
            recusa de cookies. Dados enviados em formulários pertencem ao dono
            da página e nunca entram na medição agregada.
          </p>
        </section>
      </div>
    </main>
  );
}
