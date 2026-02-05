"use client";

import { memo, useEffect, useRef, useState } from "react";
import StatusTimeline from "./StatusTimeline";
import type { ConsoleLogEntry } from "../lib/types";

interface StreamViewerProps {
  phase: string | null;
  logs: ConsoleLogEntry[];
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleTimeString();
}

const LogEntry = memo(function LogEntry({ entry }: { entry: ConsoleLogEntry }) {
  const hasJsonRender = entry.meta?.hasJsonRender;
  const jsonRenderCount = entry.meta?.jsonRenderBlockCount ?? 0;
  const loadedSkill = entry.meta?.loadedSkill;

  return (
    <div className="console-log-entry rounded-md border border-transparent bg-white px-3 py-2">
      <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-[var(--console-text-muted)]">
        <span className="font-mono">{formatTimestamp(entry.timestamp)}</span>
        <span
          className={`font-mono ${
            entry.stream === "stdout"
              ? "text-[var(--console-success)]"
              : "text-[var(--console-warning)]"
          }`}
        >
          {entry.stream}
        </span>
        {hasJsonRender && (
          <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[9px] font-medium text-purple-700">
            json-render ×{jsonRenderCount}
          </span>
        )}
        {loadedSkill && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-medium text-blue-700">
            skill: {loadedSkill}
          </span>
        )}
      </div>
      <pre
        className={`mt-2 whitespace-pre-wrap text-sm ${
          entry.stream === "stdout"
            ? "text-[var(--console-success)]"
            : "text-[var(--console-warning)]"
        }`}
      >
        {entry.content}
      </pre>
    </div>
  );
});

export default function StreamViewer({ phase, logs }: StreamViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPinned, setIsPinned] = useState(true);

  // Compute session-level stats
  const jsonRenderTotal = logs.reduce(
    (sum, log) => sum + (log.meta?.jsonRenderBlockCount ?? 0),
    0
  );
  const skillsLoaded = [
    ...new Set(
      logs
        .map((log) => log.meta?.loadedSkill)
        .filter((s): s is string => Boolean(s))
    ),
  ];

  useEffect(() => {
    if (!isPinned) {
      return;
    }
    const container = containerRef.current;
    if (!container) {
      return;
    }
    container.scrollTop = container.scrollHeight;
  }, [logs, isPinned]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const distanceToBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    setIsPinned(distanceToBottom < 40);
  };

  const jumpToBottom = () => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    container.scrollTop = container.scrollHeight;
    setIsPinned(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <StatusTimeline phase={phase} />

      <div className="rounded-xl border border-[var(--console-border)] bg-[var(--console-surface)] p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--console-text-muted)]">
              Stream Logs
            </p>
            {jsonRenderTotal > 0 && (
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[9px] font-medium text-purple-700">
                {jsonRenderTotal} json-render block{jsonRenderTotal > 1 ? "s" : ""}
              </span>
            )}
            {skillsLoaded.length > 0 && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-medium text-blue-700">
                {skillsLoaded.length} skill{skillsLoaded.length > 1 ? "s" : ""} loaded
              </span>
            )}
            {jsonRenderTotal === 0 && logs.length > 0 && skillsLoaded.includes("json-render") && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-medium text-amber-700">
                json-render skill loaded but not used
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-[var(--console-text-muted)]">
            <span>{logs.length} lines</span>
            {!isPinned ? (
              <button
                className="rounded-full border border-[var(--console-border)] px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-[var(--console-text-muted)] transition hover:text-[var(--console-text)]"
                onClick={jumpToBottom}
                type="button"
              >
                Jump to Latest
              </button>
            ) : null}
          </div>
        </div>

        <div
          aria-live="polite"
          className="mt-4 max-h-[360px] overflow-y-auto rounded-lg border border-[var(--console-border)] bg-[var(--console-input-bg)] p-3"
          onScroll={handleScroll}
          ref={containerRef}
          role="log"
        >
          {logs.length === 0 ? (
            <div className="rounded-md border border-dashed border-[var(--console-border)] p-4 text-sm text-[var(--console-text-muted)]">
              Stream output will appear here once the session starts.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {logs.map((entry) => (
                <LogEntry key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
