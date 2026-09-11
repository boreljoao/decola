"use client";

import { animate } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";

/** Server HTML is visible. Only offscreen content opts into motion after hydration. */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (
      preference.matches ||
      element.getBoundingClientRect().top < window.innerHeight
    )
      return;
    let animation: ReturnType<typeof animate> | undefined;
    const restore = () => {
      element.classList.remove("reveal-hidden");
      element.style.removeProperty("opacity");
      element.style.removeProperty("transform");
    };
    element.classList.add("reveal-hidden");
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        element.classList.remove("reveal-hidden");
        animation = animate(
          element,
          {
            opacity: [0, 1],
            transform: ["translateY(24px)", "translateY(0px)"],
          },
          {
            duration: 0.95,
            delay: Math.max(0, Math.min(delay, 0.18)),
            ease: [0.22, 1, 0.36, 1],
            onComplete: restore,
          },
        );
        observer.disconnect();
      },
      { rootMargin: "0px 0px -48px 0px", threshold: 0.01 },
    );
    observer.observe(element);
    const reduce = () => {
      if (preference.matches) {
        observer.disconnect();
        animation?.stop();
        restore();
      }
    };
    preference.addEventListener("change", reduce);
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", reduce);
      animation?.stop();
      restore();
    };
  }, [delay]);
  return (
    <div ref={ref} className={"reveal " + className}>
      {children}
    </div>
  );
}
