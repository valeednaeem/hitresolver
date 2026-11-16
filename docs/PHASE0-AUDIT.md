# Phase 0 — Discovery & Project Audit

**Date:** 2026-11-16
**Status:** Complete
**Auditor:** AI Product Director / Technical Architect

---

## 1. Repository Audit

| Check | Result |
|---|---|
| Project directory | `C:\xampp\htdocs\HitResolver` |
| Pre-existing files | **None** — directory was empty |
| Git repository | **Not initialized** (now initialized, see §5) |
| Existing framework / dependencies | None |
| Existing tests | None |
| Existing deployment config | None |
| Existing database | None |
| Existing AI integrations | None |
| Secrets in repo | None (repo was empty) |

**Conclusion:** Greenfield project. No legacy code to preserve or migrate. The full architecture is our choice.

### Reference files

Both supplied references were located **outside** the project directory and copied in unmodified:

| Original location | Copied to |
|---|---|
| `C:\xampp\htdocs\nadeemqaisar\6.01-ai_studio-app HitResolver features.txt` (915 B) | `docs/reference/6.01-ai_studio-app HitResolver features.txt` |
| `C:\xampp\htdocs\nadeemqaisar\ai_studio_code-hitresolver_v02.html` (51,523 B) | `docs/reference/ai_studio_code-hitresolver_v02.html` |

Originals were **not** modified. All further analysis used the copies in `docs/reference/`.

---

## 2. Environment Audit

| Tool | Version | Notes |
|---|---|---|
| Node.js | v24.22.0 | Current LTS-track; all candidate frameworks supported |
| npm | 11.17.0 | Registry reachable (`registry.npmjs.org` OK) |
| Git | 2.53.0 | Global identity configured (name + email) |
| Python | 3.15.2 | Available, not required for demo |
| Vercel CLI | 65.14.0 | **Authenticated** as `valeednaeem` — free preview deploys available |
| Bun | 1.4.4 | Available as alternative runner |
| XAMPP | installed | PHP not on PATH; **not needed** for chosen stack |

**npm registry access:** verified working. `next@16.4.6`, `vite@8.3.8` available.
**.npmrc:** present, contains only an `allow-scripts` allowlist (supply-chain hardening). No registry overrides.

### AI provider inspection (per §5G of the brief)

| Provider | Configured? | Reachable? |
|---|---|---|
| OmniRoute (`localhost:20128`) | Yes, in OpenCode config | **No** — port closed |
| Anthropic proxy (`127.0.0.1:1337`) | Yes, in env vars | **No** — port closed |
| OpenAI / Gemini / OpenRouter / Groq / etc. | **No API keys present** | n/a |

**Conclusion:** **No working AI provider is available at this time.** Per the brief, Phase 4 will therefore build an honest, clearly-labelled demo experience and document exactly what is simulated. We will **not** fabricate model responses, and we will **not** read the harness's own credentials (they are session-scoped and would break in production). A real server-side integration point will be built so a provider can be switched on later by configuration only.

---

## 3. Prototype Analysis

**File:** `docs/reference/ai_studio_code-hitresolver_v02.html`
**Structure:** Single-file HTML + CSS + vanilla JS. ~1,514 lines. Dark theme, CSS custom properties.

### 3.1 Data model (extracted)

```
state = { activeDecisionId, decisions: Decision[] }

Decision = {
  id, title, description, updatedAt,
  prosCons:   { pros:  Item[], cons: Item[] },          // Item = {id, text, weight}
  comparison: { options: Opt[], criteria: Crit[] },      // Opt = {id, name}
  swot:       { strengths, weaknesses, opportunities, threats }  // SWOTItem = {id, text, impact}
  // Crit = {id, name, weight, scores: {optId: number}, notes: {optId: string}}
}
```

Persisted to `localStorage` under key `hitresolver_v1_state`.

### 3.2 Calculation logic (extracted — authoritative for the spec)

