"use client";

import { useMemo } from "react";
import { useWorkspace } from "@/state/workspace";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/ui/brand";
import {
  CopyIcon,
  DatabaseIcon,
  CloseIcon,
  PlusIcon,
} from "@/components/ui/icons";
import { useToast } from "@/components/ui/toast";

/** Relative time in plain, human terms — never a raw timestamp. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(then).toLocaleDateString();
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const {
    data,
    activeDecision,
    select,
    create,
    duplicate,
    storageProblem,
    retrySave,
    dismissStorageProblem,
  } = useWorkspace();
  const { toast } = useToast();

  /** Most recently updated first — required by the brief. */
  const ordered = useMemo(
    () =>
      [...data.decisions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [data.decisions],
  );

  return (
    <>
      {/* Mobile scrim */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        id="sidebar"
        aria-label="Saved decisions"
        className={[
          "fixed inset-y-0 left-0 z-40 w-[290px] flex flex-col",
          "bg-surface border-r border-line",
          "transition-transform duration-200 ease-out",
          "lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-line">
          <BrandMark />
          <div className="min-w-0 flex-1">
            <h1 className="text-[0.9375rem] font-extrabold text-ink leading-tight tracking-tight">
              HitResolver
            </h1>
            <p className="text-[0.6875rem] text-ink-subtle leading-tight">
              Make Better Decisions, Every Day!
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="lg:hidden p-2 -mr-2 text-ink-muted hover:text-ink rounded-md"
          >
            <CloseIcon className="size-5" />
          </button>
        </div>

        {/* Storage warning — surfaced, never silent */}
        {storageProblem && (
          <div
            role="alert"
            className="mx-3 mt-3 rounded-lg border border-warning/35 bg-warning-soft p-3"
          >
            <div className="flex items-start gap-2">
              <DatabaseIcon className="size-4 mt-0.5 text-warning shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-warning">Storage problem</p>
                <p className="text-xs text-ink-muted mt-1 leading-relaxed break-words">
                  {storageProblem.message}
                </p>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="outline" onClick={retrySave}>
                    Retry save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={dismissStorageProblem}>
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* New decision */}
        <div className="px-3 pt-3">
          <Button
            variant="primary"
            className="w-full"
            icon={<PlusIcon className="size-4" />}
            onClick={() => {
              create();
              toast("New decision created", "success");
              onClose();
            }}
          >
            New Decision
          </Button>
        </div>

        {/* Decision list */}
        <div className="px-4 pt-4 pb-1 text-[0.6875rem] font-bold uppercase tracking-wider text-ink-subtle">
          Saved Decisions
          <span className="ml-1.5 font-normal normal-case tracking-normal">
            ({ordered.length})
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-1.5">
          {ordered.map((decision) => {
            const isActive = decision.id === activeDecision.id;
            const itemCount =
              decision.prosCons.pros.length +
              decision.prosCons.cons.length +
              decision.swot.strengths.length +
              decision.swot.weaknesses.length +
              decision.swot.opportunities.length +
              decision.swot.threats.length;

            return (
              <div key={decision.id} className="group relative">
                <button
                  type="button"
                  onClick={() => {
                    select(decision.id);
                    onClose();
                  }}
                  aria-current={isActive ? "page" : undefined}
                  className={[
                    "w-full text-left rounded-lg border pr-9 pl-3 py-2.5",
                    "transition-colors duration-150",
                    isActive
                      ? "bg-primary-soft border-primary/40"
                      : "bg-transparent border-transparent hover:bg-surface-2 hover:border-line",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "block text-[0.8125rem] font-semibold truncate",
                      isActive ? "text-primary" : "text-ink",
                    ].join(" ")}
                  >
                    {decision.title || "Untitled Decision"}
                  </span>
                  <span className="block text-[0.6875rem] text-ink-subtle mt-0.5 truncate">
                    {decision.comparison.options.length} option
                    {decision.comparison.options.length === 1 ? "" : "s"} ·{" "}
                    {itemCount} item{itemCount === 1 ? "" : "s"} ·{" "}
                    {relativeTime(decision.updatedAt)}
                  </span>
                </button>

                {/* Duplicate — available on every row */}
                <button
                  type="button"
                  onClick={() => {
                    duplicate(decision.id);
                    toast("Decision duplicated", "success");
                  }}
                  title={`Duplicate "${decision.title}"`}
                  aria-label={`Duplicate ${decision.title}`}
                  className="absolute top-1/2 -translate-y-1/2 right-2 p-1.5 rounded-md text-ink-subtle hover:text-ink hover:bg-surface-3 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                >
                  <CopyIcon className="size-3.5" />
                </button>
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-line px-4 py-3">
          <p className="text-[0.6875rem] text-ink-subtle leading-relaxed">
            Data is stored in{" "}
            <strong className="font-semibold text-ink-muted">
              this browser only
            </strong>{" "}
            — not synced, not backed up. Export a JSON backup to keep your work.
          </p>
        </div>
      </aside>
    </>
  );
}
