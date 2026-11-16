/**
 * SWOT Analysis engine (spec §3).
 *
 * Keeps the four quadrants distinct, preserves the internal/external and
 * helpful/harmful axes, and weights nothing into a single score —
 * SWOT produces **counts and a posture label**, never a number that could
 * be added to other frameworks' numbers (§3.3, brief §5F).
 *
 * Derived signals (§3.3):
 *   helpfulCount      = |strengths| + |opportunities|
 *   harmfulCount      = |weaknesses| + |threats|
 *   highImpactRisks   = High weaknesses ∪ High threats
 *
 * Posture (§3.4, evaluated in this exact order):
 *   empty            → Not assessed
 *   highImpactRisks  → Exposed
 *   harmful > helpful → Strained
 *   helpful > harmful → Favourable
 *   equal            → Balanced
 *
 * An item whose `impact` is not High/Medium/Low is **rejected**: it is
 * excluded from every count and reported. It is never assumed to be
 * Medium (spec §0.2 — no silent coercion).
 *
 * Pure: no DOM, no React, no storage, no AI.
 */

import {
  IMPACT_LEVELS,
  SWOT_QUADRANTS,
  type Swot,
  type SwotQuadrant,
} from "../domain/types";

export type Posture =
  | "Not assessed"
  | "Exposed"
  | "Strained"
  | "Favourable"
  | "Balanced";

export interface InvalidImpactItem {
  quadrant: SwotQuadrant;
  id: string;
  reason: string;
}

export interface SwotResult {
  /** Valid item count per quadrant — four distinct buckets, never flattened. */
  counts: Record<SwotQuadrant, number>;
  helpfulCount: number;
  harmfulCount: number;
  internalCount: number;
  externalCount: number;
  /** High-impact items in Weaknesses ∪ Threats — the risk signal. */
  highImpactRisks: number;
  /** High-impact items in any quadrant — used by completeness (§4.3). */
  highImpactItems: number;
  posture: Posture;
  /** No valid items at all → "Not assessed" empty state. */
  isEmpty: boolean;
  emptyQuadrants: SwotQuadrant[];
  /** Items rejected for an invalid impact level — surfaced, not counted. */
  invalid: InvalidImpactItem[];
}

/** True when `value` is one of the three permitted impact levels. */
function isValidImpact(value: unknown): value is "High" | "Medium" | "Low" {
  return (
    typeof value === "string" &&
    (IMPACT_LEVELS as readonly string[]).includes(value)
  );
}

/**
 * Evaluate a SWOT analysis.
 *
 * Deterministic and total: never throws, never mutates input, and
 * produces no numeric "SWOT score" by design.
 */
export function evaluateSwot(swot: Swot): SwotResult {
  const counts = {
    strengths: 0,
    weaknesses: 0,
    opportunities: 0,
    threats: 0,
  } as Record<SwotQuadrant, number>;

  const emptyQuadrants: SwotQuadrant[] = [];
  const invalid: InvalidImpactItem[] = [];
  let highImpactItems = 0;
  let highImpactRisks = 0;

  for (const quadrant of SWOT_QUADRANTS) {
    const items = swot[quadrant];
    let validHere = 0;

    for (const item of items) {
      if (!isValidImpact(item.impact)) {
        invalid.push({
          quadrant,
          id: item.id,
          reason: "Impact must be one of: High, Medium, Low.",
        });
        continue;
      }
      validHere += 1;
      if (item.impact === "High") {
        highImpactItems += 1;
        if (quadrant === "weaknesses" || quadrant === "threats") {
          highImpactRisks += 1;
        }
      }
    }

    counts[quadrant] = validHere;
    if (validHere === 0) emptyQuadrants.push(quadrant);
  }

  const helpfulCount = counts.strengths + counts.opportunities;
  const harmfulCount = counts.weaknesses + counts.threats;
  const internalCount = counts.strengths + counts.weaknesses;
  const externalCount = counts.opportunities + counts.threats;

  // §3.4 — evaluated in the listed order; the high-impact rule wins ties.
  let posture: Posture;
  if (helpfulCount === 0 && harmfulCount === 0) {
    posture = "Not assessed";
  } else if (highImpactRisks > 0) {
    posture = "Exposed";
  } else if (harmfulCount > helpfulCount) {
    posture = "Strained";
  } else if (helpfulCount > harmfulCount) {
    posture = "Favourable";
  } else {
    posture = "Balanced";
  }

  return {
    counts,
    helpfulCount,
    harmfulCount,
    internalCount,
    externalCount,
    highImpactRisks,
    highImpactItems,
    posture,
    isEmpty: helpfulCount === 0 && harmfulCount === 0,
    emptyQuadrants,
    invalid,
  };
}
