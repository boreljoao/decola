import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "./reveal";
import { DEMO_FIXTURES } from "@/features/demo/fixtures";
import { hashAnswers } from "@/features/generation/pipeline";
import { generatePageDocument } from "@/features/generation/rules-engine";

export function getExamples() {
  return DEMO_FIXTURES.map((fixture) => ({
    fixture,
    doc: generatePageDocument({
      briefingRevisionId: fixture.revisionId,
      answersHash: hashAnswers(fixture.answers),
      answers: fixture.answers,
    }),
  }));
}

export function ExampleGallery() {
  return (
    <div className="example-gallery">
      {getExamples().map(({ fixture, doc }, index) => {
        const hero = doc.sections.find((s) => s.type === "hero");
        return (
          <Reveal key={fixture.slug} delay={index * 0.06}>
            <Link className="example-card" href={"/exemplos/" + fixture.slug}>
              <div
                className="example-artboard"
                style={{
                  background: doc.designTokens.palette.bg,
                  color: doc.designTokens.palette.text,
                }}
              >
                <div className="example-browser">
                  <span />
                  <span />
                  <span />
                  <small>{doc.businessName}</small>
                </div>
                <div className="example-layout">
                  <span className="example-category">{fixture.nicheLabel}</span>
                  <h3
                    style={{
                      fontFamily:
                        "var(--font-" +
                        doc.designTokens.fontHeading +
                        ", var(--font-sora))",
                    }}
                  >
                    {hero?.type === "hero"
                      ? hero.props.headline
                      : doc.businessName}
                  </h3>
                  <span
                    className="example-cta"
                    style={{
                      background: doc.designTokens.palette.accent,
                      color: doc.designTokens.palette.accentContrast,
                    }}
                  >
                    {doc.primaryConversion.label}
                    <ArrowUpRight size={14} aria-hidden="true" />
                  </span>
                  <div
                    className="example-line"
                    style={{ background: doc.designTokens.palette.text }}
                  />
                  <p>Uma composição para {fixture.nicheLabel.toLowerCase()}.</p>
                </div>
              </div>
              <div className="example-caption">
                <div>
                  <h3>{fixture.label}</h3>
                  <p>{fixture.nicheLabel}</p>
                </div>
                <span className="circle-link">
                  <ArrowUpRight size={20} aria-hidden="true" />
                </span>
              </div>
            </Link>
          </Reveal>
        );
      })}
    </div>
  );
}
