/**
 * @vitest-environment jsdom
 *
 * Workspace header backup/restore UI tests — Phase 3.
 *
 * Covers the export buttons and the import → validate → confirm → restore
 * flow, including the failure path (invalid file must NOT open the modal).
 */
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceHeader } from "./workspace-header";
import { WorkspaceProvider } from "@/state/workspace";
import { ToastProvider } from "@/components/ui/toast";
import { buildBackupPayload, downloadTextFile, parseBackup } from "@/storage/backup";
import type { AppState } from "@/domain/types";

vi.mock("@/storage/backup", () => ({
  buildBackupPayload: vi.fn((state: unknown) => JSON.stringify(state)),
  downloadTextFile: vi.fn(),
  parseBackup: vi.fn(),
}));

const mockedBuildBackup = vi.mocked(buildBackupPayload);
const mockedDownload = vi.mocked(downloadTextFile);
const mockedParseBackup = vi.mocked(parseBackup);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderHeader() {
  return render(
    <WorkspaceProvider>
      <ToastProvider>
        <WorkspaceHeader onOpenSidebar={() => {}} />
      </ToastProvider>
    </WorkspaceProvider>,
  );
}

function fileInput(): HTMLInputElement {
  const el = document.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement | null;
  if (!el) throw new Error("File input not found");
  return el;
}

describe("WorkspaceHeader backup actions (Phase 3)", () => {
  beforeEach(() => {
    mockedBuildBackup.mockImplementation(
      (state) => JSON.stringify(state),
    );
    mockedDownload.mockReset();
    mockedParseBackup.mockReset();
  });

  it("renders export and import actions", () => {
    renderHeader();
    expect(screen.getByRole("button", { name: /export json/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /export markdown/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /import json/i })).toBeTruthy();
  });

  it("exports the full state as a versioned JSON backup on click", async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole("button", { name: /export json/i }));

    expect(mockedDownload).toHaveBeenCalledTimes(1);
    const call = mockedDownload.mock.calls[0];
    expect(call?.[0]).toMatch(/^hitresolver-backup-/);
    expect(call?.[2] ?? "application/json").toBe("application/json");
    const parsed = JSON.parse(String(call?.[1])) as {
      schemaVersion: number;
      decisions: unknown[];
    };
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.decisions.length).toBeGreaterThan(0);
  });

  it("exports a markdown report for the active decision", async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole("button", { name: /export markdown/i }));

    expect(mockedDownload).toHaveBeenCalledTimes(1);
    const call = mockedDownload.mock.calls[0];
    expect(String(call?.[0])).toMatch(/^decision-report-.+\.md$/);
    expect(call?.[2]).toBe("text/markdown");
    expect(String(call?.[1])).toContain("# Decision Report:");
  });

  it("shows an error toast and does NOT open the confirm modal for an invalid backup", async () => {
    const user = userEvent.setup();
    mockedParseBackup.mockImplementation(() => ({
      ok: false,
      errors: ["Unsupported schema version (expected 1, received 2)."],
    }));
    renderHeader();

    await user.upload(fileInput(), new File(["{}"], "backup.json", { type: "application/json" }));
    await waitFor(() => expect(mockedParseBackup).toHaveBeenCalled());

    expect((await screen.findAllByText(/unsupported schema version/i)).length).toBeGreaterThan(0);
    expect(screen.queryByText("Restore this backup?")).toBeNull();
  });

  it("opens the restore confirmation after a valid backup parses, and restores on confirm", async () => {
    const user = userEvent.setup();
    const restored: AppState = {
      schemaVersion: 1,
      activeDecisionId: "d2",
      decisions: [
        {
          id: "d2",
          title: "Restored Decision",
          description: "",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          prosCons: { pros: [], cons: [] },
          comparison: { options: [], criteria: [] },
          swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
        },
      ],
    };
    mockedParseBackup.mockImplementation(() => ({ ok: true, state: restored }));
    renderHeader();

    await user.upload(fileInput(), new File(["{}"], "backup.json", { type: "application/json" }));
    expect(await screen.findByText("Restore this backup?")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Restore backup" }));

    await waitFor(() =>
      expect(screen.queryByText("Restore this backup?")).toBeNull(),
    );
    expect((await screen.findAllByText("Backup restored")).length).toBeGreaterThan(0);
  });
});
