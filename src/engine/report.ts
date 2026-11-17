/**
 * Markdown decision report builder — Phase 3.
 *
 * Produces a complete, human-readable report from a decision using the
 * decision engine's outputs (never re-implementing their maths). The
 * exported report must reflect the actual current decision state and must
 * surface:
 *   - decision details
 *   - Pros & Cons
 *   - Weighted Comparison Matrix
 *   - SWOT
 *   - Verdict Dashboard
 *   - Risks / recommendations (R-* rules)
 *   - Incomplete evaluation warnings
 *
 * Pure: no DOM, no I/O, deterministic for a given decision.
 */

import type { Decision } from "../domain/types";
import { evaluateDashboard } from "./verdict";
import { evaluateMatrix } from "./matrix";
import { evaluateProsCons } from "./proscons";
import { evaluateSwot } from "./swot";

export function buildMarkdownReport(decision: Decision): string {
  const d = decision;
  const prosCons = evaluateProsCons(d.prosCons.pros, d.prosCons.cons);
  const matrix = evaluateMatrix(d.comparison);
  const swot = evaluateSwot(d.swot);
  const dashboard = evaluateDashboard(d);

  const lines: string[] = [];
  lines.push(`# Decision Report: ${d.title || "Untitled Decision"}`);
  lines.push("");
  lines.push(`**Decision:** ${d.title || "Untitled Decision"}`);
  lines.push("");
  if (d.description.trim().length > 0) {
    lines.push(d.description);
    lines.push("");
  }
  lines.push("---");
  lines.push("");

  // --- Pros & Cons ---
  lines.push("## Pros & Cons");
  lines.push("");
  if (prosCons.isEmpty) {
    lines.push(
      "_Not enough information — no pros or cons were entered. No balance was calculated._",
    );
  } else {
    lines.push(
      `- Positive weight: ${prosCons.prosPts} · Negative weight: ${prosCons.consPts} · Net: ${prosCons.prosPts - prosCons.consPts >= 0 ? "+" : "−"}${Math.abs(prosCons.prosPts - prosCons.consPts)} · Balance: ${prosCons.pct}% · Verdict: ${prosCons.verdict}.`,
    );
    if (prosCons.oneSided) {
      lines.push(
        `_One side is empty (${prosCons.oneSided}) — the balance reflects one side only and is not a complete measurement._`,
      );
    }
  }
  lines.push("");

  // --- Comparison Matrix ---
  lines.push("## Weighted Comparison Matrix");
  lines.push("");
  lines.push(`- Status: ${matrix.status === "ok" ? "Ranked" : matrix.statusMessage}`);
  if (matrix.status === "ok" && matrix.leaderIds.length > 0) {
    const leader = matrix.options.find((o) => o.id === matrix.leaderIds[0]);
    lines.push(
      `- Leader: ${leader?.name ?? "Unknown"} at ${leader?.pct ?? 0}% (raw ${leader?.rawScore ?? 0} / max ${matrix.maxPossible}).`,
    );
  }
  for (const o of matrix.options) {
    const cellSummary = o.cells
      .map(
        (c) =>
          `${c.criterionName}: ${c.score === null ? "missing" : `${c.score}×${c.weight}`} (max ${c.max})`,
      )
      .join("; ");
    lines.push(
      `- ${o.name}: rank ${o.rank ?? "n/a"}, pct ${o.pct}%, raw ${o.rawScore}, ${o.scoredCells}/${o.totalCells} cells scored.${o.incomplete ? " INCOMPLETE — provisional." : ""}`,
    );
    if (o.cells.length > 0) lines.push(`  - ${cellSummary}`);
  }
  lines.push("");

  // --- SWOT ---
  lines.push("## SWOT Analysis");
  lines.push("");
  lines.push(`- Posture: ${swot.posture}`);
  lines.push(
    `- Counts — Strengths: ${swot.counts.strengths}, Weaknesses: ${swot.counts.weaknesses}, Opportunities: ${swot.counts.opportunities}, Threats: ${swot.counts.threats}.`,
  );
  lines.push(
    `- Helpful: ${swot.helpfulCount} · Harmful: ${swot.harmfulCount} · High-impact risks: ${swot.highImpactRisks}.`,
  );
  lines.push("");

  // --- Verdict Dashboard ---
  lines.push("## Verdict Dashboard");
  lines.push("");
  lines.push(
    `- Completeness: ${dashboard.completeness.completenessPct}% (${dashboard.completeness.completeCount}/${dashboard.completeness.totalCount} checks complete) — fill-in coverage, not decision quality.`,
  );
  lines.push("");

  // --- Recommendations / risks ---
  lines.push("## Risks and Recommendations");
  lines.push("");
  if (dashboard.recommendations.length === 0) {
    lines.push("_No recommendations — no rule triggered._");
  } else {
    for (const r of dashboard.recommendations) {
      lines.push(`- \`${r.ruleId}\` — ${r.message}`);
    }
  }
  lines.push("");

  // --- Incomplete warnings ---
  lines.push("## Incomplete Evaluations");
  lines.push("");
  const warnings: string[] = [];
  for (const id of dashboard.matrix.incompleteOptionIds) {
    const o = dashboard.matrix.options.find((x) => x.id === id);
    warnings.push(
      `Matrix: option "${o?.name ?? id}" has unscored cells — ranking may be provisional.`,
    );
  }
  if (dashboard.matrix.status !== "ok") {
    warnings.push(`Matrix status: ${dashboard.matrix.statusMessage || "not assessable"}.`);
  }
  if (dashboard.prosCons.oneSided) {
    warnings.push(
      `Pros & Cons: one side is empty (${dashboard.prosCons.oneSided}).`,
    );
  }
  if (swot.emptyQuadrants.length > 0) {
    warnings.push(`SWOT: empty quadrants — ${swot.emptyQuadrants.join(", ")}.`);
  }
  if (dashboard.completeness.checks.some((c) => !c.passed)) {
    for (const c of dashboard.completeness.checks.filter((c) => !c.passed)) {
      warnings.push(`Completeness gap: ${c.label} — ${c.message}`);
    }
  }
  if (warnings.length === 0) {
    lines.push("_No incomplete evaluations detected._");
  } else {
    for (const w of warnings) lines.push(`- ${w}`);
  }

  lines.push("");
  lines.push("---");
  lines.push(
    "_Generated by HitResolver. Results reflect the entered inputs, not objective truth._",
  );
  return lines.join("\n");
}
