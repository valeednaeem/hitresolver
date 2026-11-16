/**
 * Weighted Comparison Matrix engine (spec §2) — HitResolver's signature
 * calculation.
 *
 * Formulas (§2.2):
 *   maxPossible = Σ (weight × 10)               over criteria with valid weights
 *   rawScore(o) = Σ (score × weight)            over available cells only
 *   pct(o)      = maxPossible > 0
 *                   ? round_half_up(rawScore / maxPossible × 100)
 *                   : 0
 *
 * Hard rules encoded here:
 *   - A missing cell is NEVER defaulted to 0 or 5 (prototype defect W2).
 *     It is reported as `score: null` and excluded from the sum.
 *   - Invalid criterion weights (0, negative, NaN, out of range) are
 *     excluded from `maxPossible` and reported — never silently used
 *     (defects W1, W5, W6).
 *   - Ranking is competition ranking (1, 1, 3) at full precision with
 *     explicit ties (defect W4). No tie-breaker invents a winner.
 *   - `maxPossible == 0` ⇒ no ranking at all, pct = 0 for everyone
 *     (defect W5).
 *
 * Pure: no DOM, no React, no storage, no AI. Deterministic for a given
 * input (spec §0).
 */

import type { Comparison } from "../domain/types";
import { coerceOneToTen, percentOf } from "./numeric";

/** Why the matrix cannot produce a ranking. */
export type MatrixStatus =
  | "no-criteria"
  | "no-options"
  | "no-weights"
  | "ok";

/** One cell as the engine sees it: a score and its contribution, or MISSING. */
export interface CellResult {
  criterionId: string;
  criterionName: string;
  /** Criterion weight, or `null` when the weight itself was invalid. */
  weight: number | null;
  /** Valid score 1–10, or `null` when the cell is MISSING. */
  score: number | null;
  /** `score × weight`, or `null` when either input is unusable. */
  contribution: number | null;
  /** `weight × 10` — the cell's maximum contribution. */
  max: number | null;
}

export interface OptionResult {
  id: string;
  name: string;
  /** Σ (score × weight) over available cells only. */
  rawScore: number;
  /** 0–100, rounded half-up; 0 when maxPossible == 0. */
  pct: number;
  /** Competition rank (1, 1, 3) or `null` when no ranking is possible. */
  rank: number | null;
  /** Cells with a valid score, across all criteria. */
  scoredCells: number;
  /** `criteria.length` — the full grid this option should fill. */
  totalCells: number;
  missingCells: number;
  /** Any unscored cell ⇒ the ranking for this option rests on partial data. */
  incomplete: boolean;
  /** Every cell unscored ⇒ rawScore 0, excluded from leader designation. */
  allMissing: boolean;
  eligibleForLeader: boolean;
  /** Per-criterion breakdown (§2.5) — one entry per criterion, in order. */
  cells: CellResult[];
}

export interface InvalidWeight {
  criterionId: string;
  criterionName: string;
  reason: string;
}

export interface MatrixResult {
  status: MatrixStatus;
  /** Human-readable state for `status !== "ok"` (E7/E8/E17). Empty when ok. */
  statusMessage: string;
  /** Σ (weight × 10) over criteria with valid weights. */
  maxPossible: number;
  options: OptionResult[];
  /** Options ranked #1 and not all-missing. Empty ⇒ no leader. */
  leaderIds: string[];
  /** Names of `leaderIds`, for display. */
  leaderNames: string[];
  /** More than one eligible option shares rank 1 (§2.3, defect W4). */
  tied: boolean;
  runnerUpId: string | null;
  /** leader − runner-up at full precision; `null` when not measurable. */
  margin: number | null;
  /** margin as % of maxPossible, rounded half-up; `null` when margin is. */
  marginPct: number | null;
  /** `margin <= 5% of maxPossible` (§2.3) — a race that could flip. */
  close: boolean;
  incompleteOptionIds: string[];
  invalidWeights: InvalidWeight[];
  /** Structural problems (duplicate/orphan ids) — surfaced, never fatal. */
  dataIssues: string[];
  /** Total cells in the grid (options × criteria). */
  totalCells: number;
  /** Cells with no valid score across the whole grid. */
  missingCells: number;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function findDuplicates(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) dupes.add(id);
    seen.add(id);
  }
  return [...dupes];
}

/* ------------------------------------------------------------------ */
/* Main evaluation                                                     */
/* ------------------------------------------------------------------ */

/**
 * Evaluate a comparison matrix.
 *
 * Handles every state from "fully scored" to "nothing entered" without
 * throwing and without inventing data.
 */
