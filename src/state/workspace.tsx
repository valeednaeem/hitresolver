"use client";

/**
 * Workspace state management.
 *
 * A single reducer owns all `AppState` mutations. Components dispatch
 * actions; they never mutate state directly. Persistence happens through
 * a debounced effect so a keystroke does not serialise the whole state
 * (prototype defect W13).
 *
 * Layering: this module sits above `domain` and `storage`. It contains
 * no calculation logic — scoring belongs to `engine` (Phase 2).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { createBlankDecision, createInitialState } from "@/domain/factory";
import { createId } from "@/domain/ids";
import type {
  AppState,
  Comparison,
  Decision,
  ProsCons,
  StorageFailure,
  Swot,
} from "@/domain/types";
import { localStorageAdapter } from "@/storage/local-storage";
import type { StorageAdapter } from "@/storage/adapter";

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

export type WorkspaceAction =
  | { type: "hydrate"; state: AppState; problem?: StorageProblem | null }
  | { type: "select"; id: string }
  | { type: "create"; decision?: Decision }
  | { type: "duplicate"; id: string }
  | { type: "remove"; id: string }
  | { type: "updateMeta"; id: string; title?: string; description?: string }
  | { type: "updateProsCons"; id: string; prosCons: ProsCons }
  | { type: "updateComparison"; id: string; comparison: Comparison }
  | { type: "updateSwot"; id: string; swot: Swot }
  | { type: "setStorageProblem"; problem: StorageProblem | null };

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

export interface WorkspaceState {
  hydrated: boolean;
  data: AppState;
  /**
   * True once the user has mutated data in this session. Auto-save is
   * gated on it so a failed load can never be overwritten by the
   * in-memory fallback.
   */
  dirty: boolean;
  /** Non-fatal storage problem to surface to the user, if any. */
  storageProblem: StorageProblem | null;
}

/* ------------------------------------------------------------------ */
/* Reducer                                                             */
/* ------------------------------------------------------------------ */

function touch(decision: Decision, patch: Partial<Decision>): Decision {
  return { ...decision, ...patch, updatedAt: new Date().toISOString() };
}

function mapDecision(
  state: AppState,
  id: string,
  fn: (d: Decision) => Decision,
): AppState {
  return {
    ...state,
    decisions: state.decisions.map((d) => (d.id === id ? fn(d) : d)),
  };
}

export function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction,
): WorkspaceState {
  switch (action.type) {
    case "hydrate":
      return {
        hydrated: true,
        data: action.state,
        // A fresh load is not a user mutation — nothing to save yet.
        dirty: false,
        storageProblem: action.problem ?? null,
      };

    case "setStorageProblem":
      return { ...state, storageProblem: action.problem };

    case "select": {
      if (!state.data.decisions.some((d) => d.id === action.id)) return state;
      return {
        ...state,
        dirty: true,
        data: { ...state.data, activeDecisionId: action.id },
      };
    }

    case "create": {
      const decision = action.decision ?? createBlankDecision();
      return {
        ...state,
        dirty: true,
        data: {
          ...state.data,
          decisions: [decision, ...state.data.decisions],
          activeDecisionId: decision.id,
        },
      };
    }

    case "duplicate": {
      const index = state.data.decisions.findIndex((d) => d.id === action.id);
      if (index === -1) return state;
      const source = state.data.decisions[index];
      const stamp = new Date().toISOString();
      const copy: Decision = {
        ...structuredClone(source),
        id: createId(),
        title: `${source.title} (copy)`,
        createdAt: stamp,
        updatedAt: stamp,
      };
      const decisions = [...state.data.decisions];
      decisions.splice(index + 1, 0, copy);
      return {
        ...state,
        dirty: true,
        data: { ...state.data, decisions, activeDecisionId: copy.id },
      };
    }

    case "remove": {
      const decisions = state.data.decisions.filter((d) => d.id !== action.id);
      // Never allow an empty list — the app always needs a valid target.
      if (decisions.length === 0) return state;
      const activeDecisionId =
        state.data.activeDecisionId === action.id
          ? decisions[0].id
          : state.data.activeDecisionId;
      return {
        ...state,
        dirty: true,
        data: { ...state.data, decisions, activeDecisionId },
      };
    }

    case "updateMeta":
      return {
        ...state,
        dirty: true,
        data: mapDecision(state.data, action.id, (d) =>
          touch(d, {
            ...(action.title !== undefined ? { title: action.title } : {}),
            ...(action.description !== undefined
              ? { description: action.description }
              : {}),
          }),
        ),
      };

    case "updateProsCons":
      return {
        ...state,
        dirty: true,
        data: mapDecision(state.data, action.id, (d) => touch(d, { prosCons: action.prosCons })),
      };

    case "updateComparison":
      return {
        ...state,
        dirty: true,
        data: mapDecision(state.data, action.id, (d) =>
          touch(d, { comparison: action.comparison }),
        ),
      };

    case "updateSwot":
      return {
        ...state,
        dirty: true,
        data: mapDecision(state.data, action.id, (d) => touch(d, { swot: action.swot })),
      };

    default:
      return state;
  }
}

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

export interface StorageProblem {
  reason: StorageFailure;
  message: string;
}

