/**
 * @vitest-environment jsdom
 *
 * Exercises the real `window.localStorage` surface, so it must run in a
 * DOM environment. Domain and engine tests deliberately do not.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalStorageAdapter } from "./local-storage";
import { STORAGE_KEY } from "@/domain/types";
import { createInitialState, createSampleDecision } from "@/domain/factory";

/**
 * Clear jsdom's real localStorage between tests.
 *
 * We deliberately use the genuine `window.localStorage` rather than a
 * stub: the adapter's failure paths are exercised via
 * `vi.spyOn(Storage.prototype, …)`, which only fires against the real
 * Storage implementation.
 */
function installStorage() {
  window.localStorage.clear();
}

describe("LocalStorageAdapter", () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    vi.restoreAllMocks();
    installStorage();
    adapter = new LocalStorageAdapter(STORAGE_KEY);
  });

  it("returns null on first run rather than an error", () => {
    const result = adapter.load();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBeNull();
  });

  it("round-trips a valid state", () => {
    const state = createInitialState();
    const save = adapter.save(state);
    expect(save.ok).toBe(true);

    const load = adapter.load();
    expect(load.ok).toBe(true);
    if (load.ok) {
      expect(load.value).not.toBeNull();
      expect(load.value?.activeDecisionId).toBe(state.activeDecisionId);
      expect(load.value?.decisions).toHaveLength(1);
    }
  });

  // W8: corrupt data must be reported, never silently replaced.
  it("reports corrupt JSON instead of substituting sample data", () => {
    window.localStorage.setItem(STORAGE_KEY, "{ not json at all");
    const result = adapter.load();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("corrupt");
      expect(result.message).toBeTruthy();
    }
  });

  it("reports valid JSON with an invalid shape as corrupt", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ hello: "world" }));
    const result = adapter.load();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("corrupt");
  });

  it("does not overwrite a corrupt payload on load", () => {
    const corrupt = "{ broken";
    window.localStorage.setItem(STORAGE_KEY, corrupt);
    adapter.load();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(corrupt);
  });

  // W7: quota failures must surface as a typed result, not a throw.
  it("returns a quota result when setItem throws QuotaExceededError", () => {
    const state = createInitialState();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      const err = new Error("quota");
      err.name = "QuotaExceededError";
      throw err;
    });

    const result = adapter.save(state);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("quota");
      expect(result.message).toContain("storage is full");
    }
    vi.restoreAllMocks();
  });

  it("returns an unavailable result for a generic write failure", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const result = adapter.save(createInitialState());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unavailable");
    vi.restoreAllMocks();
  });

  it("returns an unavailable result when reading throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const result = adapter.load();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unavailable");
    vi.restoreAllMocks();
  });

  it("refuses to save an invalid state", () => {
    const bad = { ...createInitialState(), activeDecisionId: "dangling" };
    const result = adapter.save(bad as never);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid");
  });

  // W12: a dangling active id is repaired, not loaded as-is.
  it("repairs an activeDecisionId that no longer resolves", () => {
    const state = createInitialState();
    const broken = { ...state, activeDecisionId: "does-not-exist" };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(broken));

    const result = adapter.load();
    expect(result.ok).toBe(true);
    if (result.ok && result.value) {
      expect(result.value.activeDecisionId).toBe(state.decisions[0].id);
    }
  });

  it("clear removes only the app key", () => {
    adapter.save(createInitialState());
    window.localStorage.setItem("unrelated:key", "keep me");

    const result = adapter.clear();
    expect(result.ok).toBe(true);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem("unrelated:key")).toBe("keep me");
  });

  it("preserves decisions that survive validation", () => {
    const state = {
      ...createInitialState(),
      decisions: [createSampleDecision()],
    };
    state.activeDecisionId = state.decisions[0].id;
    adapter.save(state);

    const loaded = adapter.load();
    expect(loaded.ok).toBe(true);
    if (loaded.ok && loaded.value) {
      expect(loaded.value.decisions[0].title).toBe(
        "Choosing Our Next Product Stack",
      );
    }
  });
});
