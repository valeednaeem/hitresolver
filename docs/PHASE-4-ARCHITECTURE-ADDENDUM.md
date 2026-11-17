# HitResolver — Phase 4 Architecture Addendum

**Updated:** 2026-11-17 · **Phase:** 4 (architecture addendum — authorized by owner, implementation NOT authorized)

> **Status:** Addendum delivered from owner review of the Phase 4 architecture investigation report. Implementation remains blocked pending owner review and explicit authorization.

---

## 1. Purpose and scope

This addendum records the corrections and focused decisions from the owner’s Phase 4 architecture review, before implementation authorization.

Owner decisions recorded here:

1. Phase 4 architecture direction — **accepted in principle**.
2. Focused architecture addendum — **authorized**.
3. Phase 4 implementation — **not authorized**.
4. Phase 5 AI — **not authorized**.

## 2. Auth.js correction and re-evaluation

### 2.1 Finding

The Phase 4 investigation report treated **Auth.js with the Credentials provider** as providing a reasonably complete email/password account system.

Owner review corrected this: **Auth.js does not by itself provide a complete email/password account system.** Its Credentials provider delegates account lifecycle concerns — credential persistence, password hashing, registration persistence, email verification, password reset, rate limiting — to the implementer. The result is substantially more custom security-sensitive code than the original report implied.

### 2.2 Re-evaluation (three candidate approaches)

Re-evaluate against the actual Phase 4 requirements:

| Requirement | Auth.js (Credentials + custom lifecycle) | Better Auth (+ PostgreSQL) | Supabase Auth (+ PostgreSQL) |
|---|---|---|---|
| Next.js 16.4.6 App Router compatibility | Expected / well-supported path | Supported | Supported |
| Registration & email verification | Custom (lifecycle delegated) | Built-in flows | Built-in |
| Email/password login & logout | Credentials provider + custom | Built-in | Built-in |
| Password recovery & reset | Custom | Built-in | Built-in |
| Secure, revocable sessions | Custom/integrable | Built-in | Built-in |
| DB integration & migrations | Custom | Native PostgreSQL | Managed Postgres |
| Rate limiting / abuse protection | Custom or external | Built-in | Built-in |
| Account deletion & data export | Custom | Built-in hooks | Built-in |
| Vercel deployment compatibility | Yes (self-hosted) | Yes | Yes |
| Maintenance burden / security responsibility / vendor lock-in | High (custom surface) | Low–medium (OSS, managed hosting) | Low (managed) |
| Free-tier limits & likely future costs | OSS + self-hosted DB | OSS + self-hosted DB | Managed free tier |

### 2.3 Addendum decision (pending final owner choice)

- The **Auth.js Credentials path requires a substantial custom implementation** of the password lifecycle; it should not be assumed to be lighter than Better Auth for the owner’s completeness requirements.
- **Better Auth** deserves explicit evaluation as the preferred self-hosted option because it natively covers the required account lifecycle surface (email/password, verification, reset, sessions, rate limiting, DB) while keeping open-source control.
- **Supabase Auth** remains a credible managed alternative that bundles database + auth, at the cost of tighter coupling.

No final provider choice is recorded unilaterally here; the addendum records the correction and the decision criteria.

## 3. Next.js 16 architecture correction

- Next.js 16 convention: **`src/proxy.ts`** replaces the older **`src/middleware.ts`** convention.
- Next.js documentation states Proxy should **not** be treated as the application’s full authorization or session-management layer.
- Target architecture:
  - `src/proxy.ts` — suitable early request checks / redirects (e.g., auth-gated route shaping where appropriate).
  - Server-side authentication / session check in the **data-access layer**.
  - Ownership authorization **close to every database operation**.
  - No reliance on hidden UI controls or Proxy redirects for protection of private data.

## 4. Database model decision

- Initial cloud release lean: **one personal workspace per user containing one validated `AppState` JSONB snapshot**.
- Explicit statement: **decisions are contained within the workspace document — not stored as separate child decision records** in the initial model.
- Required considerations (owner):
  - Atomic updates / concurrency handling for workspace snapshots.
  - Workspace versioning or optimistic concurrency.
  - Maximum acceptable workspace size.
  - How decision deletion / update works inside the snapshot.
  - How the model may later evolve into separate decision records without data loss.
- If independent decision queries / sharing / collaboration are needed soon, normalized decision records may be more appropriate — choice must be explicit, not ambiguous.

## 5. Session and security design (addendum)

- Specify session strategy: revocable database sessions vs JWT — to be finalized in the implementation plan; security requirements (revocation, cookie config, expiry, password hashing, reset-token single-use/expiry, rate limiting, CSRF/Origin, account status, error handling, logging) are binding for Phase 4.

## 6. Revised cost comparison

- Free-tier candidates: Neon (1 GB storage/project); Supabase (500 MB DB, may pause after inactivity, Pro from $25/month).
- Additional Phase-4 cost components: transactional email, rate limiting, backups, monitoring, production usage.
- No paid service activation authorized.

## 7. Cross-reference updates

- Updated/created in this addendum cycle: `USER-MANAGEMENT-ARCHITECTURE.md`, `AUTHENTICATION-DESIGN.md`, `DATABASE-DESIGN.md`, `DATA-OWNERSHIP-AND-SECURITY.md`, `LOCAL-TO-CLOUD-MIGRATION.md`, `PHASE-4-IMPLEMENTATION-PLAN.md`, `PROJECT-STATUS.md`, `DECISIONS-LOG.md`, and this file.

## 8. Remaining owner decisions (to be resolved before implementation)

1. Final authentication approach: Auth.js + completed custom lifecycle, Better Auth + PostgreSQL, or Supabase Auth + PostgreSQL — and provider selection.
2. Database host: Neon vs Supabase PostgreSQL.
3. Transactional email provider (after cost/deliverability review).
4. Session strategy finalization (revocable DB sessions vs JWT).
5. Personal workspace provisioning timing relative to email verification.
6. JSONB snapshot vs normalized decision records — owner leaning JSONB for first release; final confirmation.

## 9. Authorization boundary reminder

This addendum is **architecture investigation only**:

- No application source code changes.
- No dependency installs/updates.
- No database infrastructure/provider accounts.
- No env vars / Vercel / email config.
- No deploys, implementation changes, or Phase 5 AI work.

Documentation-only changes are permitted and were made. Stop here pending owner review and explicit authorization.
