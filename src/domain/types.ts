/**
 * HitResolver domain types.
 *
 * This module is the single source of truth for the decision data model.
 * It is intentionally framework-free: no React, no Next.js, no DOM, no I/O.
 * Every layer (engine, storage, UI) depends on these types; nothing here
 * depends on them.
 *
 * @see docs/TECHNICAL-ARCHITECTURE.md §3
 */

/** SWOT impact levels, ordered strongest to weakest. */
export const IMPACT_LEVELS = ["High", "Medium", "Low"] as const;
export type Impact = (typeof IMPACT_LEVELS)[number];

/** The four SWOT quadrants. */
export const SWOT_QUADRANTS = [
  "strengths",
  "weaknesses",
  "opportunities",
  "threats",
] as const;
export type SwotQuadrant = (typeof SWOT_QUADRANTS)[number];

/**
 * Polarity of each quadrant — used by the verdict layer to group
 * helpful (Strengths, Opportunities) vs harmful (Weaknesses, Threats).
 */
export const QUADRANT_POLARITY: Record<
  SwotQuadrant,
  { helpful: boolean; internal: boolean }
> = {
  strengths: { helpful: true, internal: true },
  weaknesses: { helpful: false, internal: true },
  opportunities: { helpful: true, internal: false },
  threats: { helpful: false, internal: false },
};

/** Inclusive numeric ranges. Enforced by `domain/validation`. */
export const RANGES = {
  weight: { min: 1, max: 10 },
  score: { min: 1, max: 10 },
  title: { min: 1, max: 160 },
  description: { max: 2000 },
  itemText: { min: 1, max: 400 },
  optionName: { min: 1, max: 80 },
  criterionName: { min: 1, max: 80 },
  note: { max: 400 },
} as const;

/** Bump when the persisted shape changes. @see docs/DATABASE-DESIGN.md §3 */
export const SCHEMA_VERSION = 1;

/** Storage key namespace. Never write outside this prefix. */
export const STORAGE_PREFIX = "hitresolver:v1";
export const STORAGE_KEY = `${STORAGE_PREFIX}:state`;

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

/** A weighted pro or con. `weight` is 1–10. */
export interface WeightedItem {
  id: string;
  text: string;
  weight: number;
}

/** A SWOT entry tagged with its impact level. */
export interface SwotItem {
  id: string;
  text: string;
  impact: Impact;
}

/** An alternative being compared. */
export interface Option {
  id: string;
  name: string;
}

/**
 * An evaluation criterion.
 *
 * `scores` is keyed by option id. **An absent key means the cell has not
 * been scored yet** — it is never defaulted to 0 or 5. This is deliberate:
 * the prototype displayed 5 but computed 0 (defect W2), and we will not
 * repeat that.
 */
export interface Criterion {
  id: string;
  name: string;
  weight: number;
  scores: Record<string, number>;
  notes: Record<string, string>;
}

export interface Comparison {
  options: Option[];
  criteria: Criterion[];
}

export interface ProsCons {
  pros: WeightedItem[];
  cons: WeightedItem[];
}

export interface Swot {
  strengths: SwotItem[];
  weaknesses: SwotItem[];
  opportunities: SwotItem[];
  threats: SwotItem[];
}

/** One decision record. */
export interface Decision {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  prosCons: ProsCons;
  comparison: Comparison;
  swot: Swot;
}

/** The whole persisted application state. */
export interface AppState {
  schemaVersion: number;
  activeDecisionId: string;
  decisions: Decision[];
}

/* ------------------------------------------------------------------ */
/* Narrow unions used by result types                                  */
/* ------------------------------------------------------------------ */

/** Why a storage operation failed. */
export type StorageFailure =
  | "unavailable" // storage not accessible at all (private mode, SSR)
  | "quota" // write rejected, typically exceeded the browser quota
  | "corrupt" // stored payload could not be parsed or validated
  | "invalid"; // caller passed a state that failed validation

/** A decision counted by the sidebar. */
export interface DecisionSummary {
  id: string;
  title: string;
  updatedAt: string;
  optionCount: number;
  itemCount: number;
}
