const CANONICAL_STATUSES = new Set([
  "pending",
  "in_progress",
  "blocked",
  "done",
]);

const STATUS_NORMALIZATIONS: Record<string, string> = {
  todo: "pending",
  new: "pending",
  open: "pending",
  not_started: "pending",
  active: "in_progress",
  working: "in_progress",
  complete: "done",
  completed: "done",
  finished: "done",
};

export function normalizeTaskStatuses(content: string): {
  content: string;
  changed: boolean;
} {
  try {
    const data = JSON.parse(content);
    if (!Array.isArray(data)) {
      return { content, changed: false };
    }

    let changed = false;

    for (const task of data) {
      if (!task || typeof task !== "object") {
        continue;
      }
      const statusValue = (task as { status?: unknown }).status;
      if (typeof statusValue !== "string") {
        continue;
      }

      const key = statusValue.trim().toLowerCase();
      const normalized =
        STATUS_NORMALIZATIONS[key] ??
        (CANONICAL_STATUSES.has(key) ? key : undefined);

      if (normalized && normalized !== statusValue) {
        (task as { status?: string }).status = normalized;
        changed = true;
      }
    }

    if (!changed) {
      return { content, changed: false };
    }

    return {
      content: JSON.stringify(data, null, 2),
      changed: true,
    };
  } catch {
    return { content, changed: false };
  }
}
