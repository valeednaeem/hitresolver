/**
 * Verdict Dashboard engine tests (spec §4).
 *
 * Covers the completeness analysis (§4.3, W23), the ten named
 * recommendation rules and their severity order (§4.4), the no-composite
 * -score rule (§4.1/§4.5, W22 groundwork), E20 (tie + close both fire),
 * E21 (empty decision → 0%), and integration with the sample decision.
 * DOM-free (spec §6).
 */

import { describe, expect, it } from "vitest";
import { createSampleDecision } from "../domain/factory";
import type { Swot } from "../domain/types";
import { evaluateDashboard, type DashboardInput } from "./verdict";

/* ------------------------------------------------------------------ */
/* Builders                                                            */
/* ------------------------------------------------------------------ */

const SWOT_EMPTY: Swot = {
  strengths: [],
  weaknesses: [],
  opportunities: [],
  threats: [],
};

/** A fully-populated decision: 100% complete, firing only R-SO. */
function baseInput(patch: Partial<DashboardInput> = {}): DashboardInput {
  const swotBase: Swot = {
    strengths: [{ id: "s1", text: "Strong team", impact: "High" }],
    weaknesses: [{ id: "w1", text: "Thin margins", impact: "Medium" }],
    opportunities: [{ id: "o1", text: "New market", impact: "Medium" }],
    threats: [{ id: "t1", text: "Regulation", impact: "Low" }],
  };
  return {
    description: "Launch decision for Q3.",
    prosCons: {
      pros: [{ id: "p1", text: "Fast", weight: 5 }],
      cons: [{ id: "c1", text: "Risky", weight: 5 }],
    },
    comparison: {
      options: [
        { id: "a", name: "Alpha" },
        { id: "b", name: "Beta" },
      ],
      criteria: [
        {
          id: "k1",
          name: "Cost",
          weight: 5,
          scores: { a: 8, b: 3 },
          notes: {},
        },
      ],
    },
    swot: swotBase,
    ...patch,
  };
}

const ruleIds = (input: DashboardInput) =>
  evaluateDashboard(input).recommendations.map((r) => r.ruleId);

/* ------------------------------------------------------------------ */
/* §4.1 — no composite score                                           */
/* ------------------------------------------------------------------ */

describe("§4.1/§4.5 — incompatible outputs are never combined", () => {
  it("returns exactly four independent signals plus recommendations", () => {
    const dashboard = evaluateDashboard(baseInput());
    expect(Object.keys(dashboard).sort()).toEqual([
      "completeness",
      "matrix",
      "prosCons",
      "recommendations",
      "swot",
    ]);
    expect(Object.keys(dashboard)).not.toContain("score");
    expect(Object.keys(dashboard)).not.toContain("overall");
    expect(Object.keys(dashboard)).not.toContain("total");
  });

  it("keeps each framework's numbers separate and labelled by source", () => {
    const dashboard = evaluateDashboard(baseInput());
    // Three different scales coexist without being summed:
    expect(dashboard.prosCons.pct).toBe(50); // §1 share
    expect(dashboard.matrix.maxPossible).toBe(50); // §2 normalisation
    expect(dashboard.swot.posture).toBe("Balanced"); // §3 label, not a number
    expect(dashboard.completeness.completenessPct).toBe(100); // §4 fill-in
  });
});

/* ------------------------------------------------------------------ */
/* §4.3 — completeness                                                 */
/* ------------------------------------------------------------------ */

