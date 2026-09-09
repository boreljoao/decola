import type { CSSProperties, ReactNode } from "react";
import type {
  PageDocument,
  PageSection,
} from "@/features/generation/page-document";
import {
  buildCtaHref,
  RADIUS_CLASS,
  SECTION_PAD,
} from "./conversion-utils";
import { AnalyticsBeacon, LeadForm, TrackedCta } from "./conversion";

/**
 * Renderer da biblioteca proprietária (spec §8.2/§8.3): monta exclusivamente
 * componentes do catálogo permitido com props já validadas pelo Zod do
 * PageDocument. Nenhum HTML/JS vindo de geração é executado.
 */

interface RenderContext {
  doc: PageDocument;
  pageId: string;
  pageVersionId?: string;
  /** preview: eventos desativados e noindex. */
  preview: boolean;
  /** plano Free: badge Decola visível (spec §1.2). */
  showBadge: boolean;
  /** URL do app para o link do badge (nunca inventar domínio). */
  appUrl?: string;
}

const FONT_VAR: Record<string, string> = {
  sora: "var(--font-sora)",
  "space-grotesk": "var(--font-space-grotesk)",
  inter: "var(--font-inter)",
};

function Icon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    spark: <path d="M12 2l2.1 6.4L20 10l-5.9 1.6L12 18l-2.1-6.4L4 10l5.9-1.6L12 2z" />,
    shield: <path d="M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M12 7v5l3.5 2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    heart: <path d="M12 21c-4.8-3.6-9-7-9-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 4-4.2 7.4-9 11z" />,
    target: (
      <>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="1.5" />
      </>
    ),
    star: <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9 2.9-6z" />,
    chat: <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z" />,
    check: (
      <path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    ),
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      {paths[name] ?? paths.check}
    </svg>
  );
}

function CtaButton({
  ctx,
  label,
  large,
}: {
  ctx: RenderContext;
  label: string;
  large?: boolean;
}) {
  const { href, eventType, external } = buildCtaHref(ctx.doc);
  const radius = RADIUS_CLASS[ctx.doc.designTokens.radius];
  return (
    <TrackedCta
      pageId={ctx.pageId}
      pageVersionId={ctx.pageVersionId}
      disabled={ctx.preview}
      href={href}
      eventType={eventType}
      external={external}
      className={`${radius} inline-flex items-center justify-center gap-2 bg-[var(--lp-accent)] font-semibold text-[var(--lp-accent-contrast)] shadow-sm transition-transform hover:-translate-y-0.5 hover:opacity-95 ${
        large ? "px-8 py-4 text-lg" : "px-6 py-3 text-base"
      }`}
    >
      {label}
    </TrackedCta>
  );
}

function Shell({
  children,
  pad,
  tinted,
}: {
  children: ReactNode;
  pad: string;
  tinted?: boolean;
}) {
  return (
    <section className={`${pad} ${tinted ? "bg-[var(--lp-surface)]" : ""}`}>
      <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-8">{children}</div>
    </section>
  );
}

function Heading({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2
      id={id}
      style={{ fontFamily: "var(--lp-font-heading)" }}
      className="text-balance text-3xl font-bold leading-tight sm:text-4xl"
    >
      {children}
    </h2>
  );
}

