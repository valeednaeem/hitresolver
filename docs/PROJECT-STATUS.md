# Project Status — HitResolver

> This file is the single source of truth for where the project stands.
> Updated at the end of every meaningful phase or milestone.

**Last updated:** 2026-11-17 (end of Phase 3 — persistence & export delivered)

---

## Current Phase

**Phase 3 — Persistence & Export — COMPLETE (delivered; awaiting owner review before Phase 4)**

Phase 3 delivered the full backup/restore/report loop the brief requires:

1. **Reliable persistence** — via the existing `StorageAdapter` (localStorage backend), unchanged architecture; debounced save + dirty-gating + flush-on-hide retained.
2. **JSON export / import** — versioned backup envelope (`schemaVersion`), validate-before-accept through `validateAppState`, explicit confirmation before restore replaces existing decisions, typed errors.
3. **Markdown export** — `buildMarkdownReport` via the engine evaluators; decision details, Pros & Cons, Matrix, SWOT, Verdict Dashboard, risks/recommendations, incomplete warnings.
4. **Reliability** — corrupt JSON, bad schema version, duplicate ids, empty imports, unknown references, out-of-range weights all rejected before restore; storage failures surfaced via the existing typed storage problem path.

Next: Phase 4 — AI Decision Assistant (awaiting owner Phase 3 sign-off).

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

- [x] `npx vitest run` — **189 tests passing** (61 Phase 1 + 116 engine + 9 component + new focused-review regressions)
- [x] `npm run typecheck` — clean
- [x] `npm run lint` — clean (0 errors, 0 warnings)
- [x] `npm run build` — clean, static `/` prerendered
- [x] Engine + domain + storage suites DOM-free (node env); component suite opts in via `@vitest-environment jsdom`

### Phase 3 — Persistence & Export (2026-11-17)

- [x] Backup helpers (`src/storage/backup.ts`): `buildBackupPayload`, `parseBackup` (validate-before-accept), `downloadTextFile`.
- [x] Markdown report builder (`src/engine/report.ts`): `buildMarkdownReport(decision)` via engine evaluators; sections: decision details, Pros & Cons, Weighted Comparison Matrix, SWOT, Verdict Dashboard, Risks & Recommendations, Incomplete Evaluations.
- [x] Workspace header: Export JSON / Export Markdown / Import JSON + restore confirmation modal.
- [x] Workspace reducer: `restore` action (replaces state; treated as user mutation so it persists; clears storage problem).
- [x] New tests: backup (13 cases), report (5 cases), workspace reducer (5 cases), header UI (5 cases).
- [x] Phase 3 quality gates (all executed and green):

- [x] `npx vitest run` — **215 tests passing** (189 Phase 2 + 26 Phase 3)
- [x] `npm run typecheck` — clean
- [x] `npm run lint` — clean (0 errors, 0 warnings)
- [x] `npm run build` — clean, static `/` prerendered
- [x] `npm audit` — **0 vulnerabilities**

## Work In Progress

- Owner review of the Phase 3 completion report and sign-off before Phase 4 — **in progress**.

## Remaining Tasks

| Phase | Status |
|---|---|
| 1 — Product Foundation & UI/UX | **Complete — owner approved** |
| 2 — Decision Engine | **Complete — owner approved** |
| 3 — Persistence & Export | **Complete — delivered, awaiting owner review** |
| 4 — Identity, User Management & Cloud Persistence | **Investigation + addendum delivered; awaiting owner implementation authorization** |
| 5 — AI Decision Assistant | Not started (blocked until Phase 4 implemented and reviewed) |
| 6 — QA, Security & Product Refinement | Not started |
| 7 — Demo Release & Feedback | Not started |

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

**215 tests passing (13 files).** Covers: weight/score/text/impact validation (reject-don't-clamp, NaN, Infinity, out-of-range, reject-before-rounding, duplicate identifiers), full `AppState` shape validation, factories, localStorage adapter, engine numeric policy, Pros & Cons, Matrix, SWOT, Verdict, framework panels, backup export/import helpers, markdown report builder, and workspace reducer actions (create/duplicate/remove/restore).

Run with `npm test`. Type check: `npm run typecheck`. Lint: `npm run lint`. All three: `npm run check`.

## Deployment Status

**Not deployed.** Vercel CLI is authenticated and available. Target: free preview deployment in Phase 6, verified before the URL is reported.

## Limitations (stated plainly)

- This is a **demo**, not a production SaaS.
- Data is stored in **browser `localStorage` only** — it is **not** cloud-synced, **not** available across devices, and **not** backed up unless the user exports JSON (Phase 3 export/restore now shipped — still local-only by design).
- There are **no user accounts** and **no authentication**.
- The framework panels now run **real engine calculations** (Phase 2). Remaining plain-language gaps: no per-option scoring UI for every criterion yet beyond the editor, and no AI assistant (Phase 4).
- The AI assistant cannot be connected to a real model yet — no provider is configured. Anything AI-shaped in the demo is **clearly labelled as simulated**.
- No payment, subscription, or usage-limiting systems exist.

## Next Recommended Action

Phase 4 — Identity, User Management & Cloud Persistence: architecture investigation **and** focused addendum delivered (2026-11-17); Phase 4 implementation **not authorized**; Phase 5 AI **not authorized**.

Awaiting owner review of the addendum and explicit implementation authorization. No Phase 4 code has been written.

---

*Owner: product owner (business authority) · Agent: day-to-day technical & delivery lead*
