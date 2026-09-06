import { useState, useEffect, useCallback, useMemo } from "react";

export interface DraftStateOptions<T> {
  onNotify?: (text: string, type: "success" | "error" | "info") => void;
  entityName?: string;
  isEqual?: (a: T, b: T) => boolean;
}

export interface UseDraftStateReturn<T> {
  draft: T;
  isDirty: boolean;
  updateField: <K extends keyof T>(field: K, value: T[K]) => void;
  updateDraft: (updates: Partial<T>) => void;
  commit: () => void | Promise<void>;
  discard: () => void;
  statusMessage: { text: string; type: "success" | "info" } | null;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || a === null || typeof b !== "object" || b === null) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  const objA = a as Record<string, unknown>;
  const objB = b as Record<string, unknown>;
  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(objB, key)) return false;
    if (!deepEqual(objA[key], objB[key])) return false;
  }
  return true;
}

function cloneEntity<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

/**
 * Universal strongly-typed draft isolation hook.
 * Prevents instant auto-save by isolating edits in a local draft state.
 * Commits to global state only upon explicit invocation of commit().
 */
export function useDraftState<T extends { id: string }>(
  initialValue: T,
  onCommit: (updated: T) => void | Promise<void>,
  options?: DraftStateOptions<T>
): UseDraftStateReturn<T> {
  const [draft, setDraft] = useState<T>(() => cloneEntity(initialValue));
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: "success" | "info";
  } | null>(null);

  const customIsEqual = options?.isEqual;
  const isDirty = useMemo(() => {
    if (customIsEqual) {
      return !customIsEqual(draft, initialValue);
    }
    return !deepEqual(draft, initialValue);
  }, [draft, initialValue, customIsEqual]);

  // Sync upstream modifications only if no uncommitted local edits exist
  useEffect(() => {
    if (!isDirty) {
      setDraft(cloneEntity(initialValue));
    }
  }, [initialValue, isDirty]);

  // Auto-dismiss transient feedback badge
  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const updateDraft = useCallback((updates: Partial<T>) => {
    setDraft((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const commit = useCallback(async () => {
    try {
      await onCommit(draft);
      setStatusMessage({
        text: "Cambios guardados",
        type: "success",
      });
      const name = options?.entityName ? ` en "${options.entityName}"` : "";
      options?.onNotify?.(`Cambios guardados${name}`, "success");
    } catch {
      options?.onNotify?.("Error al guardar cambios", "error");
    }
  }, [draft, onCommit, options]);

  const discard = useCallback(() => {
    setDraft(cloneEntity(initialValue));
    setStatusMessage({
      text: "Cambios descartados",
      type: "info",
    });
    const name = options?.entityName ? ` en "${options.entityName}"` : "";
    options?.onNotify?.(`Cambios descartados${name}`, "info");
  }, [initialValue, options]);

  return {
    draft,
    isDirty,
    updateField,
    updateDraft,
    commit,
    discard,
    statusMessage,
  };
}
