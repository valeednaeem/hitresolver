"use client";

import { useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "@/components/ui/icons";

const STORAGE_KEY = "hitresolver:v1:theme";

/**
 * Light/dark theme switch.
 *
 * The theme lives on `<html>` as a class (matching Tailwind's `dark:`
 * variant) and is persisted per browser. The pre-paint script in
 * `layout.tsx` applies it before React mounts, so there is no flash.
 *
 * React reads the class via `useSyncExternalStore` rather than holding a
 * copy in state — that keeps the DOM as the single source of truth and
 * avoids setState-in-effect entirely. On first visit the operating
 * system preference wins.
 */
function subscribe(onStoreChange: () => void): () => void {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): boolean {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot(): boolean {
  // The layout's inline script always runs before paint; during SSR we
  // optimistically render the light icon and reconcile immediately after
  // hydration.
  return false;
}

export function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = () => {
    const next = isDark ? "light" : "dark";
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Preference is non-critical; failing to persist it is fine.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-2 border border-transparent hover:border-line transition-colors"
    >
      {isDark ? (
        <SunIcon className="size-4.5" />
      ) : (
        <MoonIcon className="size-4.5" />
      )}
    </button>
  );
}
