/**
 * HitResolver decision engine — public surface.
 *
 * Pure, deterministic, framework-independent TypeScript (D-003):
 * no React, no Next.js, no DOM, no storage, no AI. Every formula from
 * `docs/DECISION-ENGINE-SPECIFICATION.md` §1–§4 lives behind these
 * exports, and no UI code may re-implement any of them.
 *
 * Layering rule: the engine *depends on* domain types (type-only) and
 * is depended on by the UI. Nothing here imports from `react`,
 * `next/*`, `@/storage/*` or any AI provider.
 */

export * from "./numeric";
export * from "./proscons";
export * from "./matrix";
export * from "./swot";
export * from "./verdict";
