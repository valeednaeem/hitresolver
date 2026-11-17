/**
 * Weighted Comparison Matrix engine tests (spec §2) — signature feature.
 *
 * Covers E7–E20, E25, the Phase 1 review's additional scenarios (equal
 * scores, explicit ties, no hidden substitution, zero/all-zero weights,
 * duplicate identifiers, floating-point precision, large inputs) and the
 * W1–W6 regression rows that concern matrix maths.
 * DOM-free (spec §6).
 */

import { describe, expect, it } from "vitest";
import type { Comparison, Criterion, Option } from "../domain/types";
import { evaluateMatrix, type MatrixResult } from "./matrix";

/* ------------------------------------------------------------------ */
/* Builders                                                            */
/* ------------------------------------------------------------------ */

const opt = (id: string, name = id): Option => ({ id, name });

const crit = (
  id: string,
  weight: number,
  scores: Record<string, number>,
  name = id,
): Criterion => ({ id, name, weight, scores, notes: {} });

const compare = (options: Option[], criteria: Criterion[]): Comparison => ({
  options,
  criteria,
});

const evaluate = (options: Option[], criteria: Criterion[]): MatrixResult =>
  evaluateMatrix(compare(options, criteria));

/* ------------------------------------------------------------------ */
/* Empty / structural states (E7, E8, E9, E17)                         */
/* ------------------------------------------------------------------ */

describe("E7 — no criteria", () => {
  it("reports maxPossible 0 with an explicit 'No criteria' state", () => {
    const result = evaluate([opt("a"), opt("b")], []);
    expect(result.maxPossible).toBe(0);
    expect(result.status).toBe("no-criteria");
    expect(result.statusMessage).toBe("No criteria");
    expect(result.leaderIds).toEqual([]);
    expect(result.options.every((o) => o.rank === null)).toBe(true);
  });
});

describe("E8 — all criterion weights invalid", () => {
  it("reports 'No valid criterion weights', pct 0, and lists every rejection", () => {
    const result = evaluate(
      [opt("a"), opt("b")],
      [
        crit("c1", 0, { a: 9, b: 4 }),
        crit("c2", -5, { a: 2, b: 8 }),
        crit("c3", Number.NaN, { a: 5, b: 5 }),
      ],
    );
    expect(result.maxPossible).toBe(0);
    expect(result.status).toBe("no-weights");
    expect(result.statusMessage).toBe("No valid criterion weights");
    expect(result.invalidWeights).toHaveLength(3);
    expect(result.options.map((o) => o.pct)).toEqual([0, 0]);
    expect(result.leaderIds).toEqual([]);
    expect(result.tied).toBe(false);
  });
});

describe("E9 — criteria but no options", () => {
  it("produces no leader and no crash", () => {
    const result = evaluate([], [crit("c1", 5, {})]);
    expect(result.status).toBe("no-options");
    expect(result.leaderIds).toEqual([]);
    expect(result.margin).toBeNull();
    expect(result.options).toEqual([]);
  });
});

