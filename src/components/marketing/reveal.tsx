"use client";

import { MotionConfig, motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Reveal de rolagem com Motion, seguro para hidratação: a estrutura renderizada
 * é idêntica no servidor e no cliente, e `reducedMotion="user"` faz o Motion
 * respeitar `prefers-reduced-motion` internamente (spec §5.3) — transformações
 * são suprimidas e apenas opacidade anima para quem reduz movimento.
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
  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        className={className}
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.55, delay, ease: [0.21, 0.6, 0.35, 1] }}
      >
        {children}
      </motion.div>
    </MotionConfig>
  );
}
