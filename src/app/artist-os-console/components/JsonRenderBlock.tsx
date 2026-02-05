"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActionProvider,
  ConfirmDialog,
  DataProvider,
  Renderer,
  VisibilityProvider,
  useActions,
  useData,
} from "@json-render/react";
import type { UITree } from "@json-render/core";
import type { ActionHandler } from "@json-render/core";
import { artistOSRegistry, parseJsonRenderContent } from "../json-render";
import type { ApplyPromptOptions } from "../json-render/actions";
import type { ComponentRenderProps } from "@json-render/react";
import { JsonRenderErrorBoundary } from "./ErrorBoundary";

interface JsonRenderBlockProps {
  content: string;
  dataContext?: Record<string, unknown>;
  onApplyPrompt?: (prompt: string, options?: ApplyPromptOptions) => void;
}

function JsonRenderConfirmDialog() {
  const { pendingConfirmation, confirm, cancel } = useActions();
  if (!pendingConfirmation?.action.confirm) return null;

  return (
    <ConfirmDialog
      confirm={pendingConfirmation.action.confirm}
      onConfirm={confirm}
      onCancel={cancel}
    />
  );
}

function UnknownComponent({ element }: ComponentRenderProps) {
  return (
    <div className="json-render-error">
      Unknown component type: {element.type}
    </div>
  );
}

/**
 * Syncs external dataContext changes into the DataProvider state.
 * Only updates the specific fields we own (phase, result) using JSON Pointer paths.
 */
function DataContextSync({ dataContext }: { dataContext?: Record<string, unknown> }) {
  const { update } = useData();
  const prevDataContextRef = useRef(dataContext);

  useEffect(() => {
    // Skip initial mount (DataProvider already has initialData)
    if (dataContext === prevDataContextRef.current) return;
    prevDataContextRef.current = dataContext;

    if (!dataContext) return;

    // Convert to JSON Pointer paths for the update function
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(dataContext)) {
      updates[`/${key}`] = value;
    }
    update(updates);
  }, [dataContext, update]);

  return null;
}

export default function JsonRenderBlock({
  content,
  dataContext,
  onApplyPrompt,
}: JsonRenderBlockProps) {
  const [showRaw, setShowRaw] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const notify = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 1800);
  }, []);

  // Use refs to ensure handlers always call the latest callbacks.
  // This is necessary because ActionProvider snapshots handlers on mount
  // and doesn't react to prop changes.
  const onApplyPromptRef = useRef(onApplyPrompt);
  const notifyRef = useRef(notify);

  // Keep refs in sync with props
  useEffect(() => {
    onApplyPromptRef.current = onApplyPrompt;
  }, [onApplyPrompt]);

  useEffect(() => {
    notifyRef.current = notify;
  }, [notify]);

  // Build handlers once - they close over refs to always call the latest callbacks.
  // Using useState with initializer to ensure handlers are only created once.
  const [handlers] = useState<Record<string, ActionHandler>>(() => ({
    copy_to_clipboard: async (params) => {
      const text = String((params as { text?: string }).text ?? "");
      if (!text) {
        notifyRef.current?.("Nothing to copy");
        return;
      }
      try {
        await navigator.clipboard.writeText(text);
        notifyRef.current?.("Copied to clipboard");
      } catch (error) {
        console.warn("Failed to copy to clipboard", error);
        notifyRef.current?.("Copy failed");
      }
    },
    open_url: (params) => {
      const url = String((params as { url?: string }).url ?? "");
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          notifyRef.current?.("Invalid URL");
          return;
        }
      } catch {
        notifyRef.current?.("Invalid URL");
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
        notifyRef.current?.("Prompt is empty");
        return;
      }
      onApplyPromptRef.current?.(prompt, {
        userId: payload.userId ?? null,
        artistId: payload.artistId ?? null,
        resumeSessionId: payload.resumeSessionId ?? null,
        ownedArtistIds: payload.ownedArtistIds ?? null,
      });
      notifyRef.current?.("Prompt applied");
    },
  }));

  const parseResult = useMemo(() => {
    try {
      const tree = parseJsonRenderContent(content);
      return { tree, error: null } as { tree: UITree | null; error: string | null };
    } catch (error) {
      return {
        tree: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }, [content]);

  return (
    <div className="json-render-block">
      <div className="json-render-header">
        <span className="json-render-title">json-render</span>
        <div className="json-render-actions">
          {notice && <span className="json-render-notice">{notice}</span>}
          <button
            type="button"
            className="json-render-toggle"
            onClick={() => setShowRaw((value) => !value)}
          >
            {showRaw ? "Hide JSON" : "Show JSON"}
          </button>
        </div>
      </div>

      {parseResult.error ? (
        <div className="json-render-error">
          <strong>Invalid json-render payload</strong>
          <p>{parseResult.error}</p>
          <pre className="json-render-raw">
            <code>{content.trim()}</code>
          </pre>
        </div>
      ) : (
        <JsonRenderErrorBoundary content={content}>
          <DataProvider initialData={dataContext ?? {}}>
            <DataContextSync dataContext={dataContext} />
            <VisibilityProvider>
              <ActionProvider handlers={handlers}>
                <Renderer
                  tree={parseResult.tree}
                  registry={artistOSRegistry}
                  fallback={UnknownComponent}
                />
                {showRaw && (
                  <pre className="json-render-raw">
                    <code>{content.trim()}</code>
                  </pre>
                )}
                <JsonRenderConfirmDialog />
              </ActionProvider>
            </VisibilityProvider>
          </DataProvider>
        </JsonRenderErrorBoundary>
      )}
    </div>
  );
}
