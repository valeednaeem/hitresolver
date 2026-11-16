/**
 * Weighted Pros & Cons engine tests (spec §1).
 *
 * Covers E1–E6, E23 (band boundaries), §1.2 formulas, §1.4 empty-state
 * semantics and the W1/W3/W6 rejection regressions.
 * DOM-free (spec §6).
 */

import { describe, expect, it } from "vitest";
import {
  classifyVerdict,
  evaluateProsCons,
  type WeightedEntry,
} from "./proscons";

const pro = (id: string, weight: unknown): WeightedEntry => ({
  id,
  text: `Pro ${id}`,
  weight,
});
const con = (id: string, weight: unknown): WeightedEntry => ({
  id,
  text: `Con ${id}`,
  weight,
});

describe("§1.2 formulas", () => {
  it("sums each side and derives the positive weight share", () => {
    const result = evaluateProsCons(
      [pro("p1", 9), pro("p2", 7)],
      [con("c1", 6), con("c2", 5)],
    );
    expect(result.prosPts).toBe(16);
    expect(result.consPts).toBe(11);
    expect(result.total).toBe(27);
    expect(result.pct).toBe(Math.floor((16 * 100) / 27 + 0.5)); // 59
    expect(result.pct).toBe(59);
    expect(result.verdict).toBe("Lean Yes");
  });

  it("is deterministic: identical input ⇒ identical output", () => {
    const pros = [pro("a", 3), pro("b", 8)];
    const cons = [con("c", 6)];
    const first = evaluateProsCons(pros, cons);
    const second = evaluateProsCons(pros, cons);
    expect(second).toEqual(first);
  });
});

describe("E1 — no pros, no cons", () => {
  it("reports pct 50 as a placeholder with an explicit empty state", () => {
    const result = evaluateProsCons([], []);
    expect(result.pct).toBe(50);
    expect(result.verdict).toBe("Balanced");
    expect(result.total).toBe(0);
    expect(result.isEmpty).toBe(true);
    expect(result.oneSided).toBeNull();
  });
});

describe("E2 — pros only", () => {
  it("computes 100% Strong Go and flags the empty cons side", () => {
    const result = evaluateProsCons([pro("p1", 10)], []);
    expect(result.pct).toBe(100);
    expect(result.verdict).toBe("Strong Go");
    expect(result.oneSided).toBe("cons");
    expect(result.isEmpty).toBe(false);
  });

  it("flags the empty pros side when only cons are entered", () => {
    const result = evaluateProsCons([], [con("c1", 4)]);
    expect(result.pct).toBe(0);
    expect(result.verdict).toBe("Strong No");
    expect(result.oneSided).toBe("pros");
  });
});

describe("invalid weights are excluded, never counted (E3–E5)", () => {
  it("E3: weight 0 is rejected and reported", () => {
    const result = evaluateProsCons([pro("p1", 0), pro("p2", 5)], []);
    expect(result.prosPts).toBe(5);
    expect(result.counted.pros).toBe(1);
    expect(result.entered.pros).toBe(2);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0]).toMatchObject({ side: "pros", id: "p1" });
  });

  it("E4: NaN and non-numeric weights never reach the totals", () => {
    const result = evaluateProsCons(
      [pro("p1", Number.NaN), pro("p2", "abc"), pro("p3", 6)],
      [con("c1", Number.POSITIVE_INFINITY)],
    );
    expect(Number.isFinite(result.total)).toBe(true);
    expect(result.prosPts).toBe(6);
    expect(result.consPts).toBe(0);
    expect(result.invalid).toHaveLength(3);
  });

  it("E5: weight 15 is rejected, not clamped to 10", () => {
    const result = evaluateProsCons([pro("p1", 15)], []);
    expect(result.prosPts).toBe(0);
    expect(result.invalid).toHaveLength(1);
    expect(result.invalid[0].reason).toMatch(/1 to 10/);
  });

  it("E6: weight 3.6 is rounded to 4 and accepted", () => {
    const result = evaluateProsCons([pro("p1", 3.6)], []);
    expect(result.prosPts).toBe(4);
    expect(result.invalid).toHaveLength(0);
  });

  it("negative weights are rejected (W6)", () => {
    const result = evaluateProsCons([pro("p1", -5)], [con("c1", -2)]);
    expect(result.total).toBe(0);
    expect(result.invalid).toHaveLength(2);
    expect(Number.isNaN(result.total)).toBe(false);
  });
});

