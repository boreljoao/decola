import Link from "next/link";
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  Globe2,
  MessageSquare,
  MousePointer2,
  Play,
  ShieldCheck,
} from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { AmbientVideo } from "@/components/marketing/ambient-video";
import { HomeEntry } from "@/components/marketing/home-entry";
import { ProductPreview } from "@/components/marketing/product-preview";
import { ExampleGallery, getExamples } from "@/components/marketing/examples";
import { formatBRL, PLANS } from "@/config/commercial-policy";

export default function HomePage() {
  const { doc } = getExamples()[0];
  const hero = doc.sections.find((s) => s.type === "hero");
  const description =
    "Tratamentos faciais personalizados e protocolos de skincare para o dia a dia.";
  return (
    <main className="home-page">
      <HomeEntry />
      <section className="home-hero">
        <AmbientVideo />
        <div className="hero-copy site-container">
          <p className="hero-badge hero-enter">
            <span aria-hidden="true">✦</span> Boas ideias merecem decolar
          </p>
          <h1 className="hero-enter">
            Seu negócio.
            <br />
            <em>Um novo horizonte.</em>
          </h1>
          <p className="hero-description hero-enter">
            Você conta a sua história. A Decola transforma em uma página com a
            sua identidade, pronta para receber clientes.
          </p>
          <div className="hero-actions hero-enter">
            <Link href="/cadastro" className="action action-dark">
              Criar minha página grátis{" "}
              <ArrowUpRight size={17} aria-hidden="true" />
            </Link>
            <Link href="/como-funciona" className="action action-glass">
              <span className="play-icon">
                <Play size={13} fill="currentColor" aria-hidden="true" />
              </span>
              Como funciona
            </Link>
          </div>
          <p className="hero-note hero-enter">
            Sua primeira página grátis. Sem cartão de crédito.
          </p>
        </div>
        <div className="hero-product site-container hero-enter">
          <ProductPreview
            example={{
              name: doc.businessName,
              headline:
                hero?.type === "hero" ? hero.props.headline : doc.businessName,
              description,
              cta: doc.primaryConversion.label,
              colors: doc.designTokens.palette,
            }}
          />
        </div>
      </section>

      <section className="niche-strip" aria-label="Segmentos atendidos">
        <div className="site-container">
          <span>SEU NEGÓCIO TEM LUGAR AQUI</span>
          <div>
            {[
              "Estética e beleza",
              "Saúde",
              "Serviços locais",
              "Gastronomia",
              "Infoprodutos",
            ].map((niche) => (
              <span key={niche}>{niche}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="site-container editorial-section">
        <Reveal>
          <div className="section-intro">
            <p className="eyebrow">MENOS COMPLICAÇÃO. MAIS POSSIBILIDADES.</p>
            <h2 className="display-heading">
              Você cuida do negócio.
              <br />
              <em>A gente abre o caminho.</em>
            </h2>
            <p className="section-description">
              Tirar uma ideia do papel já dá trabalho. Colocar seu negócio na
              internet pode ser mais simples.
            </p>
          </div>
        </Reveal>
        <div className="benefit-grid">
          {[
            {
              icon: MessageSquare,
              number: "01",
              title: "Comece com o que você sabe",
              text: "Conte o que oferece, para quem e o que faz de diferente. As perguntas guiam você, uma de cada vez.",
            },
            {
              icon: MousePointer2,
              number: "02",
              title: "Reconheça a sua identidade",
              text: "Textos, cores e seções partem das suas respostas. Você revisa e ajusta os detalhes antes de publicar.",
            },
            {
              icon: Globe2,
              number: "03",
              title: "Encontre seu próximo cliente",
              text: "Sua página ganha um endereço. Visitas, cliques e contatos ficam reunidos no seu painel.",
            },
          ].map((item, i) => (
            <Reveal key={item.number} delay={i * 0.07}>
              <article className="benefit">
                <div className="benefit-top">
                  <item.icon size={23} strokeWidth={1.4} aria-hidden="true" />
                  <span>{item.number}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="process-section" id="como-funciona">
        <div className="site-container process-grid">
          <Reveal>
            <div className="process-statement">
              <span className="eyebrow">DA CONVERSA À DECOLAGEM</span>
              <h2 className="display-heading">
                Não precisa
                <br />
                saber design.
                <br />
                <em>Precisa ser você.</em>
              </h2>
              <p>
                A Decola faz as perguntas certas para transformar o seu
                conhecimento em uma página.
              </p>
              <Link href="/como-funciona" className="text-link">
                Conheça o passo a passo{" "}
                <ArrowUpRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </Reveal>
          <div className="process-steps">
            {[
              {
                n: "01",
                title: "Conte a sua história",
                text: "Um briefing sobre seu negócio, público e diferencial. No modo rápido, cerca de 5 minutos. Digite ou responda falando.",
                note: "Seu ponto de partida",
              },
              {
                n: "02",
                title: "Veja sua página ganhar forma",
                text: "A Decola organiza textos, seções e identidade visual. Confira a prévia e dê o seu toque no editor.",
                note: "Você tem a palavra final",
              },
              {
                n: "03",
                title: "Publique. Acompanhe. Evolua.",
                text: "Coloque a página no ar e acompanhe as visitas e os contatos. Tenha clareza para decidir o próximo passo.",
                note: "Seu negócio em movimento",
              },
            ].map((item) => (
              <Reveal key={item.n}>
                <article className="process-step">
                  <span className="step-index">{item.n}</span>
                  <div>
                    <span className="step-note">{item.note}</span>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                  </div>
                  <ArrowDown size={18} strokeWidth={1.4} aria-hidden="true" />
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="site-container editorial-section">
        <Reveal>
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">UM NEGÓCIO NUNCA É IGUAL AO OUTRO</p>
              <h2 className="display-heading">
                Sua história.
                <br />
                <em>Seu jeito de aparecer.</em>
              </h2>
            </div>
            <Link href="/exemplos" className="action action-outline">
              Explore os exemplos <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </Reveal>
        <ExampleGallery />
        <p className="gallery-note">
          Negócios fictícios. Páginas geradas a partir de briefings de
          demonstração.
        </p>
      </section>

      <section className="site-container trust-section">
        <Reveal>
          <div className="trust-panel">
            <div>
              <ShieldCheck size={29} strokeWidth={1.3} aria-hidden="true" />
              <h2 className="display-heading">
                Uma página bonita.
                <br />
                <em>Uma história verdadeira.</em>
              </h2>
            </div>
            <div>
              <p>
                A sua identidade também está no que você promete. A Decola usa o
                conteúdo que você fornece e deixa de fora o que não pode
                afirmar.
              </p>
              <ul>
                <li>
                  <Check size={16} /> Depoimentos só quando são reais.
                </li>
                <li>
                  <Check size={16} /> Preços e ofertas que você informou.
                </li>
                <li>
                  <Check size={16} /> Você revisa antes de colocar no ar.
                </li>
              </ul>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="site-container editorial-section">
        <Reveal>
          <div className="section-heading-row">
            <div>
              <p className="eyebrow">ESPAÇO PARA CRESCER</p>
              <h2 className="display-heading">
                Comece leve.
                <br />
                <em>Cresça no seu tempo.</em>
              </h2>
            </div>
            <p className="section-aside">
              Sua primeira página é grátis.
              <br />
              Escolha mais recursos quando precisar.
            </p>
          </div>
        </Reveal>
        <div className="home-pricing">
          {[PLANS.free, PLANS.start, PLANS.pro].map((plan, i) => (
            <Reveal key={plan.id} delay={i * 0.06}>
              <article
                className={
                  "home-plan " + (plan.highlight ? "home-plan-featured" : "")
                }
              >
                <div className="plan-label">
                  <h3>{plan.name}</h3>
                  {plan.highlight && <span>Para começar</span>}
                </div>
                <p className="plan-description">
                  {plan.id === "free"
                    ? "Sua ideia, pronta para o mundo."
                    : plan.id === "start"
                      ? "Mais identidade para sua página."
                      : "Mais espaço para seus projetos."}
                </p>
                <p className="plan-price">
                  {plan.monthlyPriceCents.value === 0
                    ? "R$ 0"
                    : formatBRL(plan.monthlyPriceCents.value ?? 0)}
                  <span>/mês</span>
                </p>
                <ul>
                  <li>
                    <Check size={16} />
                    {plan.entitlements.maxPublishedPages}{" "}
                    {plan.entitlements.maxPublishedPages === 1
                      ? "página publicada"
                      : "páginas publicadas"}
                  </li>
                  <li>
                    <Check size={16} />
                    {plan.entitlements.customDomain
                      ? "Seu domínio próprio"
                      : "Endereço Decola"}
                  </li>
                  <li>
                    <Check size={16} />
                    {plan.entitlements.showDecolaBadge
                      ? "Com assinatura Decola"
                      : "Sem marca Decola no rodapé"}
                  </li>
                </ul>
                <Link
                  href={plan.id === "free" ? "/cadastro" : "/precos"}
                  className={
                    "action " +
                    (plan.highlight ? "action-dark" : "action-outline")
                  }
                >
                  {plan.id === "free"
                    ? "Começar grátis"
                    : "Conhecer o " + plan.name}
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
        <p className="gallery-note">
          <Link href="/precos" className="text-link">
            Todos os planos, condições e formas de pagamento{" "}
            <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </p>
      </section>

      <section className="flight-section">
        <div className="site-container flight-grid">
          <Reveal>
            <span className="eyebrow">DEPOIS DA PRIMEIRA DECOLAGEM</span>
            <h2 className="display-heading">
              Um próximo passo.
              <br />
              <em>Sempre mais claro.</em>
            </h2>
          </Reveal>
          <Reveal>
            <div className="flight-copy">
              <span className="roadmap-label">
                Voo Contínuo · em construção
              </span>
              <p>
                Seu painel já acompanha visitas, cliques e contatos. O próximo
                capítulo são testes de variações, guiados pelo comportamento
                real dos visitantes.
              </p>
              <div className="flight-sequence">
                <span>Observar</span>
                <span>Formular</span>
                <span>Testar</span>
                <span>Decidir</span>
              </div>
              <p className="small-note">
                Testes automáticos ainda em desenvolvimento. Sem dados
                suficientes, nenhuma melhora é presumida.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="closing-section">
        <div className="site-container">
          <Reveal>
            <span className="eyebrow">O PRÓXIMO CAPÍTULO É SEU</span>
            <h2>
              Vamos tirar a sua
              <br />
              <em>ideia do papel?</em>
            </h2>
            <Link href="/cadastro" className="action action-dark">
              Vamos decolar <ArrowUpRight size={18} aria-hidden="true" />
            </Link>
            <p>Grátis para começar. Com a sua identidade desde o início.</p>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