describe("§4.3 completeness", () => {
  it("defines exactly 10 checks and reports a fill-in percentage", () => {
    const { completeness } = evaluateDashboard(baseInput());
    expect(completeness.totalCount).toBe(10);
    expect(completeness.checks).toHaveLength(10);
    expect(completeness.completeCount).toBe(10);
    expect(completeness.completenessPct).toBe(100);
  });

  it("W23: every failed check carries a concrete, actionable message", () => {
    const input = baseInput({
      description: "",
      prosCons: { pros: [], cons: [] },
      comparison: { options: [], criteria: [] },
      swot: SWOT_EMPTY,
    });
    const { completeness } = evaluateDashboard(input);

    expect(completeness.completeCount).toBe(0);
    expect(completeness.completenessPct).toBe(0);
    for (const check of completeness.checks) {
      expect(check.passed).toBe(false);
      expect(check.message.trim().length).toBeGreaterThan(10);
      expect(check.label.trim().length).toBeGreaterThan(0);
    }
    // Spot-check the wording is specific, not generic.
    const byId = Object.fromEntries(
      completeness.checks.map((c) => [c.id, c]),
    );
    expect(byId["matrix-scored"].message).toMatch(/unscored|No matrix/);
    expect(byId["context"].message).toMatch(/context/i);
    expect(byId["ledger-both-sides"].message).toMatch(/one-sided|empty side/);
  });

  it("E21: a fully blank decision is 0% complete with no fabricated verdict", () => {
    const dashboard = evaluateDashboard(
      baseInput({
        description: "",
        prosCons: { pros: [], cons: [] },
        comparison: { options: [], criteria: [] },
        swot: SWOT_EMPTY,
      }),
    );
    expect(dashboard.completeness.completenessPct).toBe(0);
    expect(dashboard.swot.posture).toBe("Not assessed");
    expect(dashboard.matrix.status).toBe("no-criteria");
    expect(dashboard.recommendations).toEqual([
      { ruleId: "R-MATRIX-EMPTY", severity: "data", message: expect.stringContaining("comparison matrix") },
      { ruleId: "R-CONTEXT", severity: "completeness", message: expect.stringContaining("context") },
      { ruleId: "R-ONE-SIDED", severity: "completeness", message: expect.stringContaining("one-sided") },
      { ruleId: "R-SWOT-EMPTY", severity: "completeness", message: expect.stringContaining("SWOT") },
      { ruleId: "R-NO-HIGH", severity: "completeness", message: expect.stringContaining("high-impact") },
    ]);
  });

  it("counts partial fill-in honestly (sample decision: one close race)", () => {
    const sample = createSampleDecision();
    const dashboard = evaluateDashboard(sample);

    // 9 of 10 checks pass; only 'margin-clear' fails (margin 2 ≤ 12).
    expect(dashboard.completeness.completeCount).toBe(9);
    expect(dashboard.completeness.completenessPct).toBe(90);

    const failed = dashboard.completeness.checks.filter((c) => !c.passed);
    expect(failed.map((c) => c.id)).toEqual(["margin-clear"]);
    expect(failed[0].message).toMatch(/5% close-race threshold/);
  });
});

/* ------------------------------------------------------------------ */
/* §4.4 — one rule per trigger, severity order                         */
/* ------------------------------------------------------------------ */

