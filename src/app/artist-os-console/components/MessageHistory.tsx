"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Streamdown } from "streamdown";
import type { ConsoleLogEntry, ConsoleMessageBlock } from "../lib/types";
import { parseConsoleMessageBlocks } from "../lib/parse-console-message";
import { splitJsonRenderFences } from "../json-render";
import JsonRenderBlock from "./JsonRenderBlock";
import type { ApplyPromptOptions } from "../json-render/actions";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type TextBlock = Extract<ConsoleMessageBlock, { type: "text" }>;
type ToolUseBlock = Extract<ConsoleMessageBlock, { type: "tool_use" }>;

interface ParsedMessage {
  id: string;
  timestamp: string;
  stream: "stdout" | "stderr";
  blocks: ConsoleMessageBlock[] | null;
  rawContent: string;
}

interface MessageHistoryProps {
  logs: ConsoleLogEntry[];
  isStreaming?: boolean;
  dataContext?: Record<string, unknown>;
  onApplyPrompt?: (prompt: string, options?: ApplyPromptOptions) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Icons (inline SVGs)
// ─────────────────────────────────────────────────────────────────────────────

const toolIcons: Record<string, React.ReactNode> = {
  Read: (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    </svg>
  ),
  Write: (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
      />
    </svg>
  ),
  Bash: (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 17.25V6.75A2.25 2.25 0 0 0 18.75 4.5H5.25A2.25 2.25 0 0 0 3 6.75v10.5A2.25 2.25 0 0 0 5.25 20Z"
      />
    </svg>
  ),
  Search: (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
      />
    </svg>
  ),
  Glob: (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z"
      />
    </svg>
  ),
  List: (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
      />
    </svg>
  ),
};

const defaultToolIcon = (
  <svg
    className="h-4 w-4"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z"
    />
  </svg>
);

function getToolIcon(toolName: string): React.ReactNode {
  return toolIcons[toolName] || defaultToolIcon;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsing
// ─────────────────────────────────────────────────────────────────────────────

function parseMessages(logs: ConsoleLogEntry[]): ParsedMessage[] {
  return logs.map((log) => ({
    id: log.id,
    timestamp: log.timestamp,
    stream: log.stream,
    blocks:
      log.parsedBlocks !== undefined
        ? log.parsedBlocks
        : parseConsoleMessageBlocks(log.content),
    rawContent: log.content,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────────────────────

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

const ToolUseBlockComponent = memo(function ToolUseBlockComponent({
  block,
}: {
  block: ToolUseBlock;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(block.input, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access may fail in non-secure contexts or if permission denied
      console.warn("Failed to copy to clipboard");
    }
  };

  const inputPreview =
    block.input && Object.keys(block.input).length > 0
      ? Object.entries(block.input)
          .map(([k, v]) => {
            const val = typeof v === "string" ? v : JSON.stringify(v);
            return `${k}: ${val.length > 40 ? val.slice(0, 40) + "…" : val}`;
          })
          .join(", ")
      : null;

  return (
    <div className="tool-block group">
      <div className="tool-header">
        <div className="flex items-center gap-2">
          <span className="tool-icon">{getToolIcon(block.name)}</span>
          <span className="tool-badge">{block.name}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            className="tool-action-btn"
            onClick={handleCopy}
            title="Copy input"
            type="button"
          >
            {copied ? (
              <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
              </svg>
            )}
          </button>
          {inputPreview && (
            <button
              className="tool-action-btn"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? "Collapse" : "Expand"}
              type="button"
            >
              <svg
                className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
          )}
        </div>
      </div>
      {inputPreview && !isExpanded && (
        <div className="tool-preview">{inputPreview}</div>
      )}
      {isExpanded && (
        <div className="tool-input-expanded">
          <pre className="text-xs">
            {JSON.stringify(block.input, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
});

const TextBlockComponent = memo(function TextBlockComponent({
  block,
  isStreaming,
  dataContext,
  onApplyPrompt,
}: {
  block: TextBlock;
  isStreaming?: boolean;
  dataContext?: Record<string, unknown>;
  onApplyPrompt?: (prompt: string, options?: ApplyPromptOptions) => void;
}) {
  const segments = useMemo(
    () => splitJsonRenderFences(block.text),
    [block.text]
  );

  const jsonRenderCount = segments.filter((s) => s.type === "json-render").length;

  return (
    <div className="text-block">
      {jsonRenderCount > 0 && (
        <div className="text-block-meta">
          <span className="json-render-badge">
            ✨ json-render ×{jsonRenderCount}
          </span>
        </div>
      )}
      <div className="text-block-content">
        {segments.map((segment, index) => {
          if (segment.type === "text") {
            if (!segment.content.trim()) {
              return null;
            }
            return (
              <div key={`text-${index}`} className="streamdown-content">
                <Streamdown isAnimating={isStreaming}>{segment.content}</Streamdown>
              </div>
            );
          }
          return (
            <JsonRenderBlock
              key={`json-render-${index}`}
              content={segment.content}
              dataContext={dataContext}
              onApplyPrompt={onApplyPrompt}
            />
          );
        })}
      </div>
    </div>
  );
});

const AgentMessage = memo(function AgentMessage({
  blocks,
  timestamp,
  isStreaming,
  dataContext,
  onApplyPrompt,
}: {
  blocks: ConsoleMessageBlock[];
  timestamp: string;
  isStreaming?: boolean;
  dataContext?: Record<string, unknown>;
  onApplyPrompt?: (prompt: string, options?: ApplyPromptOptions) => void;
}) {
  return (
    <div className="message-entry agent-message">
      <div className="message-timestamp">
        {formatTimestamp(timestamp)}
      </div>
      <div className="message-blocks">
        {blocks.map((block, idx) => {
          if (block.type === "text") {
            return (
              <TextBlockComponent
                key={idx}
                block={block}
                isStreaming={isStreaming}
                dataContext={dataContext}
                onApplyPrompt={onApplyPrompt}
              />
            );
          }
          if (block.type === "tool_use") {
            return <ToolUseBlockComponent key={block.id || idx} block={block} />;
          }
          return null;
        })}
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function MessageHistory({
  logs,
  isStreaming,
  dataContext,
  onApplyPrompt,
}: MessageHistoryProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isPinned, setIsPinned] = useState(true);

  const messages = useMemo(() => parseMessages(logs), [logs]);
  const agentMessages = useMemo(
    () => messages.filter((m) => m.blocks !== null),
    [messages]
  );

  useEffect(() => {
    if (!isPinned) return;
    const container = containerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [agentMessages, isPinned]);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    const distanceToBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    setIsPinned(distanceToBottom < 40);
  };

  const jumpToBottom = () => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
    setIsPinned(true);
  };

  return (
    <div className="message-history-container">
      <div className="message-history-header">
        <div className="flex items-center gap-3">
          <div className="message-history-icon">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
              />
            </svg>
          </div>
          <span className="message-history-title">Message History</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="message-history-count">
            {agentMessages.length} messages
          </span>
          {!isPinned && (
            <button
              className="jump-to-bottom-btn"
              onClick={jumpToBottom}
              type="button"
            >
              Jump to Latest
            </button>
          )}
        </div>
      </div>

      <div
        className="message-history-scroll"
        onScroll={handleScroll}
        ref={containerRef}
      >
        {agentMessages.length === 0 ? (
          <div className="message-history-empty">
            <div className="empty-icon">
              <svg
                className="h-8 w-8"
                fill="none"
                stroke="currentColor"
                strokeWidth={1}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
                />
              </svg>
            </div>
            <p>Agent messages will appear here once the session starts.</p>
          </div>
        ) : (
          <div className="message-list">
            {agentMessages.map((msg, idx) => (
              <AgentMessage
                key={msg.id}
                blocks={msg.blocks!}
                timestamp={msg.timestamp}
                isStreaming={isStreaming && idx === agentMessages.length - 1}
                dataContext={dataContext}
                onApplyPrompt={onApplyPrompt}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
