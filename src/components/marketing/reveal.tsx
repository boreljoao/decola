"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Reveal de rolagem.
 *
 * Por que não usa `whileInView` do Motion: com `prefers-reduced-motion`
 * ativo, a animação não roda e o elemento fica preso no estado inicial
 * (`opacity: 0`) — a página inteira some para quem reduz movimento. Aqui o
 * estado escondido é aplicado por JavaScript e SÓ quando três condições valem:
 *
 * 1. o usuário não pede movimento reduzido;
 * 2. o elemento está abaixo da dobra (acima dela aparece direto, sem flash);
 * 3. o JavaScript rodou.
 *
 * Se qualquer uma falhar, o conteúdo simplesmente aparece. O padrão é
 * "visível"; a animação é o caso especial. O HTML do servidor não carrega
 * estado escondido, então também não há divergência de hidratação.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof IntersectionObserver === "undefined") return;

    // Já visível na carga: nada a animar, evita piscar.
    const rect = element.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) return;

    element.classList.add("reveal-hidden");
    element.style.transitionDelay = `${delay}s`;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            element.classList.remove("reveal-hidden");
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -80px 0px" },
    );
    observer.observe(element);

    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={`reveal ${className ?? ""}`}>
      {children}
    </div>
  );
}
