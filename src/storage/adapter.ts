/**
 * Storage abstraction.
 *
 * The application never touches `localStorage` directly. It goes through
 * `StorageAdapter`, so swapping in a cloud-backed implementation later
 * (docs/DATABASE-DESIGN.md §5) requires no UI changes.
 *
 * Design rules:
 *  - Every operation returns a result; nothing throws to the caller.
 *  - Failures are explicit and typed, never silent.
 *  - A corrupt payload is reported as `corrupt`, never silently replaced
 *    with sample data (prototype defect W8).
 */

import type { AppState, StorageFailure } from "@/domain/types";

export type StorageResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: StorageFailure; message: string };

export interface StorageAdapter {
  /** Read the persisted state, or report why it could not be read. */
  load(): StorageResult<AppState | null>;
  /** Persist the full state. */
  save(state: AppState): StorageResult<void>;
  /** Remove all HitResolver data. */
  clear(): StorageResult<void>;
  /** Whether this adapter can be used in the current environment. */
  isAvailable(): boolean;
}

/** Human-readable messages for each failure reason. */
export const STORAGE_MESSAGES: Record<StorageFailure, string> = {
  unavailable:
    "Browser storage is unavailable. Your changes are kept in this tab only and will be lost when you close it.",
  quota:
    "Browser storage is full, so this change could not be saved. Export a JSON backup now to avoid losing work.",
  corrupt:
    "Saved data could not be read. Nothing was overwritten — export a backup if you can, then restore a valid file.",
  invalid: "That data is not valid and was not saved.",
};
