import { describe, expect, it } from "vitest";
import {
  validateAppState,
  validateImpact,
  validateScore,
  validateText,
  validateWeight,
} from "./validation";
import { createBlankDecision, createInitialState, createSampleDecision } from "./factory";
import { IMPACT_LEVELS, RANGES, SCHEMA_VERSION } from "./types";

/* ------------------------------------------------------------------ */
/* validateWeight / validateScore — range rejection, no silent clamping */
/* ------------------------------------------------------------------ */

describe("validateWeight", () => {
  it("accepts every in-range integer", () => {
    for (let n = RANGES.weight.min; n <= RANGES.weight.max; n++) {
      const r = validateWeight(n);
      expect(r.ok, `weight ${n} should be valid`).toBe(true);
      if (r.ok) expect(r.value).toBe(n);
    }
  });

  // W1 / W6: NaN and non-numerics must never reach a total.
  it("rejects NaN", () => {
    expect(validateWeight(Number.NaN).ok).toBe(false);
  });

  it("rejects Infinity and -Infinity", () => {
    expect(validateWeight(Number.POSITIVE_INFINITY).ok).toBe(false);
    expect(validateWeight(Number.NEGATIVE_INFINITY).ok).toBe(false);
  });

  it("rejects non-numeric strings", () => {
    expect(validateWeight("abc").ok).toBe(false);
    expect(validateWeight("eight").ok).toBe(false);
  });

  // W3 / W6: zero and negatives are out of range, not clamped.
  it("rejects zero", () => {
    expect(validateWeight(0).ok).toBe(false);
  });

  it("rejects negative weights", () => {
    expect(validateWeight(-5).ok).toBe(false);
  });

  // Spec §0.1: reject rather than clamp —15 stays 15 and fails.
  it("rejects values above the maximum instead of clamping", () => {
    const r = validateWeight(15);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toContain("10");
  });

  it("rounds fractional input then range-checks", () => {
    const up = validateWeight(3.6);
    expect(up.ok).toBe(true);
    if (up.ok) expect(up.value).toBe(4);

    const down = validateWeight(3.4);
    expect(down.ok).toBe(true);
    if (down.ok) expect(down.value).toBe(3);
  });

  it("rejects a fraction that rounds out of range", () => {
    expect(validateWeight(10.4).ok).toBe(false); // rejected before rounding
    expect(validateWeight(10.6).ok).toBe(false); // rounds to 11 — out of range
  });

  it("rejects fractions below the allowed range before rounding (Phase 2 review)", () => {
    expect(validateWeight(0.6).ok).toBe(false); // would round to 1 — must reject
    expect(validateScore(0.6).ok).toBe(false);
  });

  it("accepts in-range fractional weights via rounding", () => {
    const r = validateWeight(5.4);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(5);

    const s = validateScore(3.6);
    expect(s.ok).toBe(true);
    if (s.ok) expect(s.value).toBe(4);
  });

  it("accepts numeric strings (form input)", () => {
    const r = validateWeight("7");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(7);
  });

  it("rejects objects, arrays, booleans and null", () => {
    expect(validateWeight({}).ok).toBe(false);
    expect(validateWeight([5]).ok).toBe(false);
    expect(validateWeight(true).ok).toBe(false);
    expect(validateWeight(null).ok).toBe(false);
    expect(validateWeight(undefined).ok).toBe(false);
  });
});

