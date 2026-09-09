import "server-only";
import type { BriefingAnswers } from "@/features/briefing/questions";
import type { PageDocument } from "./page-document";

/**
 * Fronteira de geração (spec §2.2): resposta estruturada, registro de uso e
 * classificação de falhas.
 */

export interface GenerationInput {
  briefingRevisionId: string;
  answersHash: string;
  answers: BriefingAnswers;
}

export type GenerationFailureKind =
  | "invalid_output"
  | "provider_unavailable"
  | "rate_limited"
  | "timeout"
  | "not_configured";

export class GenerationError extends Error {
  constructor(
    public kind: GenerationFailureKind,
    message: string,
    /** Falhas transitórias podem ser retentadas pela fila. */
    public transient: boolean,
  ) {
    super(message);
    this.name = "GenerationError";
  }
}

export interface GenerationUsage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface GenerationOutput {
  document: PageDocument;
  usage: GenerationUsage;
}

export interface GenerationProvider {
  readonly kind: "rules" | "anthropic";
  readonly version: string;
  generate(input: GenerationInput): Promise<GenerationOutput>;
}
