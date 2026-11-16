"use client";

import { useId, useState } from "react";
import {
  CompassIcon,
  GridIcon,
  LayersIcon,
  ScaleIcon,
} from "@/components/ui/icons";
import { PhasePlaceholder } from "@/components/ui/brand";

const TABS = [
  {
    id: "proscons",
    label: "Pros & Cons",
    step: "1",
    icon: ScaleIcon,
    phase: "Phase 2",
    title: "Weighted Pros & Cons",
    description:
      "List the upsides and downsides, give each an impact weight, and see a live balance with a clearly-labelled verdict.",
    bullets: [
      "Add, edit and remove advantages and disadvantages",
      "Impact weights from 1 to 10 with a live balance meter",
      "Strong Go / Lean Yes / Balanced / Lean No / Strong No",
      "The formula is shown, and the result is never framed as an objective answer",
    ],
  },
  {
    id: "comparison",
    label: "Comparison Table",
    step: "2",
    icon: GridIcon,
    phase: "Phase 2",
    title: "Weighted Comparison Matrix",
    description:
      "Score every alternative against weighted criteria and get a transparent, deterministic ranking.",
    bullets: [
      "Unlimited options and criteria with 1–10 weights and scores",
      "Weighted totals, percentages, ranking and per-cell breakdowns",
      "Missing scores, ties, zero weights and incomplete matrices handled safely",
      "Ranking reflects your priorities — it is not proof of a universally best option",
    ],
  },
  {
    id: "swot",
    label: "SWOT Analysis",
    step: "3",
    icon: LayersIcon,
    phase: "Phase 2",
    title: "2×2 SWOT Analysis",
    description:
      "Map internal strengths and weaknesses against external opportunities and threats, tagged by impact.",
    bullets: [
      "Four quadrants with clear internal / external categorisation",
      "High, Medium and Low impact tags on every entry",
      "Add, edit and remove entries",
      "Responsive 2×2 layout that stacks cleanly on mobile",
    ],
  },
  {
    id: "verdict",
    label: "HitResolver Verdict",
    step: "4",
    icon: CompassIcon,
    phase: "Phase 2",
    title: "HitResolver Verdict Dashboard",
    description:
      "A combined overview that separates calculated results from interpretation and recommendations.",
    bullets: [
      "Pros & Cons signal, comparison ranking and SWOT posture side by side",
      "High-impact risks, opportunities and missing-information detection",
      "Suggested next actions from transparent, named rules",
      "No composite “scientific score” — unrelated signals are never summed",
    ],
  },
] as const;

export type TabId = (typeof TABS)[number]["id"];

/**
 * Accessible tablist following the ARIA tabs pattern: roving tabindex,
 * Left/Right/Home/End navigation, and `aria-controls` wiring.
 */
export function FrameworkTabs({ children }: { children?: React.ReactNode }) {
  const [active, setActive] = useState<TabId>("proscons");
  const baseId = useId();

  const onKeyDown = (e: React.KeyboardEvent) => {
    const index = TABS.findIndex((t) => t.id === active);
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = TABS.length - 1;
    else return;
    e.preventDefault();
    setActive(TABS[next].id);
    document
      .getElementById(`${baseId}-tab-${TABS[next].id}`)
      ?.focus();
  };

  const current = TABS.find((t) => t.id === active)!;

  return (
    <div>
      <div
        role="tablist"
        aria-label="Decision frameworks"
        onKeyDown={onKeyDown}
        className="flex gap-1 overflow-x-auto border-b border-line pb-px -mx-1 px-1"
      >
        {TABS.map((tab) => {
          const selected = tab.id === active;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              className={[
                "relative flex items-center gap-2 px-3.5 py-2.5 rounded-t-lg",
                "text-[0.8125rem] font-semibold whitespace-nowrap",
                "transition-colors duration-150 -mb-px",
                "border-b-2",
                selected
                  ? "text-primary border-primary bg-primary-soft"
                  : "text-ink-muted border-transparent hover:text-ink hover:bg-surface-2",
              ].join(" ")}
            >
              <span
                aria-hidden="true"
                className="text-[0.625rem] font-bold opacity-60"
              >
                {tab.step}
              </span>
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-${current.id}`}
        aria-labelledby={`${baseId}-tab-${current.id}`}
        tabIndex={0}
        className="pt-5 outline-none"
      >
        {children ?? (
          <div className="bg-surface border border-line rounded-xl shadow-sm">
            <PhasePlaceholder
              phase={current.phase}
              title={current.title}
              description={current.description}
              bullets={[...current.bullets]}
            />
          </div>
        )}
      </div>
    </div>
  );
}