describe("§1.3 verdict band boundaries — E23", () => {
  it("classifies every documented boundary (first match wins)", () => {
    expect(classifyVerdict(65)).toBe("Strong Go");
    expect(classifyVerdict(64)).toBe("Lean Yes");
    expect(classifyVerdict(55)).toBe("Lean Yes");
    expect(classifyVerdict(54)).toBe("Balanced");
    expect(classifyVerdict(46)).toBe("Balanced");
    expect(classifyVerdict(45)).toBe("Lean No");
    expect(classifyVerdict(36)).toBe("Lean No");
    expect(classifyVerdict(35)).toBe("Strong No");
    expect(classifyVerdict(0)).toBe("Strong No");
    expect(classifyVerdict(100)).toBe("Strong Go");
    expect(classifyVerdict(50)).toBe("Balanced");
  });

  it("reaches the 65% boundary from real entries (pct 65 → Strong Go)", () => {
    // 65 pro points vs 35 con points = exactly 65%.
    const result = evaluateProsCons(
      [pro("p1", 10), pro("p2", 10), pro("p3", 10), pro("p4", 10), pro("p5", 10), pro("p6", 10), pro("p7", 5)],
      [con("c1", 10), con("c2", 10), con("c3", 10), con("c4", 5)],
    );
    expect(result.pct).toBe(65);
    expect(result.verdict).toBe("Strong Go");
  });

  it("lands just below the boundary (pct 64 → Lean Yes)", () => {
    const result = evaluateProsCons(
      [pro("p1", 10), pro("p2", 10), pro("p3", 10), pro("p4", 10), pro("p5", 10), pro("p6", 10), pro("p7", 4)],
      [con("c1", 10), con("c2", 10), con("c3", 10), con("c4", 6)],
    );
    expect(result.pct).toBe(64);
    expect(result.verdict).toBe("Lean Yes");
  });

  it("rounds the share half-up before classifying", () => {
    // 1 vs 2 = 33.333…% → 33 → Strong No.
    const result = evaluateProsCons([pro("p1", 1)], [con("c1", 1), con("c2", 1)]);
    expect(result.pct).toBe(33);
    expect(result.verdict).toBe("Strong No");
  });
});

describe("§1.4 one-sided ledger", () => {
  it("computes normally when both sides are filled", () => {
    const result = evaluateProsCons([pro("p1", 8)], [con("c1", 8)]);
    expect(result.pct).toBe(50);
    expect(result.verdict).toBe("Balanced");
    expect(result.oneSided).toBeNull();
  });

  it("reports the single empty side when only pros are entered", () => {
    const result = evaluateProsCons([pro("p1", 8)], []);
    expect(result.pct).toBe(100);
    expect(result.verdict).toBe("Strong Go");
    expect(result.oneSided).toBe("cons");
  });

  it("reports the empty pros side when only cons are entered", () => {
    const result = evaluateProsCons([], [con("c1", 4)]);
    expect(result.pct).toBe(0);
    expect(result.verdict).toBe("Strong No");
    expect(result.oneSided).toBe("pros");
  });
});

describe("property: pct stays within 0–100 for valid input", () => {
  it("holds across a spread of weight combinations", () => {
    const weightSets = [
      { pros: [1], cons: [10] },
      { pros: [10, 10, 10], cons: [1, 2, 3] },
      { pros: [3, 5, 8, 10], cons: [3, 5, 8, 10] },
      { pros: [10], cons: [10] },
      { pros: [7, 7, 7], cons: [] },
    ];
    for (const set of weightSets) {
      const result = evaluateProsCons(
        set.pros.map((w, i) => pro(`p${i}`, w)),
        set.cons.map((w, i) => con(`c${i}`, w)),
      );
      expect(result.pct).toBeGreaterThanOrEqual(0);
      expect(result.pct).toBeLessThanOrEqual(100);
      expect(Number.isFinite(result.total)).toBe(true);
    }
  });
});

describe("verdict never claims certainty (§1.5)", () => {
  it("uses only the five documented labels", () => {
    const labels = new Set(
      [0, 35, 45, 50, 55, 65, 100].map(classifyVerdict),
    );
    expect([...labels].sort()).toEqual(
      ["Balanced", "Lean No", "Lean Yes", "Strong Go", "Strong No"].sort(),
    );
  });
});