export function evaluateMatrix(comparison: Comparison): MatrixResult {
  const { options, criteria } = comparison;

  /* ---- structural issues (duplicate / orphan identifiers) ---- */
  const dataIssues: string[] = [];
  for (const id of findDuplicates(options.map((o) => o.id))) {
    dataIssues.push(`Duplicate option id "${id}".`);
  }
  for (const id of findDuplicates(criteria.map((c) => c.id))) {
    dataIssues.push(`Duplicate criterion id "${id}".`);
  }
  const optionIdSet = new Set(options.map((o) => o.id));
  for (const criterion of criteria) {
    for (const key of Object.keys(criterion.scores)) {
      if (!optionIdSet.has(key)) {
        dataIssues.push(
          `Criterion "${criterion.name}" has a score for unknown option "${key}".`,
        );
      }
    }
  }

  /* ---- criterion weights: reject invalid, never clamp (§0.1) ---- */
  const invalidWeights: InvalidWeight[] = [];
  let maxPossible = 0;
  for (const criterion of criteria) {
    const weight = coerceOneToTen(criterion.weight);
    if (weight === null) {
      invalidWeights.push({
        criterionId: criterion.id,
        criterionName: criterion.name,
        reason: "Criterion weight must be a whole number from 1 to 10.",
      });
      continue;
    }
    maxPossible += weight * 10;
  }

  /* ---- status (order matters for the message shown) ---- */
  const status: MatrixStatus =
    criteria.length === 0
      ? "no-criteria"
      : options.length === 0
        ? "no-options"
        : maxPossible === 0
          ? "no-weights"
          : "ok";
  const statusMessage =
    status === "no-criteria"
      ? "No criteria"
      : status === "no-options"
        ? "No options"
        : status === "no-weights"
          ? "No valid criterion weights"
          : "";

  /* ---- per-option totals (§2.2, §2.4, §2.5) ---- */
  const optionResults: OptionResult[] = options.map((option) => {
    let rawScore = 0;
    let scoredCells = 0;
    const cells: CellResult[] = criteria.map((criterion) => {
      const weight = coerceOneToTen(criterion.weight);
      const score = coerceOneToTen(criterion.scores[option.id]);
      if (score !== null) scoredCells += 1;

      const contribution =
        weight !== null && score !== null ? score * weight : null;
      if (contribution !== null) rawScore += contribution;

      return {
        criterionId: criterion.id,
        criterionName: criterion.name,
        weight,
        score,
        contribution,
        max: weight !== null ? weight * 10 : null,
      };
    });

    const totalCells = criteria.length;
    const missingCells = totalCells - scoredCells;
    const allMissing = totalCells > 0 && scoredCells === 0;

    return {
      id: option.id,
      name: option.name,
      rawScore,
      pct: maxPossible > 0 ? percentOf(rawScore, maxPossible) : 0,
      rank: null,
      scoredCells,
      totalCells,
      missingCells,
      incomplete: missingCells > 0,
      allMissing,
      eligibleForLeader: !allMissing,
      cells,
    };
  });

  /* ---- ranking: competition ranking, full precision (§2.3) ---- */
  const rankingActive = status === "ok";
  if (rankingActive) {
    for (const option of optionResults) {
      // Rank = 1 + number of options strictly ahead. Equal rawScore ⇒
      // equal rank (1, 1, 3). No tie-breaker is applied.
      option.rank =
        1 +
        optionResults.filter((other) => other.rawScore > option.rawScore)
          .length;
    }
  }

  const leaderPool = rankingActive
    ? optionResults.filter(
        (o) => o.rank === 1 && o.eligibleForLeader,
      )
    : [];
  const leaderIds = leaderPool.map((o) => o.id);
  const leaderNames = leaderPool.map((o) => o.name);
  const tied = leaderIds.length > 1;

  /* ---- margin & close race (§2.3) ---- */
  let runnerUpId: string | null = null;
  let margin: number | null = null;

  if (leaderPool.length > 0) {
    const leaderRaw = leaderPool[0].rawScore;
    const runnerUp = optionResults
      .filter(
        (o) =>
          o.eligibleForLeader &&
          o.rank !== 1 &&
          o.rawScore < leaderRaw,
      )
      .sort((a, b) => b.rawScore - a.rawScore)[0];

    if (runnerUp) {
      runnerUpId = runnerUp.id;
      margin = leaderRaw - runnerUp.rawScore;
    } else if (leaderPool.length > 1) {
      // Every eligible option is tied at the top: the gap between
      // leaders is exactly zero, which is both a tie and (trivially) a
      // close race — both may fire (E20).
      margin = 0;
    }
    // Single leader with no measurable runner-up ⇒ margin stays null.
  }

  const close =
    margin !== null && maxPossible > 0 && margin <= 0.05 * maxPossible;

  const incompleteOptionIds = optionResults
    .filter((o) => o.incomplete)
    .map((o) => o.id);

  return {
    status,
    statusMessage,
    maxPossible,
    options: optionResults,
    leaderIds,
    leaderNames,
    tied,
    runnerUpId,
    margin,
    marginPct: margin !== null ? percentOf(margin, maxPossible) : null,
    close,
    incompleteOptionIds,
    invalidWeights,
    dataIssues,
    totalCells: options.length * criteria.length,
    missingCells: optionResults.reduce((n, o) => n + o.missingCells, 0),
  };
}
