# HitResolver — Database & Persistence Design

**Updated:** 2026-11-17 · **Stage:** Phase 3 complete (local-first) → Phase 4 design (cloud, proposed, not built)

> There is **no database** in the demo, by design. The brief forbids introducing one "unless it provides real value at the current stage." This document records what exists instead, and the design that the future cloud store will follow.

---

## 1. Current: Browser localStorage

**Adapter:** `StorageAdapter` interface → `LocalStorageAdapter`

| Property | Value |
|---|---|
| Key namespace | `hitresolver:v1:*` |
| Root key | `hitresolver:v1:state` |
| Format | JSON, UTF-8 |
| Scope | Per browser, per origin — **not** synced, **not** cross-device |
| Durability | Survives refresh and browser restart; **lost** if site data is cleared |
| Backed up | Only if the user exports JSON |

### 1.1 Why localStorage is correct for v0.1

- Zero infrastructure, zero cost, zero security surface (no server, no accounts, no PII at rest on a server)
- Instant reads/writes — no loading spinners for a single-user demo
- Works offline after first load
- The brief explicitly targets a local-first demo

### 1.2 Honest limitations (stated in the UI, not just here)

1. Data lives **only in this browser** — clearing site data deletes it permanently.
2. Not available on another device or browser profile.
3. No automatic backup. **The user must export JSON.**
4. Private/incognito windows may reject writes.
5. Browser storage quotas apply (~5 MB, varies).

The UI must surface these plainly near the data, not hide them in documentation.

---

## 2. Logical Data Model

```
AppState
├── schemaVersion: number            // migration hook
├── activeDecisionId: string
└── decisions: Decision[]
    └── Decision
        ├── id: string               // crypto.randomUUID()
        ├── title: string
        ├── description: string
        ├── createdAt: ISO-8601
        ├── updatedAt: ISO-8601
        ├── prosCons
        │   ├── pros:  WeightedItem[]   { id, text, weight 1–10 }
        │   └── cons:  WeightedItem[]   { id, text, weight 1–10 }
        ├── comparison
        │   ├── options:   { id, name }[]
        │   └── criteria: Criterion[]
        │       ├── id, name, weight 1–10
        │       ├── scores: Record<optionId, 1–10>   // ABSENT KEY = missing cell
        │       └── notes:  Record<optionId, string>
        └── swot
            ├── strengths:     SwotItem[]  { id, text, impact }
            ├── weaknesses:    SwotItem[]
            ├── opportunities: SwotItem[]
            └── threats:       SwotItem[]
```

**Invariants** (enforced by `domain/` validation on every load and save):

| # | Invariant |
|---|---|
| I1 | `activeDecisionId` references an existing decision |
| I2 | Every `Criterion.scores` key references an existing option (orphans removed) |
| I3 | Every `Criterion.notes` key references an existing option |
| I4 | Weights are integers 1–10 |
| I5 | Scores are integers 1–10 **or the key is absent** (never 0, never out of range) |
| I6 | `impact` ∈ {High, Medium, Low} |
| I7 | IDs are unique within a decision |
| I8 | `updatedAt >= createdAt` |
| I9 | All strings are plain text (no HTML is ever stored) |

### 2.1 Modelling decision: missing score = absent key

The prototype stored a *displayed* 5 but *computed* a 0 for missing cells (defect **W2**). Here, an absent key means **not yet scored** — the engine reports it as missing, the UI marks the cell incomplete, and nothing is invented.

---

## 3. Schema Versioning & Migration

```ts
const SCHEMA_VERSION = 1;
```

- Every persisted root carries `schemaVersion`.
- On load: if `version < SCHEMA_VERSION`, run forward migrations in order, then save.
- If `version > SCHEMA_VERSION` (data from a newer app): **refuse to load**, tell the user, and preserve the raw data — never guess at a future format.
- Migrations are pure functions `state_vN → state_vN+1`, each unit-tested.

Nothing is migrated yet — v1 is the first version.

---

## 4. Import / Export Formats

### 4.1 JSON backup (full state)

**Implemented Phase 3 format (authoritative):**

```json
{
  "schemaVersion": 1,
  "activeDecisionId": "…",
  "decisions": [ … ]
}
```

> Note: an earlier design draft sketched a wrapped envelope (`{ "app", "schemaVersion", "exportedAt", "state" }`). The Phase 3 implementation standardised on the bare `AppState` envelope above; it is authoritative and must remain supported.

