import type { ReactNode } from "react";

/** Shared marketing surface; legacy export kept for existing imports. */
export function SpotlightCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "surface-card relative transition-shadow duration-300 " + className
      }
    >
      {children}
    </div>
  );
}
