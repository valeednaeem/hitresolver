# HitResolver — Technical Architecture

**Updated:** 2026-11-16 · **Stack decision:** D-002 in `DECISIONS-LOG.md`

---

## 1. Selected Stack

| Layer | Choice | Version target |
|---|---|---|
| Framework | **Next.js** (App Router) | 16.x |
| Language | **TypeScript** (strict) | 5.x |
| Styling | **Tailwind CSS** | 4.x |
| State | React Context + reducers (pure functions) | — |
| Persistence | `localStorage` behind `StorageAdapter` | — |
| Decision engine | **Pure TypeScript module, zero deps** | — |
| Testing | **Vitest** | 3.x |
| Lint / format | ESLint + Prettier | — |
| Deploy | **Vercel** (CLI authenticated) | — |

**Node:** v24.22.0 (installed) · **npm:** 11.17.0 (registry reachable)

### Why this stack (summary — full reasoning in `DECISIONS-LOG.md` D-002)

- **Server boundary for AI** — API routes keep provider keys off the client (brief §5H).
- **SaaS path without re-architecture** — auth, cloud persistence, and billing slot in later.
- **TypeScript strict** — directly prevents the prototype's NaN/shape defects (W1, W6).
- **Single deploy target** — Vercel CLI is already authenticated; free preview deploys.

**Rejected:** Vite SPA (no AI server boundary → future rewrite), vanilla HTML/JS (untestable, unsafe rendering), Express + separate SPA (two deploy targets), adding a database now (brief forbids premature infrastructure).

---

## 2. Layering & Dependency Rule

```
src/
  engine/       Decision calculation — PURE TS. No React, no DOM, no I/O, no imports from anywhere else.
  domain/       Types, validation, schema, migration, ID generation
  storage/      StorageAdapter interface + LocalStorageAdapter
  ai/           AIService interface + providers (SERVER-SIDE ONLY)
  components/   Reusable UI primitives (Button, Input, Card, Modal, Badge, Toast, Tabs…)
  features/     Feature modules (workspace, proscons, matrix, swot, verdict, reports)
  app/          Next.js routes (pages) and api routes (server)
```

**Dependency direction (enforced, one-way):**

```
engine  ←  features  ←  components  ←  app
   ↑
domain
```

| Rule | Reason |
|---|---|
| `engine` imports **nothing** from the app | Testable in isolation; reusable for future frameworks |
| `features` never build HTML strings | React encodes by default → kills the prototype's attribute-injection bug (W14) |
| `storage` accessed only through `StorageAdapter` | Swapping to cloud persistence is a drop-in, no UI change |
| `ai` code never ships to the client bundle | Keys and prompts stay server-side |
| No `innerHTML` / `dangerouslySetInnerHTML` for user data | Security invariant |

---

## 3. Core Data Model

```ts
type Impact = "High" | "Medium" | "Low";

interface WeightedItem { id: string; text: string; weight: number }        // 1–10
interface SwotItem    { id: string; text: string; impact: Impact }

interface Criterion {
  id: string;
  name: string;
  weight: number;                                   // 1–10
  scores: Record<string, number>;                   // optionId -> 1..10 ; ABSENT = missing
  notes:  Record<string, string>;                   // optionId -> note
}

interface Comparison { options: { id: string; name: string }[]; criteria: Criterion[] }

interface Decision {
  id: string;
  title: string;
  description: string;
  createdAt: string;                                // ISO-8601
  updatedAt: string;                                // ISO-8601
  prosCons:   { pros: WeightedItem[]; cons: WeightedItem[] };
  comparison: Comparison;
  swot:       Record<"strengths"|"weaknesses"|"opportunities"|"threats", SwotItem[]>;
}

interface AppState { schemaVersion: number; activeDecisionId: string; decisions: Decision[] }
```

**Key modelling choices (differ from the prototype on purpose):**

| Choice | Why |
|---|---|
| Missing score = **absent key**, never `0` or `5` default | Fixes display/calc mismatch (W2) |
| `schemaVersion` on the root | Enables safe future migrations |
| `createdAt` **and** `updatedAt` | "Recently updated" ordering (W18) requires both |
| Scores/notes keyed by option id | Deleting an option cleans up in one pass (prototype did this well — kept) |
| IDs from `crypto.randomUUID()` | Eliminates `Math.random` collision risk (W25) |

---

## 4. Persistence

```ts
interface StorageAdapter {
  load(): AppState | null;
  save(state: AppState): StorageResult;     // { ok: true } | { ok: false; reason: "quota"|"unavailable"|"corrupt" }
  clear(): void;
}
```

**Hardening (fixes W7, W8, W9, W10, W12):**

