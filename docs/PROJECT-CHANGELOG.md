# HitResolver — Project Changelog

All notable changes to HitResolver, per release and per phase.
Format loosely follows Keep a Changelog.

---

## [Unreleased]

### Phase 1 — Product Foundation & UI/UX (2026-11-16)

**Added**
- Next.js 16.4.6 scaffold (TypeScript, Tailwind CSS 4, App Router, `src/` directory, `@/*` import alias).
- Design system: semantic tokens (canvas/surface/ink/brand/status) with class-based dark mode in `src/app/globals.css`, plus theme-aware scrollbars, visible focus rings and reduced-motion support.
- Reusable UI kit under `src/components/ui/`:
  - `Button` (5 variants, 3 sizes, loading state), `Spinner`/`LoadingState`
  - `Card`/`CardHeader`, `Badge` (text + colour, never colour alone)
  - `TextField`/`TextAreaField`/`SelectField` with `aria-describedby`/`aria-invalid` wiring
  - `Modal` (focus trap, Escape/backdrop close, scroll lock, focus restore) + `ModalActions`
  - `ToastProvider`/`useToast` with an always-present `aria-live` region
  - `EmptyState`, `BrandMark`, `PhasePlaceholder`, dependency-free inline icon set
- Responsive application shell (`src/components/shell/`):
  - Sidebar: fixed drawer below `lg`, static column at `lg+`; decision list sorted by last updated with counts and relative times; create/duplicate actions; storage-failure banner with Retry/Dismiss
  - Workspace header: inline-editable title and description (commit on blur/Enter, Escape reverts, validation errors shown inline), duplicate, delete-with-confirmation
  - Framework tabs: full ARIA tabs pattern (roving tabindex, Arrow/Home/End) covering all four frameworks
  - Theme toggle via `useSyncExternalStore` + pre-paint script in `layout.tsx` (no flash, no setState-in-effect)
  - Skip-to-content link, sticky top bar, honest demo/storage footer
- Domain layer (`src/domain/`):
  - `types.ts` — single source of truth for `Decision`, `AppState`, ranges, `SCHEMA_VERSION`, storage key namespace
  - `validation.ts` — pure, total validators; **rejects rather than clamps** (spec §0.1); full `AppState` shape validation collecting all errors at once
  - `ids.ts` — `crypto.randomUUID()` with a collision-resistant fallback
  - `factory.ts` — blank decision (2 options, 2 criteria) and the reference sample decision, content preserved verbatim
- Storage layer (`src/storage/`):
  - `StorageAdapter` interface with typed `StorageResult` and `STORAGE_MESSAGES`
  - `LocalStorageAdapter`: every access wrapped; corrupt payloads reported (never silently replaced); quota vs unavailable distinguished by error name; dangling `activeDecisionId` repaired before validation
- Workspace state (`src/state/workspace.tsx`): single reducer for all mutations, debounced (300 ms) persistence, flush on `pagehide`/`visibilitychange`, and **dirty-gating** so a failed load is never overwritten by the in-memory fallback.
- Vitest setup: node environment by default (keeps engine/domain DOM-free), jsdom opted into per file via `@vitest-environment` docblock; coverage via `@vitest/coverage-v8`.
- **61 tests** across `validation.test.ts`, `factory.test.ts`, `local-storage.test.ts`.
- npm scripts: `test`, `test:watch`, `typecheck`, `check`.

**Changed**
- `@types/node` raised `^20` → `^24` to satisfy Vitest 5's peer range.
- `allowScripts: {}` added to `package.json` (required by the environment's npm `allow-scripts` policy).

**Fixed (found during Phase 1 build)**
- Storage load validated before repairing, making the dangling-`activeDecisionId` repair unreachable (defect W12 path).
- Quota detection required `instanceof DOMException`; now matches the error name so shimmed environments still report `quota` correctly.
- Reducer initializer called `crypto.randomUUID()` during prerender, failing `next build`; replaced with a static bootstrap state that is never rendered or persisted.

**Known issues**
- Framework panels are honest placeholders until Phase 2 — no controls are shown that do not work.
- No JSON export/import yet (Phase 3); the sidebar footer states this plainly.

---

### Phase 0 — Discovery & Project Audit (2026-11-16)

**Added**
- Project repository initialized (Git, clean history from commit #1).
- Reference files copied **unmodified** into `docs/reference/`:
  - `6.01-ai_studio-app HitResolver features.txt` (915 B)
  - `ai_studio_code-hitresolver_v02.html` (51,523 B)
  - Originals at `C:\xampp\htdocs\nadeemqaisar\` left untouched.
- Documentation set:
  - `PROJECT-OVERVIEW.md`
  - `PRODUCT-REQUIREMENTS.md`
  - `TECHNICAL-ARCHITECTURE.md`
  - `DECISION-ENGINE-SPECIFICATION.md`
  - `FEATURE-ROADMAP.md`
  - `AI-INTEGRATION.md`
  - `QA-STRATEGY.md`
  - `DEPLOYMENT-GUIDE.md`
  - `PROJECT-STATUS.md`
  - `DECISIONS-LOG.md`
  - `PROJECT-CHANGELOG.md` (this file)
  - `PHASE0-AUDIT.md`

**Analysis**
- Repository audited: confirmed **greenfield** — empty directory, no pre-existing code, no git.
- Environment audited: Node v24.22.0, npm 11.17.0, Git 2.53.0, Vercel CLI 65.14.0 (authenticated), npm registry reachable.
- AI providers probed: **none reachable**; no third-party API keys in environment.
- Prototype read in full (1,514 lines); data model and all formulas extracted.
- **13 features** recorded as must-preserve.
- **25 weaknesses** catalogued (10 High severity), including:
  - display/calculation mismatch on missing matrix scores (W2)
  - score range accepts 0 despite stated 1–10 (W3)
  - unvalidated arithmetic allowing `NaN` (W1, W6)
  - unguarded `localStorage.setItem` (W7)
  - silent full-state overwrite on JSON restore (W9)
  - attribute-injection via incomplete HTML escaping (W14)
  - Markdown export omitting the Verdict Dashboard (W22)

**Decisions**
- D-001 Build greenfield; prototype is reference, not source.
- D-002 Stack: Next.js 16 + TypeScript + Tailwind + Vitest + Vercel.
- D-003 Decision engine as pure, dependency-free module.
- D-004 localStorage behind a `StorageAdapter` interface.
- D-005 No AI provider → honest labelled demo mode with real server boundary.
- D-006 Preserve-list governance for prototype features.
- D-007 Reference files copied into `docs/reference/`.
- D-008 Git initialized; clean incremental history.

**Known issues**
- None — no application code exists yet.

---

## Release History

| Version | Date | Status |
|---|---|---|
| v0.1 (demo) | — | Not yet started |
