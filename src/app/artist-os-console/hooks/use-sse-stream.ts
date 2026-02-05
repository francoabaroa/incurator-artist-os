"use client";

import { startTransition, useCallback, useRef, useState } from "react";
import { streamSSE } from "../lib/stream-sse";
import { parseConsoleMessageBlocks } from "../lib/parse-console-message";
import type {
  ConsoleQueryParams,
  ConsoleLogEntry,
  ConsoleLogEntryMeta,
  ConsoleRunState,
  StatusData,
  LogData,
  DoneData,
  ErrorData,
} from "../lib/types";

const MAX_LOGS = 2000;
const JSON_RENDER_FENCE_REGEX = /```json-render/g;
const SKILL_READ_REGEX = /\.claude\/skills\/([^/]+)\/SKILL\.md/;

function detectLogMeta(content: string, parsedBlocks: unknown[] | null): ConsoleLogEntryMeta {
  const meta: ConsoleLogEntryMeta = {};

  // Check for json-render fences in text blocks
  if (parsedBlocks && Array.isArray(parsedBlocks)) {
    for (const block of parsedBlocks) {
      if (block && typeof block === "object" && "type" in block) {
        if ((block as { type: string }).type === "text") {
          const text = (block as { text?: string }).text ?? "";
          const matches = text.match(JSON_RENDER_FENCE_REGEX);
          if (matches) {
            meta.hasJsonRender = true;
            meta.jsonRenderBlockCount = matches.length;
          }
        }
        // Check for skill loading via tool_use
        if ((block as { type: string }).type === "tool_use") {
          const input = (block as { input?: { file_path?: string } }).input;
          const filePath = input?.file_path ?? "";
          const skillMatch = filePath.match(SKILL_READ_REGEX);
          if (skillMatch?.[1]) {
            meta.loadedSkill = skillMatch[1];
          }
        }
      }
    }
  }

  return meta;
}

function buildErrorMessage(value: unknown, status: number): string {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object" && "error" in value) {
    const errorValue = (value as { error?: unknown }).error;
    if (typeof errorValue === "string") {
      return errorValue;
    }

    try {
      return JSON.stringify(errorValue);
    } catch {
      return `HTTP ${status}`;
    }
  }

  return `HTTP ${status}`;
}

export function useSseStream() {
  const [state, setState] = useState<ConsoleRunState>({
    phase: null,
    logs: [],
    result: null,
    error: null,
    statusCode: null,
    isStreaming: false,
    startedAt: null,
    finishedAt: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(async (params: ConsoleQueryParams) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState({
      phase: null,
      logs: [],
      result: null,
      error: null,
      statusCode: null,
      isStreaming: true,
      startedAt: Date.now(),
      finishedAt: null,
    });

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-user-id": params.userId,
      };

      // Only set x-artist-ids if explicitly provided (allows testing auth without ownership header)
      const ownedIds = params.ownedArtistIds?.trim();
      if (ownedIds) {
        headers["x-artist-ids"] = ownedIds;
      }

      const response = await fetch("/api/artist-os/query", {
        method: "POST",
        headers,
        body: JSON.stringify({
          artist_id: params.artistId,
          prompt: params.prompt,
          resume_session_id: params.resumeSessionId || undefined,
        }),
        signal: controller.signal,
      });

      // Guard: skip state updates if this run was superseded
      if (abortRef.current !== controller) return;
      setState((current) => ({ ...current, statusCode: response.status }));

      if (!response.ok) {
        if (abortRef.current !== controller) return;
        const errorBody = await response.json().catch(() => null);
        setState((current) => ({
          ...current,
          error: buildErrorMessage(errorBody, response.status),
          isStreaming: false,
          finishedAt: Date.now(),
        }));
        return;
      }

      for await (const event of streamSSE(response, controller.signal)) {
        // Guard: skip state updates if a newer run has started
        if (abortRef.current !== controller) break;

        if (event.event === "status") {
          const data = event.data as StatusData;
          setState((current) => ({ ...current, phase: data.phase }));
        } else if (event.event === "log") {
          const data = event.data as LogData;
          const parsedBlocks = parseConsoleMessageBlocks(data.chunk);
          const meta = detectLogMeta(data.chunk, parsedBlocks);
          const entry: ConsoleLogEntry = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            stream: data.stream,
            content: data.chunk,
            parsedBlocks,
            meta: Object.keys(meta).length > 0 ? meta : undefined,
          };
          startTransition(() => {
            // Double-check inside startTransition as it's async
            if (abortRef.current !== controller) return;
            setState((current) => {
              const logs = [...current.logs, entry];
              return {
                ...current,
                logs: logs.length > MAX_LOGS ? logs.slice(-MAX_LOGS) : logs,
              };
            });
          });
        } else if (event.event === "done") {
          const data = event.data as DoneData;
          setState((current) => ({
            ...current,
            result: data,
            isStreaming: false,
            finishedAt: Date.now(),
          }));
        } else if (event.event === "error") {
          const data = event.data as ErrorData;
          setState((current) => ({
            ...current,
            error: data.message,
            isStreaming: false,
            finishedAt: Date.now(),
          }));
        }
      }
    } catch (error) {
      // Only update state if this run is still the current one
      if (abortRef.current !== controller) {
        return;
      }
      if ((error as Error).name !== "AbortError") {
        setState((current) => ({
          ...current,
          error: String(error),
          isStreaming: false,
          finishedAt: Date.now(),
        }));
      }
    } finally {
      // Only apply cleanup if this run is still the current one
      // to avoid clobbering state from a newer run
      if (abortRef.current === controller) {
        setState((current) => ({
          ...current,
          isStreaming: false,
          finishedAt: current.finishedAt ?? Date.now(),
        }));
      }
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setState((current) => ({
      ...current,
      isStreaming: false,
      finishedAt: Date.now(),
    }));
  }, []);

  const reset = useCallback(() => {
    setState({
      phase: null,
      logs: [],
      result: null,
      error: null,
      statusCode: null,
      isStreaming: false,
      startedAt: null,
      finishedAt: null,
    });
  }, []);

  return { state, start, stop, reset };
}
