# Decisions Log — HitResolver

Significant technical and product decisions, with rationale, alternatives, benefits, risks, and reversibility.

**Format:** newest first.

---

## D-013 — Pre-hydration bootstrap state instead of generated ids during prerender

**Date:** 2026-11-16 · **Phase:** 1

**Decided:** The workspace reducer's initializer uses a static `BOOTSTRAP_STATE` (fixed id, empty content). The real state — including `crypto.randomUUID()` ids — is created in the mount effect, client-side only.

**Why:** Next.js 16 refuses to prerender a client component that evaluates `crypto.randomUUID()`, failing `next build`. The app renders only a loading screen until hydration, so the bootstrap state is never visible; because `dirty` starts `false` it is also never persisted.

**Alternatives considered:** wrapping in `Suspense` or deferring the read — both add complexity for a value that is discarded one tick later.

**Benefits:** Production build passes; no generated content in server HTML (also avoids hydration mismatch on ids/timestamps).
**Reversible:** Yes.

---

## D-012 — Auto-save is gated on a user mutation (`dirty` flag)

**Date:** 2026-11-16 · **Phase:** 1

**Decided:** The reducer tracks `dirty`, set only by user actions (select/create/duplicate/remove/updateMeta). Persistence and the `pagehide` flush run only while `dirty` is true.

**Why:** On a failed load (corrupt/unavailable) the provider falls back to an in-memory sample so the app stays usable. Without gating, the debounced save would overwrite the user's unreadable data within 300 ms — exactly the silent-overwrite failure the brief forbids (prototype defect W9). Gating means a failed load is never replaced until the user actually edits.

**Benefits:** Corrupt payloads survive for manual recovery; unchanged data is not rewritten on every visit.
**Risks:** A user who only reads data never persists anything — harmless, since there is nothing new to persist.
**Reversible:** Yes.

---

## D-011 — Storage problems live in the reducer, not component state

**Date:** 2026-11-16 · **Phase:** 1

**Decided:** `storageProblem` is a reducer field with a `setStorageProblem` action, surfaced through context with `retrySave` / `dismissStorageProblem`.

**Why:** Failures are raised from three places (hydrate, debounced save, flush-on-hide). Centralising in the reducer keeps a single source of truth and satisfies the React rule against synchronous `setState` in effects. Retry re-saves the pending payload rather than hiding the problem.

**Reversible:** Yes.

---

## D-010 — Tailwind 4 class-based dark mode with pre-paint script

**Date:** 2026-11-16 · **Phase:** 1

**Decided:** Dark mode is a `.dark` class on `<html>`, toggled by a small inline script in `layout.tsx` before paint, persisted under `hitresolver:v1:theme`, defaulting to `prefers-color-scheme`. The toggle reads the class via `useSyncExternalStore` (MutationObserver) rather than copying it into React state.

**Why:** Tailwind 4 dropped `darkMode: "media"` config in favour of `@custom-variant`. A class-based approach gives user control; the pre-paint script prevents a light-flash. `useSyncExternalStore` keeps the DOM as single source of truth — no `setState`-in-effect, no hydration mismatch.

**Alternatives considered:** `next-themes` package — rejected; ~1 dependency for what is 20 lines, and the brief favours minimal dependencies.
**Reversible:** Yes.

---

## D-009 — Validation rejects rather than clamps

**Date:** 2026-11-16 · **Phase:** 1

**Decided:** All validators return `{ ok: false, errors }` for out-of-range or malformed input — weights/scores outside 1–10, `NaN`, `Infinity`, empty required text — and never silently adjust the value. Shape validation (`validateAppState`) collects **all** errors at once rather than failing at the first.

**Why:** Spec §0.1 and prototype defects W1/W3/W6: the prototype clamped and accepted 0, producing numbers the user could not explain. Rejection with the allowed range stated in the message is the honest behaviour. Collecting all errors makes backup-restore failures actionable in one pass.

**Benefits:** Deterministic, testable, matches the audit's fix list.
**Risks:** Slightly more verbose UI error handling — mitigated by `validateField` for inline editing.
**Reversible:** Yes, but changing this later would alter persisted-behaviour expectations.

---

## D-001 — Greenfield build; prototype is a reference, not source

**Date:** 2026-11-16 · **Phase:** 0

**Decided:** Build HitResolver as a new codebase. Use `ai_studio_code-hitresolver_v02.html` and the feature document as **product references only** — extract behaviour, data model, and formulas; do not copy HTML/CSS/JS.

**Why:** The prototype is a single 1,514-line file with string-concatenated `innerHTML`, an attribute-injection vulnerability (audit W14), unvalidated arithmetic (W1, W6), and unguarded persistence (W7). Copying it would import every defect and be untestable.

**Alternatives considered:**
1. *Fork the prototype and refactor* — rejected; refactoring unsafe rendering is riskier than rebuilding.
2. *Copy prototype into `docs/reference/` and reuse CSS directly* — rejected; CSS is entangled with the markup structure.

**Benefits:** Clean testable architecture, secure rendering, room to grow into SaaS.
**Risks:** Re-implementation may drift from prototype behaviour — mitigated by an explicit preserve-list (13 items) in `PHASE0-AUDIT.md` §3.3.
**Reversible:** Yes, at this stage — nothing has been discarded.

---

## D-002 — Stack: Next.js 16 + TypeScript + Tailwind + Vitest

**Date:** 2026-11-16 · **Phase:** 0

**Decided:** Next.js 16 (App Router), strict TypeScript, Tailwind CSS, Vitest, deployed to Vercel (CLI already authenticated).

