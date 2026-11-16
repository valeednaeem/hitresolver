/**
 * Input validation for HitResolver.
 *
 * Philosophy (see docs/DECISION-ENGINE-SPECIFICATION.md §0.1):
 * **reject, do not silently clamp.** The prototype clamped out-of-range
 * values, which produced numbers the user could not explain. We surface
 * the allowed range instead.
 *
 * Every function here is pure and total: it never throws, never mutates
 * its input, and always returns a `ValidationResult`.
 */

import {
  IMPACT_LEVELS,
  RANGES,
  SCHEMA_VERSION,
  SWOT_QUADRANTS,
  type AppState,
  type Criterion,
  type Decision,
  type Impact,
} from "./types";

/* ------------------------------------------------------------------ */
/* Result type                                                         */
/* ------------------------------------------------------------------ */

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

const pass = <T>(value: T): ValidationResult<T> => ({ ok: true, value });
const fail = (errors: string[]): ValidationResult<never> => ({
  ok: false,
  errors,
});

/** Convenience: collect every failure rather than stopping at the first. */
function collect(
  results: ValidationResult<unknown>[],
): ValidationResult<void> {
  const errors = results.flatMap((r) => (r.ok ? [] : r.errors));
  return errors.length ? fail(errors) : pass(undefined);
}

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

/**
 * Round half away from zero, then confirm the value is a finite number.
 * Used for weights and scores so `3.6 → 4` and `3.4 → 3`.
 */
function coerceInt(raw: unknown): number | null {
  const n = typeof raw === "string" ? Number(raw.trim()) : raw;
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return n < 0 ? -Math.round(-n) : Math.round(n);
}

/**
 * Validate a weight or score against an inclusive integer range.
 * Rejects `NaN`, `±Infinity`, non-numerics, and out-of-range values.
 */
export function validateRange(
  raw: unknown,
  range: { min: number; max: number },
  label: string,
): ValidationResult<number> {
  const n = coerceInt(raw);
  if (n === null) {
    return fail([`${label} must be a number.`]);
  }
  if (n < range.min || n > range.max) {
    return fail([
      `${label} must be between ${range.min} and ${range.max} (received ${n}).`,
    ]);
  }
  return pass(n);
}

/** Validate a criterion or pros/cons impact weight (1–10). */
export function validateWeight(
  raw: unknown,
  label = "Weight",
): ValidationResult<number> {
  return validateRange(raw, RANGES.weight, label);
}

/** Validate a matrix cell score (1–10). */
export function validateScore(
  raw: unknown,
  label = "Score",
): ValidationResult<number> {
  return validateRange(raw, RANGES.score, label);
}

/** Validate free text with a maximum length. Empty is rejected by default. */
export function validateText(
  raw: unknown,
  options: { label: string; min?: number; max: number; allowEmpty?: boolean },
): ValidationResult<string> {
  const { label, max, allowEmpty = false } = options;
  const min = options.min ?? (allowEmpty ? 0 : 1);

  if (typeof raw !== "string") {
    return fail([`${label} must be text.`]);
  }
  const value = raw.trim();
  if (value.length < min) {
    return fail([
      allowEmpty && value.length === 0
        ? `${label} is required.`
        : `${label} must be at least ${min} character${
            min === 1 ? "" : "s"
          }.`,
    ]);
  }
  if (value.length > max) {
    return fail([`${label} must be ${max} characters or fewer.`]);
  }
  return pass(value);
}

/** Validate a SWOT impact level. */
export function validateImpact(
  raw: unknown,
): ValidationResult<Impact> {
  if (typeof raw !== "string" || !IMPACT_LEVELS.includes(raw as Impact)) {
    return fail([
      `Impact must be one of: ${IMPACT_LEVELS.join(", ")}.`,
    ]);
  }
  return pass(raw as Impact);
}

/** Validate an id: non-empty string. */
export function validateId(raw: unknown, label = "Id"): ValidationResult<string> {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return fail([`${label} is required.`]);
  }
  return pass(raw);
}

