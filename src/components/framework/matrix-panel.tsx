"use client";

/**
 * Weighted Comparison Matrix panel — Phase 2 (spec §2).
 *
 * Shows the engine's status, leader, ranking, per-cell breakdown and
 * coverage — plus real editing controls. All numbers come from
 * `evaluateMatrix`; nothing is recomputed here.
 */

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertIcon, GridIcon } from "@/components/ui/icons";
import { useWorkspace } from "@/state/workspace";
import { evaluateMatrix } from "@/engine";
import { createId } from "@/domain/ids";
import type { Comparison, Criterion } from "@/domain/types";

export function MatrixPanel() {
  const { activeDecision, updateComparison } = useWorkspace();
  const { comparison } = activeDecision;
  const result = useMemo(() => evaluateMatrix(comparison), [comparison]);

  const update = (next: Comparison) =>
    updateComparison(activeDecision.id, next);

  const addOption = () =>
    update({
      ...comparison,
      options: [...comparison.options, { id: createId(), name: `Option ${comparison.options.length + 1}` }],
    });

  const addCriterion = () =>
    update({
      ...comparison,
      criteria: [
        ...comparison.criteria,
        { id: createId(), name: `Criterion ${comparison.criteria.length + 1}`, weight: 5, scores: {}, notes: {} },
      ],
    });

  const removeCriterion = (id: string) =>
    update({ ...comparison, criteria: comparison.criteria.filter((c) => c.id !== id) });

  const updateCriterion = (id: string, patch: Partial<Criterion>) =>
    update({
      ...comparison,
      criteria: comparison.criteria.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });

  const updateScore = (criterionId: string, optionId: string, raw: string) => {
    const criterion = comparison.criteria.find((c) => c.id === criterionId);
    if (!criterion) return;
    const value = raw.trim() === "" ? (criterion.scores[optionId] ?? 0) : Number(raw);
    updateCriterion(criterionId, {
      scores: { ...criterion.scores, [optionId]: value },
    });
  };

  const statusBody = () => {
    switch (result.status) {
      case "no-criteria":
        return (
          <EmptyState
            icon={<GridIcon className="size-8" />}
            title="No criteria"
            description="Add at least one criterion (e.g. Cost, Speed) to score options against. No ranking is shown until criteria exist."
          />
        );
      case "no-weights":
        return (
          <EmptyState
            icon={<AlertIcon className="size-8" />}
            title="No valid criterion weights"
            description="Every criterion needs an impact weight from 1 to 10. Invalid or missing weights are rejected — nothing is defaulted — so no ranking can be computed yet."
          />
        );
      case "no-options":
        return (
          <EmptyState
            icon={<GridIcon className="size-8" />}
            title="No options"
            description="Add the alternatives you are weighing (e.g. ‘Monolith’, ‘Serverless’) before scoring."
          />
        );
    }
  };

  if (result.status !== "ok") {
    return (
      <Card>
        <CardHeader
          title="Weighted Comparison Matrix"
          description="Score every alternative against weighted criteria and get a transparent, deterministic ranking."
          icon={<GridIcon className="size-4" />}
        />
        {statusBody()}
      </Card>
    );
  }

  const leaderId = result.leaderIds[0];
  const leader = leaderId ? result.options.find((o) => o.id === leaderId) : undefined;
  const sortedByRank = [...result.options].sort((a, b) => (b.rawScore ?? 0) - (a.rawScore ?? 0));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Weighted Comparison Matrix"
          description="Score every alternative against weighted criteria and get a transparent, deterministic ranking."
          icon={<GridIcon className="size-4" />}
        />

        {/* Leader */}
        {leader && (
          <div className="mb-6 rounded-xl border border-primary/30 bg-primary-soft/40 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="primary">Leader</Badge>
              <span className="text-lg font-extrabold text-ink">{leader.name}</span>
              <span className="text-2xl font-extrabold text-primary tabular-nums">
                {leader.pct}%
              </span>
              <span className="text-xs text-ink-muted">
                of possible score · raw {leader.rawScore} / {result.maxPossible}
              </span>
              {result.tied && (
                <Badge tone="warning">Tied</Badge>
              )}
              {result.close && (
                <Badge tone="warning">Close race</Badge>
              )}
              {leader.incomplete && (
                <Badge tone="warning">Incomplete</Badge>
              )}
            </div>
            {result.tied && (
              <p className="mt-2 text-sm text-ink-muted">
                Top options are tied — the ranking does not separate them.
              </p>
            )}
            {result.close && !result.tied && (
              <p className="mt-2 text-sm text-ink-muted">
                Leader is ahead by a narrow margin ({(result.marginPct ?? 0)}% of
                possible score); small weight changes could flip it.
              </p>
            )}
            {leader.incomplete && (
              <p className="mt-2 text-sm text-ink-muted">
                This leader has unscored cells — its percentage is provisional
                until missing scores are filled in.
              </p>
            )}
            <p className="mt-2 text-xs text-ink-subtle">
              This reflects the priorities you entered, not an objective measure.
            </p>
          </div>
        )}

        {/* Ranked breakdown */}
        <div className="space-y-3">
          {result.incompleteOptionIds.length > 0 && (
            <p className="text-sm text-ink-muted">
              Ranking includes incomplete evaluations (
              {result.incompleteOptionIds.length} option
              {result.incompleteOptionIds.length === 1 ? "" : "s"} flagged) — it
              may be provisional.
            </p>
          )}
          <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wide">
            Ranking
          </h4>
          <ol className="space-y-2">
            {sortedByRank.map((o) => (
              <li
                key={o.id}
                className="rounded-lg border border-line bg-canvas p-3"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={o.rank === 1 ? "primary" : "neutral"}>
                    #{o.rank}
                  </Badge>
                  <span className="font-bold text-ink">{o.name}</span>
                  {o.incomplete && (
                    <Badge tone="warning">Incomplete</Badge>
                  )}
                  <span className="ml-auto text-sm font-bold text-ink tabular-nums">
                    {o.pct}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  Raw score {o.rawScore} · {o.scoredCells}/{o.totalCells} cells
                  scored
                </p>
                <div className="mt-2 space-y-1">
                  {o.cells.map((cell) => (
                    <div
                      key={cell.criterionId}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-ink-muted">
                        {cell.criterionName}
                        {cell.weight === null ? " (weight invalid)" : ""}
                      </span>
                      <span className="tabular-nums">
                        {cell.score === null ? (
                          <span className="text-danger font-bold">Missing</span>
                        ) : (
                          `${cell.score} × ${cell.weight} = ${cell.contribution}`
                        )}
                        <span className="text-ink-subtle">
                          {" "}
                          / max {cell.max}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Card>

      {/* Editor: criteria + options */}
      <Card>
        <CardHeader
          title="Matrix editor"
          description="Weights must be whole numbers 1–10. Scores must be whole numbers 1–10; missing cells are never defaulted."
        />
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wide">
                Criteria ({comparison.criteria.length})
              </h4>
              <Button variant="ghost" size="sm" onClick={addCriterion}>
                + Add criterion
              </Button>
            </div>
            {comparison.criteria.length === 0 && (
              <p className="text-xs text-ink-subtle">
                No criteria yet — add one to start scoring.
              </p>
            )}
            <div className="space-y-3">
              {comparison.criteria.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-line bg-canvas p-3 space-y-2"
                >
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex-1 min-w-40 text-xs font-semibold text-ink-muted">
                      Criterion name
                      <input
                        type="text"
                        value={c.name}
                        onChange={(e) => updateCriterion(c.id, { name: e.target.value })}
                        className="mt-1 w-full bg-canvas border border-line rounded-md px-2 py-1.5 text-sm text-ink focus:border-primary focus:outline-none"
                      />
                    </label>
                    <label className="text-xs font-semibold text-ink-muted">
                      Weight (1–10)
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={c.weight}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          if (Number.isFinite(n)) updateCriterion(c.id, { weight: n });
                        }}
                        className="mt-1 w-20 bg-canvas border border-line rounded-md px-2 py-1.5 text-sm text-ink focus:border-primary focus:outline-none"
                      />
                    </label>
                    <Button variant="danger" size="sm" onClick={() => removeCriterion(c.id)}>
                      Remove
                    </Button>
                  </div>
                  <div className="grid gap-2">
                    {comparison.options.map((o) => (
                      <div key={o.id} className="flex items-center gap-2">
                        <span className="text-xs text-ink-muted w-40 truncate">{o.name}</span>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={c.scores[o.id] ?? ""}
                          onChange={(e) => updateScore(c.id, o.id, e.target.value)}
                          aria-label={`Score for ${c.name} / ${o.name}`}
                          className="w-16 bg-canvas border border-line rounded-md px-2 py-1.5 text-sm text-ink focus:border-primary focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={addOption} className="mt-3">
              + Add option
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
