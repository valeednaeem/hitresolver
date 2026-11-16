"use client";

/**
 * HitResolver Verdict Dashboard panel — Phase 2 (spec §4).
 *
 * Synthesises the three framework signals plus completeness into an
 * executive overview. Deliberately shows four independent cards and
 * NEVER combines them into a single "overall" number (§4.1, §4.5).
 */

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { evaluateDashboard } from "@/engine";
import { useWorkspace } from "@/state/workspace";
import type { RecommendationSeverity } from "@/engine/verdict";

const RECOMMENDATION_TONE: Record<RecommendationSeverity, "info" | "danger" | "success" | "neutral"> = {
  data: "info",
  risk: "danger",
  strategic: "success",
  completeness: "neutral",
};

export function VerdictPanel() {
  const { activeDecision } = useWorkspace();
  const dashboard = useMemo(() => evaluateDashboard(activeDecision), [activeDecision]);

  const completenessPct = dashboard.completeness.completenessPct;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="HitResolver Verdict Dashboard"
          description="A combined overview that separates calculated results from interpretation and recommendations."
        />

        {/* Four independent signals — no composite score is produced. */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Signal 1 — Pros & Cons */}
          <div className="rounded-xl border border-line bg-canvas p-4">
            <Badge tone="primary">CALCULATED</Badge>
            <h4 className="mt-2 text-sm font-bold text-ink">Pros & Cons balance</h4>
            <p className="mt-1 text-2xl font-extrabold text-ink tabular-nums">
              {dashboard.prosCons.pct}%
            </p>
            <p className="text-xs text-ink-muted">
              {dashboard.prosCons.prosPts} pro weight vs {dashboard.prosCons.consPts}{" "}
              con weight · verdict {dashboard.prosCons.verdict}
            </p>
          </div>

          {/* Signal 2 — Comparison */}
          <div className="rounded-xl border border-line bg-canvas p-4">
            <Badge tone="primary">CALCULATED</Badge>
            {dashboard.matrix.status === "ok" && dashboard.matrix.leaderIds.length > 0 ? (
              <>
                <h4 className="mt-2 text-sm font-bold text-ink">Comparison leader</h4>
                <p className="mt-1 text-2xl font-extrabold text-ink tabular-nums">
                  {dashboard.matrix.leaderNames.join(" / ")}
                </p>
                <p className="text-xs text-ink-muted">
                  {dashboard.matrix.options.find((o) => dashboard.matrix.leaderIds.includes(o.id))?.pct ?? 0}
                  % of possible score · margin {dashboard.matrix.marginPct ?? 0}%
                </p>
                {dashboard.matrix.tied && <Badge tone="warning">Tied</Badge>}
                {dashboard.matrix.close && <Badge tone="warning">Close race</Badge>}
              </>
            ) : (
              <>
                <h4 className="mt-2 text-sm font-bold text-ink">Comparison leader</h4>
                <p className="mt-1 text-sm text-ink-muted">
                  {dashboard.matrix.statusMessage || "No ranking available yet"}.
                </p>
              </>
            )}
          </div>

          {/* Signal 3 — SWOT */}
          <div className="rounded-xl border border-line bg-canvas p-4">
            <Badge tone="primary">CALCULATED</Badge>
            <h4 className="mt-2 text-sm font-bold text-ink">SWOT posture</h4>
            <p className="mt-1 text-2xl font-extrabold text-ink tabular-nums">
              {dashboard.swot.posture}
            </p>
            <p className="text-xs text-ink-muted">
              Helpful {dashboard.swot.helpfulCount} vs harmful{" "}
              {dashboard.swot.harmfulCount} · high-impact risks{" "}
              {dashboard.swot.highImpactRisks}
            </p>
          </div>

          {/* Signal 4 — Completeness */}
          <div className="rounded-xl border border-line bg-canvas p-4">
            <Badge tone="primary">CALCULATED</Badge>
            <h4 className="mt-2 text-sm font-bold text-ink">Completeness</h4>
            <p className="mt-1 text-2xl font-extrabold text-ink tabular-nums">
              {completenessPct}%
            </p>
            <p className="text-xs text-ink-muted">
              {dashboard.completeness.completeCount} of{" "}
              {dashboard.completeness.totalCount} checks complete — how much of the
              record has been filled in, not how good the decision is.
            </p>
          </div>
        </div>

        {/* Missing information */}
        <div className="mt-6">
          <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wide mb-2">
            Missing information
          </h4>
          <ul className="space-y-1">
            {dashboard.completeness.checks
              .filter((c) => !c.passed)
              .map((c) => (
                <li key={c.id} className="text-sm text-ink-muted">
                  <span className="font-bold text-ink">{c.label}:</span>{" "}
                  {c.message}
                </li>
              ))}
          </ul>
        </div>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader
          title="Recommended next actions"
          description="Transparent, rule-based prompts. No recommendation is emitted without a triggering condition."
        />
        {dashboard.recommendations.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No recommendations — the current record is complete enough to act on.
          </p>
        ) : (
          <ol className="space-y-2">
            {dashboard.recommendations.map((r) => (
              <li
                key={r.ruleId}
                className="flex items-start gap-3 rounded-lg border border-line bg-canvas p-3"
              >
                <Badge tone={RECOMMENDATION_TONE[r.severity]}>{r.ruleId}</Badge>
                <span className="text-sm text-ink">{r.message}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
