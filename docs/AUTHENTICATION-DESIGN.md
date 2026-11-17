# HitResolver — Authentication Design

**Updated:** 2026-11-17 · **Phase:** 4 (architecture investigation — proposed, not implemented)

---

## 1. Scope (Phase 4 initial)

Per owner direction, Phase 4 initial authentication scope:

1. Registration (email + password).
2. Login / logout.
3. Email verification.
4. Account recovery (forgot password / reset).
5. Session management (login, refresh, logout, expiry).
6. User profile (minimal: display name, email; no complex roles yet).
7. Personal workspace creation tied to the account.
8. Account management endpoints: data export, account deletion (GDPR-style), session management hooks.

**Explicitly deferred:** social login (Phase 4+ later), organizations/teams, roles (post-SaaS).

## 2. Options Evaluated

| Option | What it is | Next.js 16 fit | Security posture | Pricing / cost | Ops complexity | Migration risk |
|---|---|---|---|---|---|---|
| **A — Auth.js (`@auth/core`) + managed PostgreSQL** | Open-source auth framework; self-hostable; DB-backed sessions or JWT; email/password + built-in recovery/verification hooks | Native; actively maintained; Next 16 support present/expected | High — open source, auditable; rate limiting available; battle-tested | Self-hosted: free (code); DB on free tier (Neon/Supabase) → **≈ $0 at launch** | Low–medium (self-host wiring) | Low — no migration from nothing; schema new |
| **B — Clerk** | Hosted auth SaaS | Excellent (first-class) | High | Free tier 10k MAU; paid thereafter → **cost risk later** | Very low | Medium — SDK-level migration from localStorage-era anonymous model is straightforward but vendor-coupled |
| **C — Supabase Auth + Supabase Postgres | Hosted auth+DB | Good | High | Free tier 500MB DB + auth | Low | Medium-high — couples auth provider to DB vendor |
| **D — Firebase Auth + Firestore | Hosted auth+DB | Moderate (not Next-native) | Medium | Free Spark tier | Low | Medium |

### 2.1 Comparison

- **Security:** all four are defensible; A gives self-hosting control and avoids per-user SaaS spend at launch while retaining battle-tested behaviour (credential hashing, verification, recovery). **A rated best for this project's stated constraints** (minimal recurring cost, security-first owner, avoid premature complexity).
- **Cost:** A ≈ $0 at launch (Auth.js OSS + Neon/Supabase free Postgres + Vercel free tier); B becomes paid beyond free tier; C couples services; D least aligned with stack.
- **Operational complexity:** B lowest, C low, A medium, D low. Phase 4 initial wants "not overcomplicate first implementation" → B is tempting, but owner's constraint ("avoid unnecessary infrastructure and recurring costs, but not at the expense of data security") plus future multi-workspace/team plans favor **A with managed Postgres**.
- **Migration risk:** A lowest for new build-out.

## 3. Recommendation (Phase 4 initial)

**Primary recommendation: Auth.js (`@auth/core`) with email/password, backed by managed PostgreSQL (Neon or Supabase Postgres), deployed on Vercel.**

- Auth provider: **Auth.js** with the database/email strategy (or JWT strategy for simplicity at launch, moving to database sessions later if revocation is needed).
- Credentials: email + password (bcrypt via Auth.js); email verification and password recovery via Auth.js flows; custom email delivery can be wired later without schema change.
- Sessions: session cookie (httpOnly, secure, sameSite) — JWT or database-backed; server derives identity per request.
- Rate limiting: Auth.js built-in rate limiting (or Vercel/Upstash-based) for auth endpoints.
- Social login: deferred — additive provider config later, no schema change.
- No paid service required at launch (self-hosted Auth.js OSS + free-tier DB).

## 4. Auth Flows

1. **Sign-up:** email/password → verification → session. Personal workspace created on verified account (or workspace created at signup, activated on verification — decision to finalize in implementation plan).
2. **Login / logout / session refresh:** standard Auth.js flows; logout revokes session.
3. **Recovery:** forgot password → reset → set new password.
4. **Profile:** minimal fields.

## 5. Security Requirements (binding)

- Never trust client-supplied user identity — derive from verified session.
- Ownership enforced server-side on every read/write/export/restore.
- Prevent IDOR (decision/workspace IDs from URL/body must be ownership-checked).
- Validate all server input (reuse `domain/validation` semantics for decision payloads).
- Protect sessions & credentials; rate limit sensitive endpoints.
- No secrets in logs; audit logs must not expose sensitive data.
- Cross-user access denial explicitly tested.

## 6. Deferred / out of initial scope

- Social login — deferred.
- Organizations/teams/roles — deferred (post-SaaS).
- Multi-workspace UI — architecture must allow; initial = one personal workspace.

## 7. Open questions for owner review

1. Email provider for verification/reset (built-in mock/local dev vs real provider later).
2. Database: Neon vs Supabase Postgres (both PostgreSQL-compatible).
3. Session strategy: JWT vs database sessions at launch.
4. Whether personal workspace is auto-created at signup or on first decision.