**Why:** The brief requires AI integration through a **server-side boundary** and an architecture that becomes SaaS "without unnecessary redevelopment." Next.js provides API routes (keys never reach the browser) and a natural path to auth and cloud persistence, on a single deploy target. TypeScript strict mode directly addresses the prototype's NaN/shape bugs. Vitest gives fast native-TS engine tests.

**Alternatives considered:**
| Option | Why rejected |
|---|---|
| Vite + React SPA | No server boundary for AI → would need a rewrite when AI ships |
| Continue with vanilla HTML/JS | Untestable, unsafe rendering, not SaaS-viable |
| Express API + separate SPA | Two deploy targets, unjustified complexity at demo stage |
| Svelte / Vue | React/Next has the strongest SaaS ecosystem and AI-agent familiarity |
| Add a database now | Brief forbids introducing one "unless it provides real value at the current stage" |

**Trade-off accepted:** Next.js is heavier than a plain SPA. Accepted because the AI boundary and SaaS path are explicit requirements; retrofitting them later costs more than adopting them now.
**Benefits:** One deploy target, secure AI path, no future re-architecture.
**Risks:** Framework weight; mitigated by keeping the engine framework-agnostic and deployable as static output if needed.
**Reversible:** Partially — the engine and domain layers are framework-independent, so a UI-framework change would not discard them.

---

## D-003 — Decision engine is a pure, dependency-free module

**Date:** 2026-11-16 · **Phase:** 0

**Decided:** All scoring lives in `src/engine/` as pure TypeScript functions with **no React, no DOM, no I/O**. UI calls the engine; the engine never calls the UI.

**Why:** The brief requires calculation logic "independent of UI components so it can be tested and reused," and R1 (matrix math correctness) is the project's top risk. Pure functions are exhaustively unit-testable and are the foundation for future sensitivity analysis and alternative frameworks.

**Benefits:** Test-first development, guaranteed consistency between UI and export/report (both call the same code), future reuse.
**Risks:** Slight indirection — mitigated by keeping the API small and well-named.
**Reversible:** Yes — this is a structural choice with no lock-in.

---

## D-004 — localStorage behind a `StorageAdapter` interface

**Date:** 2026-11-16 · **Phase:** 0

**Decided:** Persistence goes through a `StorageAdapter` interface with a `LocalStorageAdapter` implementation for the demo. No cloud storage in v0.1.

**Why:** The demo must be local-first per the brief, but must also be honest that local data is **not** synced or available across devices. An interface means cloud sync is a later drop-in without UI changes. A database/auth now would violate the "no premature infrastructure" rule.

**Benefits:** Honest demo, zero-cost, future-proofed, no infra to secure.
**Risks:** Users may lose data if they clear the browser — mitigated by prominent export/restore and plain-language warnings (R7).
**Reversible:** Yes — the interface is the seam.

---

## D-005 — No AI provider available → honest labelled demo mode

**Date:** 2026-11-16 · **Phase:** 0

**Decided:** AI inspection found **no reachable provider** (OmniRoute `:20128` closed, Anthropic proxy `:1337` closed, no third-party API keys in the environment). Therefore Phase 4 will ship a fully-labelled **demo mode**: the AI assistant UI, contract, and server boundary are real; responses are clearly marked as simulated and never presented as model output. No harness/session credentials will be used.

**Why:** The brief is explicit — "Never fabricate an AI response and represent it as a real model response" and "Never expose API keys in browser code." Using the agent harness's own session credentials would also break the moment the session ends.

**Alternatives considered:**
1. *Reuse `ANTHROPIC_AUTH_TOKEN` / OmniRoute key* — **rejected**; session-scoped, would break in production, and is not ours to expose.
2. *Ship no AI UI at all* — rejected; the brief wants the AI experience built, with honest labelling.
3. *Call a public model from the browser* — rejected; would expose credentials.

**Benefits:** Real integration point ready; honest UX; switching on a real provider becomes a configuration-only change.
**Risks:** Demo AI is not genuinely intelligent — mitigated by conspicuous labelling and documentation of exactly what is simulated.
**Reversible:** Yes — adding a provider later changes configuration, not architecture.

---

## D-006 — Preserve prototype features via explicit preserve-list

**Date:** 2026-11-16 · **Phase:** 0

**Decided:** 13 prototype features are recorded as must-preserve (`PHASE0-AUDIT.md` §3.3), and 25 defects as must-fix (§3.4). Any feature dropped from the prototype will be logged here with a reason.

**Why:** The brief requires "Do not remove an existing useful feature without documenting the reason."

**Status:** No features removed. Prototype's Verdict Dashboard **export gap** (W22 — Markdown export omits the verdict) is being treated as a defect to fix, not a feature to drop.

**Reversible:** Yes.

---

## D-007 — Reference files copied into `docs/reference/`

**Date:** 2026-11-16 · **Phase:** 0

**Decided:** Both supplied references were found at `C:\xampp\htdocs\nadeemqaisar\` (outside the project) and copied **unmodified** into `docs/reference/`. Originals left untouched.

**Why:** The brief instructs that references must be inside the workspace without altering the originals.

**Benefits:** Project is self-contained; analysis reproducible.
**Reversible:** Yes — copies can be deleted at any time.

---

## D-008 — Git initialized; clean history from commit #1

**Date:** 2026-11-16 · **Phase:** 0

**Decided:** Initialize a Git repository at project root, commit documentation first, and maintain incremental, buildable commits thereafter. No destructive Git operations without authorization.

**Why:** The brief requires a clean, understandable history and forbids discarding uncommitted owner changes.

**Reversible:** Yes (local-only; no remote configured yet — creating one is a separate, logged decision).