/* ------------------------------------------------------------------ */
/* Shape validation — used when loading or importing persisted data     */
/* ------------------------------------------------------------------ */

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateWeightedItem(
  raw: unknown,
  path: string,
): ValidationResult<void> {
  if (!isPlainObject(raw)) return fail([`${path} must be an object.`]);
  return collect([
    validateId(raw.id, `${path}.id`),
    validateText(raw.text, { label: `${path}.text`, max: RANGES.itemText.max }),
    validateWeight(raw.weight, `${path}.weight`),
  ]);
}

function validateSwotItem(
  raw: unknown,
  path: string,
): ValidationResult<void> {
  if (!isPlainObject(raw)) return fail([`${path} must be an object.`]);
  return collect([
    validateId(raw.id, `${path}.id`),
    validateText(raw.text, { label: `${path}.text`, max: RANGES.itemText.max }),
    validateImpact(raw.impact),
  ]);
}

function validateCriterion(
  raw: unknown,
  path: string,
  knownOptionIds: Set<string>,
): ValidationResult<void> {
  if (!isPlainObject(raw)) return fail([`${path} must be an object.`]);

  const base = collect([
    validateId(raw.id, `${path}.id`),
    validateText(raw.name, {
      label: `${path}.name`,
      max: RANGES.criterionName.max,
    }),
    validateWeight(raw.weight, `${path}.weight`),
  ]);
  if (!base.ok) return base;

  // scores / notes are maps keyed by option id.
  if (!isPlainObject(raw.scores)) {
    return fail([`${path}.scores must be an object.`]);
  }
  if (raw.notes !== undefined && !isPlainObject(raw.notes)) {
    return fail([`${path}.notes must be an object.`]);
  }

  const errors: string[] = [];
  for (const [optionId, score] of Object.entries(raw.scores)) {
    if (!knownOptionIds.has(optionId)) {
      errors.push(
        `${path}.scores references unknown option "${optionId}".`,
      );
      continue;
    }
    const result = validateScore(score, `${path}.scores["${optionId}"]`);
    if (!result.ok) errors.push(...result.errors);
  }
  for (const [optionId, note] of Object.entries(
    (raw.notes as Record<string, unknown>) ?? {},
  )) {
    if (!knownOptionIds.has(optionId)) {
      errors.push(`${path}.notes references unknown option "${optionId}".`);
      continue;
    }
    const result = validateText(note, {
      label: `${path}.notes["${optionId}"]`,
      max: RANGES.note.max,
      allowEmpty: true,
    });
    if (!result.ok) errors.push(...result.errors);
  }
  return errors.length ? fail(errors) : pass(undefined);
}

