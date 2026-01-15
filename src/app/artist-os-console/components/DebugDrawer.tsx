"use client";

import { useState } from "react";
import type { ConsoleQueryParams, ConsoleRunState } from "../lib/types";

interface DebugDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  request: ConsoleQueryParams | null;
  runState: ConsoleRunState;
}

interface ActionState {
  loading: boolean;
  status: number | null;
  payload: unknown | null;
  error: string | null;
}

function formatTimestamp(value: number | null) {
  if (!value) {
    return "-";
  }
  return new Date(value).toLocaleString();
}

function formatDuration(startedAt: number | null, finishedAt: number | null) {
  if (!startedAt) {
    return "-";
  }
  const end = finishedAt ?? Date.now();
  const durationMs = Math.max(end - startedAt, 0);
  const seconds = Math.floor(durationMs / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function extractError(payload: unknown, status: number) {
  if (payload && typeof payload === "object" && "error" in payload) {
    const message = (payload as { error?: unknown }).error;
    if (typeof message === "string") {
      return message;
    }
  }
  return `HTTP ${status}`;
}

function formatPayload(payload: unknown) {
  if (payload === null || payload === undefined) {
    return "-";
  }
  if (typeof payload === "string") {
    return payload;
  }
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

export default function DebugDrawer({
  isOpen,
  onClose,
  request,
  runState,
}: DebugDrawerProps) {
  const [adminToken, setAdminToken] = useState("");
  const [sandboxId, setSandboxId] = useState("");
  const [snapshotState, setSnapshotState] = useState<ActionState>({
    loading: false,
    status: null,
    payload: null,
    error: null,
  });
  const [resetState, setResetState] = useState<ActionState>({
    loading: false,
    status: null,
    payload: null,
    error: null,
  });
  const [stopState, setStopState] = useState<ActionState>({
    loading: false,
    status: null,
    payload: null,
    error: null,
  });

  const ownedIds = request?.ownedArtistIds?.trim() || request?.artistId || "";
  const hasRequest = Boolean(request?.artistId && request?.userId);

  const headersSummary = [
    "Content-Type: application/json",
    request?.userId ? `x-user-id: ${request.userId}` : "x-user-id: -",
    ownedIds ? `x-artist-ids: ${ownedIds}` : "x-artist-ids: -",
  ].join("\n");

  const runAdminAction = async (
    action: "snapshot" | "reset" | "stop"
  ) => {
    const token = adminToken.trim();
    if (!token) {
      const errorState = {
        loading: false,
        status: null,
        payload: null,
        error: "Admin token is required.",
      };
      if (action === "snapshot") {
        setSnapshotState(errorState);
      } else if (action === "reset") {
        setResetState(errorState);
      } else {
        setStopState(errorState);
      }
      return;
    }

    if (!request?.artistId && action !== "stop") {
      return;
    }

    if (!request?.artistId && action === "stop" && !sandboxId.trim()) {
      setStopState({
        loading: false,
        status: null,
        payload: null,
        error: "Artist ID or Sandbox ID is required.",
      });
      return;
    }

    const setState =
      action === "snapshot"
        ? setSnapshotState
        : action === "reset"
          ? setResetState
          : setStopState;

    setState({ loading: true, status: null, payload: null, error: null });

    try {
      const headers: Record<string, string> = {
        "x-admin-token": token,
      };

      let response: Response;
      if (action === "snapshot") {
        response = await fetch(
          `/api/artist-os/snapshot?artist_id=${encodeURIComponent(
            request?.artistId ?? ""
          )}`,
          { headers }
        );
      } else if (action === "reset") {
        headers["Content-Type"] = "application/json";
        response = await fetch("/api/artist-os/snapshot", {
          method: "DELETE",
          headers,
          body: JSON.stringify({ artist_id: request?.artistId }),
        });
      } else {
        headers["Content-Type"] = "application/json";
        const payload = sandboxId.trim()
          ? { sandbox_id: sandboxId.trim() }
          : { artist_id: request?.artistId };
        response = await fetch("/api/artist-os/stop", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
      }

      const contentType = response.headers.get("content-type") ?? "";
      const payload = contentType.includes("application/json")
        ? await response.json().catch(() => null)
        : await response.text().catch(() => null);

      if (!response.ok) {
        setState({
          loading: false,
          status: response.status,
          payload,
          error: extractError(payload, response.status),
        });
        return;
      }

      setState({
        loading: false,
        status: response.status,
        payload,
        error: null,
      });
    } catch (error) {
      setState({
        loading: false,
        status: null,
        payload: null,
        error: String(error),
      });
    }
  };

  const handleReset = async () => {
    if (
      request?.artistId &&
      !window.confirm(
        `Reset snapshot pointers for ${request.artistId}? This cannot be undone.`
      )
    ) {
      return;
    }
    await runAdminAction("reset");
  };

  return (
    <>
      <button
        aria-hidden={!isOpen}
        aria-label="Close debug drawer"
        className={`fixed inset-0 z-40 bg-slate-900/20 transition-opacity ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        type="button"
      />
      <aside
        aria-hidden={!isOpen}
        className={`fixed bottom-0 left-0 z-50 h-[70vh] w-full border-t border-[var(--console-border)] bg-[var(--console-surface)] shadow-2xl shadow-slate-200 transition-transform duration-300 ease-out sm:bottom-auto sm:left-auto sm:right-0 sm:top-0 sm:h-full sm:max-w-[360px] sm:border-l sm:border-t-0 ${
          isOpen ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col gap-6 overflow-y-auto p-6 text-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold tracking-wide text-[var(--console-text)]">
              Debug Drawer
            </p>
            <button
              className="rounded-md border border-[var(--console-border)] px-2 py-1 text-xs uppercase tracking-widest text-[var(--console-text-muted)] transition hover:text-[var(--console-text)]"
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          </div>

          <section className="rounded-lg border border-[var(--console-border)] bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--console-text-muted)]">
              Request Context
            </p>
            <div className="mt-4 grid gap-3 text-xs">
              <div>
                <span className="uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
                  User ID
                </span>
                <p className="mt-1 font-mono text-[var(--console-text)]">
                  {request?.userId ?? "-"}
                </p>
              </div>
              <div>
                <span className="uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
                  Artist ID
                </span>
                <p className="mt-1 font-mono text-[var(--console-text)]">
                  {request?.artistId ?? "-"}
                </p>
              </div>
              <div>
                <span className="uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
                  Owned Artist IDs
                </span>
                <p className="mt-1 font-mono text-[var(--console-text)]">
                  {ownedIds || "-"}
                </p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--console-text-muted)]">
                Headers
              </p>
              <pre className="mt-2 whitespace-pre-wrap rounded-md border border-[var(--console-border)] bg-white p-3 font-mono text-[11px] text-[var(--console-text)]">
                {headersSummary}
              </pre>
            </div>
            {!hasRequest ? (
              <p className="mt-3 text-[11px] text-[var(--console-text-muted)]">
                Submit a request to populate header values.
              </p>
            ) : null}
          </section>

          <section className="rounded-lg border border-[var(--console-border)] bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--console-text-muted)]">
              Run Summary
            </p>
            <div className="mt-4 grid gap-3 text-xs">
              <div>
                <span className="uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
                  Duration
                </span>
                <p className="mt-1 font-mono text-[var(--console-text)]">
                  {formatDuration(runState.startedAt, runState.finishedAt)}
                </p>
              </div>
              <div>
                <span className="uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
                  Started At
                </span>
                <p className="mt-1 font-mono text-[var(--console-text)]">
                  {formatTimestamp(runState.startedAt)}
                </p>
              </div>
              <div>
                <span className="uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
                  Finished At
                </span>
                <p className="mt-1 font-mono text-[var(--console-text)]">
                  {runState.isStreaming
                    ? "In progress"
                    : formatTimestamp(runState.finishedAt)}
                </p>
              </div>
              <div>
                <span className="uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
                  Last Phase
                </span>
                <p className="mt-1 font-mono text-[var(--console-text)]">
                  {runState.phase ?? "-"}
                </p>
              </div>
              <div>
                <span className="uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
                  Log Count
                </span>
                <p className="mt-1 font-mono text-[var(--console-text)]">
                  {runState.logs.length}
                </p>
              </div>
              <div>
                <span className="uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
                  Exit Code
                </span>
                <p className="mt-1 font-mono text-[var(--console-text)]">
                  {runState.result?.exitCode ?? "-"}
                </p>
              </div>
              <div>
                <span className="uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
                  Resume ID (input)
                </span>
                <p className="mt-1 break-all font-mono text-[var(--console-text)]">
                  {request?.resumeSessionId || "-"}
                </p>
              </div>
              <div>
                <span className="uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
                  Session ID (output)
                </span>
                <p className="mt-1 break-all font-mono text-[var(--console-text)]">
                  {runState.result?.sessionId || "-"}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-[var(--console-border)] bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-[var(--console-text-muted)]">
              Admin Actions
            </p>
            <div className="mt-4 flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.3em] text-[var(--console-text-muted)]">
                Admin Token
                <input
                  className="rounded-md border border-[var(--console-border)] bg-[var(--console-input-bg)] px-3 py-2 text-xs text-[var(--console-text)] outline-none focus:border-[var(--console-accent)]"
                  onChange={(event) => setAdminToken(event.target.value)}
                  placeholder="ARTIST_OS_ADMIN_TOKEN"
                  type="password"
                  value={adminToken}
                />
              </label>
              <label className="flex flex-col gap-2 text-[10px] uppercase tracking-[0.3em] text-[var(--console-text-muted)]">
                Sandbox ID (optional)
                <input
                  className="rounded-md border border-[var(--console-border)] bg-[var(--console-input-bg)] px-3 py-2 text-xs text-[var(--console-text)] outline-none focus:border-[var(--console-accent)]"
                  onChange={(event) => setSandboxId(event.target.value)}
                  placeholder="sandbox_123"
                  type="text"
                  value={sandboxId}
                />
              </label>

              <div className="flex flex-col gap-3">
                <button
                  className="rounded-md border border-[var(--console-border)] px-3 py-2 text-[11px] uppercase tracking-[0.3em] text-[var(--console-text-muted)] transition hover:text-[var(--console-text)] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!request?.artistId || snapshotState.loading}
                  onClick={() => runAdminAction("snapshot")}
                  type="button"
                >
                  {snapshotState.loading
                    ? "Fetching..."
                    : "Fetch Snapshot Pointers"}
                </button>
                <pre className="whitespace-pre-wrap rounded-md border border-[var(--console-border)] bg-black/40 p-3 font-mono text-[11px] text-[var(--console-text)]">
                  {snapshotState.error
                    ? `Error: ${snapshotState.error}`
                    : formatPayload(snapshotState.payload)}
                </pre>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  className="rounded-md border border-[var(--console-border)] px-3 py-2 text-[11px] uppercase tracking-[0.3em] text-[var(--console-text-muted)] transition hover:text-[var(--console-text)] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!request?.artistId || resetState.loading}
                  onClick={handleReset}
                  type="button"
                >
                  {resetState.loading
                    ? "Resetting..."
                    : "Reset Snapshot Pointers"}
                </button>
                <pre className="whitespace-pre-wrap rounded-md border border-[var(--console-border)] bg-black/40 p-3 font-mono text-[11px] text-[var(--console-text)]">
                  {resetState.error
                    ? `Error: ${resetState.error}`
                    : formatPayload(resetState.payload)}
                </pre>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  className="rounded-md border border-[var(--console-border)] px-3 py-2 text-[11px] uppercase tracking-[0.3em] text-[var(--console-text-muted)] transition hover:text-[var(--console-text)] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={stopState.loading || (!request?.artistId && !sandboxId)}
                  onClick={() => runAdminAction("stop")}
                  type="button"
                >
                  {stopState.loading ? "Stopping..." : "Stop Sandbox"}
                </button>
                <pre className="whitespace-pre-wrap rounded-md border border-[var(--console-border)] bg-black/40 p-3 font-mono text-[11px] text-[var(--console-text)]">
                  {stopState.error
                    ? `Error: ${stopState.error}`
                    : formatPayload(stopState.payload)}
                </pre>
              </div>
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}
