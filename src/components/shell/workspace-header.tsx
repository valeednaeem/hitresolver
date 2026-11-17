"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useWorkspace } from "@/state/workspace";
import { validateField } from "@/domain/validation";
import { RANGES, type AppState } from "@/domain/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CopyIcon,
  TrashIcon,
  MenuIcon,
  DownloadIcon,
  UploadIcon,
  FileTextIcon,
} from "@/components/ui/icons";
import { Modal, ModalActions } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { buildBackupPayload, downloadTextFile, parseBackup } from "@/storage/backup";
import { buildMarkdownReport } from "@/engine/report";

interface WorkspaceHeaderProps {
  onOpenSidebar: () => void;
}

/**
 * Decision header: inline-editable title and description, plus the
 * duplicate, delete, and backup/restore actions.
 *
 * Editing is local-state-first with commit-on-blur/Enter, so the sidebar
 * does not re-sort on every keystroke; validation errors are shown
 * inline and never silently clamp (spec §0.1).
 *
 * Backup (Phase 3): export downloads the full state as a versioned JSON
 * backup; markdown export downloads a generated report for the active
 * decision. Import parses + validates through the backup layer and only
 * replaces state after an explicit confirmation.
 */
export function WorkspaceHeader({ onOpenSidebar }: WorkspaceHeaderProps) {
  const { activeDecision, data, updateMeta, duplicate, remove, restore } = useWorkspace();
  const { toast } = useToast();

  const [title, setTitle] = useState(activeDecision.title);
  const [description, setDescription] = useState(activeDecision.description);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState(activeDecision.id);
  const titleRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingRestore, setPendingRestore] = useState<AppState | null>(null);

  // Re-sync local edits when the active decision changes. Adjusting state
  // during render (rather than in an effect) avoids a frame where the new
  // decision shows the previous decision's title.
  if (editingId !== activeDecision.id) {
    setEditingId(activeDecision.id);
    setTitle(activeDecision.title);
    setDescription(activeDecision.description);
    setTitleError(null);
  }

  const commitTitle = () => {
    const error = validateField("title", title);
    if (error) {
      setTitleError(error);
      return;
    }
    setTitleError(null);
    if (title !== activeDecision.title) {
      updateMeta(activeDecision.id, { title });
    }
  };

  const commitDescription = () => {
    const error = validateField("description", description);
    if (error) return; // description is optional; keep local value
    if (description !== activeDecision.description) {
      updateMeta(activeDecision.id, { description });
    }
  };

  const handleDuplicate = () => {
    duplicate(activeDecision.id);
    toast("Decision duplicated", "success");
  };

  const handleDelete = () => {
    if (data.decisions.length <= 1) {
      toast("At least one decision must remain", "error");
      setConfirmOpen(false);
      return;
    }
    const title = activeDecision.title || "Untitled Decision";
    remove(activeDecision.id);
    setConfirmOpen(false);
    toast(`Deleted "${title}"`, "success");
  };

  /* ---- Backup / restore (Phase 3) ---- */

  const handleExportJson = () => {
    const text = buildBackupPayload(data);
    downloadTextFile(
      `hitresolver-backup-${new Date().toISOString().slice(0, 10)}.json`,
      text,
    );
    toast("Backup downloaded", "success");
  };

  const handleExportMarkdown = () => {
    const text = buildMarkdownReport(activeDecision);
    downloadTextFile(
      `decision-report-${activeDecision.id}.md`,
      text,
      "text/markdown",
    );
    toast("Markdown report downloaded", "success");
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Allow re-selecting the same file later.
    e.target.value = "";
    if (!file) return;
    const text = await file.text();
    const result = parseBackup(text);
    if (!result.ok) {
      toast(result.errors[0] ?? "The file could not be imported.", "error");
      return;
    }
    setPendingRestore(result.state);
  };

  const handleRestoreConfirm = () => {
    if (!pendingRestore) return;
    restore(pendingRestore);
    setPendingRestore(null);
    toast("Backup restored", "success");
  };

  return (
    <header className="bg-surface border border-line rounded-xl shadow-sm p-5">
      <div className="flex flex-col gap-4">
        {/* Mobile menu trigger */}
        <div className="flex items-center justify-between gap-3 lg:hidden">
          <Button
            variant="ghost"
            size="sm"
            icon={<MenuIcon className="size-4" />}
            onClick={onOpenSidebar}
          >
            Decisions
          </Button>
          <Badge tone="neutral">Demo</Badge>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Title + description */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <label htmlFor="decision-title" className="sr-only">
              Decision title
            </label>
            <input
              id="decision-title"
              ref={titleRef}
              type="text"
              value={title}
              maxLength={RANGES.title.max}
              placeholder="Decision title…"
              aria-invalid={titleError ? true : undefined}
              aria-describedby={titleError ? "decision-title-error" : undefined}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError(null);
              }}
              onBlur={commitTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") {
                  setTitle(activeDecision.title);
                  setTitleError(null);
                  e.currentTarget.blur();
                }
              }}
              className={[
                "w-full bg-transparent border border-transparent rounded-md",
                "px-2 -ml-2 py-1 text-xl sm:text-2xl font-extrabold tracking-tight",
                "text-ink placeholder:text-ink-subtle",
                "hover:border-line focus:border-primary focus:bg-canvas",
                "transition-colors duration-150 outline-none",
              ].join(" ")}
            />
            {titleError && (
              <p
                id="decision-title-error"
                role="alert"
                className="text-xs text-danger px-2 -ml-2"
              >
                {titleError}
              </p>
            )}

            <label htmlFor="decision-description" className="sr-only">
              Decision context
            </label>
            <textarea
              id="decision-description"
              value={description}
              rows={2}
              maxLength={RANGES.description.max}
              placeholder="Add context, deadline, or goal for this decision…"
              onChange={(e) => setDescription(e.target.value)}
              onBlur={commitDescription}
              className={[
                "w-full bg-transparent border border-transparent rounded-md",
                "px-2 -ml-2 py-1 text-sm resize-none",
                "text-ink-muted placeholder:text-ink-subtle",
                "hover:border-line focus:border-primary focus:bg-canvas",
                "transition-colors duration-150 outline-none",
              ].join(" ")}
            />
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              icon={<DownloadIcon className="size-4" />}
              onClick={handleExportJson}
            >
              Export JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<FileTextIcon className="size-4" />}
              onClick={handleExportMarkdown}
            >
              Export Markdown
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<UploadIcon className="size-4" />}
              onClick={handleImportClick}
            >
              Import JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<CopyIcon className="size-4" />}
              onClick={handleDuplicate}
            >
              Duplicate
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<TrashIcon className="size-4" />}
              onClick={() => setConfirmOpen(true)}
              disabled={data.decisions.length <= 1}
              title={
                data.decisions.length <= 1
                  ? "At least one decision must remain"
                  : undefined
              }
            >
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete this decision?"
        description={
          <>
            <strong className="text-ink">
              {activeDecision.title || "Untitled Decision"}
            </strong>{" "}
            and all of its pros, cons, scores and SWOT entries will be removed
            from this browser. This cannot be undone.
          </>
        }
        footer={
          <ModalActions
            cancelLabel="Keep it"
            confirmLabel="Delete decision"
            tone="danger"
            onCancel={() => setConfirmOpen(false)}
            onConfirm={handleDelete}
          />
        }
      />

      {/* Restore confirmation — only opened after a validated import. */}
      <Modal
        open={pendingRestore !== null}
        onClose={() => setPendingRestore(null)}
        title="Restore this backup?"
        description={
          pendingRestore && (
            <>
              <strong className="text-ink">
                {pendingRestore.decisions.length}
              </strong>{" "}
              decision{pendingRestore.decisions.length === 1 ? "" : "s"} will be
              restored and replace the {data.decisions.length} decision
              {data.decisions.length === 1 ? "" : "s"} currently saved in this
              browser. Any existing decisions will be overwritten.
            </>
          )
        }
        footer={
          <ModalActions
            cancelLabel="Cancel"
            confirmLabel="Restore backup"
            onCancel={() => setPendingRestore(null)}
            onConfirm={handleRestoreConfirm}
          />
        }
      />

      {/* Hidden file input driving the JSON import flow. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportChange}
      />
    </header>
  );
}
