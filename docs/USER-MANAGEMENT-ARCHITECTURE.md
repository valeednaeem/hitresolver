# HitResolver — User Management Architecture

**Updated:** 2026-11-17 · **Phase:** 4 (architecture investigation — proposed, not implemented)

> **Status:** Investigation deliverable. No authentication or database code has been written. This document is part of the Phase 4 architecture proposal authorized by the owner on 2026-11-17.

---

## 1. Purpose

Define the target user-management architecture for HitResolver as it evolves from a browser-only decision demo into a private multi-user SaaS product.

## 2. Current State (Phase 3, accepted 2026-11-17)

- Every browser session owns an **anonymous workspace** persisted via `localStorage` behind the `StorageAdapter`.
- Workspace shape: `{ schemaVersion, activeDecisionId, decisions }` (`AppState`) — validated by `validateAppState`.
- No accounts, no identity, no server-side data. Cross-device access is impossible by design (accepted Phase 3 limitation).
- Phase 3 backup envelope = bare `AppState` (`{ schemaVersion, activeDecisionId, decisions }`).

## 3. Target State

```
User (auth identity)
  └── Workspace (personal, per user)
        └── Decisions (user-owned)
```

- **User:** verified identity (email + credential or future social identity). Holds an auth session.
- **Workspace:** a user's private container for decisions. **Phase 4 initial scope: one personal workspace per user.** Multi-workspace support is designed for but not implemented.
- **Decision:** an independently evaluable decision record, owned by a workspace, evaluated by the pure engine.

### 3.1 Ownership model

- Every workspace record carries an **owner identity** derived from the **verified server-side session** — never from client input.
- Ownership is enforced on every operation: create, read, update, delete, export, restore.
- Users can only ever touch workspaces they own.

### 3.2 Privacy posture

- Private by default. No sharing features exist yet (Phase 6+ / SaaS monetization roadmap).
- Data at rest encrypted per provider defaults; TLS in transit; secrets server-side only.

---

## 4. Architectural Principles Going Forward

1. **Private by default.** Unauthenticated/anonymous use remains local-only. Authenticated users get cloud-backed private workspaces.
2. **Cloud as source of truth.** Once a user is authenticated, the server-side store is authoritative; local browser storage may cache but must not silently overwrite cloud data.
3. **AI as assistant, not owner.** AI suggestions operate on user-owned data but never override human decisions (Phase 5 continues this).
4. **Engine stays pure.** Auth/DB layers never import or alter engine calculations.

---

## 5. Phase Mapping

| Phase | Scope | Relationship to user management |
|---|---|---|
| 2 | Decision engine | Unchanged — pure functions, no auth awareness needed |
| 3 | Local persistence & export | Anonymous workspaces; backup/restore validated client-side |
| **4 (proposed)** | **Identity, user management & cloud persistence** | **Accounts, workspaces, ownership, cloud storage, migration** |
| 5 | AI assistant | Runs against user-owned decisions (server-side boundary) |
| 6 | QA, security & product refinement | Auth-adjacent security tests, cross-user denial, migration QA |
| 7 | Demo release & feedback | Multi-user readiness |

---

## 6. Non-Functional Requirements for Phase 4

- Cross-device continuity for authenticated users.
- Data integrity: validated writes, atomic restores, no silent overwrite.
- Security: mandatory ownership enforcement (see `DATA-OWNERSHIP-AND-SECURITY.md`).
- Cost: no recurring cost burden at launch (free-tier targets; paid plans later).
- Performance: workspace load must not block the UI; sync latency acceptable at demo scale.