interface WorkspaceContextValue {
  hydrated: boolean;
  data: AppState;
  activeDecision: Decision;
  /** Non-fatal storage problem to surface to the user, if any. */
  storageProblem: StorageProblem | null;
  select: (id: string) => void;
  create: (decision?: Decision) => void;
  duplicate: (id: string) => void;
  remove: (id: string) => void;
  updateMeta: (id: string, patch: { title?: string; description?: string }) => void;
  /** Replace a decision's pros/cons ledger. */
  updateProsCons: (id: string, prosCons: ProsCons) => void;
  /** Replace a decision's comparison matrix. */
  updateComparison: (id: string, comparison: Comparison) => void;
  /** Replace a decision's SWOT analysis. */
  updateSwot: (id: string, swot: Swot) => void;
  /** Retry persistence after a storage failure. */
  retrySave: () => void;
  /** Dismiss the storage banner. */
  dismissStorageProblem: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const SAVE_DEBOUNCE_MS = 300;

/**
 * Static pre-hydration state.
 *
 * The reducer's initializer runs during the server prerender, where
 * `crypto.randomUUID()` is an unstable value and fails the build. Until
 * the mount effect hydrates the real state, the app renders only the
 * loading screen, so this stub is never displayed — and because
 * `dirty` starts false it is never persisted either.
 */
const BOOTSTRAP_STATE: AppState = {
  schemaVersion: 1,
  activeDecisionId: "bootstrap",
  decisions: [
    {
      id: "bootstrap",
      title: "",
      description: "",
      createdAt: "1970-01-01T00:00:00.000Z",
      updatedAt: "1970-01-01T00:00:00.000Z",
      prosCons: { pros: [], cons: [] },
      comparison: { options: [], criteria: [] },
      swot: {
        strengths: [],
        weaknesses: [],
        opportunities: [],
        threats: [],
      },
    },
  ],
};

interface ProviderProps {
  children: ReactNode;
  /** Injected in tests; defaults to the real localStorage adapter. */
  adapter?: StorageAdapter;
}

export function WorkspaceProvider({ children, adapter }: ProviderProps) {
  const storage = adapter ?? localStorageAdapter;

  const [state, dispatch] = useReducer(workspaceReducer, undefined, () => ({
    hydrated: false,
    data: BOOTSTRAP_STATE,
    dirty: false,
    storageProblem: null,
  }));

  const pendingRef = useRef<AppState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydratedRef = useRef(false);
  // Auto-save is gated on an actual user mutation: a failed load must not
  // be overwritten by the in-memory fallback (never silently replace
  // unreadable data).
  const dirtyRef = useRef(false);

  /* ---- hydrate once on mount ---- */
  useEffect(() => {
    const result = storage.load();
    if (result.ok) {
      dispatch({
        type: "hydrate",
        state: result.value ?? createInitialState(),
      });
    } else {
      // Keep the in-memory sample so the app is usable, but tell the user
      // their saved data could not be read. We never overwrite it silently.
      dispatch({
        type: "hydrate",
        state: createInitialState(),
        problem: { reason: result.reason, message: result.message },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- debounced save ---- */
  useEffect(() => {
    if (!state.hydrated) return;
    hydratedRef.current = true;
    dirtyRef.current = state.dirty;
    pendingRef.current = state.data;
    if (!state.dirty) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const payload = pendingRef.current;
      if (!payload) return;
      const result = storage.save(payload);
      dispatch({
        type: "setStorageProblem",
        problem: result.ok
          ? null
          : { reason: result.reason, message: result.message },
      });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state.data, state.hydrated, state.dirty, storage]);

  /* ---- flush pending write when the tab is hidden ---- */
  useEffect(() => {
    const flush = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (pendingRef.current && hydratedRef.current && dirtyRef.current) {
        const result = storage.save(pendingRef.current);
        if (!result.ok) {
          dispatch({
            type: "setStorageProblem",
            problem: { reason: result.reason, message: result.message },
          });
        }
      }
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
    };
  }, [storage]);

  const activeDecision = useMemo(
    () =>
      state.data.decisions.find((d) => d.id === state.data.activeDecisionId) ??
      state.data.decisions[0],
    [state.data],
  );

  const select = useCallback((id: string) => dispatch({ type: "select", id }), []);
  const create = useCallback(
    (decision?: Decision) => dispatch({ type: "create", decision }),
    [],
  );
  const duplicate = useCallback(
    (id: string) => dispatch({ type: "duplicate", id }),
    [],
  );
  const remove = useCallback((id: string) => dispatch({ type: "remove", id }), []);
  const updateMeta = useCallback(
    (id: string, patch: { title?: string; description?: string }) =>
      dispatch({ type: "updateMeta", id, ...patch }),
    [],
  );

  const updateProsCons = useCallback(
    (id: string, prosCons: ProsCons) => dispatch({ type: "updateProsCons", id, prosCons }),
    [],
  );

  const updateComparison = useCallback(
    (id: string, comparison: Comparison) =>
      dispatch({ type: "updateComparison", id, comparison }),
    [],
  );

  const updateSwot = useCallback(
    (id: string, swot: Swot) => dispatch({ type: "updateSwot", id, swot }),
    [],
  );

  const retrySave = useCallback(() => {
    if (!pendingRef.current) return;
    const result = storage.save(pendingRef.current);
    dispatch({
      type: "setStorageProblem",
      problem: result.ok
        ? null
        : { reason: result.reason, message: result.message },
    });
  }, [storage]);

  const dismissStorageProblem = useCallback(
    () => dispatch({ type: "setStorageProblem", problem: null }),
    [],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      hydrated: state.hydrated,
      data: state.data,
      activeDecision,
      storageProblem: state.storageProblem,
      select,
      create,
      duplicate,
      remove,
      updateMeta,
      updateProsCons,
      updateComparison,
      updateSwot,
      retrySave,
      dismissStorageProblem,
    }),
    [
      state.hydrated,
      state.data,
      state.storageProblem,
      activeDecision,
      select,
      create,
      duplicate,
      remove,
      updateMeta,
      updateProsCons,
      updateComparison,
      updateSwot,
      retrySave,
      dismissStorageProblem,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
}
