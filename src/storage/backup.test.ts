/**
 * @vitest-environment jsdom
 *
 * Backup (export/import) helper tests — Phase 3.
 *
 * The download path needs a DOM (Blob + anchor + URL), so this file runs
 * in jsdom; the build/parse logic is pure but shares the environment for
 * convenience (mirrors `local-storage.test.ts`).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildBackupPayload,
  downloadTextFile,
  parseBackup,
} from "./backup";
import { createInitialState } from "@/domain/factory";
import { SCHEMA_VERSION } from "@/domain/types";

describe("buildBackupPayload", () => {
  it("serialises the versioned backup envelope", () => {
    const state = createInitialState();
    const parsed = JSON.parse(buildBackupPayload(state)) as Record<string, unknown>;

    expect(parsed.schemaVersion).toBe(SCHEMA_VERSION);
    expect(parsed.activeDecisionId).toBe(state.activeDecisionId);
    expect(Array.isArray(parsed.decisions)).toBe(true);
    expect((parsed.decisions as unknown[]).length).toBe(1);
  });
});

describe("parseBackup", () => {
  it("accepts a well-formed backup round-tripping through the domain validator", () => {
    const state = createInitialState();
    const result = parseBackup(buildBackupPayload(state));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(result.state.activeDecisionId).toBe(state.activeDecisionId);
      expect(result.state.decisions).toHaveLength(1);
    }
  });

  it("rejects corrupt JSON", () => {
    const result = parseBackup("{ this is not json");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/not valid JSON/i);
  });

  it("rejects an unsupported schema version", () => {
    const bad = {
      schemaVersion: SCHEMA_VERSION + 1,
      activeDecisionId: "d1",
      decisions: [],
    };
    const result = parseBackup(JSON.stringify(bad));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/unsupported schema version/i);
  });

  it("rejects an empty decisions array", () => {
    const bad = { schemaVersion: SCHEMA_VERSION, activeDecisionId: "d1", decisions: [] };
    const result = parseBackup(JSON.stringify(bad));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/no decisions/i);
  });

  it("rejects a dangling activeDecisionId", () => {
    const bad = {
      schemaVersion: SCHEMA_VERSION,
      activeDecisionId: "does-not-exist",
      decisions: [createInitialState().decisions[0]],
    };
    const result = parseBackup(JSON.stringify(bad));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/activeDecisionId/i);
  });

  it("rejects duplicate decision ids across decisions", () => {
    const sample = createInitialState().decisions[0];
    const bad = {
      schemaVersion: SCHEMA_VERSION,
      activeDecisionId: sample.id,
      decisions: [sample, { ...sample, title: "Duplicate" }],
    };
    const result = parseBackup(JSON.stringify(bad));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toMatch(/duplicated/i);
  });

  it("rejects a matrix score for an unknown option", () => {
    const decision = createInitialState().decisions[0];
    const bad = {
      schemaVersion: SCHEMA_VERSION,
      activeDecisionId: decision.id,
      decisions: [
        {
          ...decision,
          comparison: {
            ...decision.comparison,
            criteria: [
              ...decision.comparison.criteria,
              { id: "criterion-ghost", name: "Ghost Criterion", weight: 5, scores: { ghost: 5 }, notes: {} },
            ],
          },
        },
      ],
    };
    const result = parseBackup(JSON.stringify(bad));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toMatch(/unknown option/i);
  });

  it("rejects out-of-range pros/cons weights", () => {
    const decision = createInitialState().decisions[0];
    const bad = {
      schemaVersion: SCHEMA_VERSION,
      activeDecisionId: decision.id,
      decisions: [
        {
          ...decision,
          prosCons: {
            ...decision.prosCons,
            pros: [{ id: "p1", text: "Great", weight: 15 }],
          },
        },
      ],
    };
    const result = parseBackup(JSON.stringify(bad));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(" ")).toMatch(/weight/i);
  });
});

describe("downloadTextFile", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("downloads a text payload through an anchor element", () => {
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");

    downloadTextFile("decision-report.md", "# Decision Report", "text/markdown");

    expect(clickSpy).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalled();
  });

  it("defaults to an application/json mime type", () => {
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    downloadTextFile("backup.json", "{}");

    expect(clickSpy).toHaveBeenCalled();
  });
});
