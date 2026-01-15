"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { HistoryEntry } from "../lib/types";
import {
  clearHistory,
  readHistorySnapshot,
  subscribeHistory,
  writeHistory,
  MAX_HISTORY_ENTRIES,
} from "../lib/history";

const EMPTY_ENTRIES: HistoryEntry[] = [];

export function usePromptHistory() {
  const entries = useSyncExternalStore(
    subscribeHistory,
    () => readHistorySnapshot(),
    () => EMPTY_ENTRIES
  );

  const add = useCallback(
    (entry: Omit<HistoryEntry, "id" | "timestamp">): string => {
      const nextEntry: HistoryEntry = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      };

      const current = readHistorySnapshot();
      const next = [nextEntry, ...current].slice(0, MAX_HISTORY_ENTRIES);
      writeHistory(next);

      return nextEntry.id;
    },
    []
  );

  const update = useCallback(
    (id: string, updates: Partial<Pick<HistoryEntry, "sessionId">>) => {
      const current = readHistorySnapshot();
      const updated = current.map((entry) =>
        entry.id === id ? { ...entry, ...updates } : entry
      );
      writeHistory(updated);
    },
    []
  );

  const clear = useCallback(() => {
    clearHistory();
  }, []);

  return { entries, add, update, clear };
}
