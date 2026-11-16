# Project Status — HitResolver

> This file is the single source of truth for where the project stands.
> Updated at the end of every meaningful phase or milestone.

**Last updated:** 2026-11-16 (end of Phase 2)

---

## Current Phase

**Phase 2 — Decision Engine — COMPLETE (awaiting owner review)**

Next: Phase 3 — Persistence & Export.

---

## Completed Work

### Phase 0 — Discovery & Project Audit

- [x] Repository inspected — confirmed **greenfield** (empty directory, no git)
- [x] Both reference files located outside the project and copied unmodified to `docs/reference/`
- [x] Feature document read (915 B, 5 feature areas)
- [x] HTML prototype read in full (1,514 lines) — data model and all formulas extracted
- [x] 13 features identified for preservation
- [x] **25 weaknesses catalogued** (10 High severity)
- [x] Environment audited: Node 24.22, npm 11.17, Git 2.53, Vercel CLI authenticated
- [x] AI providers probed — **none reachable**; honest demo approach selected
- [x] Technology stack selected: **Next.js 16 + TypeScript + Tailwind + Vitest**
- [x] Demo scope defined (in/out lists)
- [x] Risk register created (9 risks)
- [x] Documentation structure established
- [x] Git repository initialized

### Phase 1 — Product Foundation & UI/UX

