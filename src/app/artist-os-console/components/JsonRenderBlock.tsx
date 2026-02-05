"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { artistOSRegistry, buildActionHandlers, parseJsonRenderContent } from "../json-render";
import type { ApplyPromptOptions } from "../json-render/actions";
import type { ComponentRenderProps } from "@json-render/react";

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

function DataContextSync({ dataContext }: { dataContext?: Record<string, unknown> }) {
  const { update } = useData();

  useEffect(() => {
    if (!dataContext) return;
    update(dataContext);
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

  const handlers = useMemo(
    () => buildActionHandlers({ onApplyPrompt, notify }),
    [onApplyPrompt, notify]
  );

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
      )}
    </div>
  );
}
