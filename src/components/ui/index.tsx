import type { ComponentPropsWithoutRef, ReactNode } from "react";

/** Primitivos de UI do dashboard (claro, spec §5.1). */

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

type ButtonVariant =
  "primary" | "commercial" | "secondary" | "ghost" | "danger";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-electric-600 text-white shadow-sm hover:bg-electric-700 active:translate-y-px disabled:opacity-50 disabled:shadow-none",
  commercial:
    "bg-ink-900 text-white shadow-sm hover:bg-ink-600 active:translate-y-px disabled:opacity-50 disabled:shadow-none",
  secondary:
    "border border-ink-900/15 bg-white text-ink-900 hover:border-ink-900/25 hover:bg-paper active:translate-y-px disabled:opacity-50",
  ghost:
    "text-ink-600 hover:bg-ink-900/5 hover:text-ink-900 disabled:opacity-50",
  danger:
    "border border-danger-600/30 text-danger-600 hover:border-danger-600/50 hover:bg-danger-600/5 active:translate-y-px disabled:opacity-50",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ComponentPropsWithoutRef<"button"> & { variant?: ButtonVariant }) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-[background-color,color,box-shadow,transform] duration-200 disabled:cursor-not-allowed",
        BUTTON_STYLES[variant],
        className,
      )}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {hint && <span className="text-xs opacity-70">{hint}</span>}
      {children}
      {error && (
        <span role="alert" className="text-xs font-medium text-danger-600">
          {error}
        </span>
      )}
    </label>
  );
}

export function Input({
  className,
  ...props
}: ComponentPropsWithoutRef<"input">) {
  return (
    <input
      {...props}
      className={cx(
        "rounded-xl border border-ink-900/15 bg-white px-3.5 py-3 text-base text-ink-900 transition-colors placeholder:text-ink-400 hover:border-ink-900/25 focus:border-electric-500",
        className,
      )}
    />
  );
}

export function Textarea({
  className,
  ...props
}: ComponentPropsWithoutRef<"textarea">) {
  return (
    <textarea
      {...props}
      className={cx(
        "rounded-xl border border-ink-900/15 bg-white px-3.5 py-3 text-base text-ink-900 transition-colors placeholder:text-ink-400 hover:border-ink-900/25 focus:border-electric-500",
        className,
      )}
    />
  );
}

export function Select({
  className,
  ...props
}: ComponentPropsWithoutRef<"select">) {
  return (
    <select
      {...props}
      className={cx(
        "rounded-xl border border-ink-900/15 bg-white px-3.5 py-3 text-base text-ink-900 focus:border-electric-500",
        className,
      )}
    />
  );
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-ink-900/10 bg-card p-6 shadow-[0_2px_8px_rgb(10_14_26/0.025)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

const BADGE_STYLES: Record<BadgeTone, string> = {
  neutral: "bg-ink-900/5 text-ink-600",
  success: "bg-success-600/10 text-success-600",
  warning: "bg-warning-600/10 text-warning-600",
  danger: "bg-danger-600/10 text-danger-600",
  info: "bg-electric-600/10 text-electric-600",
};

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        BADGE_STYLES[tone],
      )}
    >
      {children}
    </span>
  );
}

/** Estado vazio que orienta a próxima ação (spec §5.3). */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-ink-900/10 bg-card px-6 py-16 text-center">
      <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-600">
        {description}
      </p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
