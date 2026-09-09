/**
 * Fundo aurora — luz que respira atrás do conteúdo.
 *
 * Componente de servidor: nenhuma decisão depende do navegador, então a marcação
 * é idêntica no servidor e no cliente (sem risco de hidratação). As camadas
 * animam só `transform` e `opacity`, que ficam na GPU e não bloqueiam a
 * renderização; `prefers-reduced-motion` é respeitado pela regra global em
 * globals.css, que congela as animações (spec §5.3).
 */
export function Aurora({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <div
        className="absolute -top-1/3 left-1/4 h-[70vh] w-[70vh] animate-aurora-slow rounded-full blur-[120px]"
        style={{
          background:
            "radial-gradient(circle, rgb(53 115 245 / 0.30), transparent 70%)",
        }}
      />
      <div
        className="absolute -right-1/4 top-1/4 h-[55vh] w-[55vh] animate-aurora-medium rounded-full blur-[110px]"
        style={{
          background:
            "radial-gradient(circle, rgb(237 164 40 / 0.18), transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 h-[45vh] w-[60vh] animate-aurora-fast rounded-full blur-[130px]"
        style={{
          background:
            "radial-gradient(circle, rgb(157 134 255 / 0.16), transparent 70%)",
        }}
      />
      {/* Grão sutil: tira o aspecto "gradiente de banco de imagens". */}
      <div
        className="absolute inset-0 opacity-[0.15] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}

/** Malha de pontos que dá profundidade sem pesar. */
export function DotGrid({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{
        backgroundImage:
          "radial-gradient(circle at 1px 1px, rgb(255 255 255 / 0.07) 1px, transparent 0)",
        backgroundSize: "32px 32px",
        maskImage:
          "radial-gradient(ellipse 80% 60% at 50% 40%, black, transparent)",
        WebkitMaskImage:
          "radial-gradient(ellipse 80% 60% at 50% 40%, black, transparent)",
      }}
    />
  );
}
