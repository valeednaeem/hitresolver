/**
 * JSON backup (export/import) helpers — Phase 3.
 *
 * The backup envelope is the persisted `AppState` shape itself, stamped
 * with `schemaVersion` so future data-model changes can ship with a new
 * version while old backups remain readable (or clearly rejected).
 *
 * All parsing funnels through `validateAppState` — nothing is accepted on
 * JSON alone.
 */

import type { AppState } from "@/domain/types";
import { validateAppState } from "@/domain/validation";

export type BackupParseResult =
  | { ok: true; state: AppState }
  | { ok: false; errors: string[] };

/** Serialise the full application state as an exportable backup document. */
export function buildBackupPayload(state: AppState): string {
  return JSON.stringify(
    {
      schemaVersion: state.schemaVersion,
      activeDecisionId: state.activeDecisionId,
      decisions: state.decisions,
    },
    null,
    2,
  );
}

/**
 * Parse and validate a backup document. Never accepts anything that does
 * not pass the full `AppState` validation — malformed JSON, wrong schema
 * version, duplicate ids, unknown references and empty decision lists are
 * all rejected with concrete errors.
 */
export function parseBackup(text: string): BackupParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["The file is not valid JSON."] };
  }
  const result = validateAppState(parsed);
  if (!result.ok) {
    return { ok: false, errors: result.errors };
  }
  return { ok: true, state: result.value };
}

/**
 * Trigger a browser download for a text payload (used for JSON backup and
 * Markdown report export). Client-side only.
 */
export function downloadTextFile(
  filename: string,
  text: string,
  mime = "application/json",
): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