describe("E17 — zero options", () => {
  it("is an empty state, not a crash", () => {
    const result = evaluate([], []);
    expect(result.status).toBe("no-criteria");
    expect(result.options).toEqual([]);
    expect(result.totalCells).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* Missing cells (E10, E13) + W2 regression                            */
/* ------------------------------------------------------------------ */

describe("E10 — missing score cells are never substituted", () => {
  const result = evaluate(
    [opt("a", "Alpha"), opt("b", "Beta")],
    [
      crit("c1", 5, { a: 8, b: 6 }),
      crit("c2", 5, { a: 4 }), // Beta has no score for c2
    ],
  );

  it("W2: the engine reports the cell as missing — not 5, not 0", () => {
    const beta = result.options.find((o) => o.id === "b")!;
    const cell = beta.cells.find((c) => c.criterionId === "c2")!;
    expect(cell.score).toBeNull();
    expect(cell.contribution).toBeNull();
    expect(cell.score).not.toBe(5);
    expect(cell.score).not.toBe(0);
  });

  it("computes the raw score over available cells only", () => {
    const alpha = result.options.find((o) => o.id === "a")!;
    const beta = result.options.find((o) => o.id === "b")!;
    expect(alpha.rawScore).toBe(8 * 5 + 4 * 5); // 60
    expect(beta.rawScore).toBe(6 * 5); // 30 — missing cell adds nothing
  });

  it("keeps the missing cell's maximum in maxPossible, so the gap counts", () => {
    const betaNow = result.options.find((o) => o.id === "b")!;
    expect(result.maxPossible).toBe(100); // (5 + 5) × 10 — the gap is disclosed
    expect(betaNow.pct).toBe(30);
  });

  it("flags the option incomplete with a coverage count", () => {
    const beta = result.options.find((o) => o.id === "b")!;
    expect(beta.scoredCells).toBe(1);
    expect(beta.totalCells).toBe(2);
    expect(beta.missingCells).toBe(1);
    expect(beta.incomplete).toBe(true);
    expect(result.incompleteOptionIds).toEqual(["b"]);
  });

  it("E13: NaN scores are treated as missing", () => {
    const r = evaluate(
      [opt("a")],
      [crit("c1", 5, { a: Number.NaN })],
    );
    expect(r.options[0].cells[0].score).toBeNull();
    expect(r.options[0].incomplete).toBe(true);
  });
});

describe("E11/E12 — out-of-range scores are rejected, not clamped", () => {
  it("score 0 is rejected (range starts at 1) — W3", () => {
    const r = evaluate([opt("a")], [crit("c1", 5, { a: 0 })]);
    expect(r.options[0].cells[0].score).toBeNull();
    expect(r.options[0].incomplete).toBe(true);
  });

  it("score 11 is rejected", () => {
    const r = evaluate([opt("a")], [crit("c1", 5, { a: 11 })]);
    expect(r.options[0].cells[0].score).toBeNull();
  });

  it("E25: fractional score 3.6 rounds to 4, then counts", () => {
    const r = evaluate([opt("a")], [crit("c1", 5, { a: 3.6 })]);
    expect(r.options[0].cells[0].score).toBe(4);
    expect(r.options[0].rawScore).toBe(20);
  });

  it("fractional weight 3.6 rounds to 4 before use", () => {
    const r = evaluate([opt("a")], [crit("c1", 3.6, { a: 5 })]);
    expect(r.maxPossible).toBe(40);
    expect(r.options[0].rawScore).toBe(20);
  });
});

/* ------------------------------------------------------------------ */
/* Ranking & ties (E14, E15, E16, E18) + W4                            */
/* ------------------------------------------------------------------ */

describe("E14 — identical totals are explicitly tied", () => {
  const result = evaluate(
    [opt("a", "Alpha"), opt("b", "Beta")],
    [crit("c1", 7, { a: 6, b: 6 }), crit("c2", 3, { a: 9, b: 9 })],
  );

  it("gives both options rank 1 and flags the tie", () => {
    expect(result.options.map((o) => o.rank)).toEqual([1, 1]);
    expect(result.tied).toBe(true);
    expect(result.leaderIds).toEqual(["a", "b"]);
    expect(result.leaderNames).toEqual(["Alpha", "Beta"]);
  });

  it("does not invent a winner via tie-breakers", () => {
    // Names/ids are reported, never used to separate equal scores.
    expect(result.runnerUpId).toBeNull();
    // The gap between leaders is 0 — a tie is also trivially a close race.
    expect(result.margin).toBe(0);
    expect(result.close).toBe(true);
  });
});

describe("E15 — competition ranking is 1, 1, 3", () => {
  it("ranks three options with a shared top", () => {
    const result = evaluate(
      [opt("a"), opt("b"), opt("c")],
      [crit("c1", 5, { a: 9, b: 9, c: 4 })],
    );
    expect(result.options.map((o) => o.rank)).toEqual([1, 1, 3]);
    expect(result.tied).toBe(true);
  });
});

describe("equal weighted totals → explicit tie", () => {
  it("different score patterns that total the same are tied", () => {
    // Alpha: 6×10 + 4×5 = 80 · Beta: 4×10 + 8×5 = 80 — equal totals via
    // different patterns; the engine must tie them on rawScore.
    const result = evaluate(
      [opt("a"), opt("b")],
      [crit("c1", 10, { a: 6, b: 4 }), crit("c2", 5, { a: 4, b: 8 })],
    );
    expect(result.options[0].rawScore).toBe(80);
    expect(result.options[1].rawScore).toBe(80);
    expect(result.options.map((o) => o.rank)).toEqual([1, 1]);
    expect(result.tied).toBe(true);
  });

  it("near-equal totals are separated by rawScore at full precision", () => {
    const tied = evaluate(
      [opt("a"), opt("b")],
      [crit("c1", 10, { a: 6, b: 4 }), crit("c2", 5, { a: 4, b: 8 })],
    );
    expect(tied.tied).toBe(true);

    const broken = evaluate(
      [opt("a"), opt("b")],
      [crit("c1", 10, { a: 6, b: 4 }), crit("c2", 5, { a: 4, b: 9 })],
    );
    // Beta now leads: 4×10 + 9×5 = 85 > Alpha's 80.
    expect(broken.tied).toBe(false);
    expect(broken.options.map((o) => o.rank)).toEqual([2, 1]);
  });
});

describe("E16 — an option with every cell missing", () => {
  const result = evaluate(
    [opt("a", "Scored"), opt("b", "Unscored")],
    [crit("c1", 6, { a: 8 }), crit("c2", 4, { a: 5 })],
  );

  it("has rawScore 0 and is excluded from leader designation", () => {
    const unscored = result.options.find((o) => o.id === "b")!;
    expect(unscored.rawScore).toBe(0);
    expect(unscored.allMissing).toBe(true);
    expect(unscored.eligibleForLeader).toBe(false);
    expect(result.leaderIds).toEqual(["a"]);
  });

  it("is still flagged incomplete and reported", () => {
    expect(result.incompleteOptionIds).toEqual(["b"]);
    expect(result.missingCells).toBe(2);
  });

  it("excludes it from margin calculations (no fake runner-up)", () => {
    expect(result.runnerUpId).toBeNull();
    expect(result.margin).toBeNull();
    expect(result.close).toBe(false);
  });
});

describe("E18 — one option, one criterion", () => {
  it("ranks a single option and computes pct normally", () => {
    const result = evaluate([opt("a")], [crit("c1", 5, { a: 7 })]);
    expect(result.status).toBe("ok");
    expect(result.options[0].rank).toBe(1);
    expect(result.options[0].rawScore).toBe(35);
    expect(result.options[0].pct).toBe(70);
    expect(result.leaderIds).toEqual(["a"]);
    expect(result.tied).toBe(false);
    expect(result.margin).toBeNull(); // nothing to measure against
  });
});

describe("E19 — very large valid inputs", () => {
  it("handles all weights 10 across many criteria without overflow", () => {
    const options = Array.from({ length: 20 }, (_, i) => opt(`o${i}`));
    const criteria = Array.from({ length: 50 }, (_, c) =>
      crit(
        `c${c}`,
        10,
        // o0 scores 10 everywhere (clear leader); the rest vary by
        // criterion so totals are realistic, not all-tied.
        Object.fromEntries(
          options.map((o, i) => [o.id, i === 0 ? 10 : ((c % 10) + i) % 10 + 1]),
        ),
      ),
    );
    const result = evaluate(options, criteria);

    expect(result.maxPossible).toBe(50 * 10 * 10); // 5000
    expect(Number.isFinite(result.maxPossible)).toBe(true);
    for (const option of result.options) {
      expect(Number.isFinite(option.rawScore)).toBe(true);
      expect(option.pct).toBeGreaterThanOrEqual(0);
      expect(option.pct).toBeLessThanOrEqual(100);
      expect(option.rawScore).toBeLessThanOrEqual(result.maxPossible);
    }
    expect(result.leaderIds).toEqual(["o0"]);
    // Deterministic under repetition.
    expect(evaluate(options, criteria)).toEqual(result);
  });
});

/* ------------------------------------------------------------------ */
/* Weights: zero, all-zero, invalid (owner scenarios + W5, W6)         */
/* ------------------------------------------------------------------ */

describe("zero-weight criteria exert no accidental influence", () => {
  it("excludes a weight-0 criterion from maxPossible and rawScore", () => {
    const base = evaluate(
      [opt("a"), opt("b")],
      [crit("c1", 5, { a: 9, b: 2 })],
    );
    const withZero = evaluate(
      [opt("a"), opt("b")],
      [
        crit("c1", 5, { a: 9, b: 2 }),
        crit("c2", 0, { a: 1, b: 10 }), // wildly different — must not matter
      ],
    );

    expect(withZero.maxPossible).toBe(base.maxPossible);
    expect(withZero.options.map((o) => o.rawScore)).toEqual(
      base.options.map((o) => o.rawScore),
    );
    expect(withZero.options.map((o) => o.pct)).toEqual(
      base.options.map((o) => o.pct),
    );
    expect(withZero.invalidWeights.map((w) => w.criterionId)).toEqual(["c2"]);
  });
});

describe("W1/W6 — invalid weights never corrupt a total", () => {
  it("NaN and negative weights are listed, and totals stay finite", () => {
    const result = evaluate(
      [opt("a"), opt("b")],
      [
        crit("c1", Number.NaN, { a: 5, b: 5 }),
        crit("c2", -3, { a: 5, b: 5 }),
        crit("c3", 6, { a: 8, b: 4 }),
      ],
    );
    expect(result.invalidWeights).toHaveLength(2);
    expect(Number.isFinite(result.maxPossible)).toBe(true);
    expect(result.options.every((o) => Number.isFinite(o.rawScore))).toBe(true);
    expect(result.maxPossible).toBe(60);
  });
});

/* ------------------------------------------------------------------ */
/* Leader, margin, close race (§2.3, E20)                              */
/* ------------------------------------------------------------------ */

describe("incomplete option may still lead, but is labelled (spec §2.4)", () => {
  it("labels the leader when it carries missing cells", () => {
    const result = evaluate(
      [opt("a", "Alpha"), opt("b", "Beta")],
      [
        crit("c1", 10, { a: 9, b: 2 }, "Speed"),
        crit("c2", 10, { b: 1 }, "Quality"), // Alpha missing here
      ],
    );
    // Alpha leads (90 vs 30) but is flagged incomplete — it must be
    // labelled so the provisional status is never hidden (spec §2.4).
    expect(result.leaderIds).toEqual(["a"]);
    const leader = result.options.find((o) => o.id === "a")!;
    expect(leader.incomplete).toBe(true);
    expect(result.incompleteOptionIds).toEqual(["a"]);
    expect(result.close).toBe(false);
  });
});

describe("margin & close race", () => {
  it("computes margin as leader − runner-up and compares to 5% of maxPossible", () => {
    // maxPossible = 100 → close threshold = 5.
    const closeRace = evaluate(
      [opt("a"), opt("b")],
      [crit("c1", 10, { a: 8, b: 7 })], // raw 80 vs 70 → margin 10 > 5
    );
    expect(closeRace.margin).toBe(10);
    expect(closeRace.marginPct).toBe(10);
    expect(closeRace.close).toBe(false);

    const tight = evaluate(
      [opt("a"), opt("b")],
      [
        crit("c1", 5, { a: 6, b: 6 }),
        crit("c2", 5, { a: 5, b: 4 }), // 55 vs 50 → margin 5 ≤ 5
      ],
    );
    expect(tight.margin).toBe(5);
    expect(tight.close).toBe(true);
  });

  it("scales the threshold with matrix size (not a fixed 5 points)", () => {
    // maxPossible = 1000 → close threshold = 50. A margin of 40 would be
    // 'wide' on a small matrix (maxPossible 100) but is 'close' here —
    // the threshold must scale, unlike the prototype's fixed 5 points.
    const options = [opt("a"), opt("b")];
    const criteria = Array.from({ length: 10 }, (_, c) =>
      crit(`c${c}`, 10, { a: 9, b: c < 6 ? 9 : 8 }),
    );
    const result = evaluate(options, criteria);

    expect(result.maxPossible).toBe(1000);
    expect(result.margin).toBe(40); // 4 criteria × (9−8) × weight 10
    expect(result.marginPct).toBe(4);
    expect(result.close).toBe(true); // 40 ≤ 5% of 1000 = 50

    // The same margin of 40 on a 100-point matrix is NOT close.
    const small = evaluate(
      [opt("a"), opt("b")],
      [crit("c1", 5, { a: 8, b: 4 }), crit("c2", 5, { a: 6, b: 2 })],
    );
    expect(small.maxPossible).toBe(100);
    expect(small.margin).toBe(40); // 70 − 30
    expect(small.close).toBe(false); // 40 > 5
  });

  it("E20: a tied leader with a close gap reports both signals", () => {
    const result = evaluate(
      [opt("a"), opt("b"), opt("c")],
      [
        crit("c1", 5, { a: 7, b: 7, c: 3 }),
        crit("c2", 5, { a: 7, b: 7, c: 3 }), // a and b tie at 70, c at 30
      ],
    );
    expect(result.tied).toBe(true);
    expect(result.margin).toBe(40);
    expect(result.close).toBe(false); // 40 > 5% of 100
    // …and a genuinely tight race: a/b tie at 55, c sits at 54 (margin 1).
    const tight = evaluate(
      [opt("a"), opt("b"), opt("c")],
      [
        crit("c1", 10, { a: 5, b: 5, c: 5 }),
        crit("c2", 1, { a: 5, b: 5, c: 4 }),
      ],
    );
    expect(tight.tied).toBe(true);
    expect(tight.close).toBe(true); // margin 1 ≤ 5% of 110
    expect(tight.margin).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/* Score breakdown (§2.5)                                              */
/* ------------------------------------------------------------------ */

describe("§2.5 transparent breakdown", () => {
  it("exposes contribution and max per cell so totals are explainable", () => {
    const result = evaluate(
      [opt("a"), opt("b")],
      [
        crit("c1", 8, { a: 9, b: 5 }, "Cost"),
        crit("c2", 2, { a: 4, b: 7 }, "Speed"),
      ],
    );
    const alpha = result.options[0];
    expect(alpha.cells).toHaveLength(2);
    expect(alpha.cells[0]).toMatchObject({
      criterionName: "Cost",
      weight: 8,
      score: 9,
      contribution: 72,
      max: 80,
    });
    expect(alpha.cells[1].contribution).toBe(8);
    expect(alpha.rawScore).toBe(80); // 72 + 8
    expect(alpha.pct).toBe(80); // 80 / 100
  });

  it("recalculates fully on every change (same input ⇒ same output)", () => {
    const options = [opt("a"), opt("b")];
    const criteria = [crit("c1", 5, { a: 8, b: 6 })];
    const first = evaluate(options, criteria);
    const second = evaluate(options, criteria);
    expect(second).toEqual(first);
  });
});

/* ------------------------------------------------------------------ */
/* Structural data issues: duplicate / orphan identifiers              */
/* ------------------------------------------------------------------ */

describe("duplicate and orphan identifiers are surfaced, never fatal", () => {
  it("flags duplicate option ids and still computes deterministically", () => {
    const result = evaluate(
      [opt("dup"), opt("dup"), opt("other")],
      [crit("c1", 5, { dup: 8, other: 4 })],
    );
    expect(result.dataIssues).toContain('Duplicate option id "dup".');
    expect(result.status).toBe("ok");
    expect(result.options).toHaveLength(3);
  });

  it("flags duplicate criterion ids", () => {
    const result = evaluate(
      [opt("a")],
      [crit("same", 5, { a: 8 }), crit("same", 5, { a: 3 })],
    );
    expect(result.dataIssues).toContain('Duplicate criterion id "same".');
    expect(result.status).toBe("ok");
  });

  it("flags scores recorded against unknown option ids", () => {
    const result = evaluate(
      [opt("a")],
      [crit("c1", 5, { a: 8, ghost: 3 })],
    );
    expect(
      result.dataIssues.some((i) => i.includes('unknown option "ghost"')),
    ).toBe(true);
  });

  it("a missing option id is rejected by domain validation, not by silent handling", async () => {
    const { validateAppState } = await import("../domain/validation");
    const bad = {
      schemaVersion: 1,
      activeDecisionId: "d1",
      decisions: [
        {
          id: "d1",
          title: "T",
          description: "",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          prosCons: { pros: [], cons: [] },
          comparison: {
            options: [{ id: "", name: "No id" }],
            criteria: [],
          },
          swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
        },
      ],
    };
    const result = validateAppState(bad);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes("is required"))).toBe(true);
      expect(result.errors.some((e) => e.includes("comparison.options[0].id"))).toBe(true);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Property-style checks (§6)                                          */
/* ------------------------------------------------------------------ */

describe("properties", () => {
  const scenarios: Array<[Option[], Criterion[]]> = [
    [[opt("a"), opt("b")], [crit("c1", 5, { a: 8, b: 6 })]],
    [[opt("a"), opt("b"), opt("c")], [crit("c1", 10, { a: 1, b: 10, c: 5 })]],
    [[opt("a"), opt("b")], [crit("c1", 3, { a: 5 }), crit("c2", 7, { b: 9 })]],
    [[opt("a")], [crit("c1", 1, { a: 1 })]],
    [[opt("a"), opt("b")], [crit("c1", 4, { a: 7, b: 7 }), crit("c2", 6, { a: 3, b: 8 })]],
  ];

  it("0 ≤ pct ≤ 100 for every valid scenario", () => {
    for (const [options, criteria] of scenarios) {
      const result = evaluate(options, criteria);
      for (const option of result.options) {
        expect(option.pct).toBeGreaterThanOrEqual(0);
        expect(option.pct).toBeLessThanOrEqual(100);
      }
    }
  });

  it("ranking is a total order: ranks are ≥1, non-increasing by score, ties share rank", () => {
    for (const [options, criteria] of scenarios) {
      const result = evaluate(options, criteria);
      if (result.status !== "ok") continue;
      const sorted = [...result.options].sort(
        (a, b) => b.rawScore - a.rawScore,
      );
      // Ranks never decrease as scores decrease.
      let previousRank = 0;
      for (const option of sorted) {
        expect(option.rank).not.toBeNull();
        expect(option.rank!).toBeGreaterThanOrEqual(previousRank);
        previousRank = option.rank!;
      }
      // Equal scores ⇒ equal ranks (and unequal scores ⇒ different ranks).
      for (let i = 0; i < sorted.length; i++) {
        for (let j = i + 1; j < sorted.length; j++) {
          const sameScore = sorted[i].rawScore === sorted[j].rawScore;
          expect(sorted[i].rank === sorted[j].rank).toBe(sameScore);
        }
      }
    }
  });

  it("rawScore never exceeds maxPossible (pct cannot exceed 100)", () => {
    for (const [options, criteria] of scenarios) {
      const result = evaluate(options, criteria);
      for (const option of result.options) {
        expect(option.rawScore).toBeLessThanOrEqual(result.maxPossible);
      }
    }
  });
});
