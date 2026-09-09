import type { ComponentPropsWithoutRef, ReactNode } from "react";

/** Primitivos de UI do dashboard (claro, spec §5.1). */

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "commercial" | "secondary" | "ghost" | "danger";

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary:
    "bg-electric-600 text-white hover:bg-electric-700 disabled:bg-electric-600/50",
  commercial:
    "bg-ember-500 text-night-950 hover:bg-ember-600 disabled:bg-ember-500/50",
  secondary:
    "border border-ink-900/15 bg-white text-ink-900 hover:bg-paper disabled:opacity-50",
  ghost: "text-ink-600 hover:bg-ink-900/5 disabled:opacity-50",
  danger:
    "border border-danger-600/30 text-danger-600 hover:bg-danger-600/5 disabled:opacity-50",
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
        "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed",
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
        "rounded-xl border border-ink-900/15 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-electric-500",
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
        "rounded-xl border border-ink-900/15 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-electric-500",
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
        "rounded-xl border border-ink-900/15 bg-white px-3.5 py-2.5 text-sm text-ink-900 focus:border-electric-500",
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
        "rounded-2xl border border-ink-900/10 bg-card p-6 shadow-[var(--shadow-lift)]",
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
    <div className="rounded-2xl border border-dashed border-ink-900/20 bg-paper px-8 py-14 text-center">
      <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-600">{description}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}