**Import rules (non-negotiable):**
1. Parse; on failure → clear error, **no state change**
2. Validate `app` and `schemaVersion` markers
3. Validate full schema; on failure → list what is wrong, **no state change**
4. **Never silently overwrite** — show a preview (decision count, titles) and require an explicit choice:
   - **Replace all** (with a second confirmation)
   - **Add as new decisions**
   - **Cancel**
5. On success → save atomically, then report what happened

### 4.2 Markdown report

Generated from the engine's own outputs (never re-implemented in the export path). Includes: title/context, Pros & Cons with weights and verdict, **the full Verdict Dashboard** (fixing defect W22), ranked matrix with breakdown, SWOT with impact levels, and completeness/gap analysis.

---

## 5. Cloud Persistence (Phase 4 — designed, not built)

The `StorageAdapter` seam already anticipates this:

```
StorageAdapter
├── LocalStorageAdapter      ← v0.1 (current)
├── CloudStorageAdapter      ← Phase 4 (proposed)
└── HybridAdapter            ← Phase 4+ (local cache + server sync, offline-tolerant)
```

### 5.1 Proposed Phase 4 cloud store

- **Store:** managed PostgreSQL (recommended: Neon or Supabase Postgres) — document-shaped JSONB for workspace payloads is a pragmatic fit for the current `AppState` shape, with normalized tables available later for multi-workspace/team use.

- **Proposed tables (initial):**

| Table | Key fields | Purpose |
|---|---|---|
| `users` | `id`, `email`, `name`, `created_at` | Auth identity |
| `workspaces` | `id`, `owner_id`, `name`, `data JSONB`, `created_at`, `updated_at` | One personal workspace per user at launch; extensible to many |
| `decisions` | (optional normalized child table) | Later-phase multi-workspace support |

- **Workspace payload:** reuse `AppState` (`{ schemaVersion, activeDecisionId, decisions }`) inside `workspaces.data` JSONB → single migration/validation path, preserves Phase 3 semantics.

### 5.2 Design decisions

| Topic | Proposed direction |
|---|---|
| Identity → workspace link | `workspaces.owner_id → users.id` (server-derived ownership) |
| Sync | Cloud authoritative for authenticated users; local cache optional (Hybrid later) |
| Conflict policy | Last-write-wins by `updatedAt` (single-user scope); explicit import for migrations |
| Encryption | TLS in transit; provider-managed at rest |
| Retention | User-initiated export; deletion honored |

### 5.3 Migration from localStorage

- Anonymous local workspace → explicit import into the user's cloud workspace (validate → confirm → persist; no silent overwrite). Details in `LOCAL-TO-CLOUD-MIGRATION.md`.

### 5.4 Phase 4 addendum — JSONB workspace snapshot decision

Owner decision (Phase 4 architecture addendum, 2026-11-17): for the **first cloud release**, the initial data model is:

- **One personal workspace per user**, containing **one validated `AppState` JSONB snapshot**.

- **Decisions are contained within the workspace document — not stored as separate child decision records** in the initial model. Rationale: preserves the existing state and backup semantics, avoids an unnecessary rewrite of the decision engine.

- Required considerations (owner) that must be addressed during implementation design:
  - Atomic updates and concurrent edits on workspace snapshots.
  - Workspace versioning or optimistic concurrency.
  - Maximum acceptable workspace size.
  - How individual decision deletion and updates work inside the snapshot.
  - How the model may later evolve into separate decision records without data loss.

- If the product later needs independent decision queries, sharing, or collaboration, a normalized decision-record model may be more appropriate; the choice must be explicit, not ambiguous.

### 5.5 Database hosts — kept distinct

- **Supabase:** PostgreSQL + managed authentication bundled; free tier 500 MB DB + auth (may pause after inactivity; Pro from $25/month).
- **Neon:** managed PostgreSQL kept independent of the authentication choice; free tier 1 GB storage/project.

These are treated as **distinct candidates**, not interchangeable database hosts.

---

## 6. Data Safety Summary

| Threat | Mitigation |
|---|---|
| Storage quota / private mode | `save()` try/catch; visible non-destructive error |
| Corrupt stored state | Validated on load; raw data **preserved for recovery**, never silently replaced |
| Bad import file | Full validation; atomic; existing data untouched on failure |
| Accidental overwrite | Explicit confirm on restore; confirm on delete |
| Accidental data loss | Debounced autosave + persistent export prompt |
| Orphaned references | Invariants I2/I3 enforced on every load |
| Browser data cleared | Honest UI copy + export nag (unavoidable — documented) |
