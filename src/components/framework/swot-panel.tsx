"use client";

/**
 * SWOT panel — Phase 2 (spec §3).
 *
 * Renders the four quadrants with real editing controls and the
 * engine-derived posture. No numeric SWOT score is ever shown.
 */

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { AlertIcon, LayersIcon } from "@/components/ui/icons";
import { useWorkspace } from "@/state/workspace";
import { evaluateSwot } from "@/engine";
import { createId } from "@/domain/ids";
import type { Impact, SwotItem, SwotQuadrant } from "@/domain/types";

const QUADRANT_META: Record<
  SwotQuadrant,
  { title: string; internal: boolean; helpful: boolean }
> = {
  strengths: { title: "Strengths", internal: true, helpful: true },
  weaknesses: { title: "Weaknesses", internal: true, helpful: false },
  opportunities: { title: "Opportunities", internal: false, helpful: true },
  threats: { title: "Threats", internal: false, helpful: false },
};

const IMPACT_LEVELS: Impact[] = ["High", "Medium", "Low"];

export function SwotPanel() {
  const { activeDecision, updateSwot } = useWorkspace();
  const { swot } = activeDecision;
  const result = useMemo(() => evaluateSwot(swot), [swot]);

  const updateQuadrant = (quadrant: SwotQuadrant, items: SwotItem[]) =>
    updateSwot(activeDecision.id, { ...swot, [quadrant]: items });

  const addItem = (quadrant: SwotQuadrant) =>
    updateQuadrant(quadrant, [
      ...swot[quadrant],
      { id: createId(), text: "", impact: "Medium" as Impact },
    ]);

  const removeItem = (quadrant: SwotQuadrant, id: string) =>
    updateQuadrant(quadrant, swot[quadrant].filter((i) => i.id !== id));

  const setText = (quadrant: SwotQuadrant, id: string, text: string) =>
    updateQuadrant(
      quadrant,
      swot[quadrant].map((i) => (i.id === id ? { ...i, text } : i)),
    );

  const setImpact = (quadrant: SwotQuadrant, id: string, impact: Impact) =>
    updateQuadrant(
      quadrant,
      swot[quadrant].map((i) => (i.id === id ? { ...i, impact } : i)),
    );

  const renderItem = (quadrant: SwotQuadrant, item: SwotItem) => (
    <div
      key={item.id}
      className="rounded-lg border border-line bg-canvas p-3 space-y-2"
    >
      <div className="flex gap-2">
        <input
          type="text"
          value={item.text}
          placeholder="Factor…"
          onChange={(e) => setText(quadrant, item.id, e.target.value)}
          aria-label={`SWOT ${quadrant} entry text for ${item.id}`}
          className="flex-1 min-w-0 bg-canvas border border-line rounded-md px-2 py-1.5 text-sm text-ink placeholder:text-ink-subtle focus:border-primary focus:outline-none"
        />
        <Button
          variant="danger"
          size="sm"
          onClick={() => removeItem(quadrant, item.id)}
          aria-label={`Remove SWOT ${quadrant} entry ${item.id}`}
        >
          Remove
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {IMPACT_LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            aria-pressed={item.impact === level}
            onClick={() => setImpact(quadrant, item.id, level)}
            className={`h-7 px-2.5 rounded-full border text-[0.6875rem] font-bold uppercase tracking-wide transition-colors ${
              item.impact === level
                ? "bg-primary text-on-primary border-primary"
                : "bg-canvas text-ink-muted border-line hover:bg-surface-2"
            }`}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  );

  const quadrants = Object.keys(QUADRANT_META) as SwotQuadrant[];

  return (
    <Card>
      <CardHeader
        title="2×2 SWOT Analysis"
        description="Map internal strengths and weaknesses against external opportunities and threats, tagged by impact."
        icon={<LayersIcon className="size-4" />}
      />

      <div className="mb-6 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary-soft/40 p-4">
        <Badge tone="primary">Posture</Badge>
        <span className="text-lg font-extrabold text-ink">{result.posture}</span>
        <span className="text-xs text-ink-muted">
          {result.highImpactRisks} high-impact risk{result.highImpactRisks === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {quadrants.map((quadrant) => {
          const meta = QUADRANT_META[quadrant];
          const items = swot[quadrant];
          return (
            <div
              key={quadrant}
              className="rounded-xl border border-line bg-canvas p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-ink">{meta.title}</h4>
                <Badge tone="neutral">
                  {meta.internal ? "Internal" : "External"} ·{" "}
                  {meta.helpful ? "Helpful" : "Harmful"}
                </Badge>
              </div>
              {items.length === 0 ? (
                <p className="text-xs text-ink-subtle mb-2">
                  No {meta.title.toLowerCase()} entries yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => renderItem(quadrant, item))}
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => addItem(quadrant)}
              >
                + Add {meta.title.toLowerCase()}
              </Button>
            </div>
          );
        })}
      </div>

      {result.invalid.length > 0 && (
        <div className="mt-4 rounded-lg border border-danger/40 bg-danger-soft/40 p-3">
          <p className="text-xs font-bold text-danger flex items-center gap-2">
            <AlertIcon className="size-4" /> {result.invalid.length} impact
            {result.invalid.length === 1 ? "" : "s"} rejected
          </p>
          <ul className="mt-2 space-y-1">
            {result.invalid.map((inv, i) => (
              <li key={`${inv.quadrant}-${inv.id}-${i}`} className="text-xs text-danger">
                {inv.quadrant}: “{inv.id}” — {inv.reason}.
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.emptyQuadrants.length > 0 && (
        <p className="mt-4 text-xs text-ink-muted">
          Empty quadrants: {result.emptyQuadrants.join(", ")} — complete them to
          surface external factors.
        </p>
      )}
    </Card>
  );
}
