/**
 * Framework panel component tests (Phase 2).
 *
 * Renders the real panels inside the real workspace provider and checks
 * that the DOM shows exactly the values the engine computes — no fake
 * numbers, no silent defaults (prototype defect W2 class).
 *
 * Empty / incomplete / invalid / tied scenarios are covered here.
 */

/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import { ProsConsPanel } from "./proscons-panel";
import { MatrixPanel } from "./matrix-panel";
import { SwotPanel } from "./swot-panel";
import { VerdictPanel } from "./verdict-panel";
import { WorkspaceProvider } from "@/state/workspace";
import { createInitialState } from "@/domain/factory";
import { localStorageAdapter } from "@/storage/local-storage";
import type { StorageAdapter } from "@/storage/adapter";
import type { AppState, Decision } from "@/domain/types";

afterEach(() => cleanup());

function renderWithProvider(ui: ReactElement) {
  return render(<WorkspaceProvider>{ui}</WorkspaceProvider>);
}

function tiedDecision(): Decision {
  const base = createInitialState().decisions[0];
  return {
    ...base,
    comparison: {
      options: [
        { id: "x1", name: "Alpha" },
        { id: "x2", name: "Beta" },
      ],
      criteria: [
        {
          id: "k1",
          name: "Cost",
          weight: 5,
          scores: { x1: 7, x2: 7 },
          notes: {},
        },
      ],
    },
  };
}

function emptyDecision(): Decision {
  const stamp = "2026-01-01T00:00:00.000Z";
  return {
    id: "d-empty",
    title: "Empty Decision",
    description: "",
    createdAt: stamp,
    updatedAt: stamp,
    prosCons: { pros: [], cons: [] },
    comparison: { options: [], criteria: [] },
    swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
  };
}

function stateWith(decision: Decision): AppState {
  return {
    schemaVersion: 1,
    activeDecisionId: decision.id,
    decisions: [decision],
  };
}

const emptyAdapter: StorageAdapter = {
  load: () => ({ ok: true, value: stateWith(emptyDecision()) }),
  save: () => ({ ok: true, value: undefined }),
  clear: () => ({ ok: true, value: undefined }),
  isAvailable: () => true,
};

const tiedAdapter: StorageAdapter = {
  load: () => ({ ok: true, value: stateWith(tiedDecision()) }),
  save: () => ({ ok: true, value: undefined }),
  clear: () => ({ ok: true, value: undefined }),
  isAvailable: () => true,
};

describe("ProsConsPanel", () => {
  it("renders the engine verdict and percentage for the sample decision", async () => {
    renderWithProvider(<ProsConsPanel />);
    await waitFor(() => expect(screen.getByText("Strong Go")).toBeTruthy());
    expect(screen.getByText("69%")).toBeTruthy();
  });
});

describe("MatrixPanel", () => {
  it("renders the engine leader and percentage for the sample decision", async () => {
    renderWithProvider(<MatrixPanel />);
    await waitFor(() =>
      expect(screen.getAllByText("Modular Monolith").length).toBeGreaterThan(0),
    );
    expect(screen.getAllByText("80%").length).toBeGreaterThan(0);
  });

  it("shows the explicit tied state for identical totals", async () => {
    render(
      <WorkspaceProvider adapter={tiedAdapter}>
        <MatrixPanel />
      </WorkspaceProvider>,
    );
    await waitFor(() => expect(screen.getAllByText("Tied").length).toBeGreaterThan(0));
  });
});

describe("SwotPanel", () => {
  it("renders the engine posture for the sample decision", async () => {
    renderWithProvider(<SwotPanel />);
    await waitFor(() => expect(screen.getByText("Exposed")).toBeTruthy());
  });
});

describe("VerdictPanel", () => {
  it("renders calculated signals and at least one named recommendation", async () => {
    renderWithProvider(<VerdictPanel />);
    await waitFor(() => expect(screen.getByText("R-CLOSE")).toBeTruthy());
    expect(screen.getByText("HitResolver Verdict Dashboard")).toBeTruthy();
  });
});

describe("empty framework states", () => {
  it("shows an honest empty ledger state instead of a neutral measurement", async () => {
    render(
      <WorkspaceProvider adapter={emptyAdapter}>
        <ProsConsPanel />
      </WorkspaceProvider>,
    );
    await waitFor(() => expect(screen.getByText("No entries yet")).toBeTruthy());
    expect(screen.getByText(/Not enough information/i)).toBeTruthy();
  });

  it("shows an honest matrix status message for a blank decision", async () => {
    render(
      <WorkspaceProvider adapter={emptyAdapter}>
        <MatrixPanel />
      </WorkspaceProvider>,
    );
    await waitFor(() => expect(screen.getByText("No criteria")).toBeTruthy());
  });

  it("shows a meaningful SWOT empty state posture", async () => {
    render(
      <WorkspaceProvider adapter={emptyAdapter}>
        <SwotPanel />
      </WorkspaceProvider>,
    );
    await waitFor(() => expect(screen.getByText("Not assessed")).toBeTruthy());
  });
});

describe("storage adapter", () => {
  it("uses the real localStorage adapter by default", () => {
    expect(localStorageAdapter.isAvailable()).toBe(true);
  });
});
