"use client";

import { useState, type FormEvent } from "react";
import type { ConsoleQueryParams } from "../lib/types";

interface QueryFormProps {
  onSubmit: (params: ConsoleQueryParams) => void;
  onStop: () => void;
  isStreaming: boolean;
  initialValues?: Partial<ConsoleQueryParams>;
  latestSessionId?: string;
}

export default function QueryForm({
  onSubmit,
  onStop,
  isStreaming,
  initialValues,
  latestSessionId,
}: QueryFormProps) {
  const initialUserId = initialValues?.userId ?? "";
  const initialArtistId = initialValues?.artistId ?? "";
  const initialPrompt = initialValues?.prompt ?? "";
  const initialOwnedIds = initialValues?.ownedArtistIds ?? "";
  const initialResume = initialValues?.resumeSessionId ?? "";

  const [userId, setUserId] = useState(initialUserId);
  const [artistId, setArtistId] = useState(initialArtistId);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [ownedArtistIds, setOwnedArtistIds] = useState(initialOwnedIds);
  const [resumeSessionId, setResumeSessionId] = useState(initialResume);
  const [autoOwnedIds, setAutoOwnedIds] = useState(
    initialOwnedIds.length === 0 || initialOwnedIds === initialArtistId
  );
  const hasLatestSession = Boolean(latestSessionId);

  const submit = (resumeOverride?: string) => {
    const trimmedUserId = userId.trim();
    const trimmedArtistId = artistId.trim();
    const trimmedPrompt = prompt.trim();
    const trimmedOwnedIds = autoOwnedIds
      ? trimmedArtistId
      : ownedArtistIds.trim();

    if (!trimmedUserId || !trimmedArtistId || !trimmedPrompt) {
      return;
    }

    const trimmedResume = resumeSessionId.trim();
    const resolvedResumeId = resumeOverride ?? (trimmedResume || undefined);

    onSubmit({
      userId: trimmedUserId,
      artistId: trimmedArtistId,
      ownedArtistIds: trimmedOwnedIds,
      prompt: trimmedPrompt,
      resumeSessionId: resolvedResumeId,
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit();
  };

  const handleContinue = () => {
    if (!latestSessionId) {
      return;
    }
    setResumeSessionId(latestSessionId);
    submit(latestSessionId);
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
          User ID
          <input
            className="rounded-lg border border-[var(--console-border)] bg-[var(--console-input-bg)] px-3 py-2 text-sm font-medium text-[var(--console-text)] outline-none transition focus:border-[var(--console-accent)]"
            disabled={isStreaming}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="user_123"
            required
            value={userId}
          />
        </label>
        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
          Artist ID
          <input
            className="rounded-lg border border-[var(--console-border)] bg-[var(--console-input-bg)] px-3 py-2 text-sm font-medium text-[var(--console-text)] outline-none transition focus:border-[var(--console-accent)]"
            disabled={isStreaming}
            onChange={(event) => setArtistId(event.target.value)}
            placeholder="user_123_artist_001"
            required
            value={artistId}
          />
        </label>
      </div>

      <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
        Owned Artist IDs (comma-separated)
        <input
          className="rounded-lg border border-[var(--console-border)] bg-[var(--console-input-bg)] px-3 py-2 text-sm font-medium text-[var(--console-text)] outline-none transition focus:border-[var(--console-accent)] disabled:opacity-60"
          disabled={isStreaming || autoOwnedIds}
          onChange={(event) => setOwnedArtistIds(event.target.value)}
          placeholder="artist_a, artist_b"
          value={autoOwnedIds ? artistId : ownedArtistIds}
        />
      </label>

      <label className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
        <input
          checked={autoOwnedIds}
          className="h-4 w-4 rounded border border-[var(--console-border)] bg-[var(--console-input-bg)] text-[var(--console-accent)]"
          disabled={isStreaming}
          onChange={(event) => setAutoOwnedIds(event.target.checked)}
          type="checkbox"
        />
        Auto-fill x-artist-ids with artist id
      </label>

      <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
        Prompt
        <textarea
          className="min-h-[120px] rounded-lg border border-[var(--console-border)] bg-[var(--console-input-bg)] px-3 py-2 text-sm font-medium text-[var(--console-text)] outline-none transition focus:border-[var(--console-accent)]"
          disabled={isStreaming}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="What is in my workspace?"
          required
          value={prompt}
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
          Resume Session ID (optional)
        </span>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-[var(--console-border)] bg-[var(--console-input-bg)] px-3 py-2 text-sm font-medium text-[var(--console-text)] outline-none transition focus:border-[var(--console-accent)]"
            disabled={isStreaming}
            onChange={(event) => setResumeSessionId(event.target.value)}
            placeholder="session_abc"
            value={resumeSessionId}
          />
          <button
            type="button"
            disabled={isStreaming || !latestSessionId}
            onClick={() => setResumeSessionId(latestSessionId ?? "")}
            className="rounded-lg border border-[var(--console-border)] bg-[var(--console-input-bg)] px-3 py-2 text-xs uppercase tracking-[0.2em] text-[var(--console-text-muted)] transition hover:text-[var(--console-text)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Use Latest
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        {hasLatestSession ? (
          <button
            className="rounded-full bg-[var(--console-accent)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isStreaming}
            onClick={handleContinue}
            type="button"
          >
            Continue Session
          </button>
        ) : null}
        <button
          className={
            hasLatestSession
              ? "rounded-full border border-[var(--console-border)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--console-text-muted)] transition hover:-translate-y-0.5 hover:text-[var(--console-text)] disabled:cursor-not-allowed disabled:opacity-60"
              : "rounded-full bg-[var(--console-accent)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-black transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          }
          disabled={isStreaming}
          type="submit"
        >
          {hasLatestSession ? "Start New Session" : "Start Session"}
        </button>
        <button
          className="rounded-full border border-[var(--console-border)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--console-text-muted)] transition hover:-translate-y-0.5 hover:text-[var(--console-text)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!isStreaming}
          onClick={onStop}
          type="button"
        >
          Stop Stream
        </button>
      </div>
    </form>
  );
}
