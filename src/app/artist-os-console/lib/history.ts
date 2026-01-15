import type { HistoryEntry } from "./types";

export const HISTORY_STORAGE_KEY = "artist-os-console-history";
export const MAX_HISTORY_ENTRIES = 50;

type HistoryListener = () => void;

const historyListeners = new Set<HistoryListener>();
let hasStorageListener = false;
let cachedRaw: string | null = null;
let cachedEntries: HistoryEntry[] = [];

function resolveStorage(storage?: Storage | null): Storage | null {
  if (storage) {
    return storage;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage ?? null;
}

function notifyHistoryListeners() {
  for (const listener of historyListeners) {
    listener();
  }
}

function handleStorageEvent(event: StorageEvent) {
  if (event.key !== HISTORY_STORAGE_KEY) {
    return;
  }
  notifyHistoryListeners();
}

export function subscribeHistory(listener: HistoryListener): () => void {
  historyListeners.add(listener);

  if (typeof window !== "undefined" && !hasStorageListener) {
    window.addEventListener("storage", handleStorageEvent);
    hasStorageListener = true;
  }

  return () => {
    historyListeners.delete(listener);
    if (typeof window !== "undefined" && hasStorageListener) {
      if (historyListeners.size === 0) {
        window.removeEventListener("storage", handleStorageEvent);
        hasStorageListener = false;
      }
    }
  };
}

function toHistoryEntry(value: unknown): HistoryEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;

  if (
    typeof record.id !== "string" ||
    typeof record.timestamp !== "string" ||
    typeof record.userId !== "string" ||
    typeof record.artistId !== "string" ||
    typeof record.prompt !== "string"
  ) {
    return null;
  }

  return {
    id: record.id,
    timestamp: record.timestamp,
    userId: record.userId,
    artistId: record.artistId,
    prompt: record.prompt,
    resumeSessionId:
      typeof record.resumeSessionId === "string"
        ? record.resumeSessionId
        : undefined,
    sessionId:
      typeof record.sessionId === "string" ? record.sessionId : undefined,
  };
}

export function readHistorySnapshot(storage?: Storage | null): HistoryEntry[] {
  const resolved = resolveStorage(storage);
  if (!resolved) {
    cachedRaw = null;
    cachedEntries = [];
    return cachedEntries;
  }

  try {
    const raw = resolved.getItem(HISTORY_STORAGE_KEY);
    if (raw === cachedRaw) {
      return cachedEntries;
    }

    cachedRaw = raw;
    if (!raw) {
      cachedEntries = [];
      return cachedEntries;
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      cachedEntries = [];
      return cachedEntries;
    }

    const entries = parsed
      .map(toHistoryEntry)
      .filter((entry): entry is HistoryEntry => Boolean(entry));

    cachedEntries = entries.slice(0, MAX_HISTORY_ENTRIES);
    return cachedEntries;
  } catch {
    cachedRaw = null;
    cachedEntries = [];
    return cachedEntries;
  }
}

export function readHistory(storage?: Storage | null): HistoryEntry[] {
  const resolved = resolveStorage(storage);
  if (!resolved) {
    return [];
  }

  try {
    const raw = resolved.getItem(HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const entries = parsed
      .map(toHistoryEntry)
      .filter((entry): entry is HistoryEntry => Boolean(entry));

    return entries.slice(0, MAX_HISTORY_ENTRIES);
  } catch {
    return [];
  }
}

export function writeHistory(
  entries: HistoryEntry[],
  storage?: Storage | null
): void {
  const resolved = resolveStorage(storage);
  if (!resolved) {
    return;
  }

  try {
    const trimmed = entries.slice(0, MAX_HISTORY_ENTRIES);
    resolved.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
    notifyHistoryListeners();
  } catch {
    // Ignore storage failures
  }
}

export function appendHistory(
  entry: HistoryEntry,
  storage?: Storage | null
): HistoryEntry[] {
  const current = readHistory(storage);
  const next = [entry, ...current].slice(0, MAX_HISTORY_ENTRIES);
  writeHistory(next, storage);
  return next;
}

export function clearHistory(storage?: Storage | null): void {
  const resolved = resolveStorage(storage);
  if (!resolved) {
    return;
  }

  try {
    resolved.removeItem(HISTORY_STORAGE_KEY);
    notifyHistoryListeners();
  } catch {
    // Ignore storage failures
  }
}

export function updateHistoryEntry(
  id: string,
  updates: Partial<Pick<HistoryEntry, "sessionId">>,
  storage?: Storage | null
): HistoryEntry[] {
  const current = readHistory(storage);
  const updated = current.map((entry) =>
    entry.id === id ? { ...entry, ...updates } : entry
  );
  writeHistory(updated, storage);
  return updated;
}
