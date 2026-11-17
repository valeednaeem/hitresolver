"use client";

/**
 * Weighted Pros & Cons panel — Phase 2 (spec §1).
 *
 * Renders the engine's ledger evaluation and real editing controls.
 * The panel never computes totals itself; every number comes from
 * `evaluateProsCons` so the UI can never drift from the engine (the W2
 * class of defect is display-side and cannot happen here).
 */

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertIcon, ScaleIcon } from "@/components/ui/icons";
import { useWorkspace } from "@/state/workspace";
import { evaluateProsCons } from "@/engine";
import { createId } from "@/domain/ids";
import type { WeightedItem } from "@/domain/types";

const VERDICT_TONE: Record<string, "success" | "warning" | "danger" | "primary"> = {
  "Strong Go": "success",
  "Lean Yes": "success",
  Balanced: "warning",
  "Lean No": "danger",
  "Strong No": "danger",
};

export function ProsConsPanel() {
  const { activeDecision, updateProsCons } = useWorkspace();
  const { pros, cons } = activeDecision.prosCons;
  const result = useMemo(
    () => evaluateProsCons(pros, cons),
    [pros, cons],
  );

  const setPros = (nextPros: WeightedItem[]) =>
    updateProsCons(activeDecision.id, { ...activeDecision.prosCons, pros: nextPros });

  const setCons = (nextCons: WeightedItem[]) =>
    updateProsCons(activeDecision.id, { ...activeDecision.prosCons, cons: nextCons });

  const addPro = () => {
    setPros([
      ...pros,
      { id: createId(), text: "", weight: 3 },
    ]);
  };
  const addCon = () => {
    setCons([
      ...cons,
      { id: createId(), text: "", weight: 3 },
    ]);
  };
  const removePro = (id: string) =>
    setPros(pros.filter((p) => p.id !== id));
  const removeCon = (id: string) =>
    setCons(cons.filter((c) => c.id !== id));

  const setProWeight = (id: string, weight: number) =>
    setPros(pros.map((p) => (p.id === id ? { ...p, weight } : p)));
  const setConWeight = (id: string, weight: number) =>
    setCons(cons.map((c) => (c.id === id ? { ...c, weight } : c)));
  const setProText = (id: string, text: string) =>
    setPros(pros.map((p) => (p.id === id ? { ...p, text } : p)));
  const setConText = (id: string, text: string) =>
    setCons(cons.map((c) => (c.id === id ? { ...c, text } : c)));

  const verdictTone = VERDICT_TONE[result.verdict] ?? "primary";

  return (
    <Card>
      <CardHeader
        title="Weighted Pros & Cons"
        description="Positive vs negative entered weight, with an explicit verdict."
        icon={<ScaleIcon className="size-4" />}
      />

      {result.isEmpty ? (
        <EmptyState
          icon={<ScaleIcon className="size-8" />}
          title="No entries yet"
          description="Not enough information yet — add upsides and downsides with impact weights (1–10). Nothing has been measured, so no balance is presented; the verdict is not a finding."
        />
      ) : (
        <div className="space-y-5">
          {/* Balance + verdict */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div>
              <p className="text-3xl font-extrabold text-ink tabular-nums">
                {result.pct}%
              </p>
              <p className="text-xs text-ink-muted mt-1">
                {result.pct}% of entered weight is on the upside.
              </p>
            </div>
            <Badge tone={verdictTone} className="text-xs">
              {result.verdict}
            </Badge>
            {result.oneSided && (
              <Badge tone="warning" className="text-xs">
                One side empty
              </Badge>
            )}
            {result.oneSided && (
              <p className="text-xs text-ink-muted">
                No {result.oneSided} entries were provided — the balance below
                reflects one side only and is not a complete measurement.
              </p>
            )}
          </div>

          {/* Ledger detail */}
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border border-line bg-canvas p-3">
              <dt className="text-xs text-ink-muted font-semibold uppercase tracking-wide">
                Pros weight
              </dt>
              <dd className="text-lg font-bold text-ink tabular-nums mt-0.5">
                {result.prosPts}
              </dd>
            </div>
            <div className="rounded-lg border border-line bg-canvas p-3">
              <dt className="text-xs text-ink-muted font-semibold uppercase tracking-wide">
                Cons weight
              </dt>
              <dd className="text-lg font-bold text-ink tabular-nums mt-0.5">
                {result.consPts}
              </dd>
            </div>
            <div className="rounded-lg border border-line bg-canvas p-3">
              <dt className="text-xs text-ink-muted font-semibold uppercase tracking-wide">
                Net balance
              </dt>
              <dd
                className={`text-lg font-bold tabular-nums mt-0.5 ${result.prosPts - result.consPts >= 0 ? "text-success" : "text-danger"}`}
              >
                {result.prosPts - result.consPts >= 0 ? "+" : "−"}
                {Math.abs(result.prosPts - result.consPts)}
              </dd>
            </div>
          </dl>

          {result.invalid.length > 0 && (
            <div className="rounded-lg border border-danger/40 bg-danger-soft/40 p-3">
              <p className="text-xs font-bold text-danger flex items-center gap-2">
                <AlertIcon className="size-4" /> {result.invalid.length} weight
                {result.invalid.length === 1 ? "" : "s"} rejected
              </p>
              <ul className="mt-2 space-y-1">
                {result.invalid.map((inv) => (
                  <li key={`${inv.side}-${inv.id}`} className="text-xs text-danger">
                    {inv.side === "pros" ? "Pro" : "Con"} “{inv.id}” — {inv.reason}.
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Editing lists */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Pros */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wide">
              Pros ({pros.length})
            </h4>
            <Button variant="ghost" size="sm" onClick={addPro}>
              + Add pro
            </Button>
          </div>
          {pros.length === 0 ? (
            <p className="text-xs text-ink-subtle">No upsides entered.</p>
          ) : (
            <ul className="space-y-2">
              {pros.map((p) => (
                <li
                  key={p.id}
                  className="rounded-lg border border-line bg-canvas p-3 space-y-2"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={p.text}
                      placeholder="Advantage…"
                      onChange={(e) => setProText(p.id, e.target.value)}
                      aria-label={`Pros entry text for ${p.id}`}
                      className="flex-1 min-w-0 bg-canvas border border-line rounded-md px-2 py-1.5 text-sm text-ink placeholder:text-ink-subtle focus:border-primary focus:outline-none"
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => removePro(p.id)}
                      aria-label={`Remove pro ${p.id}`}
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Impact weight">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((w) => (
                      <button
                        key={w}
                        type="button"
                        aria-pressed={p.weight === w}
                        onClick={() => setProWeight(p.id, w)}
                        className={`h-7 w-9 rounded-md border text-xs font-bold tabular-nums transition-colors ${
                          p.weight === w
                            ? "bg-primary text-on-primary border-primary"
                            : "bg-canvas text-ink-muted border-line hover:bg-surface-2"
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Cons */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wide">
              Cons ({cons.length})
            </h4>
            <Button variant="ghost" size="sm" onClick={addCon}>
              + Add con
            </Button>
          </div>
          {cons.length === 0 ? (
            <p className="text-xs text-ink-subtle">No downsides entered.</p>
          ) : (
            <ul className="space-y-2">
              {cons.map((c) => (
                <li
                  key={c.id}
                  className="rounded-lg border border-line bg-canvas p-3 space-y-2"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={c.text}
                      placeholder="Disadvantage…"
                      onChange={(e) => setConText(c.id, e.target.value)}
                      aria-label={`Cons entry text for ${c.id}`}
                      className="flex-1 min-w-0 bg-canvas border border-line rounded-md px-2 py-1.5 text-sm text-ink placeholder:text-ink-subtle focus:border-primary focus:outline-none"
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => removeCon(c.id)}
                      aria-label={`Remove con ${c.id}`}
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Impact weight">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((w) => (
                      <button
                        key={w}
                        type="button"
                        aria-pressed={c.weight === w}
                        onClick={() => setConWeight(c.id, w)}
                        className={`h-7 w-9 rounded-md border text-xs font-bold tabular-nums transition-colors ${
                          c.weight === w
                            ? "bg-primary text-on-primary border-primary"
                            : "bg-canvas text-ink-muted border-line hover:bg-surface-2"
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Card>
  );
}