**Pros & Cons:**
```
prosPts = Σ weight(pro)        consPts = Σ weight(con)
total   = prosPts + consPts
pct     = (total === 0) ? 50 : round(prosPts / total × 100)

label: pct ≥ 65 → Strong Go
       pct ≥ 55 → Lean Yes
       pct ≤ 35 → Strong No
       pct ≤ 45 → Lean No
       else     → Balanced
```

**Comparison matrix:**
```
maxPossible = Σ (criterion.weight × 10)        over all criteria
score(opt)  = Σ (score[crit][opt] ?? 0) × crit.weight
pct(opt)    = (maxPossible > 0) ? round(score / maxPossible × 100) : 0
rank        = sort by score descending
```

**Verdict dashboard:** deterministic rules over the three inputs — pros/cons label, matrix leader + margin, SWOT helpful-vs-harmful counts, high-impact weakness/threat flag, plus scripted "guidance" lines (close race, clear leader, mitigate risk, SO growth move).

### 3.3 Functionality that MUST be preserved

1. Multi-decision sidebar with active-state switching
2. Sample decision preset ("Choosing Our Next Product Stack")
3. Blank decision creation with sensible seed criteria
4. Editable decision title and description (inline)
5. Weighted Pros & Cons with live balance meter + verdict badge
6. Weighted comparison matrix with live ranking cards + leader highlight
7. Per-cell contextual notes on the matrix
8. SWOT 2×2 with High/Med/Low impact tags and internal/external labels
9. Combined Verdict Dashboard with strategic synthesis
10. JSON backup **and** restore
11. Markdown report export
12. Clear "how this is calculated" formula disclosure
13. Toast feedback on actions

### 3.4 Weaknesses identified (must be fixed)

**Correctness / calculation**

| # | Issue | Severity |
|---|---|---|
| W1 | `Number(weight)` can yield `NaN`; no validation — a bad value silently corrupts every total | **High** |
| W2 | **Display/calc mismatch:** matrix input *displays* `?? 5` for a missing score but the formula *uses* `?? 0`. A missing score looks like a 5 yet counts as 0 | **High** |
| W3 | Score input claims range 1–10 but clamps to **0–10**; `0` is storable and contradicts the stated range | **High** |
| W4 | No tie handling — equal scores are ranked #1/#2 with no indication they are tied | Medium |
| W5 | All criteria weights = 0 → `maxPossible = 0` → everything ties at 0% with no explicit "no weights set" state | Medium |
| W6 | NaN/Infinity/negative weights accepted on criteria and pros/cons | **High** |

**Data safety**

| # | Issue | Severity |
|---|---|---|
| W7 | `saveState()` calls `localStorage.setItem` **outside** try/catch — quota or private-mode failure throws and can lose the edit | **High** |
| W8 | `loadState()` swallows *all* errors and silently substitutes the sample — the user's work appears to vanish with no warning | **High** |
| W9 | JSON restore **silently overwrites** the entire state with no confirmation. Brief requires an explicit user choice | **High** |
| W10 | Imported JSON is not schema-validated beyond `Array.isArray` — a malformed nested shape crashes on render | **High** |
| W11 | Delete decision has **no confirmation** — brief requires confirmation | **High** |
| W12 | `activeDecisionId` from an import may not exist in the imported decisions | Medium |
| W13 | Full state re-serialised on **every keystroke** — unnecessary write pressure | Low |

**Security**

| # | Issue | Severity |
|---|---|---|
| W14 | `escapeHtml()` round-trips `textContent → innerHTML`, which escapes `& < >` but **not** `"` or `'`. Note values are injected into `value="…"` **attributes** → attribute breakout / injection | **High** |
| W15 | Whole UI is built by string concatenation into `innerHTML` — structurally fragile; must move to a rendering approach that encodes by default | **High** |

**UX / accessibility**

