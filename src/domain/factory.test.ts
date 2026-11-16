import { describe, expect, it } from "vitest";
import {
  createBlankDecision,
  createInitialState,
  createSampleDecision,
  createStateWith,
} from "./factory";
import { validateAppState } from "./validation";
import { SCHEMA_VERSION, SWOT_QUADRANTS } from "./types";

describe("decision factories", () => {
  it("creates a blank decision that passes validation", () => {
    const decision = createBlankDecision();
    const state = createStateWith(decision);
    const result = validateAppState(state);
    expect(result.ok, result.ok ? "" : result.errors.join("; ")).toBe(true);
  });

  it("seeds two options and two criteria so the matrix is usable", () => {
    const decision = createBlankDecision();
    expect(decision.comparison.options).toHaveLength(2);
    expect(decision.comparison.criteria).toHaveLength(2);
    // Every criterion scores every option — no missing cells on a new record.
    for (const criterion of decision.comparison.criteria) {
      for (const option of decision.comparison.options) {
        expect(criterion.scores[option.id]).toBeTypeOf("number");
      }
    }
  });

  it("creates an empty decision with all four SWOT quadrants present", () => {
    const decision = createBlankDecision();
    for (const quadrant of SWOT_QUADRANTS) {
      expect(decision.swot[quadrant]).toEqual([]);
    }
    expect(decision.prosCons.pros).toEqual([]);
    expect(decision.prosCons.cons).toEqual([]);
  });

  it("gives every decision a unique id", () => {
    const ids = new Set(
      Array.from({ length: 50 }, () => createBlankDecision().id),
    );
    expect(ids.size).toBe(50);
  });

  it("produces createdAt that is not after updatedAt", () => {
    for (const decision of [createBlankDecision(), createSampleDecision()]) {
      expect(Date.parse(decision.createdAt)).toBeLessThanOrEqual(
        Date.parse(decision.updatedAt),
      );
    }
  });
});

describe("createSampleDecision", () => {
  it("passes validation", () => {
    const state = createStateWith(createSampleDecision());
    const result = validateAppState(state);
    expect(result.ok, result.ok ? "" : result.errors.join("; ")).toBe(true);
  });

  it("preserves the reference prototype's content", () => {
    const decision = createSampleDecision();
    expect(decision.title).toBe("Choosing Our Next Product Stack");
    expect(decision.comparison.options.map((o) => o.name)).toEqual([
      "Modular Monolith",
      "Serverless",
      "Microservices",
    ]);
    expect(decision.prosCons.pros).toHaveLength(3);
    expect(decision.prosCons.cons).toHaveLength(2);
    expect(decision.swot.strengths).toHaveLength(2);
    expect(decision.swot.weaknesses).toHaveLength(1);
    expect(decision.swot.opportunities).toHaveLength(1);
    expect(decision.swot.threats).toHaveLength(1);
  });

  it("scores every cell in the sample matrix", () => {
    const decision = createSampleDecision();
    for (const criterion of decision.comparison.criteria) {
      for (const option of decision.comparison.options) {
        const score = criterion.scores[option.id];
        expect(score, `${criterion.name} × ${option.name}`).toBeGreaterThanOrEqual(1);
        expect(score).toBeLessThanOrEqual(10);
      }
    }
  });

  it("creates distinct option ids", () => {
    const decision = createSampleDecision();
    const ids = decision.comparison.options.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("createInitialState", () => {
  it("carries the current schema version", () => {
    expect(createInitialState().schemaVersion).toBe(SCHEMA_VERSION);
  });

  it("points activeDecisionId at an existing decision", () => {
    const state = createInitialState();
    expect(
      state.decisions.some((d) => d.id === state.activeDecisionId),
    ).toBe(true);
  });

  it("produces independent states across calls", () => {
    const a = createInitialState();
    const b = createInitialState();
    expect(a.decisions[0].id).not.toBe(b.decisions[0].id);
    a.decisions[0].title = "mutated";
    expect(b.decisions[0].title).toBe("Choosing Our Next Product Stack");
  });
});
