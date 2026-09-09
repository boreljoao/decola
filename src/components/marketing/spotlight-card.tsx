"use client";

import { useRef, type ReactNode } from "react";

/**
 * Card com foco de luz que segue o ponteiro.
 *
 * A posição do brilho vive em variáveis CSS escritas direto no elemento — sem
 * estado no React, então mover o mouse não causa re-render. A marcação é a
 * mesma no servidor e no cliente (sem risco de hidratação) e
 * `prefers-reduced-motion` esconde o brilho pela classe `.spotlight-glow`
 * em globals.css.
 */
export function SpotlightCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(event: React.MouseEvent<HTMLDivElement>) {
    const element = ref.current;
    if (!element) return;
    const rect = element.getBoundingClientRect();
    element.style.setProperty("--x", `${event.clientX - rect.left}px`);
    element.style.setProperty("--y", `${event.clientY - rect.top}px`);
    element.style.setProperty("--glow", "1");
  }

  function onLeave() {
    ref.current?.style.setProperty("--glow", "0");
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`gradient-border group relative overflow-hidden rounded-2xl bg-night-850 transition-transform duration-300 hover:-translate-y-1 ${className}`}
    >
      <div
        aria-hidden="true"
        className="spotlight-glow pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: "var(--glow, 0)",
          background:
            "radial-gradient(340px circle at var(--x, 50%) var(--y, 50%), rgb(53 115 245 / 0.14), transparent 70%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
