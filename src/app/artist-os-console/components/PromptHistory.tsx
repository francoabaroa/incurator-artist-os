import type { HistoryEntry } from "../lib/types";

interface PromptHistoryProps {
  entries: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onClear: () => void;
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function PromptHistory({
  entries,
  onSelect,
  onClear,
}: PromptHistoryProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--console-text-muted)]">
          Prompt History
        </p>
        <button
          className="rounded-full border border-[var(--console-border)] px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-[var(--console-text-muted)] transition hover:text-[var(--console-text)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={entries.length === 0}
          onClick={onClear}
          type="button"
        >
          Clear
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--console-border)] bg-[var(--console-input-bg)] p-4 text-sm text-[var(--console-text-muted)]">
          No prompts yet. Run a session to save history.
        </div>
      ) : (
        <div className="flex max-h-[320px] flex-col gap-3 overflow-y-auto pr-1">
          {entries.map((entry) => (
            <button
              key={entry.id}
              className="group rounded-lg border border-[var(--console-border)] bg-[var(--console-input-bg)] px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-[var(--console-accent)]"
              onClick={() => onSelect(entry)}
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[var(--console-text)]">
                  {entry.artistId}
                </p>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
                  {formatTimestamp(entry.timestamp)}
                </span>
              </div>
              <p className="mt-2 max-h-10 overflow-hidden text-xs text-[var(--console-text-muted)]">
                {entry.prompt}
              </p>
              {entry.resumeSessionId ? (
                <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
                  Resume: {entry.resumeSessionId}
                </p>
              ) : null}
              {entry.sessionId ? (
                <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[var(--console-accent)]">
                  Session: {entry.sessionId.slice(0, 20)}...
                </p>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
