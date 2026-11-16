/**
 * Decision factories.
 *
 * Provides the two seed records the product requires: a blank decision
 * with sensible starter criteria, and the worked example carried over
 * from the reference prototype.
 *
 * Both produce records that satisfy every invariant in
 * docs/DATABASE-DESIGN.md §2, so they can be persisted directly.
 */

import { createId } from "./ids";
import { SCHEMA_VERSION, type AppState, type Decision } from "./types";

/** ISO timestamp helper — keeps `createdAt <= updatedAt` true at birth. */
const now = () => new Date().toISOString();

/* ------------------------------------------------------------------ */
/* Blank decision                                                      */
/* ------------------------------------------------------------------ */

/**
 * A new decision with two options and two starter criteria, so the
 * comparison matrix is immediately usable rather than empty.
 */
export function createBlankDecision(
  title = "Untitled Decision",
): Decision {
  const optionA = createId();
  const optionB = createId();

  return {
    id: createId(),
    title,
    description: "",
    createdAt: now(),
    updatedAt: now(),
    prosCons: { pros: [], cons: [] },
    comparison: {
      options: [
        { id: optionA, name: "Option A" },
        { id: optionB, name: "Option B" },
      ],
      criteria: [
        {
          id: createId(),
          name: "Cost",
          weight: 5,
          scores: { [optionA]: 5, [optionB]: 5 },
          notes: {},
        },
        {
          id: createId(),
          name: "Impact",
          weight: 8,
          scores: { [optionA]: 5, [optionB]: 5 },
          notes: {},
        },
      ],
    },
    swot: {
      strengths: [],
      weaknesses: [],
      opportunities: [],
      threats: [],
    },
  };
}

/* ------------------------------------------------------------------ */
/* Sample decision (carried over from the reference prototype)         */
/* ------------------------------------------------------------------ */

/**
 * The worked example: "Choosing Our Next Product Stack".
 *
 * Content preserved verbatim from
 * docs/reference/ai_studio_code-hitresolver_v02.html so the demo ships
 * with a decision that genuinely exercises all three frameworks.
 */
export function createSampleDecision(): Decision {
  const monolith = createId();
  const serverless = createId();
  const microservices = createId();
  const t = now();

  return {
    id: createId(),
    title: "Choosing Our Next Product Stack",
    description:
      "Deciding between a monolith, serverless architecture, or modular microservices for Q3 launch.",
    createdAt: t,
    updatedAt: t,
    prosCons: {
      pros: [
        { id: createId(), text: "Faster time-to-market with unified deployment", weight: 9 },
        { id: createId(), text: "Lower initial cloud infrastructure overhead", weight: 7 },
        { id: createId(), text: "Team already knows the primary language", weight: 8 },
      ],
      cons: [
        { id: createId(), text: "Potential scaling bottleneck if traffic spikes 10x", weight: 6 },
        { id: createId(), text: "Requires strict module boundaries to avoid tech debt", weight: 5 },
      ],
    },
    comparison: {
      options: [
        { id: monolith, name: "Modular Monolith" },
        { id: serverless, name: "Serverless" },
        { id: microservices, name: "Microservices" },
      ],
      criteria: [
        {
          id: createId(),
          name: "Development Speed",
          weight: 9,
          scores: { [monolith]: 9, [serverless]: 7, [microservices]: 4 },
          notes: {
            [monolith]: "Single repo & deploy",
            [serverless]: "Fast APIs",
            [microservices]: "High setup cost",
          },
        },
        {
          id: createId(),
          name: "Cost Efficiency",
          weight: 7,
          scores: { [monolith]: 8, [serverless]: 8, [microservices]: 4 },
          notes: {
            [monolith]: "Predictable",
            [serverless]: "Pay-per-use",
            [microservices]: "Cluster overhead",
          },
        },
        {
          id: createId(),
          name: "Long-Term Scalability",
          weight: 8,
          scores: { [monolith]: 7, [serverless]: 9, [microservices]: 10 },
          notes: {
            [monolith]: "Can split later",
            [serverless]: "Auto-scales",
            [microservices]: "Independent scaling",
          },
        },
      ],
    },
    swot: {
      strengths: [
        { id: createId(), text: "Experienced full-stack engineering team", impact: "High" },
        { id: createId(), text: "Clear MVP scope and customer commitments", impact: "Medium" },
      ],
      weaknesses: [
        { id: createId(), text: "Limited dedicated DevOps capacity", impact: "High" },
      ],
      opportunities: [
        { id: createId(), text: "Capture early enterprise contracts before competitors ship", impact: "High" },
      ],
      threats: [
        { id: createId(), text: "Cloud vendor lock-in or pricing changes", impact: "Medium" },
      ],
    },
  };
}

/* ------------------------------------------------------------------ */
/* Application state                                                   */
/* ------------------------------------------------------------------ */

/** First-run state: the sample decision, active and ready to explore. */
export function createInitialState(): AppState {
  const sample = createSampleDecision();
  return {
    schemaVersion: SCHEMA_VERSION,
    activeDecisionId: sample.id,
    decisions: [sample],
  };
}

/** A brand-new empty state containing only the supplied decision. */
export function createStateWith(decision: Decision): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    activeDecisionId: decision.id,
    decisions: [decision],
  };
}
