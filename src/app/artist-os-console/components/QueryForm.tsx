"use client";

import { memo, useState, type FormEvent } from "react";
import {
  DEFAULT_SESSION_MODE,
  SESSION_MODE_VALUES,
  type SessionMode,
} from "@/lib/artist-os/session-mode";
import type { ConsoleQueryParams } from "../lib/types";

const SUPPORTED_MASTERING_EXTENSIONS = [".wav"] as const;
const SUPPORTED_MASTERING_EXTENSIONS_LABEL = "WAV";

function hasSupportedMasteringExtension(filePath: string) {
  const lowerPath = filePath.trim().toLowerCase();
  return SUPPORTED_MASTERING_EXTENSIONS.some((extension) =>
    lowerPath.endsWith(extension)
  );
}

interface QueryFormProps {
  onSubmit: (params: ConsoleQueryParams) => void;
  onStop: () => void;
  isStreaming: boolean;
  initialValues?: Partial<ConsoleQueryParams>;
  latestSessionId?: string;
  latestSessionMode?: SessionMode;
}

function QueryForm({
  onSubmit,
  onStop,
  isStreaming,
  initialValues,
  latestSessionId,
  latestSessionMode,
}: QueryFormProps) {
  const initialUserId = initialValues?.userId ?? "";
  const initialIncuratorUserId = initialValues?.incuratorUserId ?? "";
  const initialArtistId = initialValues?.artistId ?? "";
  const initialPrompt = initialValues?.prompt ?? "";
  const initialOwnedIds = initialValues?.ownedArtistIds ?? "";
  const initialSessionMode = initialValues?.sessionMode ?? DEFAULT_SESSION_MODE;
  const initialResume = initialValues?.resumeSessionId ?? "";

  const [userId, setUserId] = useState(initialUserId);
  const [incuratorUserId, setIncuratorUserId] = useState(initialIncuratorUserId);
  const [artistId, setArtistId] = useState(initialArtistId);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [ownedArtistIds, setOwnedArtistIds] = useState(initialOwnedIds);
  const [sessionMode, setSessionMode] =
    useState<SessionMode>(initialSessionMode);
  const [resumeSessionId, setResumeSessionId] = useState(initialResume);
  const [autoOwnedIds, setAutoOwnedIds] = useState(
    initialOwnedIds.length === 0 || initialOwnedIds === initialArtistId
  );
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPath, setAudioPath] = useState("releases/");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const hasLatestSession = Boolean(latestSessionId);

  const submit = (
    resumeOverride?: string,
    sessionModeOverride?: SessionMode
  ) => {
    const trimmedUserId = userId.trim();
    const trimmedIncuratorUserId = incuratorUserId.trim();
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
    const resolvedSessionMode = sessionModeOverride ?? sessionMode;

    onSubmit({
      userId: trimmedUserId,
      incuratorUserId: trimmedIncuratorUserId || undefined,
      artistId: trimmedArtistId,
      ownedArtistIds: trimmedOwnedIds,
      prompt: trimmedPrompt,
      sessionMode: resolvedSessionMode,
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

    const nextSessionMode = latestSessionMode ?? sessionMode;
    if (latestSessionMode) {
      setSessionMode(latestSessionMode);
    }
    setResumeSessionId(latestSessionId);
    submit(latestSessionId, nextSessionMode);
  };

  const handleUploadAudio = async () => {
    const trimmedUserId = userId.trim();
    const trimmedArtistId = artistId.trim();

    if (!trimmedUserId || !trimmedArtistId || !audioFile) {
      setUploadError("Provide user id, artist id, and select an audio file first.");
      setUploadStatus(null);
      return;
    }

    if (!hasSupportedMasteringExtension(audioFile.name)) {
      setUploadError(
        `Unsupported audio format. Only ${SUPPORTED_MASTERING_EXTENSIONS_LABEL} uploads can be mastered.`
      );
      setUploadStatus(null);
      return;
    }

    const trimmedOwnedIds = autoOwnedIds ? trimmedArtistId : ownedArtistIds.trim();
    const targetPath = audioPath.trim();
    const resolvedPath =
      targetPath.length > 0
        ? targetPath.endsWith("/")
          ? `${targetPath}${audioFile.name}`
          : targetPath
        : `releases/${audioFile.name}`;

    if (!hasSupportedMasteringExtension(resolvedPath)) {
      setUploadError(
        `Target path must end in ${SUPPORTED_MASTERING_EXTENSIONS.join(", ")}.`
      );
      setUploadStatus(null);
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("artist_id", trimmedArtistId);
      formData.append("file", audioFile);

      if (targetPath.length > 0) {
        formData.append("path", resolvedPath);
      }

      const headers: Record<string, string> = {
        "x-user-id": trimmedUserId,
      };
      if (trimmedOwnedIds) {
        headers["x-artist-ids"] = trimmedOwnedIds;
      }

      const response = await fetch("/api/artist-os/files/upload", {
        method: "POST",
        headers,
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as
        | { data?: { path?: string }; error?: string }
        | null;

      if (!response.ok) {
        const errorMessage =
          payload && typeof payload.error === "string"
            ? payload.error
            : `Upload failed (${response.status})`;
        setUploadError(errorMessage);
        setUploadStatus(null);
        return;
      }

      setUploadStatus(
        `Uploaded to ${payload?.data?.path ?? `releases/${audioFile.name}`}. You can now ask the agent to master it.`
      );
      setUploadError(null);
    } catch (error) {
      setUploadError(String(error));
      setUploadStatus(null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
          User ID
          <input
            className="rounded-lg border border-[var(--console-border)] bg-[var(--console-input-bg)] px-3 py-2 text-sm font-medium text-[var(--console-text)] outline-none transition focus:border-[var(--console-accent)]"
            disabled={isStreaming}
            name="userId"
            onChange={(event) => setUserId(event.target.value)}
            placeholder="user_123"
            required
            value={userId}
          />
        </label>
        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
          Incurator User ID
          <input
            className="rounded-lg border border-[var(--console-border)] bg-[var(--console-input-bg)] px-3 py-2 text-sm font-medium text-[var(--console-text)] outline-none transition focus:border-[var(--console-accent)]"
            disabled={isStreaming}
            inputMode="numeric"
            name="incuratorUserId"
            onChange={(event) => setIncuratorUserId(event.target.value)}
            placeholder="123"
            value={incuratorUserId}
          />
          <span className="text-[10px] normal-case tracking-normal text-[var(--console-text-muted)]">
            Required only for app-backed tools like mastering. Must be the numeric internal Incurator user id.
          </span>
        </label>
        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
          Artist ID
          <input
            className="rounded-lg border border-[var(--console-border)] bg-[var(--console-input-bg)] px-3 py-2 text-sm font-medium text-[var(--console-text)] outline-none transition focus:border-[var(--console-accent)]"
            disabled={isStreaming}
            name="artistId"
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
          name="ownedArtistIds"
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
          name="autoOwnedIds"
          onChange={(event) => setAutoOwnedIds(event.target.checked)}
          type="checkbox"
        />
        Auto-fill x-artist-ids with artist id
      </label>

      <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
        Session Mode
        <select
          className="rounded-lg border border-[var(--console-border)] bg-[var(--console-input-bg)] px-3 py-2 text-sm font-medium text-[var(--console-text)] outline-none transition focus:border-[var(--console-accent)]"
          disabled={isStreaming}
          name="sessionMode"
          onChange={(event) =>
            setSessionMode(event.target.value as SessionMode)
          }
          value={sessionMode}
        >
          {SESSION_MODE_VALUES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
        Prompt
        <textarea
          className="min-h-[120px] rounded-lg border border-[var(--console-border)] bg-[var(--console-input-bg)] px-3 py-2 text-sm font-medium text-[var(--console-text)] outline-none transition focus:border-[var(--console-accent)]"
          disabled={isStreaming}
          name="prompt"
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="What is in my workspace?"
          required
          value={prompt}
        />
      </label>

      <div className="rounded-lg border border-[var(--console-border)] bg-[var(--console-input-bg)] p-3">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
          Upload Audio to Workspace
        </p>
        <p className="mt-1 text-[11px] text-[var(--console-text-muted)]">
          Upload WAV files into <code>releases/</code> so the mastering tool can use them in the next prompt.
        </p>

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-xs uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
            File
            <input
              className="mt-2 block w-full rounded-lg border border-[var(--console-border)] bg-[var(--console-surface)] px-3 py-2 text-sm text-[var(--console-text)]"
              disabled={isStreaming || isUploading}
              name="audioFile"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                setAudioFile(file);
              }}
              type="file"
              accept={SUPPORTED_MASTERING_EXTENSIONS.join(",")}
            />
          </label>

          <label className="flex-1 text-xs uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
            Target Path
            <input
              className="mt-2 w-full rounded-lg border border-[var(--console-border)] bg-[var(--console-surface)] px-3 py-2 text-sm text-[var(--console-text)]"
              disabled={isStreaming || isUploading}
              name="audioPath"
              onChange={(event) => setAudioPath(event.target.value)}
              placeholder="releases/"
              value={audioPath}
            />
          </label>

          <button
            className="rounded-full border border-[var(--console-border)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-[var(--console-text-muted)] transition hover:-translate-y-0.5 hover:text-[var(--console-text)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isStreaming || isUploading}
            onClick={handleUploadAudio}
            type="button"
          >
            {isUploading ? "Uploading..." : "Upload Audio"}
          </button>
        </div>

        {uploadStatus ? (
          <p className="mt-2 text-xs text-[var(--console-success)]">{uploadStatus}</p>
        ) : null}
        {uploadError ? (
          <p className="mt-2 text-xs text-[var(--console-error)]">{uploadError}</p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
          Resume Session ID (optional)
        </span>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-[var(--console-border)] bg-[var(--console-input-bg)] px-3 py-2 text-sm font-medium text-[var(--console-text)] outline-none transition focus:border-[var(--console-accent)]"
            disabled={isStreaming}
            name="resumeSessionId"
            onChange={(event) => setResumeSessionId(event.target.value)}
            placeholder="session_abc"
            value={resumeSessionId}
          />
          <button
            type="button"
            disabled={isStreaming || !latestSessionId}
            onClick={() => {
              if (latestSessionMode) {
                setSessionMode(latestSessionMode);
              }
              setResumeSessionId(latestSessionId ?? "");
            }}
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

export default memo(QueryForm);
