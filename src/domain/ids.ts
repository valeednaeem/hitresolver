/**
 * ID generation.
 *
 * Uses `crypto.randomUUID()` where available (all modern browsers, Node 19+)
 * and falls back to a timestamp+random string. The prototype used
 * `Math.random().toString(36)` alone, which has a non-zero collision risk
 * (defect W25).
 */

let counter = 0;

export function createId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  // Fallback: timestamp + counter + randomness. Not cryptographically
  // strong, but collision-resistant enough for local decision records.
  counter += 1;
  const rand = Math.random().toString(36).slice(2, 10);
  return `d${Date.now().toString(36)}-${counter.toString(36)}-${rand}`;
}
