# HitResolver — Database & Persistence Design

**Updated:** 2026-11-16 · **Stage:** Demo v0.1 (local-first)

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

```json
{
  "app": "hitresolver",
  "schemaVersion": 1,
  "exportedAt": "2026-11-16T…Z",
  "state": { "activeDecisionId": "…", "decisions": [ … ] }
}
```

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

## 5. Future: Cloud Persistence (v0.4 — designed, not built)

The seam already exists: `StorageAdapter`.

```
StorageAdapter
├── LocalStorageAdapter      ← v0.1 (current)
├── CloudStorageAdapter      ← v0.4
└── HybridAdapter            ← v0.4: local cache + server sync, offline-tolerant
```

**Design considerations to resolve before building (not now):**

| Topic | Direction |
|---|---|
| Store | Likely a document store — a `Decision` maps naturally to one document |
| Identity | Anonymous device id first; account linkage later (no PII until accounts exist) |
| Conflict policy | Last-write-wins with `updatedAt` for the demo; CRDT/OT only if real-time collaboration ships |
| Sync | Push on change, pull on focus; local remains authoritative while offline |
| Encryption | TLS in transit; at rest per provider norms |
| Retention | User-initiated export always available; deletion honored on request |
| Migrations | Same `schemaVersion` discipline as local |

**Do not build any of this for v0.1.** Recorded so the architecture is ready without premature infrastructure.

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
