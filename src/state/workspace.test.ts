/**
 * Workspace reducer tests — Phase 3 (backup restore + mutation coverage).
 *
 * The reducer is the single owner of `AppState` mutations; these tests pin
 * its contract so restore can never silently corrupt the workspace.
 */
import { describe, expect, it } from "vitest";
import { workspaceReducer, type WorkspaceState } from "./workspace";
import type { AppState, Decision } from "@/domain/types";

function decisionWithId(id: string, title: string): Decision {
  const stamp = "2026-01-01T00:00:00.000Z";
  return {
    id,
    title,
    description: "",
    createdAt: stamp,
    updatedAt: stamp,
    prosCons: { pros: [], cons: [] },
    comparison: { options: [], criteria: [] },
    swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
  };
}

function bootedState(): WorkspaceState {
  const decision = decisionWithId("d1", "Original");
  const initial: AppState = {
    schemaVersion: 1,
    activeDecisionId: decision.id,
    decisions: [decision],
  };
  return workspaceReducer(
    {
      hydrated: false,
      data: initial,
      dirty: false,
      storageProblem: null,
    },
    { type: "hydrate", state: initial },
  );
}

describe("workspaceReducer", () => {
  it("hydrates a validated state and leaves it clean", () => {
    const next = bootedState();
    expect(next.hydrated).toBe(true);
    expect(next.dirty).toBe(false);
    expect(next.storageProblem).toBeNull();
  });

  it("restore replaces the whole state and marks it dirty", () => {
    const before = bootedState();
    const restored: AppState = {
      schemaVersion: 1,
      activeDecisionId: "d2",
      decisions: [decisionWithId("d2", "Restored Decision")],
    };

    const next = workspaceReducer(before, { type: "restore", state: restored });

    expect(next.data).toEqual(restored);
    expect(next.dirty).toBe(true);
    expect(next.storageProblem).toBeNull();
    // Hydration is preserved — restore replaces data, not the session.
    expect(next.hydrated).toBe(true);
  });

  it("restore switches the active decision to the restored record", () => {
    const before = bootedState();
    const restored: AppState = {
      schemaVersion: 1,
      activeDecisionId: "d2",
      decisions: [decisionWithId("d2", "Restored Decision")],
    };

    const next = workspaceReducer(before, { type: "restore", state: restored });

    expect(next.data.activeDecisionId).toBe("d2");
    expect(next.data.decisions).toHaveLength(1);
  });

  it("duplicate creates a fresh id and copy title", () => {
    const base = bootedState();
    const created = workspaceReducer(base, {
      type: "create",
      decision: decisionWithId("d2", "Second Decision"),
    });
    // created: [d1, d2] with d2 active.

    const next = workspaceReducer(created, { type: "duplicate", id: "d2" });

    expect(next.data.decisions).toHaveLength(3);
    const copy = next.data.decisions.find((d) => d.id !== "d2");
    expect(copy?.title).toBe("Second Decision (copy)");
    expect(next.data.activeDecisionId).toBe(copy?.id);
    // The copy must have a genuinely fresh identifier, not the source's.
    expect(copy?.id).not.toBe("d2");
  });

  it("remove never allows an empty decision list", () => {
    const base = bootedState();
    // Removing the only decision is a no-op — never an empty list.
    const next = workspaceReducer(base, { type: "remove", id: "d1" });
    expect(next.data.decisions).toHaveLength(1);
    expect(next).toBe(base);
  });
});
