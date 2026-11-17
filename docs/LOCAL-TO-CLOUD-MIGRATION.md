# HitResolver — Local → Cloud Migration Design

**Updated:** 2026-11-17 · **Phase:** 4 (architecture investigation — proposed, not implemented)

---

## 1. Principle

Once a user is authenticated, **the cloud store is the source of truth**. Local browser storage may act as a cache/temporary offline layer, but must never silently overwrite authoritative cloud data.

## 2. Migration Path (anonymous → authenticated)

1. Anonymous user works in localStorage-backed workspace (Phase 3 behaviour).
2. User registers / signs in → personal cloud workspace is provisioned (empty at launch).
3. Onboarding offers **explicit import** of the local anonymous workspace (via existing Phase 3 JSON backup / restore semantics) into the user's cloud workspace.
   - Import = validate → confirm → persist to cloud.
   - Never automatic: user action required; never silently overwrite existing cloud data.
4. After successful cloud write, local copy may be cleared (user-facing action) — or left; local is non-authoritative for authenticated users.
5. If the user already has cloud data, local anonymous data is **not** auto-merged/overwritten — user chooses import/replace/cancel.

### 2.1 Initial cloud data containment

In the initial cloud release, the user's personal cloud workspace holds one validated `AppState` JSONB snapshot; decisions are contained within that workspace document.

## 3. Backup / Export Compatibility

- Phase 3 backup format (canonical, implemented): `{ schemaVersion, activeDecisionId, decisions }` = bare `AppState`.
- Design doc `DATABASE-DESIGN.md` §4.1 sketched a wrapped format (`{ app, schemaVersion, exportedAt, state }`) — **superseded by the Phase 3 implementation**, which is authoritative. Cloud import/export must keep the implemented format.
- Future schema versions: bump `SCHEMA_VERSION`, keep migrations pure and tested, refuse newer versions.

## 4. Conflict / Sync Policy (Phase 4 baseline)

- Single-user personal workspace: last-write-wins by `updatedAt` for identical decision identity, or explicit replace-on-import.
- Multi-user/team sync deferred; architecture should not preclude it later.

## 5. Data Safety Summary

- Validate before accept; no partial writes.
- Explicit confirmation before destructive restore.
- Export always available.
- Cloud deletion honored on request.
