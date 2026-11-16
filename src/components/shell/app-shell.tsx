"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { WorkspaceHeader } from "./workspace-header";
import { FrameworkTabs } from "./framework-tabs";
import { ThemeToggle } from "./theme-toggle";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/spinner";
import { DatabaseIcon } from "@/components/ui/icons";
import { useWorkspace } from "@/state/workspace";

/**
 * Application shell: sidebar + main workspace.
 *
 * The sidebar is a fixed drawer below `lg` and a static column above it,
 * so mobile users reach the workspace without scrolling past the whole
 * decision list (prototype defect W20).
 */
export function AppShell() {
  const { hydrated, activeDecision } = useWorkspace();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close the drawer automatically when the viewport grows to desktop.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = () => {
      if (mq.matches) setSidebarOpen(false);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Close the drawer when Escape is pressed.
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-canvas">
        <LoadingState message="Loading your decisions" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-canvas/85 backdrop-blur border-b border-line">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                aria-hidden="true"
                className="lg:hidden size-8 rounded-lg bg-primary text-on-primary grid place-items-center text-[0.6875rem] font-extrabold shrink-0"
              >
                HR
              </span>
              <span className="text-sm font-bold text-ink truncate hidden sm:inline">
                {activeDecision.title || "Untitled Decision"}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge tone="primary" dot className="hidden sm:inline-flex">
                Demo
              </Badge>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Workspace */}
        <main
          id="main"
          className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6"
        >
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:bg-primary focus:text-on-primary focus:px-3 focus:py-2 focus:rounded-lg focus:text-sm"
          >
            Skip to main content
          </a>

          <WorkspaceHeader onOpenSidebar={() => setSidebarOpen(true)} />

          <div className="mt-6">
            <FrameworkTabs />
          </div>

          {/* Honest, always-visible limitation notice */}
          <footer className="mt-8 pt-5 border-t border-line flex items-start gap-3">
            <DatabaseIcon className="size-4 mt-0.5 text-ink-subtle shrink-0" />
            <p className="text-xs text-ink-subtle leading-relaxed">
              <strong className="font-semibold text-ink-muted">
                Demo build.
              </strong>{" "}
              Your work is saved to this browser&apos;s local storage only — it
              is not synced across devices and is not backed up. Use the JSON
              backup in a later phase to keep a copy. There are no accounts and
              no cloud storage in this release.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