| # | Issue | Severity |
|---|---|---|
| W16 | Pros/Cons items and SWOT items can only be **added/removed, not edited** — brief requires edit | Medium |
| W17 | No duplicate-decision action — brief requires it | Medium |
| W18 | No "recently updated" ordering — brief requires it | Medium |
| W19 | Icon buttons have no accessible names; tabs are not ARIA tabs; no keyboard nav; toast has no `aria-live`; impact conveyed by colour alone | Medium |
| W20 | Only one breakpoint (900px); sidebar stacks *above* content on mobile → long scroll before reaching the workspace | Medium |
| W21 | Verdict guidance is hardcoded to `array[0]` — arbitrary first item, not a real analysis | Medium |
| W22 | **Markdown export omits the Verdict Dashboard entirely** — the signature section is not in the report | Medium |
| W23 | No "missing / incomplete information" detection — brief requires it | Medium |
| W24 | No loading / empty / error state system — only a toast | Low |
| W25 | `uid()` uses `Math.random` — non-zero collision risk | Low |

### 3.5 What the prototype does well

- Formula is disclosed to the user ("Total Score = Σ(Criterion Weight × Option Score)")
- Verdict language is careful — presents a *result*, not a truth claim
- Clean separation of the three frameworks before combining them
- Reasonable visual system already established (tokens, spacing, radii, semantic colours)
- Deleting an option correctly cleans up its scores and notes

---

## 4. Demo Scope (Phase 0 definition)

**In scope for v0.1 demo:**

- Application shell: branding, sidebar, tabs, responsive layout, design system
- Multi-decision workspace: create / rename / edit / switch / duplicate / delete-with-confirm / example preset
- Weighted Pros & Cons: add / edit / remove, weights, live balance, verdict badge, disclosed formula
- Weighted comparison matrix: options, criteria, weights, 1–10 scores, notes, totals, %, ranking, leader, breakdown, tie/zero-weight/incomplete handling
- SWOT 2×2: four quadrants, add/edit/remove, High/Med/Low, internal/external labels
- Verdict dashboard: pros/cons signal, matrix leader, SWOT posture, high-impact risks, opportunities, **missing information**, suggested next actions — deterministic and transparent
- Persistence: safe localStorage with quota/failure handling
- Portability: JSON backup, validated JSON restore **with explicit confirmation**, Markdown export **including the verdict**
- AI assistant: honest, clearly-labelled experience with a server-side boundary; simulated fallback documented
- Automated tests for the entire calculation engine
- Documentation set + QA + preview deployment

**Explicitly OUT of scope for v0.1** (documented, not removed): accounts, cloud sync, databases, auth, payments, subscriptions, collaboration, PDF export, templates, sensitivity analysis, AHP, decision trees, analytics, admin dashboard.

---

## 5. Technology Recommendation

### Decision: Next.js 16 (App Router) + TypeScript + Tailwind CSS + Vitest

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16**, App Router | Server-side API boundary for AI (keys never reach the browser); single deploy target; natural path to auth/DB for SaaS **without re-architecture** |
| Language | **TypeScript**, strict | Type safety across the engine and UI; catches the NaN/shape bugs the prototype had |
| Styling | **Tailwind CSS** | Fast, consistent design tokens; no dead CSS; responsive-first |
| State | React context + reducers, **pure functions** | No heavyweight store needed at demo scale; keeps engine decoupled |
| Persistence | `localStorage` behind a **`StorageAdapter` interface** | Swap to a cloud adapter later with zero UI changes |
| Decision engine | **Pure TypeScript module**, zero dependencies | Unit-testable, UI-independent, reusable — brief requires this |
| Tests | **Vitest** | Fast, TypeScript-native |
| Lint/format | ESLint + Prettier | Baseline quality gate |
| Deploy | **Vercel** (CLI already authenticated) | Free preview deployments; zero new credentials |

### Alternatives considered

