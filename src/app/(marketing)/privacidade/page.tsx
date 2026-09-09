import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacidade" };

export default function PrivacidadePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-8">
      <h1 style={{ fontFamily: "var(--font-sora)" }} className="text-3xl font-bold">
        Política de privacidade
      </h1>
      <p className="mt-2 text-sm text-mist-500">
        Minuta em vigor durante o período de desenvolvimento — sujeita a revisão
        jurídica antes do lançamento comercial.
      </p>
      <div className="mt-8 grid gap-5 leading-relaxed text-mist-300">
        <p>
          <strong className="text-mist-100">O que coletamos de você (cliente Decola):</strong>{" "}
          e-mail, nome e as respostas do seu briefing — usados exclusivamente
          para gerar e operar suas páginas. Não vendemos seus dados.
        </p>
        <p>
          <strong className="text-mist-100">O que as suas páginas coletam dos visitantes:</strong>{" "}
          medição first-party de eventos (visita, clique, envio de formulário)
          sem cookies e sem identificadores persistentes por padrão. Os dados de
          formulários enviados pelos visitantes (leads) pertencem a você e ficam
          acessíveis apenas no seu painel — nunca entram na medição agregada.
        </p>
        <p>
          <strong className="text-mist-100">Provedores:</strong> a operação usa
          serviços de infraestrutura (hospedagem, banco de dados, e-mail
          transacional e, quando configurado, geração por IA). A lista de
          subprocessadores ativos é mantida na documentação da plataforma e
          reflete apenas integrações realmente habilitadas.
        </p>
        <p>
          <strong className="text-mist-100">Seus direitos:</strong> você pode
          solicitar exportação e exclusão dos seus dados. A exclusão remove ou
          anonimiza os dados de produto; registros exigidos por lei podem ser
          retidos pelo período obrigatório.
        </p>
      </div>
    </main>
  );
}
