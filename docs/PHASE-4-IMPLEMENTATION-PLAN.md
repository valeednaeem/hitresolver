# HitResolver — Phase 4 Implementation Plan (proposed)

**Updated:** 2026-11-17 · **Phase:** 4 (architecture investigation — plan only, not started) · **Addendum:** 2026-11-17

---

## 1. Objective

Turn the approved Phase 4 direction (multi-user SaaS foundation) into an ordered, testable implementation sequence — starting from the already-delivered Phase 3 architecture.

## 2. Recommended Technology Decisions (pending owner choice) — revised by addendum

| Area | Investigation finding | **Recommended direction** |
|---|---|---|
| Authentication | No auth exists; stack Next.js 16 + TS + Vercel; owner wants minimal infra/cost, security-first, no social login initially. **Addendum:** Auth.js Credentials does not provide a complete email/password account system — custom lifecycle required; Better Auth evaluated as preferred self-hosted candidate pending final owner decision; Supabase Auth evaluated as managed candidate. | **Self-hosted open-source auth (Better Auth preferred candidate, pending final owner decision) + managed PostgreSQL; social deferred** |
| Database | `StorageAdapter` seam exists; `AppState` JSON shape stable. **Addendum:** one personal workspace per user containing one validated `AppState` JSONB snapshot (decisions contained within workspace document); normalized later if needed. | **PostgreSQL**, one-workspace-per-user with JSONB `AppState` snapshot; distinct DB host candidates: Neon vs Supabase |
| Auth sessions | —. **Addendum:** recommend revocable database sessions for Phase 4 initial (final owner decision pending); httpOnly/secure/sameSite cookies; rate limiting. | **Revocable database sessions (recommended) or JWT (final owner decision)** |
| Email (verification / recovery) | —. **Addendum:** separate transactional email provider; choose only after cost/deliverability review. | **Provider TBD (post-cost review)** |

Two credible options for the owner to choose from (full comparison in `AUTHENTICATION-DESIGN.md` §2):
- **Option A:** Auth.js + managed Postgres (self-hosted, larger custom lifecycle surface).
- **Option B:** Better Auth + PostgreSQL (self-hosted, built-in lifecycle) / Supabase Auth + Postgres (managed, coupled) — owner decision pending.

## 3. Implementation Sequence

### Slice 0 — Foundations (architecture only, this deliverable)
- Documentation consolidation (this file set).

### Slice 1 — Authentication
- Initialize chosen auth provider (Better Auth preferred candidate / Auth.js + custom lifecycle / Supabase Auth per final owner decision).
- Register / verify / login / logout / recover flows.
- Session provider; route protection via `src/proxy.ts` (Next.js 16 convention) for early checks/redirects + server-side session/authz in data layer.

### Slice 2 — Cloud persistence
- Add `CloudStorageAdapter` (and/or `HybridAdapter`) implementing `StorageAdapter`.
- Persist per-user workspace documents (owner-scoped; JSONB `AppState` snapshot per personal workspace).
- Keep localStorage as anonymous/local phase.

### Slice 3 — Ownership & API authorization
- Server-side identity from session; ownership enforcement on all decision endpoints.
- IDOR prevention; cross-user denial tests; rate limiting; audit logging.

### Slice 4 — Migration UX
- Anonymous → authenticated import flow (validate → confirm → push; no silent overwrite).
- Cross-device retrieval via cloud workspace.

### Slice 5 — Validation & gates
- Cross-user denial tests, auth flow tests, migration tests.
- Full suite + lint + build re-run.

## 4. Expected Files to Change (implementation phase)

| Area | Files (expected) |
|---|---|
| Auth | `src/app/api/auth/[...nextauth]/route.ts` (or equivalent), **`src/proxy.ts`** (Next.js 16), auth UI components, env |
| Storage | `src/storage/*`, `src/state/workspace.tsx`, `src/domain/*` (owner fields optional) |
| API / security | `src/app/api/decisions/*`, session helpers, rate limit |
| Docs | `USER-MANAGEMENT-ARCHITECTURE.md`, `AUTHENTICATION-DESIGN.md`, `DATABASE-DESIGN.md`, `DATA-OWNERSHIP-AND-SECURITY.md`, `LOCAL-TO-CLOUD-MIGRATION.md`, `PHASE-4-IMPLEMENTATION-PLAN.md`, status/decisions |

## 5. Acceptance Criteria (Phase 4 implementation)

- [ ] Registration/login/logout/recovery/verification work end-to-end.
- [ ] Authenticated user has isolated personal cloud workspace.
- [ ] Cross-user access denied (explicit tests).
- [ ] Local → cloud import flow preserves validated decisions, requires confirm, no silent overwrite.
- [ ] Engine untouched; validation untouched semantically; backup format retained.
- [ ] Full test suite / lint / build green; security checklist satisfied.

## 6. Cost & Hosting

- Phase 4 initial target: **≈ $0/month** (Vercel free + self-hosted auth OSS + free-tier DB). *Addendum (2026-11-17): estimate qualified — free tiers plausible but not guaranteed; Neon 1 GB storage, Supabase 500 MB (pausable, Pro $25/mo); transactional email, rate limiting, backups, monitoring, production usage add cost components. No paid service activation authorized.*
- Paid plans/post-MCA later (Phase 7 roadmap).

## 7. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Vendor lock-in (Clerk) | Chosen self-hosted path reduces this |
| Email deliverability for verification | Provider later; local dev fallback |
| Session strategy complexity | Start JWT, evolve to DB sessions if revocation needed |
| Migration correctness | Validate-before-accept reuse; explicit confirm; tests |

## 8. Out of Scope (Phase 4 implementation)

- Social login, teams, roles, subscriptions, collaboration, SaaS billing, real AI provider, deployment to production.
