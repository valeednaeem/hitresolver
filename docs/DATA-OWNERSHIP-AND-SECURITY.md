# HitResolver — Data Ownership and Security Design

**Updated:** 2026-11-17 · **Phase:** 4 (architecture investigation — proposed, not implemented)

---

## 1. Ownership Model

```
Session (verified server-side user)
   └── Workspace (ownerUserId = user.id, personal)
         └── Decisions[] (each decision belongs to the workspace/user)
```

- The **owner identity is server-derived** from the authenticated session on every request. Client-supplied identifiers are treated as untrusted.
- Every persistence operation resolves a workspace through `(ownerUserId, workspaceId)` and verifies ownership before reading/writing.

## 2. Mandatory Security Requirements

1. **Never trust a client userId.** Identity comes from verified session (Auth.js server session / JWT verification).
2. Ownership on **every** operation: create, read, update, delete, export, restore.
3. Prevent IDOR / insecure direct object references: workspace and decision identifiers from URL params or request bodies must be ownership-checked server-side; cross-user access denied.
4. Validate all server-side input; decisions validated via existing `domain/validation` (`validateAppState`) before persistence.
5. Protect authentication sessions/credentials; rate limiting on auth-sensitive endpoints.
6. Avoid exposing secrets/private data in logs; audit logs store non-sensitive action metadata only.
7. Cross-user access denial explicitly tested (Phase 4 implementation tests).

## 3. Threat Register (Phase 4 additions)

| Threat | Mitigation |
|---|---|
| IDOR / cross-user decision access | Ownership-scoped queries + server-side ownership checks; denial tests |
| Credential stuffing / brute force | Rate limiting, generic errors, verification/recovery flows |
| Session hijacking | httpOnly/secure/sameSite cookies, short-lived sessions/JWT, rotation |
| Data exposure via API | Ownership checks, input validation, no client-supplied identity use |
| Silent overwrite / data loss | Explicit confirmations, validate-before-accept, atomic writes, backup export |
| Secrets leakage | Server env only (`AI_*`, DB creds), no `NEXT_PUBLIC_*` secrets, no logs of secrets |
| Cross-user data access via import | Restore scoped to the owning user's workspace only |

## 4. Audit & Logging

- Log owner-scoped actions (create/update/delete/export/restore) with user identifier and target type — **without** exposing decision content or PII beyond what the user already has.
- Errors returned to clients are generic + actionable; stack traces never leaked.

## 5. Phase 4 Security Exit Criteria

- [ ] Auth.js (or chosen provider) installed/configured — **pending owner decision**.
- [ ] Session-based identity verified server-side.
- [ ] All decision endpoints ownership-checked.
- [ ] Cross-user denial tested and green.
- [ ] Rate limiting present on auth endpoints.
- [ ] No secrets client-side; env handling rules followed.

## 6. Phase 4 Addendum — Session & Security Design Decisions

- **Session strategy:** revocable database sessions are recommended for the Phase 4 initial release (revocation on logout / account deletion), with JWT as an alternative; final owner decision pending. Identity is derived server-side per request.
- **Binding security requirements (addendum §4):** revocation/logout behaviour; secure HttpOnly SameSite cookie configuration; session expiration/renewal; password hashing (provider/implementation); password-reset token storage/expiry/single-use; rate limiting strategy & cost; CSRF/Origin protection where applicable; account status checks; safe authentication error messages and logging.
- **Ownership enforcement:** server-side data-access layer must enforce ownership on every read, create, update, delete, export, restore and account-deletion operation; client-supplied user identity is never trusted. Close to every database operation.