| Option | Verdict | Reason |
|---|---|---|
| Vite + React SPA | Rejected | No server boundary for AI → would require a rewrite when AI ships. Brief demands SaaS-ready architecture "without unnecessary redevelopment" |
| Vanilla HTML/JS (extend prototype) | Rejected | Not maintainable, not testable, unsafe rendering (W14/W15) |
| Node + Express + separate SPA | Rejected | Two deploy targets, unnecessary for demo |
| Svelte / Vue | Rejected | React/Next has the strongest SaaS ecosystem and the broadest future hiring/AI-agent familiarity |
| Adding a DB now | **Rejected** | Brief forbids introducing a database "unless it provides real value at the current stage." localStorage is correct for a local-first demo |

**Trade-off accepted:** Next.js is heavier than a plain SPA. We accept this because the AI server boundary and the SaaS path are explicit requirements, and retrofitting them later costs more than they cost now.

### Architecture boundaries (per brief §7)

```
src/
  engine/        Decision calculation engine — pure TS, no React, no DOM
  domain/        Types, validation, schema migration
  storage/       StorageAdapter interface + LocalStorageAdapter
  ai/            AI service interface + providers (server-side only)
  components/    Reusable UI primitives
  features/      Feature modules (workspace, proscons, matrix, swot, verdict)
  app/           Next.js routes + API routes
```

Dependency rule: `engine` ← `features` ← `components`. `engine` depends on **nothing**.

---

## 6. Initial Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Weighted matrix math is wrong or ambiguous → destroys trust in the signature feature | Medium | **Critical** | Dedicated `DECISION-ENGINE-SPECIFICATION.md` + exhaustive unit tests before UI work |
| R2 | Silent data loss (quota failure, bad import, no confirm) | Medium | **High** | try/catch persistence, schema validation, explicit restore confirmation, backup prompt |
| R3 | XSS via attribute injection (W14) | Medium | **High** | React escapes by default; forbid `innerHTML`; add a security test |
| R4 | No AI provider → feature looks fake | **High** | Medium | Honest labelled demo mode; documented; server boundary ready for config-only enablement |
| R5 | Demo mistaken for production-ready | Medium | **High** | `PROJECT-STATUS.md` states limitations plainly; no overclaiming |
| R6 | Scope creep into SaaS features | Medium | Medium | Roadmap defers them; every addition logged in `DECISIONS-LOG.md` |
| R7 | localStorage-only data lost on browser change | **High** | Medium | Prominent export/restore UI; honest copy; documented as a demo limitation |
| R8 | Responsive layout fails on mobile | Medium | Medium | Breakpoint plan + manual device checks in Phase 5 |
| R9 | Vercel deploy blocked or unverified | Low | Medium | Deploy to preview first; verify before reporting URL |

---

## 7. Implementation Sequence (approved for execution)

| Phase | Name | Key exit criterion |
|---|---|---|
| **0** | Discovery & audit | ✅ This document |
| **1** | Product foundation & UI/UX | Navigable shell, design tokens, data model, responsive |
| **2** | Decision engine | Engine implemented + **all engine tests green** |
| **3** | Persistence & export | Save/restore/export verified; bad input cannot corrupt data |
| **4** | AI assistant | Honest experience + server boundary + documentation |
| **5** | QA & refinement | Functional, calc, persistence, responsive, a11y, security, perf all pass |
| **6** | Demo deployment | Preview URL live **and verified** |

**Sequencing note:** the engine (Phase 2) is deliberately built *before* most UI polish, and is tested independently. This is the mitigation for R1.

---

## 8. Deliverables checklist — Phase 0

- [x] Repository audit
- [x] Reference files located, copied unmodified to `docs/reference/`
- [x] Prototype functionality & data-structure analysis
- [x] Preserve-list and weakness list (25 issues)
- [x] Environment inspection (incl. AI provider probe)
- [x] Technology recommendation with trade-offs
- [x] Demo scope definition
- [x] Implementation sequence
- [x] Initial risk register (9 risks)
- [x] Documentation & tracking structure established