describe("§4.4 recommendation rules", () => {
  it("base input fires exactly R-SO (its one true trigger)", () => {
    expect(ruleIds(baseInput())).toEqual(["R-SO"]);
  });

  it("no recommendation is emitted without a triggering condition", () => {
    // Remove the strength → R-SO must disappear (S≥1 && O≥1 no longer holds).
    const withoutStrength = baseInput({
      swot: {
        strengths: [],
        weaknesses: [{ id: "w1", text: "Thin margins", impact: "Medium" }],
        opportunities: [{ id: "o1", text: "New market", impact: "Medium" }],
        threats: [{ id: "t1", text: "Regulation", impact: "Low" }],
      },
    });
    expect(ruleIds(withoutStrength)).not.toContain("R-SO");
    // …and R-SWOT-EMPTY + R-NO-HIGH appear for their own triggers.
    expect(ruleIds(withoutStrength)).toContain("R-SWOT-EMPTY");
    expect(ruleIds(withoutStrength)).toContain("R-NO-HIGH");
  });

  it("R-MATRIX-EMPTY — no options or no criteria", () => {
    expect(ruleIds(baseInput({ comparison: { options: [], criteria: [] } }))).toContain(
      "R-MATRIX-EMPTY",
    );
    expect(
      ruleIds(
        baseInput({
          comparison: {
            options: [{ id: "a", name: "Alpha" }],
            criteria: [],
          },
        }),
      ),
    ).toContain("R-MATRIX-EMPTY");
  });

  it("R-INCOMPLETE — any unscored cell", () => {
    const input = baseInput();
    input.comparison.criteria[0].scores = { a: 8 }; // Beta unscored
    expect(ruleIds(input)).toContain("R-INCOMPLETE");
    // …and it does not fire when every cell is scored.
    expect(ruleIds(baseInput())).not.toContain("R-INCOMPLETE");
  });

  it("R-TIE — tied leaders", () => {
    const input = baseInput();
    input.comparison.criteria[0].scores.b = 8; // identical totals
    const dashboard = evaluateDashboard(input);
    const ids = dashboard.recommendations.map((r) => r.ruleId);
    expect(ids).toContain("R-TIE");
    expect(ids).toContain("R-CLOSE"); // margin 0 is trivially close (E20)
    expect(
      dashboard.recommendations.find((r) => r.ruleId === "R-TIE")!.severity,
    ).toBe("data");
  });

  it("R-CLOSE — leader ahead by ≤ 5% of maxPossible", () => {
    const input = baseInput({
      comparison: {
        options: [
          { id: "a", name: "Alpha" },
          { id: "b", name: "Beta" },
        ],
        criteria: [
          {
            id: "k1",
            name: "Cost",
            weight: 5,
            scores: { a: 5, b: 5 },
            notes: {},
          },
          {
            id: "k2",
            name: "Speed",
            weight: 1,
            scores: { a: 5, b: 3 }, // 30 vs 28 → margin 2 ≤ 3 (5% of 60)
            notes: {},
          },
        ],
      },
    });
    const dashboard = evaluateDashboard(input);
    expect(dashboard.matrix.close).toBe(true);
    expect(dashboard.recommendations.map((r) => r.ruleId)).toContain("R-CLOSE");
    expect(dashboard.completeness.checks.find((c) => c.id === "margin-clear")!.passed).toBe(false);
  });

  it("R-RISK — a High-impact weakness or threat", () => {
    const input = baseInput({
      swot: {
        strengths: [{ id: "s1", text: "Team", impact: "High" }],
        weaknesses: [{ id: "w1", text: "Burnout risk", impact: "High" }],
        opportunities: [{ id: "o1", text: "Market", impact: "Medium" }],
        threats: [{ id: "t1", text: "Regulation", impact: "Low" }],
      },
    });
    const dashboard = evaluateDashboard(input);
    expect(dashboard.recommendations.map((r) => r.ruleId)).toContain("R-RISK");
    expect(dashboard.swot.posture).toBe("Exposed");
    // A High *strength* is not a risk.
    expect(ruleIds(baseInput())).not.toContain("R-RISK");
  });

  it("R-CONTEXT — blank description", () => {
    expect(ruleIds(baseInput({ description: "   " }))).toContain("R-CONTEXT");
    expect(ruleIds(baseInput())).not.toContain("R-CONTEXT");
  });

  it("R-ONE-SIDED — pros or cons empty", () => {
    expect(
      ruleIds(baseInput({ prosCons: { pros: [], cons: [] } })),
    ).toContain("R-ONE-SIDED");
    expect(
      ruleIds(
        baseInput({
          prosCons: {
            pros: [{ id: "p1", text: "Fast", weight: 5 }],
            cons: [],
          },
        }),
      ),
    ).toContain("R-ONE-SIDED");
    expect(ruleIds(baseInput())).not.toContain("R-ONE-SIDED");
  });

  it("R-SWOT-EMPTY — any quadrant empty", () => {
    const input = baseInput();
    input.swot.threats = [];
    expect(ruleIds(input)).toContain("R-SWOT-EMPTY");
  });

  it("R-NO-HIGH — nothing marked High anywhere", () => {
    const input = baseInput({
      swot: {
        strengths: [{ id: "s1", text: "Team", impact: "Medium" }],
        weaknesses: [{ id: "w1", text: "Thin margins", impact: "Medium" }],
        opportunities: [{ id: "o1", text: "Market", impact: "Low" }],
        threats: [{ id: "t1", text: "Regulation", impact: "Low" }],
      },
    });
    expect(ruleIds(input)).toContain("R-NO-HIGH");
    expect(ruleIds(baseInput())).not.toContain("R-NO-HIGH");
  });

  it("orders recommendations data-integrity → risk → strategic → completeness", () => {
    const severityOrder = {
      data: 0,
      risk: 1,
      strategic: 2,
      completeness: 3,
    };
    const dashboard = evaluateDashboard(
      baseInput({
        description: "",
        comparison: { options: [], criteria: [] },
        swot: {
          strengths: [],
          weaknesses: [{ id: "w1", text: "Burnout", impact: "High" }],
          opportunities: [],
          threats: [],
        },
      }),
    );
    const severities = dashboard.recommendations.map((r) => r.severity);
    expect(severities.length).toBeGreaterThan(1);
    for (let i = 1; i < severities.length; i++) {
      expect(severityOrder[severities[i]]).toBeGreaterThanOrEqual(
        severityOrder[severities[i - 1]],
      );
    }
    // The data-integrity rule leads, the risk rule follows it.
    expect(dashboard.recommendations[0].ruleId).toBe("R-MATRIX-EMPTY");
    expect(dashboard.recommendations.map((r) => r.ruleId)).toContain("R-RISK");
  });

  it("E20: a tied leader with a close gap shows BOTH R-TIE and R-CLOSE", () => {
    const input: DashboardInput = baseInput({
      comparison: {
        options: [
          { id: "a", name: "Alpha" },
          { id: "b", name: "Beta" },
          { id: "c", name: "Gamma" },
        ],
        criteria: [
          {
            id: "k1",
            name: "Cost",
            weight: 10,
            scores: { a: 5, b: 5, c: 5 },
            notes: {},
          },
          {
            id: "k2",
            name: "Speed",
            weight: 1,
            scores: { a: 5, b: 5, c: 4 },
            notes: {},
          },
        ],
      },
    });
    const dashboard = evaluateDashboard(input);
    expect(dashboard.matrix.tied).toBe(true);
    expect(dashboard.matrix.close).toBe(true);
    const ids = dashboard.recommendations.map((r) => r.ruleId);
    expect(ids).toContain("R-TIE");
    expect(ids).toContain("R-CLOSE");
  });
});

