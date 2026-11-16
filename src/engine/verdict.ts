/**
 * Verdict Dashboard engine (spec §4).
 *
 * Design rule (§4.1, brief §5F): **there is no composite score.** This
 * module wires the three framework evaluators together, adds a
 * deterministic completeness analysis (§4.3) and rule-based
 * recommendations (§4.4), and deliberately produces no combined number.
 *
 * Completeness (§4.3) — exactly 10 checks:
 *   completenessPct = round_half_up(completeCount / 10 × 100)
 *   This measures how much of the decision record has been filled in —
 *   explicitly NOT how good the decision is.
 *
 * Recommendations (§4.4) — one named rule per trigger, emitted in
 * severity order (data-integrity → risk → strategic → completeness).
 * No trigger, no recommendation: never filler text.
 *
 * The AI layer (Phase 4) lives entirely outside this module and can
 * never modify anything it returns.
 *
 * Pure: no DOM, no React, no storage, no AI.
 */

import type { Comparison, ProsCons, Swot } from "../domain/types";
import { evaluateMatrix, type MatrixResult } from "./matrix";
import {
  evaluateProsCons,
  type ProsConsResult,
} from "./proscons";
import { roundHalfUp } from "./numeric";
import { evaluateSwot, type SwotResult } from "./swot";

/* ------------------------------------------------------------------ */
/* Inputs & outputs                                                    */
/* ------------------------------------------------------------------ */

/**
 * The slice of a decision the dashboard needs. `Decision` satisfies it,
 * so callers pass their record directly.
 */
export interface DashboardInput {
  description: string;
  prosCons: ProsCons;
  comparison: Comparison;
  swot: Swot;
}

export interface CompletenessCheck {
  /** Stable id, e.g. `"matrix-scored"`. */
  id: string;
  /** Short human label. */
  label: string;
  passed: boolean;
  /** What to do about it when failed; confirmation when passed. */
  message: string;
}

export interface CompletenessResult {
  checks: CompletenessCheck[];
  completeCount: number;
  totalCount: number;
  /** How much of the record is filled in — NOT decision quality. */
  completenessPct: number;
}

export type RecommendationSeverity =
  | "data"
  | "risk"
  | "strategic"
  | "completeness";

export interface Recommendation {
  ruleId: string;
  severity: RecommendationSeverity;
  message: string;
}

export interface DashboardResult {
  /** §1 signal — Calculated. */
  prosCons: ProsConsResult;
  /** §2 signal — Calculated. */
  matrix: MatrixResult;
  /** §3 signal — Calculated. */
  swot: SwotResult;
  /** §4.3 signal — Calculated. */
  completeness: CompletenessResult;
  /** §4.4 rule-based prompts, in severity order. */
  recommendations: Recommendation[];
}

/* ------------------------------------------------------------------ */
/* Completeness (§4.3)                                                 */
/* ------------------------------------------------------------------ */

const TOTAL_CHECKS = 10;