1. `save()` wrapped in `try/catch` — quota/private-mode failures surface as a **visible, non-destructive error**, never a thrown exception mid-edit.
2. `load()` distinguishes *"no data yet"* from *"data present but corrupt"* — corrupt data is **preserved for recovery** and reported, never silently replaced with the sample.
3. `load()` validates shape before use; an invalid `activeDecisionId` falls back safely.
4. **Restore never overwrites silently** — import shows a preview (count of decisions) and requires an explicit choice: *replace all* / *add as new* / *cancel*.
5. Autosave is **debounced**; no full-state serialisation on every keystroke (W13).
6. On every successful save of a non-empty state, the UI nags toward **JSON export** (plain language: *"this data lives only in this browser"*).

**Honest limitation (documented in UI and docs):** localStorage data is device- and browser-specific. It is not synced, not backed up, and is lost if browser data is cleared.

---

## 5. Validation Strategy

Validation lives in `domain/` and runs at **three points**:

| Point | Purpose |
|---|---|
| **Input** (UI event) | Reject out-of-range values immediately; show the allowed range inline |
| **Load** (storage / import) | Validate full state shape; refuse corrupt payloads |
| **Engine entry** | Defensive re-check so a calculation can never consume invalid data |

Per the spec (`DECISION-ENGINE-SPECIFICATION.md` §0.1): **reject, do not silently clamp.** The prototype clamped, which produced numbers the user could not explain.

Import errors produce specific, human-readable messages — never a generic failure, never a partial write.

---

## 6. Rendering & Security

- **React encodes all interpolated text by default.** The prototype's `escapeHtml()` failed to encode `"` and `'` yet injected values into `value="…"` attributes → attribute breakout (W14). React removes this entire class of bug.
- **No `innerHTML` for user content**, no `dangerouslySetInnerHTML` anywhere in the app.
- **No secrets client-side.** The AI provider key lives only in server environment variables, read inside `app/api/*`.
- **No external image/script/font dependencies** required for core operation — the demo works offline after first load.
- **Storage keys namespaced** (`hitresolver:v1:*`) to avoid collisions with other apps on the same origin.

---

## 7. AI Integration Boundary

Full detail in `AI-INTEGRATION.md`. Structure:

```
src/ai/
  types.ts        AIService interface, request/response shapes, Suggestion type
  server.ts       Server-only provider dispatch (never imported by client components)
  providers/      one module per provider (openai-compatible, anthropic, …)
  demo.ts         Clearly-labelled deterministic demo provider
```

- Every AI output carries a **label**, a **provenance** field (`"model"` | `"demo"`), and is **editable/acceptable/rejectable** in the UI.
- AI **never writes into user content** without an explicit accept action.
- With no provider configured, `demo.ts` is used and the UI states plainly that responses are simulated.

---

## 8. Responsive Strategy

| Breakpoint | Layout |
|---|---|
| ≥1280px | Sidebar + workspace side by side |
| 1024–1279px | Sidebar narrower, workspace full |
| 768–1023px | Sidebar collapses to a drawer with a toggle; matrix horizontally scrollable with sticky first column |
| <768px | Single column, drawer nav, stacked SWOT, tabs become scrollable strip, full-width controls |

Fixes W20 (prototype stacked the sidebar *above* content on mobile, pushing the workspace below the fold).

---

## 9. Testing Architecture

| Suite | Covers | Location |
|---|---|---|
| **Engine unit tests** | Every formula + every edge case E1–E25 | `src/engine/**` |
| **Validation tests** | Input rejection, import corruption | `src/domain/**` |
| **Storage tests** | Quota failure, corrupt data, round-trip | `src/storage/**` |
| **Component tests** | Key interactions, empty/error states | `src/features/**` |
| **Regression tests** | One per prototype defect W1–W25 | mapped in test names |
| **Security test** | Malicious strings rendered inert | `src/features/**` |

Engine tests must run with **zero DOM/React imports** — enforced by project structure, verified by the test config.

---

## 10. Future SaaS Readiness (designed for, not built)

| Future need | Seam already in place |
|---|---|
| Cloud persistence | `StorageAdapter` → `CloudStorageAdapter` |
| Accounts / auth | Next.js middleware + route groups; no engine change |
| Real AI | `src/ai/providers/*` — add a module + env var, no UI change |
| Multi-device sync | Same storage seam + conflict policy at the adapter |
| Payments / plans | Route-group-gated features; no engine change |
| Sensitivity analysis | Engine exposes per-criterion `contribution()` |
| New frameworks (AHP, trees) | Pure `engine/` functions drop in alongside existing ones |

Nothing in the demo needs to be discarded to reach any of these.
