import type { ReactNode } from "react";

/**
 * Faixa deslizante. O conteúdo é duplicado e a animação anda −50%, então o
 * laço é contínuo sem salto.
 *
 * Componente de servidor de propósito: a estrutura é idêntica no servidor e no
 * cliente, e `prefers-reduced-motion` é tratado inteiramente em CSS
 * (`.marquee-viewport` / `.marquee-track`). Decidir isso em JavaScript
 * quebraria a hidratação, porque o servidor não conhece a preferência.
 */
export function Marquee({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`marquee-viewport relative ${className}`}>
      <div className="marquee-track">
        {children}
        {/* Cópia para o laço contínuo — invisível para leitores de tela. */}
        <div aria-hidden="true" className="flex gap-4">
          {children}
        </div>
      </div>
    </div>
  );
}
