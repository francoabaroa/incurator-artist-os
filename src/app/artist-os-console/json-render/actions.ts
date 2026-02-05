import type { ActionConfirm, ActionHandler } from "@json-render/core";

export interface ApplyPromptOptions {
  userId?: string | null;
  artistId?: string | null;
  resumeSessionId?: string | null;
  ownedArtistIds?: string | null;
}

export interface JsonRenderActionContext {
  onApplyPrompt?: (prompt: string, options?: ApplyPromptOptions) => void;
  notify?: (message: string, tone?: "success" | "warning" | "danger") => void;
}

export function resolveConfirm(
  confirm: ActionConfirm | null | undefined
): ActionConfirm | null {
  if (!confirm) return null;
  return {
    ...confirm,
    variant: confirm.variant ?? "default",
  };
}

export function buildActionHandlers(
  context: JsonRenderActionContext
): Record<string, ActionHandler> {
  return {
    copy_to_clipboard: async (params) => {
      const text = String((params as { text?: string }).text ?? "");
      if (!text) {
        context.notify?.("Nothing to copy", "warning");
        return;
      }

      try {
        await navigator.clipboard.writeText(text);
        context.notify?.("Copied to clipboard", "success");
      } catch (error) {
        console.warn("Failed to copy to clipboard", error);
        context.notify?.("Copy failed", "danger");
      }
    },
    open_url: (params) => {
      const url = String((params as { url?: string }).url ?? "");
      if (!isSafeUrl(url)) {
        context.notify?.("Invalid URL", "warning");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    },
    apply_prompt: (params) => {
      const payload = params as {
        prompt?: string;
        userId?: string | null;
        artistId?: string | null;
        resumeSessionId?: string | null;
        ownedArtistIds?: string | null;
      };

      const prompt = String(payload.prompt ?? "");
      if (!prompt) {
        context.notify?.("Prompt is empty", "warning");
        return;
      }

      context.onApplyPrompt?.(prompt, {
        userId: payload.userId ?? null,
        artistId: payload.artistId ?? null,
        resumeSessionId: payload.resumeSessionId ?? null,
        ownedArtistIds: payload.ownedArtistIds ?? null,
      });
      context.notify?.("Prompt applied", "success");
    },
  };
}

function isSafeUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
