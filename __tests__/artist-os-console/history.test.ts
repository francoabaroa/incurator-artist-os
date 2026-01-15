import { describe, expect, it } from "vitest";
import {
  appendHistory,
  clearHistory,
  readHistory,
  updateHistoryEntry,
  writeHistory,
  HISTORY_STORAGE_KEY,
  MAX_HISTORY_ENTRIES,
} from "@/app/artist-os-console/lib/history";
import type { HistoryEntry } from "@/app/artist-os-console/lib/types";

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
}

function buildEntry(index: number): HistoryEntry {
  return {
    id: `entry-${index}`,
    timestamp: new Date(2026, 0, 1, 0, 0, index).toISOString(),
    userId: `user-${index}`,
    artistId: `artist-${index}`,
    prompt: `Prompt ${index}`,
    resumeSessionId: index % 2 === 0 ? `session-${index}` : undefined,
    sessionId: index % 2 === 1 ? `session-out-${index}` : undefined,
  };
}

describe("history storage", () => {
  it("returns empty array when storage is empty or invalid", () => {
    const storage = new MemoryStorage();
    expect(readHistory(storage)).toEqual([]);

    storage.setItem(HISTORY_STORAGE_KEY, "not-json");
    expect(readHistory(storage)).toEqual([]);

    storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([{ nope: true }]));
    expect(readHistory(storage)).toEqual([]);
  });

  it("writes and reads entries", () => {
    const storage = new MemoryStorage();
    const entries = [buildEntry(1), buildEntry(2)];

    writeHistory(entries, storage);

    expect(readHistory(storage)).toEqual(entries);
  });

  it("appends entries with FIFO eviction", () => {
    const storage = new MemoryStorage();

    for (let i = 0; i <= MAX_HISTORY_ENTRIES; i += 1) {
      appendHistory(buildEntry(i), storage);
    }

    const entries = readHistory(storage);

    expect(entries).toHaveLength(MAX_HISTORY_ENTRIES);
    expect(entries[0]?.id).toBe(`entry-${MAX_HISTORY_ENTRIES}`);
    expect(entries[entries.length - 1]?.id).toBe("entry-1");
  });

  it("clears history", () => {
    const storage = new MemoryStorage();
    writeHistory([buildEntry(1)], storage);

    clearHistory(storage);

    expect(readHistory(storage)).toEqual([]);
  });

  it("updates sessionId for an entry", () => {
    const storage = new MemoryStorage();
    const entry = buildEntry(1);
    writeHistory([entry], storage);

    const updated = updateHistoryEntry(
      entry.id,
      { sessionId: "session-out-99" },
      storage
    );

    expect(updated[0]?.sessionId).toBe("session-out-99");
    expect(readHistory(storage)[0]?.sessionId).toBe("session-out-99");
  });
});
