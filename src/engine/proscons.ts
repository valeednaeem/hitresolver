/**
 * Weighted Pros & Cons engine (spec §1).
 *
 * Formulas:
 *   prosPts = Σ weight(pro)      consPts = Σ weight(con)
 *   total   = prosPts + consPts
 *   pct     = total == 0 ? 50 : roundHalfUp(prosPts / total × 100)
 *
 * Verdict bands are applied first-match-wins in exactly the order of
 * spec §1.3. `pct` is the positive weight share — never a probability,
 * never advice.
 *
 * Defensive: weights that fail 1–10 coercion are excluded from totals
 * and reported (E3, E4, E5) — they never become NaN in a sum.
 */

import { coerceOneToTen, percentOf } from "./numeric";

export type Verdict = "Strong Go" | "Lean Yes" | "Balanced" | "Lean No" | "Strong No";

export interface WeightedEntry {
  id: string;
  text: string;
  weight: unknown;
}

export interface InvalidEntry {
  side: "pros" | "cons";
  id: string;
  reason: string;
}

export interface ProsConsResult {
  /** Σ of valid pro weights. */
  prosPts: number;
  /** Σ of valid con weights. */
  consPts: number;
  /** prosPts + consPts. */
  total: number;
  /** Positive weight share 0–100 (50 when total is 0, per §1.2). */
  pct: number;
  verdict: Verdict;
  /** Items the user entered, regardless of validity. */
  entered: { pros: number; cons: number };
  /** Items whose weight was accepted into the totals. */
  counted: { pros: number; cons: number };
  /** Entered items rejected by coercion — surfaced, never counted. */
  invalid: InvalidEntry[];
  /** No items entered at all → UI shows "No entries yet" (§1.4). */
  isEmpty: boolean;
  /** Which side has no entered items; `null` when both sides have some. */
  oneSided: "pros" | "cons" | null;
}

/**
 * Classify a positive weight share into a verdict band.
 * First match wins, in spec §1.3 order.
 */
export function classifyVerdict(pct: number): Verdict {
  if (pct >= 65) return "Strong Go";
  if (pct >= 55) return "Lean Yes";
  if (pct <= 35) return "Strong No";
  if (pct <= 45) return "Lean No";
  return "Balanced";
}

/** Sum the valid weights of one side, collecting rejections. */
function sumSide(
  side: "pros" | "cons",
  entries: readonly WeightedEntry[],
): { pts: number; counted: number; invalid: InvalidEntry[] } {
  let pts = 0;
  let counted = 0;
  const invalid: InvalidEntry[] = [];

  for (const entry of entries) {
    const weight = coerceOneToTen(entry.weight);
    if (weight === null) {
      invalid.push({
        side,
        id: entry.id,
        reason: "Weight must be a whole number from 1 to 10.",
      });
      continue;
    }
    pts += weight;
    counted += 1;
  }
  return { pts, counted, invalid };
}

/**
 * Evaluate a weighted pros/cons ledger.
 *
 * Pure and deterministic: same input ⇒ identical output (spec §0).
 */
export function evaluateProsCons(
  pros: readonly WeightedEntry[],
  cons: readonly WeightedEntry[],
): ProsConsResult {
  const p = sumSide("pros", pros);
  const c = sumSide("cons", cons);

  const total = p.pts + c.pts;
  // §1.2: an empty ledger reports 50 as a placeholder, not a finding.
  const pct = total === 0 ? 50 : percentOf(p.pts, total);

  const enteredPros = pros.length;
  const enteredCons = cons.length;
  const isEmpty = enteredPros === 0 && enteredCons === 0;
  // The empty side is reported — a one-sided ledger is incomplete info.
  const oneSided: "pros" | "cons" | null =
    isEmpty
      ? null
      : enteredPros === 0
        ? "pros"
        : enteredCons === 0
          ? "cons"
          : null;

  return {
    prosPts: p.pts,
    consPts: c.pts,
    total,
    pct,
    verdict: classifyVerdict(pct),
    entered: { pros: enteredPros, cons: enteredCons },
    counted: { pros: p.counted, cons: c.counted },
    invalid: [...p.invalid, ...c.invalid],
    isEmpty,
    oneSided,
  };
}
