/**
 * Engine numeric policy tests (spec §0.1).
 *
 * Covers E6, E22, E25 and the W1/W3/W6 rejection rules at the primitive
 * level. DOM-free by design (spec §6).
 */

import { describe, expect, it } from "vitest";
import {
  coerceOneToTen,
  isFiniteNumber,
  percentOf,
  roundHalfAwayFromZero,
  roundHalfUp,
} from "./numeric";

describe("isFiniteNumber", () => {
  it("accepts real finite numbers", () => {
    expect(isFiniteNumber(0)).toBe(true);
    expect(isFiniteNumber(3.14)).toBe(true);
    expect(isFiniteNumber(-7)).toBe(true);
  });

  it("rejects NaN, Infinity, numerics-as-strings and non-numbers", () => {
    expect(isFiniteNumber(Number.NaN)).toBe(false);
    expect(isFiniteNumber(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isFiniteNumber(Number.NEGATIVE_INFINITY)).toBe(false);
    expect(isFiniteNumber("5")).toBe(false);
    expect(isFiniteNumber(null)).toBe(false);
    expect(isFiniteNumber(undefined)).toBe(false);
    expect(isFiniteNumber({})).toBe(false);
  });
});

describe("roundHalfAwayFromZero (input coercion)", () => {
  it("rounds 3.6 up and 3.4 down", () => {
    expect(roundHalfAwayFromZero(3.6)).toBe(4);
    expect(roundHalfAwayFromZero(3.4)).toBe(3);
  });

  it("rounds symmetrically for negatives", () => {
    expect(roundHalfAwayFromZero(-3.6)).toBe(-4);
    expect(roundHalfAwayFromZero(-3.4)).toBe(-3);
  });
});

describe("roundHalfUp (display rounding) — E22", () => {
  it("rounds 0.5 to 1 and 1.5 to 2, deterministically", () => {
    expect(roundHalfUp(0.5)).toBe(1);
    expect(roundHalfUp(1.5)).toBe(2);
    expect(roundHalfUp(2.5)).toBe(3);
  });

  it("is locale-independent: repeated calls are identical", () => {
    const results = Array.from({ length: 5 }, () => roundHalfUp(66.6666667));
    expect(new Set(results).size).toBe(1);
    expect(results[0]).toBe(67);
  });

  it("returns NaN for non-finite input rather than a fake number", () => {
    expect(Number.isNaN(roundHalfUp(Number.NaN))).toBe(true);
  });
});

describe("coerceOneToTen (1–10 integer range)", () => {
  it("accepts in-range integers and numeric strings", () => {
    expect(coerceOneToTen(1)).toBe(1);
    expect(coerceOneToTen(10)).toBe(10);
    expect(coerceOneToTen("5")).toBe(5);
    expect(coerceOneToTen(" 7 ")).toBe(7);
  });

  it("rounds fractional input half-away-from-zero, then range-checks — E6/E25", () => {
    expect(coerceOneToTen(3.6)).toBe(4); // E6: fractional in range rounds up
    expect(coerceOneToTen(3.4)).toBe(3);
    expect(coerceOneToTen(5.4)).toBe(5);
    expect(coerceOneToTen(10.4)).toBeNull(); // out of range — rejected before rounding
    expect(coerceOneToTen(10.6)).toBeNull(); // rounds to 11 — out of range
    expect(coerceOneToTen(0.6)).toBeNull(); // below range — rejected before rounding
  });

  it("rejects 0, negatives and out-of-range values — never clamps (E3/E5/E11/E12)", () => {
    expect(coerceOneToTen(0)).toBeNull();
    expect(coerceOneToTen(-3)).toBeNull();
    expect(coerceOneToTen(11)).toBeNull();
    expect(coerceOneToTen(15)).toBeNull(); // E5: user typed 15, we reject
  });

  it("rejects NaN, Infinity and non-numeric strings — never propagates (E4)", () => {
    expect(coerceOneToTen(Number.NaN)).toBeNull();
    expect(coerceOneToTen(Number.POSITIVE_INFINITY)).toBeNull();
    expect(coerceOneToTen("abc")).toBeNull();
    expect(coerceOneToTen("")).toBeNull();
    expect(coerceOneToTen(null)).toBeNull();
    expect(coerceOneToTen(undefined)).toBeNull();
  });
});

describe("percentOf", () => {
  it("computes exact integer percentages", () => {
    expect(percentOf(64, 100)).toBe(64);
    expect(percentOf(0, 100)).toBe(0);
    expect(percentOf(100, 100)).toBe(100);
  });

  it("rounds half-up on .5 boundaries", () => {
    expect(percentOf(1, 8)).toBe(13); // 12.5 → 13
    expect(percentOf(7, 8)).toBe(88); // 87.5 → 88
  });

  it("avoids float drift by multiplying before dividing", () => {
    // Naive `(1 / 3) * 100` style drift must not leak in.
    expect(percentOf(2, 3)).toBe(67); // 66.666… → 67
    expect(percentOf(1, 3)).toBe(33); // 33.333… → 33
    expect(percentOf(64, 100)).toBe(64); // exact
  });

  it("returns 0 for a non-positive or non-finite denominator", () => {
    expect(percentOf(5, 0)).toBe(0);
    expect(percentOf(5, -10)).toBe(0);
    expect(percentOf(Number.NaN, 100)).toBe(0);
    expect(percentOf(5, Number.NaN)).toBe(0);
  });
});