function buildCompleteness(
  input: DashboardInput,
  matrix: MatrixResult,
  swot: SwotResult,
): CompletenessResult {
  const { criteria, options } = input.comparison;
  const { pros, cons } = input.prosCons;

  const anyIncomplete = matrix.incompleteOptionIds.length > 0;
  const unscoredCells = matrix.missingCells;
  const totalCells = matrix.totalCells;

  const checks: CompletenessCheck[] = [
    {
      id: "criteria",
      label: "Criteria defined",
      passed: criteria.length > 0,
      message:
        criteria.length > 0
          ? `${criteria.length} ${criteria.length === 1 ? "criterion" : "criteria"} defined.`
          : "Add at least one criterion to compare options.",
    },
    {
      id: "options",
      label: "Options defined",
      passed: options.length > 0,
      message:
        options.length > 0
          ? `${options.length} option${options.length === 1 ? "" : "s"} defined.`
          : "Add at least one option to compare.",
    },
    {
      id: "matrix-scored",
      label: "All matrix cells scored",
      passed: options.length > 0 && criteria.length > 0 && !anyIncomplete,
      message:
        options.length > 0 && criteria.length > 0 && !anyIncomplete
          ? `All ${totalCells} matrix cells are scored.`
          : totalCells > 0
            ? `${unscoredCells} of ${totalCells} matrix cells are unscored — a ranking on partial data can reverse.`
            : "No matrix cells to score yet.",
    },
    {
      id: "matrix-weights",
      label: "Criterion weights set",
      passed: matrix.maxPossible > 0,
      message:
        matrix.maxPossible > 0
          ? `Maximum possible score is ${matrix.maxPossible}.`
          : "Set at least one criterion weight (1–10).",
    },
    {
      id: "ledger-both-sides",
      label: "Pros and cons both entered",
      passed: pros.length > 0 && cons.length > 0,
      message:
        pros.length > 0 && cons.length > 0
          ? `${pros.length} pro${pros.length === 1 ? "" : "s"} and ${cons.length} con${cons.length === 1 ? "" : "s"} entered.`
          : "Add items to the empty side — a one-sided ledger is incomplete information.",
    },
    {
      id: "swot-complete",
      label: "All four SWOT quadrants filled",
      passed: swot.emptyQuadrants.length === 0,
      message:
        swot.emptyQuadrants.length === 0
          ? "All four SWOT quadrants have entries."
          : `Empty SWOT quadrant${swot.emptyQuadrants.length === 1 ? "" : "s"}: ${swot.emptyQuadrants.join(", ")}.`,
    },
    {
      id: "high-impact",
      label: "High-impact factor identified",
      passed: swot.highImpactItems > 0,
      message:
        swot.highImpactItems > 0
          ? `${swot.highImpactItems} factor${swot.highImpactItems === 1 ? "" : "s"} marked High impact.`
          : "No factor is marked High — consider whether anything is under-rated.",
    },
    {
      id: "context",
      label: "Decision context described",
      passed: input.description.trim().length > 0,
      message:
        input.description.trim().length > 0
          ? "Context recorded."
          : "Add context (deadline, goal, constraints) so the record is explainable later.",
    },
    {
      id: "ranking-unique",
      label: "Ranking has a clear leader",
      passed: matrix.status === "ok" && matrix.leaderIds.length === 1,
      message:
        matrix.status !== "ok"
          ? `Cannot rank yet — ${matrix.statusMessage.toLowerCase()}.`
          : matrix.tied
            ? "The top options are tied — the ranking does not separate them."
            : matrix.leaderIds.length === 0
              ? "No leader can be designated — every option is unscored."
              : "A single option currently ranks first.",
    },
    {
      id: "margin-clear",
      label: "Lead is not razor-thin",
      passed: matrix.margin !== null && !matrix.close,
      message:
        matrix.margin === null
          ? matrix.status === "ok" && matrix.leaderIds.length > 1
            ? "The leaders are exactly tied — there is no margin to report."
            : "Add a second scored option to establish a measurable margin."
          : matrix.close
            ? `The lead is ${matrix.margin} of ${matrix.maxPossible} possible points (${matrix.marginPct}%) — within the 5% close-race threshold.`
            : `The lead is ${matrix.margin} points, beyond the 5% close-race threshold.`,
    },
  ];

  const completeCount = checks.filter((c) => c.passed).length;

  return {
    checks,
    completeCount,
    totalCount: TOTAL_CHECKS,
    // completeCount is an integer 0–10, so ×10 is exact — no drift.
    completenessPct: roundHalfUp((completeCount / TOTAL_CHECKS) * 100),
  };
}

/* ------------------------------------------------------------------ */
/* Recommendations (§4.4)                                              */
/* ------------------------------------------------------------------ */

