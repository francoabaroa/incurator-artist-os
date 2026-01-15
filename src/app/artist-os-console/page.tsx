"use client";

import "./console.css";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import DebugDrawer from "./components/DebugDrawer";
import MessageHistory from "./components/MessageHistory";
import PromptHistory from "./components/PromptHistory";
import QueryForm from "./components/QueryForm";
import ResultPanel from "./components/ResultPanel";
import StreamViewer from "./components/StreamViewer";
import { usePromptHistory } from "./hooks/use-prompt-history";
import { useSseStream } from "./hooks/use-sse-stream";
import type { ConsoleQueryParams, HistoryEntry } from "./lib/types";

const consoleTheme: CSSProperties = {
  "--console-bg": "#f1f5f9",
  "--console-surface": "#ffffff",
  "--console-border": "#cbd5e1",
  "--console-text": "#0f172a",
  "--console-text-muted": "#475569",
  "--console-accent": "#4f46e5",
  "--console-success": "#059669",
  "--console-warning": "#d97706",
  "--console-error": "#e11d48",
  "--console-input-bg": "#f8fafc",
  backgroundColor: "var(--console-bg)",
  backgroundImage:
    "radial-gradient(900px 500px at 15% -10%, rgba(99, 102, 241, 0.08), transparent 60%), radial-gradient(700px 400px at 85% 0%, rgba(16, 185, 129, 0.06), transparent 60%)",
} as CSSProperties;

export default function ArtistOSConsolePage() {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [formSeed, setFormSeed] = useState(0);
  const [formDefaults, setFormDefaults] = useState<
    Partial<ConsoleQueryParams>
  >({});
  const [lastRequest, setLastRequest] = useState<ConsoleQueryParams | null>(
    null
  );
  const { state, start, stop } = useSseStream();
  const { entries, add, update, clear } = usePromptHistory();
  const lastHistoryIdRef = useRef<string | null>(null);
  const latestSessionId = state.result?.sessionId;

  useEffect(() => {
    const lastHistoryId = lastHistoryIdRef.current;
    if (lastHistoryId && !state.isStreaming && state.result?.sessionId) {
      update(lastHistoryId, { sessionId: state.result.sessionId });
      lastHistoryIdRef.current = null;
    }
  }, [state.isStreaming, state.result?.sessionId, update]);

  const handleSubmit = (params: ConsoleQueryParams) => {
    setLastRequest(params);
    const entryId = add({
      userId: params.userId,
      artistId: params.artistId,
      prompt: params.prompt,
      resumeSessionId: params.resumeSessionId,
    });
    lastHistoryIdRef.current = entryId;
    void start(params);
  };

  const handleSelectHistory = (entry: HistoryEntry) => {
    setFormDefaults({
      userId: entry.userId,
      artistId: entry.artistId,
      prompt: entry.prompt,
      resumeSessionId: entry.sessionId ?? entry.resumeSessionId,
    });
    setFormSeed((seed) => seed + 1);
  };

  return (
    <div
      className="console-root min-h-screen w-full text-[var(--console-text)]"
      style={consoleTheme}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--console-border)] pb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-[var(--console-text-muted)]">
              Developer Console
            </p>
            <h1 className="text-2xl font-semibold text-[var(--console-text)]">
              Artist OS Console
            </h1>
            <p className="mt-2 max-w-xl text-sm text-[var(--console-text-muted)]">
              Run Artist OS sessions end-to-end and watch the real-time stream
              for status phases, logs, and snapshot manifests.
            </p>
            {state.phase ? (
              <p className="mt-3 text-xs uppercase tracking-[0.3em] text-[var(--console-text-muted)]">
                Current Phase: {state.phase}
              </p>
            ) : null}
          </div>
          <button
            className="rounded-full border border-[var(--console-border)] bg-[var(--console-surface)] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[var(--console-text-muted)] transition hover:-translate-y-0.5 hover:text-[var(--console-text)]"
            onClick={() => setIsDrawerOpen(true)}
            type="button"
          >
            Open Debug Drawer
          </button>
        </header>

        <main className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <section className="flex flex-col gap-6">
            <div className="rounded-xl border border-[var(--console-border)] bg-[var(--console-surface)] p-5 shadow-sm">
              <p className="text-xs uppercase tracking-[0.3em] text-[var(--console-text-muted)]">
                Query Form
              </p>
              <div className="mt-4">
                <QueryForm
                  key={formSeed}
                  initialValues={formDefaults}
                  isStreaming={state.isStreaming}
                  latestSessionId={latestSessionId}
                  onStop={stop}
                  onSubmit={handleSubmit}
                />
              </div>
            </div>
            <div className="rounded-xl border border-[var(--console-border)] bg-[var(--console-surface)] p-5 shadow-sm">
              <PromptHistory
                entries={entries}
                onClear={clear}
                onSelect={handleSelectHistory}
              />
            </div>
          </section>
          <section className="flex flex-col gap-6">
            <MessageHistory
              logs={state.logs}
              isStreaming={state.isStreaming}
            />
            <StreamViewer phase={state.phase} logs={state.logs} />
            <ResultPanel
              error={state.error}
              result={state.result}
              statusCode={state.statusCode}
            />
          </section>
        </main>
      </div>

      <DebugDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        request={lastRequest}
        runState={state}
      />
    </div>
  );
}
