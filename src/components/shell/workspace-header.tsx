"use client";

import { useRef, useState } from "react";
import { useWorkspace } from "@/state/workspace";
import { validateField } from "@/domain/validation";
import { RANGES } from "@/domain/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyIcon, TrashIcon, MenuIcon } from "@/components/ui/icons";
import { Modal, ModalActions } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

interface WorkspaceHeaderProps {
  onOpenSidebar: () => void;
}

/**
 * Decision header: inline-editable title and description, plus the
 * duplicate and delete actions.
 *
 * Editing is local-state-first with commit-on-blur/Enter, so the sidebar
 * does not re-sort on every keystroke; validation errors are shown
 * inline and never silently clamp (spec §0.1).
 */
export function WorkspaceHeader({ onOpenSidebar }: WorkspaceHeaderProps) {
  const { activeDecision, data, updateMeta, duplicate, remove } = useWorkspace();
  const { toast } = useToast();

  const [title, setTitle] = useState(activeDecision.title);
  const [description, setDescription] = useState(activeDecision.description);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editingId, setEditingId] = useState(activeDecision.id);
  const titleRef = useRef<HTMLInputElement>(null);

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
          <div className="flex items-center gap-2 shrink-0">
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
    </header>
  );
}
