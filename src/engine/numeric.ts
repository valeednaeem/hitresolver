/**
 * Engine numeric policy (spec §0.1).
 *
 * Intentionally self-contained: the engine never assumes the UI's
 * validation ran. Every coercion here is defensive — invalid input
 * returns `null` rather than a plausible-looking number.
 *
 * Pure: no DOM, no React, no locale, no dates, no randomness.
 */

/** True only for real, finite numbers (rejects NaN, ±Infinity, strings). */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Input coercion rounding: half-away-from-zero (spec §0.1).
 * `3.6 → 4`, `3.4 → 3`, `-3.6 → -4`.
 */
export function roundHalfAwayFromZero(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/**
 * Display rounding: half-up (spec §0.1, E22).
 * `roundHalfUp(0.5) === 1`, `roundHalfUp(1.5) === 2`.
 * Locale-independent and deterministic for finite input.
 */
export function roundHalfUp(value: number): number {
  if (!Number.isFinite(value)) return Number.NaN;
  return Math.floor(value + 0.5);
}

/**
 * Coerce an unknown value to an integer in 1–10 inclusive.
 *
 * Accepts numeric strings (form input), rounds half-away-from-zero, then
 * range-checks. Returns `null` for anything invalid — `null` never
 * reaches a total (spec E4, E11, E12, E25).
 */
export function coerceOneToTen(raw: unknown): number | null {
  const n = typeof raw === "string" ? Number(raw.trim()) : raw;
  if (!isFiniteNumber(n)) return null;
  const rounded = roundHalfAwayFromZero(n);
  return rounded >= 1 && rounded <= 10 ? rounded : null;
}

/**
 * `part / whole` as a rounded integer percentage (0–100).
 *
 * Multiplies before dividing so exact ratios stay exact in IEEE-754
 * (avoids `0.64 * 100` drift). Returns 0 when `whole` is not a positive
 * finite number — callers decide what "no denominator" means for them
 * (pros/cons uses 50 per spec §1.2).
 */
export function percentOf(part: number, whole: number): number {
  if (!isFiniteNumber(part) || !isFiniteNumber(whole) || whole <= 0) return 0;
  return roundHalfUp((part * 100) / whole);
}
