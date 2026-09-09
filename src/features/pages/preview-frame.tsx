"use client";

import { useState, type ReactNode } from "react";
import { cx } from "@/components/ui";

/** Alternância desktop/mobile do preview (spec §9). */
export function PreviewFrame({ children }: { children: ReactNode }) {
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  return (
    <div>
      <div className="mb-4 flex items-center justify-center gap-2">
        {(
          [
            ["desktop", "Desktop"],
            ["mobile", "Mobile"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={viewport === value}
            onClick={() => setViewport(value)}
            className={cx(
              "rounded-lg px-4 py-1.5 text-sm font-medium",
              viewport === value
                ? "bg-ink-900 text-white"
                : "text-ink-600 hover:bg-ink-900/5",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        className={cx(
          "mx-auto overflow-hidden rounded-2xl border border-ink-900/15 shadow-[var(--shadow-lift)] transition-[max-width] duration-300",
          viewport === "mobile" ? "max-w-[390px]" : "max-w-full",
        )}
      >
        {children}
      </div>
    </div>
  );
}
