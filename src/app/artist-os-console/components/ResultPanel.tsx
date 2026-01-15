import { memo } from "react";
import type { DoneData } from "../lib/types";

interface ResultPanelProps {
  result: DoneData | null;
  error: string | null;
  statusCode: number | null;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) {
    return "-";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

function ResultPanel({
  result,
  error,
  statusCode,
}: ResultPanelProps) {
  return (
    <div className="rounded-xl border border-[var(--console-border)] bg-[var(--console-surface)] p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.3em] text-[var(--console-text-muted)]">
          Results
        </p>
        {statusCode ? (
          <span className="rounded-full border border-[var(--console-border)] px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-[var(--console-text-muted)]">
            HTTP {statusCode}
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-[var(--console-error)] bg-[var(--console-input-bg)] p-4 text-sm text-[var(--console-error)]">
          {error}
        </div>
      ) : result ? (
        <div className="mt-4 grid gap-4 text-sm text-[var(--console-text)]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[var(--console-success)] px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-white">
              {result.ok ? "Success" : "Failed"}
            </span>
            <span className="text-xs uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
              Exit Code: {result.exitCode}
            </span>
          </div>
          <div className="rounded-lg border border-[var(--console-border)] bg-[var(--console-input-bg)] p-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
                  Artist ID
                </dt>
                <dd className="mt-1 font-mono text-xs text-[var(--console-text)]">
                  {result.manifest.artist_id}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
                  Snapshot Key
                </dt>
                <dd className="mt-1 font-mono text-xs text-[var(--console-text)]">
                  {result.manifest.snapshot_key}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
                  Snapshot Version
                </dt>
                <dd className="mt-1 font-mono text-xs text-[var(--console-text)]">
                  {result.manifest.snapshot_version}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
                  Created At
                </dt>
                <dd className="mt-1 font-mono text-xs text-[var(--console-text)]">
                  {result.manifest.created_at}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
                  Workspace Size
                </dt>
                <dd className="mt-1 font-mono text-xs text-[var(--console-text)]">
                  {formatBytes(result.manifest.workspace_size_bytes)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
                  Checksum
                </dt>
                <dd className="mt-1 font-mono text-xs text-[var(--console-text)]">
                  {result.manifest.checksum_sha256}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
                  Session ID
                </dt>
                <dd className="mt-1 break-all font-mono text-xs text-[var(--console-text)]">
                  {result.sessionId ?? "-"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-[var(--console-border)] bg-[var(--console-input-bg)] p-4 text-sm text-[var(--console-text-muted)]">
          No completed run yet.
        </div>
      )}
    </div>
  );
}

export default memo(ResultPanel);
