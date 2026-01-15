import { memo } from "react";

const PHASES = [
  { id: "sandbox_create", label: "Sandbox" },
  { id: "restore_base", label: "Base Restore" },
  { id: "restore_artist", label: "Artist Restore" },
  { id: "agent_run_start", label: "Agent Run" },
  { id: "snapshot_export", label: "Snapshot" },
] as const;

interface StatusTimelineProps {
  phase: string | null;
}

function StatusTimeline({ phase }: StatusTimelineProps) {
  const activeIndex = phase
    ? PHASES.findIndex((item) => item.id === phase)
    : -1;

  return (
    <div className="rounded-xl border border-[var(--console-border)] bg-[var(--console-surface)] p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.3em] text-[var(--console-text-muted)]">
        Timeline
      </p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-5">
        {PHASES.map((item, index) => {
          const isActive = index === activeIndex;
          const isComplete = activeIndex > index;

          return (
            <div
              key={item.id}
              aria-current={isActive ? "step" : undefined}
              className="flex min-w-0 flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full border ${
                    isComplete
                      ? "border-[var(--console-success)] bg-[var(--console-success)]"
                      : isActive
                        ? "console-phase-active border-[var(--console-accent)] bg-[var(--console-accent)]"
                        : "border-[var(--console-border)] bg-[var(--console-input-bg)]"
                  }`}
                />
                <span
                  className={`break-words text-xs font-semibold uppercase tracking-[0.2em] ${
                    isComplete
                      ? "text-[var(--console-success)]"
                      : isActive
                        ? "text-[var(--console-accent)]"
                        : "text-[var(--console-text-muted)]"
                  }`}
                >
                  {item.label}
                </span>
              </div>
              <span
                className={`break-all text-[10px] uppercase tracking-[0.2em] ${
                  isComplete
                    ? "text-[var(--console-text)]"
                    : "text-[var(--console-text-muted)]"
                }`}
              >
                {item.id}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(StatusTimeline);