describe("validateScore", () => {
  // W3: the prototype allowed 0; the spec requires 1–10.
  it("rejects zero because the score range starts at 1", () => {
    expect(validateScore(0).ok).toBe(false);
  });

  it("rejects 11 and accepts 10", () => {
    expect(validateScore(11).ok).toBe(false);
    expect(validateScore(10).ok).toBe(true);
    expect(validateScore(1).ok).toBe(true);
  });

  it("rejects NaN", () => {
    expect(validateScore(Number.NaN).ok).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* validateText                                                        */
/* ------------------------------------------------------------------ */

describe("validateText", () => {
  it("trims and accepts normal text", () => {
    const r = validateText("  hello  ", { label: "Text", max: 100 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("hello");
  });

  it("rejects empty text by default", () => {
    expect(validateText("   ", { label: "Text", max: 100 }).ok).toBe(false);
  });

  it("allows empty when explicitly permitted", () => {
    const r = validateText("", {
      label: "Description",
      max: 100,
      allowEmpty: true,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("");
  });

  it("enforces the maximum length", () => {
    const long = "x".repeat(101);
    expect(validateText(long, { label: "Text", max: 100 }).ok).toBe(false);
    expect(validateText("x".repeat(100), { label: "Text", max: 100 }).ok).toBe(
      true,
    );
  });

  it("rejects non-strings", () => {
    expect(validateText(42, { label: "Text", max: 100 }).ok).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* validateImpact                                                      */
/* ------------------------------------------------------------------ */

describe("validateImpact", () => {
  it("accepts exactly High, Medium and Low", () => {
    for (const level of IMPACT_LEVELS) {
      expect(validateImpact(level).ok).toBe(true);
    }
  });

  it("rejects every other string", () => {
    expect(validateImpact("high").ok).toBe(false);
    expect(validateImpact("Critical").ok).toBe(false);
    expect(validateImpact("Med").ok).toBe(false);
    expect(validateImpact("").ok).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(validateImpact(1).ok).toBe(false);
    expect(validateImpact(null).ok).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* validateAppState — import / load safety                             */
/* ------------------------------------------------------------------ */

describe("validateAppState", () => {
  it("accepts a freshly created state", () => {
    expect(validateAppState(createInitialState()).ok).toBe(true);
  });

  it("accepts the sample and blank decision states", () => {
    const sample = createSampleDecision();
    expect(
      validateAppState({
        schemaVersion: SCHEMA_VERSION,
        activeDecisionId: sample.id,
        decisions: [sample],
      }).ok,
    ).toBe(true);

    const blank = createBlankDecision();
    expect(
      validateAppState({
        schemaVersion: SCHEMA_VERSION,
        activeDecisionId: blank.id,
        decisions: [blank],
      }).ok,
    ).toBe(true);
  });

  // W10: malformed nested shapes must be rejected, not crash later.
  it("rejects a non-object", () => {
    expect(validateAppState(null).ok).toBe(false);
    expect(validateAppState("nope").ok).toBe(false);
    expect(validateAppState(42).ok).toBe(false);
  });

  it("rejects an array", () => {
    expect(validateAppState([]).ok).toBe(false);
  });

  it("rejects a mismatched schema version", () => {
    const state = createInitialState();
    const r = validateAppState({ ...state, schemaVersion: 999 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toContain("schema version");
  });

  it("rejects a missing decisions array", () => {
    const state = createInitialState();
    const { decisions, ...rest } = state;
    void decisions;
    expect(validateAppState(rest).ok).toBe(false);
  });

  it("rejects an empty decisions array", () => {
    expect(
      validateAppState({
        schemaVersion: SCHEMA_VERSION,
        activeDecisionId: "x",
        decisions: [],
      }).ok,
    ).toBe(false);
  });

  // W12: a dangling activeDecisionId must not be accepted.
  it("rejects an activeDecisionId that matches no decision", () => {
    const state = createInitialState();
    const r = validateAppState({ ...state, activeDecisionId: "missing-id" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toContain("activeDecisionId");
  });

  it("rejects duplicate decision ids", () => {
    const decision = createBlankDecision();
    const r = validateAppState({
      schemaVersion: SCHEMA_VERSION,
      activeDecisionId: decision.id,
      decisions: [decision, { ...decision }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("duplicated");
  });

  it("rejects out-of-range weights nested inside a decision", () => {
    const decision = createBlankDecision();
    decision.prosCons.pros.push({ id: "p1", text: "bad", weight: 99 });
    const r = validateAppState({
      schemaVersion: SCHEMA_VERSION,
      activeDecisionId: decision.id,
      decisions: [decision],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("weight");
  });

  it("rejects a criterion score that is out of range", () => {
    const decision = createBlankDecision();
    const optionId = decision.comparison.options[0].id;
    decision.comparison.criteria[0].scores[optionId] = 42;
    const r = validateAppState({
      schemaVersion: SCHEMA_VERSION,
      activeDecisionId: decision.id,
      decisions: [decision],
    });
    expect(r.ok).toBe(false);
  });

  it("rejects a criterion score referencing an unknown option", () => {
    const decision = createBlankDecision();
    decision.comparison.criteria[0].scores["ghost-option"] = 5;
    const r = validateAppState({
      schemaVersion: SCHEMA_VERSION,
      activeDecisionId: decision.id,
      decisions: [decision],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("unknown option");
  });

  it("rejects an invalid impact level", () => {
    const decision = createBlankDecision();
    decision.swot.threats.push({
      id: "t1",
      text: "risk",
      impact: "Catastrophic" as never,
    });
    const r = validateAppState({
      schemaVersion: SCHEMA_VERSION,
      activeDecisionId: decision.id,
      decisions: [decision],
    });
    expect(r.ok).toBe(false);
  });

  it("rejects a decision missing from the shape entirely", () => {
    const r = validateAppState({
      schemaVersion: SCHEMA_VERSION,
      activeDecisionId: "a",
      decisions: [{ id: "a" }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBeGreaterThan(0);
  });

  it("reports multiple errors at once rather than stopping at the first", () => {
    const decision = createBlankDecision();
    decision.prosCons.pros.push({ id: "p1", text: "bad", weight: 99 });
    decision.swot.threats.push({
      id: "t1",
      text: "risk",
      impact: "Catastrophic" as never,
    });
    const r = validateAppState({
      schemaVersion: SCHEMA_VERSION,
      activeDecisionId: decision.id,
      decisions: [decision],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBeGreaterThanOrEqual(2);
  });
});