function SectionRenderer({ section, ctx, pad }: { section: PageSection; ctx: RenderContext; pad: string }) {
  const radius = RADIUS_CLASS[ctx.doc.designTokens.radius];

  switch (section.type) {
    case "hero": {
      const p = section.props;
      const centered = section.variant === "centered";
      return (
        <header className={`${pad} relative overflow-hidden`}>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-60"
            style={{
              background:
                "radial-gradient(60% 50% at 70% 0%, color-mix(in srgb, var(--lp-primary) 18%, transparent), transparent)",
            }}
          />
          <div
            className={`relative mx-auto w-full max-w-[1200px] px-5 sm:px-8 ${
              centered ? "text-center" : ""
            } ${section.variant === "split" ? "grid items-center gap-10 lg:grid-cols-[7fr_5fr]" : ""}`}
          >
            <div className={centered ? "mx-auto max-w-3xl" : "max-w-3xl"}>
              {p.badge && (
                <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-current/15 px-4 py-1.5 text-sm font-medium tracking-wide text-[var(--lp-muted)]">
                  {p.badge}
                </p>
              )}
              <h1
                style={{ fontFamily: "var(--lp-font-heading)" }}
                className="text-balance text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl"
              >
                {p.headline}
              </h1>
              <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-[var(--lp-muted)] sm:text-xl">
                {p.subheadline}
              </p>
              <div className={`mt-8 flex flex-wrap items-center gap-4 ${centered ? "justify-center" : ""}`}>
                <CtaButton ctx={ctx} label={p.ctaLabel} large />
                {p.secondaryNote && (
                  <span className="text-sm text-[var(--lp-muted)]">{p.secondaryNote}</span>
                )}
              </div>
            </div>
            {section.variant === "split" && p.highlights && p.highlights.length > 0 && (
              <ul className="grid gap-3">
                {p.highlights.map((h) => (
                  <li
                    key={h}
                    className={`${radius} border border-current/10 bg-[var(--lp-surface)] p-5 text-base font-medium shadow-sm`}
                  >
                    <span className="mr-2 inline-block text-[var(--lp-primary)]">
                      <Icon name="check" />
                    </span>
                    {h}
                  </li>
                ))}
              </ul>
            )}
            {section.variant !== "split" && p.highlights && p.highlights.length > 0 && (
              <ul className={`mt-10 flex flex-wrap gap-3 ${centered ? "justify-center" : ""}`}>
                {p.highlights.map((h) => (
                  <li
                    key={h}
                    className={`${radius} border border-current/10 bg-[var(--lp-surface)] px-4 py-2 text-sm font-medium`}
                  >
                    {h}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </header>
      );
    }

    case "pain": {
      const p = section.props;
      return (
        <Shell pad={pad} tinted>
          <Heading>{p.title}</Heading>
          {p.intro && <p className="mt-4 max-w-2xl text-[var(--lp-muted)]">{p.intro}</p>}
          <div
            className={
              section.variant === "cards"
                ? "mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
                : "mt-10 grid gap-4"
            }
          >
            {p.items.map((item) => (
              <div
                key={item.title}
                className={`${radius} border border-current/10 bg-[var(--lp-bg)] p-6`}
              >
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-[var(--lp-muted)]">{item.description}</p>
              </div>
            ))}
          </div>
        </Shell>
      );
    }

    case "solution": {
      const p = section.props;
      return (
        <Shell pad={pad}>
          <div className="grid gap-8 lg:grid-cols-[5fr_7fr] lg:items-start">
            <Heading>{p.title}</Heading>
            <div>
              <p className="text-lg leading-relaxed text-[var(--lp-muted)]">{p.description}</p>
              {p.steps && p.steps.length > 0 && (
                <ol className="mt-8 grid gap-4">
                  {p.steps.map((s, i) => (
                    <li key={s.title} className="flex gap-4">
                      <span
                        aria-hidden="true"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--lp-primary)] text-sm font-bold text-[var(--lp-primary-contrast)]"
                      >
                        {i + 1}
                      </span>
                      <div>
                        <h3 className="font-semibold">{s.title}</h3>
                        <p className="text-[var(--lp-muted)]">{s.description}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </Shell>
      );
    }

    case "benefits": {
      const p = section.props;
      return (
        <Shell pad={pad} tinted>
          <Heading>{p.title}</Heading>
          <div
            className={
              section.variant === "grid"
                ? "mt-10 grid gap-5 sm:grid-cols-2"
                : "mt-10 grid gap-4"
            }
          >
            {p.items.map((item) => (
              <div
                key={item.title}
                className={`${radius} flex gap-4 border border-current/10 bg-[var(--lp-bg)] p-6`}
              >
                <span className="mt-0.5 shrink-0 text-[var(--lp-primary)]">
                  <Icon name={item.icon ?? "check"} />
                </span>
                <div>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="mt-1.5 text-[var(--lp-muted)]">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Shell>
      );
    }

    case "proof": {
      const p = section.props;
      return (
        <Shell pad={pad}>
          <Heading>{p.title}</Heading>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {p.items.map((item, idx) => (
              <figure
                key={idx}
                className={`${radius} border border-current/10 bg-[var(--lp-surface)] p-6`}
              >
                <blockquote className="text-lg leading-relaxed">“{item.text}”</blockquote>
                {item.source && (
                  <figcaption className="mt-3 text-sm font-medium text-[var(--lp-muted)]">
                    — {item.source}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </Shell>
      );
    }

    case "authority": {
      const p = section.props;
      return (
        <Shell pad={pad} tinted>
          <Heading>{p.title}</Heading>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-[var(--lp-muted)]">{p.text}</p>
          {p.credentials && p.credentials.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-3">
              {p.credentials.map((c) => (
                <li
                  key={c}
                  className={`${radius} border border-current/15 px-4 py-2 text-sm font-medium`}
                >
                  {c}
                </li>
              ))}
            </ul>
          )}
        </Shell>
      );
    }

    case "offer": {
      const p = section.props;
      return (
        <Shell pad={pad}>
          <div
            className={`${radius} relative overflow-hidden border border-current/10 bg-[var(--lp-surface)] p-8 sm:p-12 ${
              section.variant === "panel" ? "mx-auto max-w-3xl text-center" : ""
            }`}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-1"
              style={{ background: "var(--lp-accent)" }}
            />
            <Heading>{p.title}</Heading>
            <p className="mt-4 text-lg text-[var(--lp-muted)]">{p.description}</p>
            {p.priceText && (
              <p className="tabular mt-6 text-3xl font-bold" style={{ fontFamily: "var(--lp-font-heading)" }}>
                {p.priceText}
              </p>
            )}
            {p.conditions && <p className="mt-2 text-sm text-[var(--lp-muted)]">{p.conditions}</p>}
            {p.bullets && p.bullets.length > 0 && (
              <ul className={`mt-6 grid gap-2.5 ${section.variant === "panel" ? "justify-center" : ""}`}>
                {p.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2.5 text-base">
                    <span className="text-[var(--lp-primary)]">
                      <Icon name="check" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            )}
            <div className={`mt-8 ${section.variant === "panel" ? "" : ""}`}>
              <CtaButton ctx={ctx} label={p.ctaLabel} large />
            </div>
          </div>
        </Shell>
      );
    }

    case "faq": {
      const p = section.props;
      return (
        <Shell pad={pad} tinted>
          <Heading>{p.title}</Heading>
          <div className="mt-8 grid max-w-3xl gap-3">
            {p.items.map((item) => (
              <details
                key={item.question}
                className={`${radius} group border border-current/10 bg-[var(--lp-bg)] p-5`}
              >
                <summary className="cursor-pointer list-none text-base font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
                  <span className="mr-2 inline-block transition-transform group-open:rotate-90">▸</span>
                  {item.question}
                </summary>
                <p className="mt-3 leading-relaxed text-[var(--lp-muted)]">{item.answer}</p>
              </details>
            ))}
          </div>
        </Shell>
      );
    }

    case "contact": {
      const p = section.props;
      const rows = [
        p.address && { label: "Endereço", value: p.address },
        p.phone && { label: "Telefone", value: p.phone },
        p.hours && { label: "Horários", value: p.hours },
        p.area && { label: "Área atendida", value: p.area },
      ].filter(Boolean) as Array<{ label: string; value: string }>;
      return (
        <Shell pad={pad}>
          <Heading>{p.title}</Heading>
          <dl className="mt-8 grid max-w-2xl gap-4">
            {rows.map((r) => (
              <div key={r.label} className={`${radius} border border-current/10 bg-[var(--lp-surface)] p-5`}>
                <dt className="text-sm font-semibold uppercase tracking-wide text-[var(--lp-muted)]">
                  {r.label}
                </dt>
                <dd className="mt-1 text-lg">{r.value}</dd>
              </div>
            ))}
          </dl>
        </Shell>
      );
    }

    case "lead_form": {
      const p = section.props;
      return (
        <Shell pad={pad} tinted>
          <div id="form" className={`${radius} mx-auto max-w-xl border border-current/10 bg-[var(--lp-bg)] p-8 sm:p-10`}>
            <Heading>{p.title}</Heading>
            {p.subtitle && <p className="mt-3 text-[var(--lp-muted)]">{p.subtitle}</p>}
            <div className="mt-8">
              <LeadForm
                pageId={ctx.pageId}
                pageVersionId={ctx.pageVersionId}
                disabled={ctx.preview}
                fields={p.fields}
                submitLabel={p.submitLabel}
                successMessage={p.successMessage}
                radiusClass={radius}
                accentStyle={{
                  background: "var(--lp-accent)",
                  color: "var(--lp-accent-contrast)",
                }}
              />
            </div>
          </div>
        </Shell>
      );
    }

    case "cta_final": {
      const p = section.props;
      return (
        <Shell pad={pad}>
          <div
            className={`${radius} px-8 py-14 text-center sm:px-12 ${
              section.variant === "banner" ? "" : "border border-current/10"
            }`}
            style={
              section.variant === "banner"
                ? {
                    background:
                      "linear-gradient(135deg, color-mix(in srgb, var(--lp-primary) 22%, var(--lp-surface)), var(--lp-surface))",
                  }
                : { background: "var(--lp-surface)" }
            }
          >
            <Heading>{p.title}</Heading>
            {p.subtitle && (
              <p className="mx-auto mt-4 max-w-xl text-lg text-[var(--lp-muted)]">{p.subtitle}</p>
            )}
            <div className="mt-8">
              <CtaButton ctx={ctx} label={p.ctaLabel} large />
            </div>
          </div>
        </Shell>
      );
    }

    default:
      return null;
  }
}

export function PageRenderer(ctx: RenderContext) {
  const { doc } = ctx;
  const t = doc.designTokens;
  const pad = SECTION_PAD[t.density];

  const style = {
    "--lp-bg": t.palette.bg,
    "--lp-surface": t.palette.surface,
    "--lp-text": t.palette.text,
    "--lp-muted": t.palette.muted,
    "--lp-primary": t.palette.primary,
    "--lp-primary-contrast": t.palette.primaryContrast,
    "--lp-accent": t.palette.accent,
    "--lp-accent-contrast": t.palette.accentContrast,
    "--lp-font-heading": FONT_VAR[t.fontHeading],
    fontFamily: FONT_VAR[t.fontBody],
    background: "var(--lp-bg)",
    color: "var(--lp-text)",
  } as CSSProperties;

  return (
    <div style={style} className="min-h-screen">
      {!ctx.preview && (
        <AnalyticsBeacon pageId={ctx.pageId} pageVersionId={ctx.pageVersionId} />
      )}
      <main>
        {doc.sections.map((section) => (
          <SectionRenderer key={section.id} section={section} ctx={ctx} pad={pad} />
        ))}
      </main>
      <footer className="border-t border-current/10 py-8">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-3 px-5 sm:px-8">
          <p className="text-sm text-[var(--lp-muted)]">
            © {new Date().getFullYear()} {doc.businessName}
          </p>
          {ctx.showBadge && (
            <a
              href={ctx.appUrl ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-current/15 px-3 py-1.5 text-xs font-medium text-[var(--lp-muted)] transition-opacity hover:opacity-80"
            >
              Feito com <span className="font-bold">Decola</span> ✦
            </a>
          )}
        </div>
      </footer>
    </div>
  );
}