function validateDecision(raw: unknown, path: string): ValidationResult<void> {
  if (!isPlainObject(raw)) return fail([`${path} must be an object.`]);

  const errors: string[] = [];
  const push = (r: ValidationResult<unknown>) => {
    if (!r.ok) errors.push(...r.errors);
  };

  push(validateId(raw.id, `${path}.id`));
  push(
    validateText(raw.title, {
      label: `${path}.title`,
      max: RANGES.title.max,
      allowEmpty: true,
    }),
  );
  push(
    validateText(raw.description, {
      label: `${path}.description`,
      max: RANGES.description.max,
      allowEmpty: true,
    }),
  );
  for (const field of ["createdAt", "updatedAt"] as const) {
    const v = raw[field];
    if (typeof v !== "string" || Number.isNaN(Date.parse(v))) {
      errors.push(`${path}.${field} must be a valid ISO-8601 timestamp.`);
    }
  }

  // comparison: collect valid option ids before checking criteria.
  const comparison = raw.comparison;
  const optionIds = new Set<string>();
  if (!isPlainObject(comparison)) {
    errors.push(`${path}.comparison must be an object.`);
  } else {
    if (!Array.isArray(comparison.options)) {
      errors.push(`${path}.comparison.options must be an array.`);
    } else {
      comparison.options.forEach((opt, i) => {
        const p = `${path}.comparison.options[${i}]`;
        if (!isPlainObject(opt)) {
          errors.push(`${p} must be an object.`);
          return;
        }
        push(validateId(opt.id, `${p}.id`));
        push(
          validateText(opt.name, {
            label: `${p}.name`,
            max: RANGES.optionName.max,
          }),
        );
        if (typeof opt.id === "string") {
          if (optionIds.has(opt.id)) errors.push(`${p}.id is duplicated.`);
          optionIds.add(opt.id);
        }
      });
    }
    if (!Array.isArray(comparison.criteria)) {
      errors.push(`${path}.comparison.criteria must be an array.`);
    } else {
      comparison.criteria.forEach((crit, i) => {
        push(
          validateCriterion(
            crit,
            `${path}.comparison.criteria[${i}]`,
            optionIds,
          ),
        );
      });
    }
  }

  // prosCons
  const prosCons = raw.prosCons;
  if (!isPlainObject(prosCons)) {
    errors.push(`${path}.prosCons must be an object.`);
  } else {
    for (const key of ["pros", "cons"] as const) {
      const list = prosCons[key];
      if (!Array.isArray(list)) {
        errors.push(`${path}.prosCons.${key} must be an array.`);
        continue;
      }
      list.forEach((item, i) =>
        push(validateWeightedItem(item, `${path}.prosCons.${key}[${i}]`)),
      );
    }
  }

  // swot
  const swot = raw.swot;
  if (!isPlainObject(swot)) {
    errors.push(`${path}.swot must be an object.`);
  } else {
    for (const quadrant of SWOT_QUADRANTS) {
      const list = swot[quadrant];
      if (!Array.isArray(list)) {
        errors.push(`${path}.swot.${quadrant} must be an array.`);
        continue;
      }
      list.forEach((item, i) =>
        push(validateSwotItem(item, `${path}.swot.${quadrant}[${i}]`)),
      );
    }
  }

  return errors.length ? fail(errors) : pass(undefined);
}

/**
 * Validate an unknown value as a full `AppState`.
 *
 * Used on storage load and JSON import. A failure means the payload must
 * be rejected **without touching existing data**.
 */
export function validateAppState(raw: unknown): ValidationResult<AppState> {
  if (!isPlainObject(raw)) {
    return fail(["Backup must be a JSON object."]);
  }
  if (raw.schemaVersion !== SCHEMA_VERSION) {
    return fail([
      `Unsupported schema version (expected ${SCHEMA_VERSION}, received ${
        String(raw.schemaVersion) ?? "none"
      }).`,
    ]);
  }
  if (!Array.isArray(raw.decisions)) {
    return fail(["Backup must contain a decisions array."]);
  }
  if (raw.decisions.length === 0) {
    return fail(["Backup contains no decisions."]);
  }
  if (typeof raw.activeDecisionId !== "string") {
    return fail(["Backup must identify an active decision."]);
  }

  const errors: string[] = [];
  const seenIds = new Set<string>();
  raw.decisions.forEach((d, i) => {
    const result = validateDecision(d, `decisions[${i}]`);
    if (!result.ok) errors.push(...result.errors);
    if (isPlainObject(d) && typeof d.id === "string") {
      if (seenIds.has(d.id)) errors.push(`decisions[${i}].id is duplicated.`);
      seenIds.add(d.id);
    }
  });

  if (errors.length) return fail(errors);

  // activeDecisionId must resolve — otherwise the app has no valid target.
  if (!seenIds.has(raw.activeDecisionId)) {
    return fail(["activeDecisionId does not match any decision in the backup."]);
  }

  return pass(raw as unknown as AppState);
}

/* ------------------------------------------------------------------ */
/* Field-level helpers for the UI                                      */
/* ------------------------------------------------------------------ */

/**
 * Validate a single decision field while typing, returning an error
 * string only when the value is actually invalid (not while the user is
 * still mid-edit on a partially typed value).
 */
export function validateField(
  field: "title" | "description",
  value: unknown,
): string | null {
  const result =
    field === "title"
      ? validateText(value, {
          label: "Title",
          max: RANGES.title.max,
          allowEmpty: true,
        })
      : validateText(value, {
          label: "Description",
          max: RANGES.description.max,
          allowEmpty: true,
        });
  return result.ok ? null : result.errors[0];
}

export type { Criterion, Decision };
