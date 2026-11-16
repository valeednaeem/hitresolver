/**
 * LocalStorage-backed StorageAdapter.
 *
 * Hardening (addresses prototype defects W7, W8, W12):
 *  - every access is wrapped, so quota/private-mode failures surface as a
 *    typed result instead of throwing mid-edit;
 *  - a payload that fails validation is reported as `corrupt` and the raw
 *    string is preserved for recovery — it is never silently replaced;
 *  - an `activeDecisionId` that does not resolve is corrected rather than
 *    allowed to dangle.
 */

import { validateAppState } from "@/domain/validation";
import type { AppState } from "@/domain/types";
import { STORAGE_KEY } from "@/domain/types";
import {
  STORAGE_MESSAGES,
  type StorageAdapter,
  type StorageResult,
} from "./adapter";

function unavailable(): StorageResult<never> {
  return {
    ok: false,
    reason: "unavailable",
    message: STORAGE_MESSAGES.unavailable,
  };
}

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private readonly key: string = STORAGE_KEY) {}

  isAvailable(): boolean {
    try {
      const probe = `${this.key}:probe`;
      window.localStorage.setItem(probe, "1");
      window.localStorage.removeItem(probe);
      return true;
    } catch {
      return false;
    }
  }

  load(): StorageResult<AppState | null> {
    let raw: string | null;
    try {
      raw = window.localStorage.getItem(this.key);
    } catch {
      // Storage exists but is not readable (privacy mode, policy).
      return unavailable();
    }

    // No data yet is a normal, successful first run.
    if (raw === null) return { ok: true, value: null };

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Preserve the raw payload: the caller may offer recovery.
      return {
        ok: false,
        reason: "corrupt",
        message: STORAGE_MESSAGES.corrupt,
      };
    }

    // Repair *before* validating: a dangling activeDecisionId would fail
    // validation, and the repair would never get the chance to run.
    const repaired = preRepair(parsed);

    const result = validateAppState(repaired);
    if (!result.ok) {
      return {
        ok: false,
        reason: "corrupt",
        message: `${STORAGE_MESSAGES.corrupt} (${result.errors[0]})`,
      };
    }

    return { ok: true, value: result.value };
  }

  save(state: AppState): StorageResult<void> {
    const check = validateAppState(state);
    if (!check.ok) {
      return {
        ok: false,
        reason: "invalid",
        message: `${STORAGE_MESSAGES.invalid} (${check.errors[0]})`,
      };
    }
    try {
      window.localStorage.setItem(this.key, JSON.stringify(state));
      return { ok: true, value: undefined };
    } catch (error) {
      // Quota errors are reported as a DOMException in browsers, but some
      // environments shim them as plain Errors — match on the name so the
      // distinction survives either shape.
      const name =
        error && typeof error === "object" && "name" in error
          ? String((error as { name: unknown }).name)
          : "";
      const isQuota =
        name === "QuotaExceededError" ||
        name === "NS_ERROR_DOM_QUOTA_REACHED";
      return {
        ok: false,
        reason: isQuota ? "quota" : "unavailable",
        message: isQuota
          ? STORAGE_MESSAGES.quota
          : STORAGE_MESSAGES.unavailable,
      };
    }
  }

  clear(): StorageResult<void> {
    try {
      window.localStorage.removeItem(this.key);
      return { ok: true, value: undefined };
    } catch {
      return unavailable();
    }
  }

}

/**
 * Structural repair applied before validation.
 *
 * Corrects an `activeDecisionId` that no longer resolves (prototype
 * defect W12). It only ever touches that one field and only when the
 * shape is already recognisable — user content is never altered, and a
 * genuinely malformed payload is left to fail validation untouched.
 */
function preRepair(parsed: unknown): unknown {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return parsed;
  }
  const candidate = parsed as Record<string, unknown>;
  const { decisions, activeDecisionId } = candidate;
  if (!Array.isArray(decisions) || decisions.length === 0) return parsed;
  if (typeof activeDecisionId !== "string") return parsed;

  const ids = decisions
    .filter((d): d is Record<string, unknown> => typeof d === "object" && d !== null)
    .map((d) => d.id)
    .filter((id): id is string => typeof id === "string");

  if (ids.length === 0 || ids.includes(activeDecisionId)) return parsed;
  return { ...candidate, activeDecisionId: ids[0] };
}

/** The adapter used by the app. Exported as a factory so tests can swap it. */
export const localStorageAdapter = new LocalStorageAdapter();
