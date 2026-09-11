"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Globe2,
  LayoutTemplate,
  MessageSquare,
  MousePointer2,
  SlidersHorizontal,
} from "lucide-react";

export type PreviewDocument = {
  name: string;
  headline: string;
  description: string;
  cta: string;
  colors: {
    bg: string;
    text: string;
    accent: string;
    accentContrast: string;
    muted: string;
  };
};

export function ProductPreview({ example }: { example: PreviewDocument }) {
  const [view, setView] = useState("pagina");
  return (
    <div
      className="product-window"
      aria-label="Demonstração ilustrativa do painel Decola"
    >
      <div className="product-bar">
        <div className="product-brand">
          d<span>✦</span>
        </div>
        <span>Meu primeiro projeto</span>
        <ChevronRight size={13} aria-hidden="true" />
        <strong>{example.name}</strong>
        <span className="demo-label">Demonstração</span>
      </div>
      <div className="product-body">
        <div className="product-sidebar">
          <span className="sidebar-caption">SEU PROJETO</span>
          {[
            { id: "briefing", label: "Briefing", icon: MessageSquare },
            { id: "pagina", label: "Sua página", icon: LayoutTemplate },
            { id: "publicar", label: "Publicação", icon: Globe2 },
          ].map((item) => (
            <button
              type="button"
              key={item.id}
              aria-pressed={view === item.id}
              onClick={() => setView(item.id)}
              className={view === item.id ? "active" : ""}
            >
              <item.icon size={17} aria-hidden="true" />
              {item.label}
            </button>
          ))}
          <div className="preview-help">
            <span>Do seu jeito.</span>
            <p>
              Uma página que começa
              <br />
              com a sua história.
            </p>
          </div>
        </div>
        <div className="product-canvas">
          <div className="canvas-toolbar">
            <span>
              {view === "pagina"
                ? "Sua identidade, em cada detalhe"
                : view === "briefing"
                  ? "Tudo começa com uma boa pergunta"
                  : "Pronta para encontrar seus clientes"}
            </span>
            <SlidersHorizontal size={16} aria-hidden="true" />
          </div>
          <div className="preview-scene" key={view}>
            {view === "pagina" ? (
              <div
                className="generated-preview"
                style={
                  {
                    "--preview-bg": example.colors.bg,
                    "--preview-text": example.colors.text,
                    "--preview-accent": example.colors.accent,
                    "--preview-contrast": example.colors.accentContrast,
                  } as CSSProperties
                }
              >
                <div className="generated-nav">
                  <strong>{example.name}</strong>
                  <span>Sobre · Atendimento</span>
                </div>
                <div className="generated-copy">
                  <span className="generated-eyebrow">
                    CUIDADO QUE COMEÇA EM VOCÊ
                  </span>
                  <h2>{example.headline}</h2>
                  <p>{example.description}</p>
                  <span className="generated-cta">
                    {example.cta}
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </span>
                </div>
                <span className="preview-cursor" aria-hidden="true">
                  <MousePointer2 size={18} fill="currentColor" /> Sua identidade
                </span>
              </div>
            ) : view === "briefing" ? (
              <div className="briefing-preview">
                <span className="eyebrow">01 / IDENTIDADE</span>
                <h2>
                  O que torna seu
                  <br />
                  <em>negócio único?</em>
                </h2>
                <div className="preview-answer">“{example.description}”</div>
                <span className="preview-saved">
                  <Check size={14} /> Resposta de demonstração
                </span>
              </div>
            ) : (
              <div className="publish-preview">
                <span className="publish-mark">
                  <Globe2 size={32} />
                </span>
                <h2>
                  Seu próximo passo:
                  <br />
                  <em>colocar no mundo.</em>
                </h2>
                <p>Revise a página e publique no seu endereço Decola.</p>
                <Link href="/cadastro" className="action action-dark">
                  Criar minha página <ArrowUpRight size={15} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="product-status">
        <span>
          <Check size={13} aria-hidden="true" /> Conteúdo a partir do briefing
        </span>
        <span>Negócio fictício · explore as etapas</span>
      </div>
    </div>
  );
}
