import type { ConsoleMessageBlock } from "./types";

export function parseConsoleMessageBlocks(
  content: string
): ConsoleMessageBlock[] | null {
  const trimmed = content.trim();
  if (!trimmed.startsWith("[")) return null;

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed[0];
      if (
        first &&
        typeof first === "object" &&
        "type" in first &&
        (first.type === "text" || first.type === "tool_use")
      ) {
        return parsed as ConsoleMessageBlock[];
      }
    }
  } catch {
    // Not valid JSON
  }

  return null;
}
