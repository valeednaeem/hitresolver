# HitResolver — Authentication Design

**Updated:** 2026-11-17 · **Phase:** 4 (architecture investigation — proposed, not implemented) · **Addendum:** 2026-11-17

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
| **A — Auth.js (`@auth/core`) + custom email/password lifecycle** | Open-source auth framework; Credentials provider delegates persistence/lifecycle to implementer | Native; self-hostable | High — open source, auditable; requires custom security-sensitive code (credential persistence, hashing, verification, reset, rate limiting) | Self-hosted: free (code); DB on free tier → **≈ $0 at launch** | Low–medium (self-host wiring) | Low — new build-out |
| **B — Better Auth (`@better-auth/*`) + PostgreSQL** | Open-source auth framework with native email/password, verification, reset, sessions, rate limiting, DB integration | Supported | High — open source; more complete out-of-box account lifecycle | OSS + self-hosted DB → **≈ $0 at launch** | Low–medium | Low |
| **C — Supabase Auth + Supabase PostgreSQL** | Hosted auth+DB | Good | High | Free tier 500 MB DB + auth; Pro $25/mo → cost risk later | Low | Medium-high — couples auth provider to DB vendor |
| **D — Firebase Auth + Firestore | Hosted auth+DB | Moderate (not Next-native) | Medium | Free Spark tier | Low | Medium |

### 2.1 Comparison

- **Auth.js:** the **Credentials provider does not persist credential users or provide the complete password lifecycle** — registration persistence, password hashing, email verification, password reset and rate limiting must be implemented separately. This materially changes the engineering cost of the recommended path: a substantial custom security-sensitive implementation surface.
- **Better Auth:** evaluated as the stronger self-hosted candidate for the owner’s completeness requirements (built-in lifecycle coverage), with PostgreSQL integration native.
- **Supabase Auth:** evaluated as the managed candidate; couples database and auth.
- **Decision criteria (owner):** Next.js 16.4.6 App Router compatibility · registration/email verification · login/logout · recovery/reset · revocable sessions · DB integration/migrations · rate limiting/abuse · account deletion & export · Vercel compatibility · maintenance burden/security responsibility/vendor lock-in · free-tier limits & future costs.

### 2.2 Comparison — built-in vs custom implementation surface

| Function | Auth.js | Better Auth | Supabase Auth |
|---|---|---|---|
| Email/password login | Credentials (partial lifecycle) | Built-in | Built-in |
| Registration | Custom | Built-in | Built-in |
| Email verification | Custom | Built-in | Built-in |
| Password reset | Custom | Built-in | Built-in |
| Sessions (revocable) | Custom/integrable | Built-in | Built-in |
| Rate limiting | Custom/external | Built-in | Built-in |
| Account deletion / export | Custom | Built-in hooks | Built-in |

### 2.3 Addendum decision (pending final owner choice)

- Auth.js alone does **not** satisfy the “complete email/password account system” bar without custom lifecycle implementation.
- Better Auth is explicitly evaluated as the likely preferred self-hosted route for built-in lifecycle coverage.
- Supabase Auth remains a credible managed route.
- **Final approach pending owner decision** before implementation.

### 2.4 Addendum outcomes

- Auth.js alone does **not** provide a complete email/password account system; the Credentials provider delegates the password lifecycle to the implementer.
- The Phase 4 initial recommendation is re-anchored: a self-hosted open-source auth framework with a complete account lifecycle (Better Auth preferred candidate pending final owner decision) + managed PostgreSQL; Auth.js + custom lifecycle retained as a viable but costlier alternative.

## 3. Recommendation (Phase 4 initial, revised by addendum)

**Direction: self-hosted open-source auth (Better Auth preferred candidate, pending final owner decision) with managed PostgreSQL, deployed on Vercel.**

- Auth provider: **Better Auth** preferred for built-in account lifecycle coverage (email/password, verification, reset, sessions, rate limiting, PostgreSQL); Auth.js with custom lifecycle remains a viable path (larger custom security-sensitive implementation surface).
- Credentials: email + password via chosen provider; email verification and password recovery via chosen provider flows; custom email delivery can be wired later without schema change.
- Sessions: session cookie (httpOnly, secure, sameSite) — revocable database sessions or JWT; server derives identity per request.
- Rate limiting: provider built-in or Vercel/Upstash-based for auth endpoints.
- Social login: deferred — additive provider config later, no schema change.
- No paid service required at launch (self-hosted auth OSS + free-tier DB).

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