/* ------------------------------------------------------------------ */
/* Integration: the sample decision                                    */
/* ------------------------------------------------------------------ */

describe("sample decision (realistic full scenario)", () => {
  const sample = createSampleDecision();
  const dashboard = evaluateDashboard(sample);

  it("produces the §1 pros/cons signal from real entries", () => {
    expect(dashboard.prosCons.prosPts).toBe(24); // 9 + 7 + 8
    expect(dashboard.prosCons.consPts).toBe(11); // 6 + 5
    expect(dashboard.prosCons.pct).toBe(69); // 24/35 → 68.57 → 69
    expect(dashboard.prosCons.verdict).toBe("Strong Go");
    expect(dashboard.prosCons.isEmpty).toBe(false);
    expect(dashboard.prosCons.oneSided).toBeNull();
  });

  it("produces the §2 matrix signal with a unique leader", () => {
    const { matrix } = dashboard;
    expect(matrix.status).toBe("ok");
    expect(matrix.maxPossible).toBe(240); // (9 + 7 + 8) × 10
    expect(matrix.leaderNames).toEqual(["Modular Monolith"]);
    expect(matrix.tied).toBe(false);
    expect(matrix.margin).toBe(2); // 193 − 191
    expect(matrix.close).toBe(true); // 2 ≤ 5% of 240 = 12
    expect(matrix.missingCells).toBe(0);

    const monolith = matrix.options.find((o) => o.name === "Modular Monolith")!;
    expect(monolith.rawScore).toBe(193); // 9×9 + 8×7 + 7×8
    expect(monolith.pct).toBe(80); // 193/240 → 80.42 → 80
    expect(monolith.rank).toBe(1);
  });

  it("produces the §3 SWOT signal — counts, never a score", () => {
    const { swot } = dashboard;
    expect(swot.counts).toEqual({
      strengths: 2,
      weaknesses: 1,
      opportunities: 1,
      threats: 1,
    });
    expect(swot.highImpactRisks).toBe(1);
    expect(swot.posture).toBe("Exposed");
  });

  it("fires exactly the recommendations its data triggers", () => {
    expect(dashboard.recommendations.map((r) => r.ruleId)).toEqual([
      "R-CLOSE",
      "R-RISK",
      "R-SO",
    ]);
  });

  it("W22 groundwork: everything the Markdown export needs is present", () => {
    // The actual export rendering is built in Phase 3; this asserts the
    // dashboard supplies every section it must contain (the prototype's
    // export omitted the Verdict Dashboard entirely).
    const d = evaluateDashboard(sample);
    expect(d.prosCons.verdict).toBeTruthy();
    expect(d.matrix.leaderNames.length).toBeGreaterThan(0);
    expect(d.swot.posture).toBeTruthy();
    expect(d.completeness.completenessPct).toBeGreaterThanOrEqual(0);
    expect(d.recommendations.length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/* Determinism (§0)                                                    */
/* ------------------------------------------------------------------ */

describe("determinism", () => {
  it("same decision ⇒ byte-identical dashboard output", () => {
    const sample = createSampleDecision();
    const input: DashboardInput = {
      description: sample.description,
      prosCons: sample.prosCons,
      comparison: sample.comparison,
      swot: sample.swot,
    };
    expect(evaluateDashboard(input)).toEqual(evaluateDashboard(input));
  });

  it("works directly from a Decision record", () => {
    const sample = createSampleDecision();
    const dashboard = evaluateDashboard(sample); // Decision satisfies DashboardInput
    expect(dashboard.completeness.totalCount).toBe(10);
  });
});

describe("empty / incomplete / invalid framework states", () => {
  it("empty pros/cons → placeholder 50 with empty flag, not a finding", () => {
    const dashboard = evaluateDashboard(
      baseInput({ prosCons: { pros: [], cons: [] } }),
    );
    expect(dashboard.prosCons.pct).toBe(50);
    expect(dashboard.prosCons.isEmpty).toBe(true);
  });

  it("invalid SWOT impact items are excluded and reported", () => {
    const dashboard = evaluateDashboard(
      baseInput({
        swot: {
          strengths: [{ id: "s1", text: "ok", impact: "High" }],
          weaknesses: [
            { id: "w1", text: "bad", impact: "Critical" as never },
          ],
          opportunities: [{ id: "o1", text: "ok", impact: "Low" }],
          threats: [{ id: "t1", text: "ok", impact: "Low" }],
        },
      }),
    );
    expect(dashboard.swot.invalid).toHaveLength(1);
    expect(dashboard.swot.counts.weaknesses).toBe(0);
    // The empty quadrant is reported honestly.
    expect(dashboard.swot.emptyQuadrants).toContain("weaknesses");
    expect(
      dashboard.recommendations.map((r) => r.ruleId),
    ).toContain("R-SWOT-EMPTY");
  });

  it("all-zero matrix weights → explicit state, pct 0, R-MATRIX context clear", () => {
    const dashboard = evaluateDashboard(
      baseInput({
        comparison: {
          options: [{ id: "a", name: "Alpha" }],
          criteria: [
            { id: "k1", name: "Cost", weight: 0, scores: { a: 5 }, notes: {} },
          ],
        },
      }),
    );
    expect(dashboard.matrix.status).toBe("no-weights");
    expect(dashboard.matrix.statusMessage).toBe("No valid criterion weights");
    expect(dashboard.matrix.options[0].pct).toBe(0);
    expect(dashboard.completeness.checks.find((c) => c.id === "matrix-weights")!.passed).toBe(false);
  });
});