interface RuleDefinition {
  ruleId: string;
  severity: RecommendationSeverity;
  message: string;
  triggers: (input: DashboardInput, matrix: MatrixResult, swot: SwotResult) => boolean;
}

/**
 * All ten rules, already in severity order:
 * data-integrity → risk → strategic opportunities → completeness.
 * A rule whose condition is false emits nothing.
 */
const RULES: RuleDefinition[] = [
  {
    ruleId: "R-MATRIX-EMPTY",
    severity: "data",
    message:
      "Complete the comparison matrix before relying on a ranking.",
    triggers: (input) =>
      input.comparison.options.length === 0 ||
      input.comparison.criteria.length === 0,
  },
  {
    ruleId: "R-INCOMPLETE",
    severity: "data",
    message:
      "Fill the missing score(s) — a ranking on partial data can reverse.",
    triggers: (_input, matrix) => matrix.incompleteOptionIds.length > 0,
  },
  {
    ruleId: "R-TIE",
    severity: "data",
    message:
      "Top options are tied; revisit your highest-weighted criteria.",
    triggers: (_input, matrix) => matrix.tied,
  },
  {
    ruleId: "R-CLOSE",
    severity: "data",
    message:
      "Leader is ahead by a narrow margin; small weight changes could flip it.",
    triggers: (_input, matrix) => matrix.close,
  },
  {
    ruleId: "R-RISK",
    severity: "risk",
    message: "Mitigate the flagged high-impact risk before committing.",
    triggers: (_input, _matrix, swot) => swot.highImpactRisks > 0,
  },
  {
    ruleId: "R-SO",
    severity: "strategic",
    message: "Consider using a strength to capture an opportunity.",
    triggers: (_input, _matrix, swot) =>
      swot.counts.strengths >= 1 && swot.counts.opportunities >= 1,
  },
  {
    ruleId: "R-CONTEXT",
    severity: "completeness",
    message:
      "Add context (deadline, goal, constraints) so the record is explainable later.",
    triggers: (input) => input.description.trim().length === 0,
  },
  {
    ruleId: "R-ONE-SIDED",
    severity: "completeness",
    message: "The ledger is one-sided; actively list the other side.",
    triggers: (input) =>
      input.prosCons.pros.length === 0 || input.prosCons.cons.length === 0,
  },
  {
    ruleId: "R-SWOT-EMPTY",
    severity: "completeness",
    message: "Complete the SWOT quadrants to surface external factors.",
    triggers: (_input, _matrix, swot) => swot.emptyQuadrants.length > 0,
  },
  {
    ruleId: "R-NO-HIGH",
    severity: "completeness",
    message:
      "Consider whether any factor truly is high-impact — everything may be under-rated.",
    triggers: (_input, _matrix, swot) => swot.highImpactItems === 0,
  },
];

function buildRecommendations(
  input: DashboardInput,
  matrix: MatrixResult,
  swot: SwotResult,
): Recommendation[] {
  return RULES.filter((rule) => rule.triggers(input, matrix, swot)).map(
    ({ ruleId, severity, message }) => ({ ruleId, severity, message }),
  );
}

/* ------------------------------------------------------------------ */
/* Main evaluation                                                     */
/* ------------------------------------------------------------------ */

/**
 * Evaluate a decision across all three frameworks plus completeness.
 *
 * Returns four independent, clearly-labelled signals. It deliberately
 * does **not** combine them into one score (§4.1, §4.5).
 */
export function evaluateDashboard(input: DashboardInput): DashboardResult {
  const prosCons = evaluateProsCons(
    input.prosCons.pros,
    input.prosCons.cons,
  );
  const matrix = evaluateMatrix(input.comparison);
  const swot = evaluateSwot(input.swot);

  return {
    prosCons,
    matrix,
    swot,
    completeness: buildCompleteness(input, matrix, swot),
    recommendations: buildRecommendations(input, matrix, swot),
  };
}
