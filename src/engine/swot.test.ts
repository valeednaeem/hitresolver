/**
 * SWOT engine tests (spec §3).
 *
 * Covers quadrant counts, internal/external and helpful/harmful axes,
 * impact-weighted risk flagging, the posture ladder (§3.4), invalid
 * impact rejection, and the guarantee that SWOT never yields a numeric
 * score. Includes the owner's "invalid impact → rejected" scenario.
 * DOM-free (spec §6).
 */

import { describe, expect, it } from "vitest";
import type { Swot, SwotItem } from "../domain/types";
import { evaluateSwot } from "./swot";

const item = (
  id: string,
  impact: SwotItem["impact"],
  text = id,
): SwotItem => ({ id, text, impact });

const swot = (patch: Partial<Swot>): Swot => ({
  strengths: [],
  weaknesses: [],
  opportunities: [],
  threats: [],
  ...patch,
});

const empty = swot({});

describe("§3.2 categorisation stays four distinct buckets", () => {
  const result = evaluateSwot(
    swot({
      strengths: [item("s1", "High"), item("s2", "Medium")],
      weaknesses: [item("w1", "High")],
      opportunities: [item("o1", "Low")],
      threats: [item("t1", "Medium"), item("t2", "Low")],
    }),
  );

  it("counts every quadrant separately", () => {
    expect(result.counts).toEqual({
      strengths: 2,
      weaknesses: 1,
      opportunities: 1,
      threats: 2,
    });
  });

  it("derives helpful/harmful and internal/external axes", () => {
    expect(result.helpfulCount).toBe(3); // strengths + opportunities
    expect(result.harmfulCount).toBe(3); // weaknesses + threats
    expect(result.internalCount).toBe(3); // strengths + weaknesses
    expect(result.externalCount).toBe(3); // opportunities + threats
  });

  it("flags High items in weaknesses and threats as risks", () => {
    expect(result.highImpactRisks).toBe(1); // only w1
    expect(result.highImpactItems).toBe(2); // s1 + w1
  });
});

describe("§3.4 posture ladder (evaluated in order)", () => {
  it("empty input → Not assessed", () => {
    const result = evaluateSwot(empty);
    expect(result.posture).toBe("Not assessed");
    expect(result.isEmpty).toBe(true);
    expect(result.emptyQuadrants).toEqual([
      "strengths",
      "weaknesses",
      "opportunities",
      "threats",
    ]);
  });

  it("high-impact risk wins even when counts favour helpful — Exposed", () => {
    const result = evaluateSwot(
      swot({
        strengths: [item("s1", "High"), item("s2", "Low")],
        opportunities: [item("o1", "Low")],
        threats: [item("t1", "High")],
      }),
    );
    expect(result.helpfulCount).toBe(3);
    expect(result.harmfulCount).toBe(1);
    expect(result.highImpactRisks).toBe(1);
    expect(result.posture).toBe("Exposed");
  });

  it("more harmful than helpful, no high risk → Strained", () => {
    const result = evaluateSwot(
      swot({
        strengths: [item("s1", "Low")],
        weaknesses: [item("w1", "Medium"), item("w2", "Low")],
        threats: [item("t1", "Low")],
      }),
    );
    expect(result.posture).toBe("Strained");
    expect(result.highImpactRisks).toBe(0);
  });

  it("more helpful than harmful, no high risk → Favourable", () => {
    const result = evaluateSwot(
      swot({
        strengths: [item("s1", "Medium"), item("s2", "Low")],
        opportunities: [item("o1", "Low")],
        weaknesses: [item("w1", "Low")],
      }),
    );
    expect(result.posture).toBe("Favourable");
  });

  it("equal counts, no high risk → Balanced", () => {
    const result = evaluateSwot(
      swot({
        strengths: [item("s1", "Low")],
        opportunities: [item("o1", "Low")],
        weaknesses: [item("w1", "Medium")],
        threats: [item("t1", "Low")],
      }),
    );
    expect(result.helpfulCount).toBe(2);
    expect(result.harmfulCount).toBe(2);
    expect(result.posture).toBe("Balanced");
  });

  it("a single High threat outranks a count tie — Exposed, not Balanced", () => {
    const result = evaluateSwot(
      swot({
        strengths: [item("s1", "Low")],
        opportunities: [item("o1", "Low")],
        weaknesses: [item("w1", "Low")],
        threats: [item("t1", "High")],
      }),
    );
    expect(result.helpfulCount).toBe(2);
    expect(result.harmfulCount).toBe(2);
    expect(result.highImpactRisks).toBe(1);
    expect(result.posture).toBe("Exposed");
  });
});

describe("invalid impact is rejected, never assumed Medium", () => {
  const result = evaluateSwot(
    swot({
      strengths: [
        item("s1", "High"),
        { id: "s2", text: "Bad level", impact: "Critical" as never },
      ],
      weaknesses: [
        { id: "w1", text: "Numeric", impact: 5 as never },
        { id: "w2", text: "Missing", impact: undefined as never },
      ],
      threats: [item("t1", "High")],
    }),
  );

  it("excludes invalid items from every count", () => {
    expect(result.counts.strengths).toBe(1);
    expect(result.counts.weaknesses).toBe(0);
    expect(result.highImpactRisks).toBe(1); // t1 only
  });

  it("reports each rejection with its quadrant and id", () => {
    expect(result.invalid).toHaveLength(3);
    expect(result.invalid.map((i) => i.quadrant)).toEqual([
      "strengths",
      "weaknesses",
      "weaknesses",
    ]);
    expect(result.invalid[0]).toMatchObject({ id: "s2" });
  });

  it("posture is computed from valid items only", () => {
    // helpful: s1 = 1 · harmful: t1 = 1, but High risk → Exposed.
    expect(result.posture).toBe("Exposed");
  });
});

describe("§3.3 — no numeric SWOT score is ever produced", () => {
  it("returns counts and a posture, never a 'score' field", () => {
    const result = evaluateSwot(
      swot({ strengths: [item("s1", "High")], threats: [item("t1", "Low")] }),
    );
    expect(Object.keys(result)).not.toContain("score");
    expect(Object.keys(result)).not.toContain("pct");
    expect(typeof result.posture).toBe("string");
    expect(typeof result.helpfulCount).toBe("number"); // a count, not a score
  });
});

describe("empty quadrants and determinism", () => {
  it("names exactly the quadrants with no valid entries", () => {
    const result = evaluateSwot(
      swot({ strengths: [item("s1", "Low")] }),
    );
    expect(result.emptyQuadrants).toEqual([
      "weaknesses",
      "opportunities",
      "threats",
    ]);
    expect(result.isEmpty).toBe(false);
  });

  it("items whose only problem is impact still mark the quadrant filled when valid entries exist", () => {
    const result = evaluateSwot(
      swot({
        strengths: [{ id: "s1", text: "x", impact: "Odd" as never }],
      }),
    );
    // The only entry was rejected → the quadrant is genuinely empty.
    expect(result.counts.strengths).toBe(0);
    expect(result.emptyQuadrants).toContain("strengths");
    expect(result.posture).toBe("Not assessed");
  });

  it("is deterministic: same input ⇒ identical output", () => {
    const input = swot({
      strengths: [item("s1", "High")],
      threats: [item("t1", "Medium")],
    });
    expect(evaluateSwot(input)).toEqual(evaluateSwot(input));
  });
});