- [x] Next.js 16 scaffold (TypeScript, Tailwind 4, App Router, `src/` dir)
- [x] Design tokens + light/dark theme in `src/app/globals.css`
- [x] Reusable UI kit: `Button`, `Card`, `Badge`, `Field`, `Modal`, `Toast`, `Spinner`, `EmptyState`, icons
- [x] Responsive application shell: sidebar drawer (mobile) / static column (desktop), sticky top bar, skip link
- [x] Sidebar: decision list sorted by last updated, create, duplicate, delete-with-confirmation, storage warning banner
- [x] Workspace header: inline-editable title/description with validation, duplicate, delete-with-confirmation
- [x] Framework tab navigation (ARIA tabs pattern) for all 4 frameworks — Phase 2 panels are real now (Phase 1 used honest placeholders)
- [x] Domain models (`src/domain/types.ts`) + validation (`src/domain/validation.ts`, reject-don't-clamp)
- [x] Decision factories: blank decision + reference sample decision
- [x] `StorageAdapter` interface + hardened localStorage implementation
- [x] Workspace state: reducer + debounced persistence + dirty-gating (a failed load is never overwritten)
- [x] Theme toggle persisted, pre-paint script avoids flash
- [x] Vitest configured (node env by default; jsdom opt-in per file)
- [x] **61 tests passing** across validation, factories and storage
- [x] `tsc --noEmit`, `eslint` and `next build` all clean

### Phase 2 — Decision Engine & Framework Panels

- [x] Pure numeric policy module (`src/engine/numeric.ts`): `isFiniteNumber`, `roundHalfAwayFromZero`, `roundHalfUp`, `coerceOneToTen` (1–10, fractional→round→range-check), `percentOf` (multiply-before-divide, half-up)
- [x] Weighted Pros & Cons engine (`src/engine/proscons.ts`): Σ weights, positive-share pct (50 placeholder when empty), verdict bands from spec §1.3, invalid-weight exclusion, one-sided ledger detection
- [x] Weighted Comparison Matrix engine (`src/engine/matrix.ts`): `maxPossible = Σ(weight×10)`, `rawScore = Σ(score×weight)` over available cells, pct half-up, competition ranking (1,1,3), explicit ties, margin ≤ 5% of maxPossible = close race, missing-cell reporting (never defaulted — W2), invalid weights excluded (W1/W5/W6), structural duplicate/orphan detection
- [x] SWOT engine (`src/engine/swot.ts`): four distinct quadrants, internal/external + helpful/harmful axes, High-impact risk flagging, posture ladder (Not assessed / Exposed / Strained / Favourable / Balanced), invalid-impact rejection
- [x] Verdict Dashboard engine (`src/engine/verdict.ts`): 10 completeness checks → `completenessPct`; 10 named recommendation rules (`R-*`) ordered data → risk → strategic → completeness; **no composite score** (§4.1/§4.5)
- [x] Engine public surface (`src/engine/index.ts`); engine stays pure TS — no React/DOM/storage/AI imports
- [x] Engine tests: **116 passing** across numeric, pros-cons, matrix, swot and verdict suites — all formulas of spec §1–§4 and every row E1–E20 + E21–E25 covered, plus owner-added scenarios (equal scores/totals, missing cells, zero/all-zero weights, invalid impact, duplicates, float precision, large inputs) and property checks (0 ≤ pct ≤ 100; ranking total order)
- [x] Prototype-defect regressions: W1, W2, W3, W4, W5, W6, W22, W23 all have named regression tests (W22 export-content test asserts the dashboard supplies everything the future Markdown export must include; the export rendering itself ships in Phase 3)
- [x] Framework panels wired to the engine (`src/components/framework/`): Pros & Cons, Matrix, SWOT, Verdict — all real calculations; `PhasePlaceholder` removed
- [x] Workspace reducer gained `updateProsCons` / `updateComparison` / `updateSwot` actions (data-layer only; no formula logic in state)
- [x] Validation hardened: duplicate option/criterion/pros/cons/SWOT identifiers now rejected on load/import with clear errors
- [x] Component tests (`src/components/framework/framework-panels.test.tsx`, jsdom): sample decision renders engine values (Strong Go / 69%, Modular Monolith / 80%, Exposed posture, R-CLOSE recommendation); empty decision shows honest empty states (no entries yet / No criteria / Not assessed)
- [x] npm audit: single advisory (GHSA-g3hv-75wg-m249, minimatch DoS) via `@typescript-eslint/typescript-estree`; scoped override `minimatch@^11.0.8` → `npm audit` now reports **0 vulnerabilities**; lint/tests/typecheck unaffected

### Phase 2 quality gates (all executed and green)

- [x] `npx vitest run` — **186 tests passing** (61 Phase 1 + 116 engine + 9 new component tests)
- [x] `npm run typecheck` — clean
- [x] `npm run lint` — clean (0 errors, 0 warnings)
- [x] `npm run build` — clean, static `/` prerendered
- [x] Engine + domain + storage suites DOM-free (node env); component suite opts in via `@vitest-environment jsdom`

## Work In Progress

- Owner review of Phase 2 completion report (engine maths, panel behaviour, remaining known limitations).

## Remaining Tasks

| Phase | Status |
|---|---|
| 1 — Product Foundation & UI/UX | **Complete — owner approved** |
| 2 — Decision Engine | **Complete — awaiting owner review** |
| 3 — Persistence & Export | Not started |
| 4 — AI Assistant | Not started |
| 5 — QA & Refinement | Not started |
| 6 — Demo Deployment | Not started |

## Known Bugs

_None in shipped paths. Known limitations listed below._

## Technical Risks

See `PHASE0-AUDIT.md` §6. Top three:

| # | Risk | Status |
|---|---|---|
| R1 | Weighted matrix math ambiguity | Mitigated by dedicated spec + test-first engine |
| R2 | Silent data loss | Mitigated — validation, typed storage failures, dirty-gated auto-save |
| R4 | No AI provider available | Mitigated by honest labelled demo mode |

## Test Status

**186 tests passing (9 files).** Covers: weight/score/text/impact validation (reject-don't-clamp, NaN, Infinity, out-of-range, duplicate identifiers), full `AppState` shape validation, factories (sample content preserved, unique ids), localStorage adapter (round-trip, corrupt reporting, quota/unavailable failures, dangling-id repair, clear scoping), engine numeric policy (E22/E25/E6), Pros & Cons (E1–E6, E23 boundaries), Matrix (E7–E20 + missing/weight/leader/margin/tie/breakdown cases), SWOT posture + invalid impact, Verdict completeness + recommendations + determinism, and framework panels via jsdom.

Run with `npm test`. Type check: `npm run typecheck`. Lint: `npm run lint`. All three: `npm run check`.

## Deployment Status

**Not deployed.** Vercel CLI is authenticated and available. Target: free preview deployment in Phase 6, verified before the URL is reported.

## Limitations (stated plainly)

- This is a **demo**, not a production SaaS.
- Data is stored in **browser `localStorage` only** — it is **not** cloud-synced, **not** available across devices, and **not** backed up unless the user exports JSON (export ships in Phase 3).
- There are **no user accounts** and **no authentication**.
- The framework panels now run **real engine calculations** (Phase 2). Remaining plain-language gaps: no per-option scoring UI for every criterion yet beyond the editor, and no AI assistant (Phase 4).
- The AI assistant cannot be connected to a real model yet — no provider is configured. Anything AI-shaped in the demo is **clearly labelled as simulated**.
- No payment, subscription, or usage-limiting systems exist.

## Next Recommended Action

Owner reviews the Phase 2 completion report against the Phase 2 acceptance criteria, then gives the go for **Phase 3 — Persistence & Export**.

---

*Owner: product owner (business authority) · Agent: day-to-day technical & delivery lead*
