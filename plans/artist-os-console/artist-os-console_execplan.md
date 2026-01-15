# Artist OS Console UI with Debug Drawer

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document must be maintained in accordance with PLANS.md at the repository root.


## Purpose / Big Picture

Build a dev-only web console at `/artist-os-console` so a developer can run Artist OS sessions end to end from the browser instead of juggling curl commands. After this change, a developer can enter a user id, artist id, and prompt, submit the request, and watch the server-sent events (SSE) stream in real time with status phases and logs. The same screen will also surface snapshot pointers and admin actions (fetch snapshot pointers, reset artist snapshot pointers, stop a sandbox) inside a debug drawer, making it easier to validate and demo the system in one place.

The result should be observable by running `pnpm dev`, navigating to `http://localhost:3000/artist-os-console`, starting a query, and seeing the timeline phases, streaming logs, and final manifest render without browser console errors. Admin actions should show their responses when a valid `ARTIST_OS_ADMIN_TOKEN` is provided.


## Progress

- [x] (2026-01-06 18:41Z) Reviewed existing Artist OS API routes, auth headers, and docs to align the console plan with current behavior.
- [x] (2026-01-06 19:49Z) Phase 1: Scaffold the console route and UI shell with visual theme and debug drawer toggle.
- [x] (2026-01-06 19:54Z) Phase 2: Implement SSE client utilities and prompt history persistence with unit tests.
- [x] (2026-01-06 20:01Z) Phase 3: Build the query form, stream viewer, timeline, results panel, and history list.
- [x] (2026-01-06 20:04Z) Phase 4: Add the debug drawer with admin actions.
- [x] (2026-01-06 20:06Z) Phase 5: Polish, docs, and end-to-end validation (browser + tests + lint + typecheck).


## Surprises & Discoveries

- Observation: Artist ownership headers are `x-artist-ids` (comma-separated) rather than `x-artist-owner`, and the user id can also be supplied via `x-incurator-user` or `Authorization: Bearer`.
  Evidence: `src/lib/artist-os/auth.ts`.

- Observation: Admin endpoints accept `x-admin-token` or `Authorization: Bearer`, and return a 500 if `ARTIST_OS_ADMIN_TOKEN` is not configured.
  Evidence: `src/lib/artist-os/admin.ts`.


## Decision Log

- Decision: Keep the console as a dev-only route at `/artist-os-console` with no app-wide auth integration.
  Rationale: The goal is fast end-to-end testing; real auth wiring is out of scope and would slow iteration.
  Date/Author: 2026-01-06 / Franco

- Decision: Use `fetch` + `ReadableStream` parsing for SSE rather than `EventSource`.
  Rationale: The query endpoint is POST-based and requires a JSON body; `EventSource` only supports GET.
  Date/Author: 2026-01-06 / Franco

- Decision: Co-locate UI code under `src/app/artist-os-console/` (subfolders for components, hooks, and utilities).
  Rationale: There is no shared `components/` or `hooks/` directory today, so co-location keeps scope tight and avoids new global abstractions.
  Date/Author: 2026-01-06 / Franco

- Decision: Support ownership overrides via an optional `x-artist-ids` input, defaulting to the artist id so 403 cases are easy to test.
  Rationale: The API already permits implicit ownership via id matching, but explicit headers are needed to test mismatched ownership scenarios.
  Date/Author: 2026-01-06 / Franco

- Decision: Limit tests to pure utilities (SSE parser and history persistence) to avoid adding new test dependencies.
  Rationale: The current test environment is Node-only; adding React testing libraries is unnecessary for a dev console MVP.
  Date/Author: 2026-01-06 / Franco

- Decision: Use a terminal-inspired dark theme with scoped CSS variables on the console root.
  Rationale: The console should look intentional without changing the rest of the app. A dark theme fits the "console" metaphor and avoids generic AI aesthetics.
  Date/Author: 2026-01-06 / Franco

- Decision: Debug drawer as a collapsible side panel (desktop) / bottom sheet (mobile).
  Rationale: Inspired by the context drawer pattern. Desktop users get a side panel that doesn't interrupt the main flow; mobile users get a bottom sheet for accessibility.
  Date/Author: 2026-01-06 / Franco

- Decision: Cap log entries at 2,000 to prevent runaway UI growth.
  Rationale: Long agent runs can produce thousands of log lines. FIFO eviction keeps the UI responsive.
  Date/Author: 2026-01-06 / Franco


## Outcomes & Retrospective

- Delivered the `/artist-os-console` UI with query form, prompt history, timeline, streaming logs, results panel, and debug drawer admin actions.
- Added SSE parsing + history utilities with unit tests for parser and storage safety.
- Applied console-specific styling, animations, and responsive debug drawer behavior.
- Updated the Artist OS runbook with console usage steps.
- Validated via Browser MCP and full test/tsc/lint runs.


## Related Documents

- Parent ExecPlan: `plans/artist-os-mvp_execplan.md` (completed backend implementation)
- API Documentation: `docs/artist-os-api.md`
- Runbook: `docs/artist-os-runbook.md`


## Context and Orientation

The repository is minimal today. The only UI route is `src/app/page.tsx`, which renders the default Next.js starter page. The Artist OS backend lives under `src/app/api/artist-os/` and the core server-side utilities live under `src/lib/artist-os/`.

### SSE Event Types

The console will call `POST /api/artist-os/query` in `src/app/api/artist-os/query/route.ts`. That endpoint streams Server-Sent Events (SSE), which is a text stream where each event is encoded as lines beginning with `event:` and `data:` and separated by a blank line. Event names are `status`, `log`, `done`, and `error`:

    event: status
    data: {"phase":"sandbox_create"}

    event: log
    data: {"stream":"stdout","chunk":"Reading workspace files...\n"}

    event: done
    data: {"ok":true,"exitCode":0,"manifest":{...}}

    event: error
    data: {"message":"Something went wrong"}

Phases in order: `sandbox_create` → `restore_base` → `restore_artist` → `agent_run_start` → `snapshot_export`

The event data shapes are defined in `src/lib/artist-os/types.ts`.

### Auth Headers

Authentication and ownership rules are enforced in `src/lib/artist-os/auth.ts`:
- **User ID**: `x-user-id`, `x-incurator-user`, or `Authorization: Bearer <user_id>`
- **Artist Ownership**: Granted if artist id matches user id, starts with `<user_id>_`, or if `x-artist-ids` header includes the artist id
- **Admin Token**: `x-admin-token` or `Authorization: Bearer <token>` checked against `ARTIST_OS_ADMIN_TOKEN` env var

Admin endpoints available for the debug drawer:
- `GET /api/artist-os/snapshot?artist_id=...` — Fetch snapshot pointer values (Blob URLs stored in Redis)
- `DELETE /api/artist-os/snapshot` with `{ "artist_id": "..." }` — Reset snapshot pointers; returns `{ reset: true }` on success
- `POST /api/artist-os/stop` with `{ "artist_id": "..." }` or `{ "sandbox_id": "..." }` — Stop sandbox; returns `{ stopped: true/false }`

**Admin Error Responses:**
- Invalid/missing admin token → 403 Forbidden
- Missing `ARTIST_OS_ADMIN_TOKEN` env var → 500 Internal Server Error

Note: The stop endpoint only affects sandboxes cached in the current process, so `stopped: false` is a valid outcome.

### File Structure After Implementation

    src/app/artist-os-console/
      page.tsx                     # Main console page (client component)
      layout.tsx                   # Console-specific layout (optional)
      components/
        QueryForm.tsx              # User/artist/prompt input form
        StreamViewer.tsx           # Real-time SSE log display
        StatusTimeline.tsx         # Phase progress indicator
        ResultPanel.tsx            # Manifest/exit code display
        PromptHistory.tsx          # Local history sidebar
        DebugDrawer.tsx            # Side panel with admin controls
      hooks/
        use-sse-stream.ts          # Custom hook for POST+SSE
        use-prompt-history.ts      # Local storage hook for history
      lib/
        stream-sse.ts              # SSE parsing utilities
        history.ts                 # localStorage persistence
        types.ts                   # Console-specific types

    __tests__/artist-os-console/
      stream-sse.test.ts           # SSE parser unit tests
      history.test.ts              # History utility unit tests


## Plan of Work

### Phase 1: Route Scaffold and UI Shell

Create `src/app/artist-os-console/page.tsx` as a client component that renders the overall layout. The initial shell should render:
- A header with "Artist OS Console" branding
- A left column for the query form and history
- A right column for the stream viewer and results
- A debug drawer toggle button

The theme should define console-specific CSS variables on the root container. Use Geist Sans for general UI and Geist Mono for logs.

**Acceptance:** The route loads without errors, the layout columns render, and the debug drawer toggle opens an empty drawer.

### Phase 2: SSE Stream Client and Prompt History

Implement a robust SSE parser in `src/app/artist-os-console/lib/stream-sse.ts` that:
- Handles partial chunks across reads
- Parses `event:` and `data:` lines correctly
- Tolerates both `\n` and `\r\n` delimiters
- Yields typed events to consumers

Build a `useSseStream` hook that:
- Accepts query parameters (userId, artistId, prompt, etc.)
- Starts a POST request with proper headers
- Parses events and updates state
- Supports aborting in-flight requests
- Caps log entries at 2,000 (FIFO eviction)

Add a prompt history utility that:
- Reads/writes localStorage under key `artist-os-console-history`
- Stores entries as JSON with ISO timestamps
- Caps list at 50 entries (FIFO eviction)
- Never throws on malformed data

Add unit tests in `__tests__/artist-os-console/` for the SSE parser and history utility.

### Phase 3: Console UI Components

Implement the query form with fields for:
- User ID (text input, required)
- Artist ID (text input, required)
- Owned Artist IDs (text input, optional, comma-separated)
- Prompt (textarea, required)
- Resume Session ID (text input, optional)

Include a checkbox to auto-fill `x-artist-ids` with the current artist id.

Build the stream viewer with:
- Status timeline showing phase progression
- Log panel with auto-scroll and manual scrollback
- Color-coded stdout (green) vs stderr (red/amber)
- Timestamps on each log entry
- `role="log"` and `aria-live="polite"` for accessibility

Build the results panel that displays the `done` manifest with exit code and snapshot keys.

Implement prompt history list that repopulates the form on click.

### Phase 4: Debug Drawer with Admin Controls

Create a collapsible debug drawer containing:

**Request Context:**
- Current headers being sent
- User ID, Artist ID, Owned IDs

**Run Summary:**
- Duration (started at → finished at)
- Last phase reached
- Log count
- Exit code

**Admin Actions (require token input):**
- "Fetch Snapshot Pointers" button → shows `latest` and `manifest` Blob URLs
- "Reset Snapshot Pointers" button (with confirmation) → clears Redis pointers, shows `{ reset: true }`
- "Stop Sandbox" button → sends stop request, shows `{ stopped: true/false }`

Each action should display its response payload and clearly surface errors.

### Phase 5: Polish, Docs, and Validation

- Refine layout spacing, typography, and color balance
- Add subtle animation for phase transitions and log entry arrival
- Ensure responsive behavior on mobile
- Update `docs/artist-os-runbook.md` with console usage section
- Run full validation: Browser MCP, tests, lint, typecheck


## Concrete Steps

From the repository root, create the co-located folders:

    mkdir -p src/app/artist-os-console/components
    mkdir -p src/app/artist-os-console/hooks
    mkdir -p src/app/artist-os-console/lib
    mkdir -p __tests__/artist-os-console

### Phase 2: SSE Parser Implementation

Create `src/app/artist-os-console/lib/stream-sse.ts`:

    export interface SSEEvent<T = unknown> {
      event: string;
      data: T;
    }

    export async function* streamSSE<T>(
      response: Response,
      signal?: AbortSignal
    ): AsyncGenerator<SSEEvent<T>> {
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          if (signal?.aborted) break;

          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Normalize line endings and split
          const normalized = buffer.replace(/\r\n/g, "\n");
          const lines = normalized.split("\n");
          buffer = lines.pop() || "";

          let currentEvent = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              const dataStr = line.slice(6);
              try {
                const data = JSON.parse(dataStr) as T;
                yield { event: currentEvent, data };
              } catch {
                // Non-JSON data, skip
              }
              currentEvent = "";
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    }

Create `src/app/artist-os-console/lib/types.ts`:

    import type { DoneData, StatusData, LogData, ErrorData } from "@/lib/artist-os/types";

    export interface ConsoleQueryParams {
      userId: string;
      artistId: string;
      ownedArtistIds?: string;
      prompt: string;
      resumeSessionId?: string;
    }

    export interface ConsoleLogEntry {
      id: string;
      timestamp: string;
      stream: "stdout" | "stderr";
      content: string;
    }

    export interface ConsoleRunState {
      phase: string | null;
      logs: ConsoleLogEntry[];
      result: DoneData | null;
      error: string | null;
      statusCode: number | null;
      isStreaming: boolean;
      startedAt: number | null;
      finishedAt: number | null;
    }

    export interface HistoryEntry {
      id: string;
      timestamp: string;
      userId: string;
      artistId: string;
      prompt: string;
      resumeSessionId?: string;
    }

    export { StatusData, LogData, DoneData, ErrorData };

Create `src/app/artist-os-console/hooks/use-sse-stream.ts`:

    "use client";

    import { useCallback, useRef, useState } from "react";
    import { streamSSE } from "../lib/stream-sse";
    import type {
      ConsoleQueryParams,
      ConsoleLogEntry,
      ConsoleRunState,
      StatusData,
      LogData,
      DoneData,
      ErrorData,
    } from "../lib/types";

    const MAX_LOGS = 2000;

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

          // Use explicit owned ids or default to artist id
          const ownedIds = params.ownedArtistIds?.trim() || params.artistId;
          headers["x-artist-ids"] = ownedIds;

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

          setState((s) => ({ ...s, statusCode: response.status }));

          if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            setState((s) => ({
              ...s,
              error: errorBody.error || `HTTP ${response.status}`,
              isStreaming: false,
              finishedAt: Date.now(),
            }));
            return;
          }

          for await (const event of streamSSE(response, controller.signal)) {
            if (event.event === "status") {
              const data = event.data as StatusData;
              setState((s) => ({ ...s, phase: data.phase }));
            } else if (event.event === "log") {
              const data = event.data as LogData;
              const entry: ConsoleLogEntry = {
                id: crypto.randomUUID(),
                timestamp: new Date().toISOString(),
                stream: data.stream,
                content: data.chunk,
              };
              setState((s) => {
                const logs = [...s.logs, entry];
                // FIFO eviction if over limit
                if (logs.length > MAX_LOGS) {
                  logs.splice(0, logs.length - MAX_LOGS);
                }
                return { ...s, logs };
              });
            } else if (event.event === "done") {
              const data = event.data as DoneData;
              setState((s) => ({
                ...s,
                result: data,
                isStreaming: false,
                finishedAt: Date.now(),
              }));
            } else if (event.event === "error") {
              const data = event.data as ErrorData;
              setState((s) => ({
                ...s,
                error: data.message,
                isStreaming: false,
                finishedAt: Date.now(),
              }));
            }
          }
        } catch (e) {
          if ((e as Error).name !== "AbortError") {
            setState((s) => ({
              ...s,
              error: String(e),
              isStreaming: false,
              finishedAt: Date.now(),
            }));
          }
        } finally {
          setState((s) => ({
            ...s,
            isStreaming: false,
            finishedAt: s.finishedAt ?? Date.now(),
          }));
        }
      }, []);

      const stop = useCallback(() => {
        abortRef.current?.abort();
        setState((s) => ({
          ...s,
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

Verify TypeScript compiles:

    pnpm tsc --noEmit


## Validation and Acceptance

Start the dev server with `pnpm dev`, open `http://localhost:3000/artist-os-console`, and confirm the page renders the console layout without browser console errors.

**Query Flow:**
1. Enter user ID: `test_user`
2. Enter artist ID: `test_user_artist_001`
3. Enter prompt: `What is in my workspace?`
4. Click Start
5. Timeline should advance: `sandbox_create` → `restore_base` → `restore_artist` → `agent_run_start` → `snapshot_export`
6. Logs should stream in real-time
7. Final manifest should render with exit code and snapshot details

**Error Handling:**
- Submit without user ID → 401 error shown
- Use mismatched user/artist with empty owned IDs → 403 error shown
- Trigger concurrent request → 409 error shown
- Rapid requests (if rate limit lowered) → 429 error shown
- Submit malformed JSON body → 400 "Invalid JSON body" error shown
- Submit invalid artist_id format (e.g., with special chars) → 400 validation error shown

**Debug Drawer:**
1. Open the drawer
2. Enter valid `ARTIST_OS_ADMIN_TOKEN`
3. "Fetch Snapshot Pointers" → shows `latest` and `manifest` Blob URLs
4. "Reset Snapshot Pointers" → shows `{ reset: true }` on success
5. "Stop Sandbox" → shows `{ stopped: true }` or `{ stopped: false }` (both valid)
6. Test with invalid/missing token → shows 403 Forbidden error
7. Test without `ARTIST_OS_ADMIN_TOKEN` env var set → shows 500 error

**Final Checks:**
- Run Browser MCP snapshot to check for runtime errors
- `pnpm test` — all tests pass including new console tests
- `pnpm tsc --noEmit` — no type errors
- `pnpm lint` — no lint errors


## Idempotence and Recovery

All changes are additive and can be re-run safely. `mkdir -p` is idempotent, the new route does not affect existing API routes, and localStorage history can be cleared from browser dev tools if it becomes corrupted.

**Recovery:**
- If SSE parsing fails, verify the API with curl first, then inspect parser tests
- If admin actions fail, confirm `ARTIST_OS_ADMIN_TOKEN` is set and headers are correct
- If styling breaks, check Tailwind config hasn't changed


## Artifacts and Notes

### Visual Design Guidance

The console uses a terminal-inspired dark theme. Apply these as CSS variables on the console root:

    --console-bg: #0a0a0a;
    --console-surface: #141414;
    --console-border: #262626;
    --console-text: #fafafa;
    --console-text-muted: #a1a1aa;
    --console-accent: #22d3ee;        /* Cyan for interactive elements */
    --console-success: #22c55e;       /* Green for stdout, completed phases */
    --console-warning: #f59e0b;       /* Amber for stderr */
    --console-error: #ef4444;         /* Red for errors */

Typography: Geist Sans for UI chrome, Geist Mono for logs and code.

Background: Use a subtle gradient or faint grid texture instead of a flat color.

### Motion Guidelines

- Phase transitions: subtle pulse/glow on the active phase
- Log entries: fade in from the right (100ms ease-out)
- Buttons: hover state with slight lift (transform: translateY(-1px))
- Debug drawer: slide in from right (300ms ease-out)
- Loading states: subtle shimmer effect, not spinners


## Interfaces and Dependencies

No new dependencies are required. Use existing React, Next.js, Tailwind, and TypeScript packages already in `package.json`. Reuse the server-side event data types from `src/lib/artist-os/types.ts` to avoid drift.

### Component Props Interfaces

    // QueryForm
    interface QueryFormProps {
      onSubmit: (params: ConsoleQueryParams) => void;
      onStop: () => void;
      isStreaming: boolean;
      initialValues?: Partial<ConsoleQueryParams>;
    }

    // StreamViewer
    interface StreamViewerProps {
      phase: string | null;
      logs: ConsoleLogEntry[];
    }

    // ResultPanel
    interface ResultPanelProps {
      result: DoneData | null;
      error: string | null;
      statusCode: number | null;
    }

    // DebugDrawer
    interface DebugDrawerProps {
      isOpen: boolean;
      onClose: () => void;
      artistId: string;
      runState: ConsoleRunState;
    }

    // PromptHistory
    interface PromptHistoryProps {
      entries: HistoryEntry[];
      onSelect: (entry: HistoryEntry) => void;
      onClear: () => void;
    }

### Hook Signatures

    // useSseStream
    function useSseStream(): {
      state: ConsoleRunState;
      start: (params: ConsoleQueryParams) => Promise<void>;
      stop: () => void;
      reset: () => void;
    };

    // usePromptHistory
    function usePromptHistory(): {
      entries: HistoryEntry[];
      add: (entry: Omit<HistoryEntry, "id" | "timestamp">) => void;
      clear: () => void;
    };


---

Revision History:

- 2026-01-06: Initial ExecPlan created for Artist OS Console UI with debug drawer
- 2026-01-06 18:41Z: Revised to align auth headers (`x-artist-ids`, `x-user-id`) with actual implementation, co-located file structure, added log capping, status code tracking, and unit test strategy
- 2026-01-06 19:00Z: Merged revisions with original content — restored code samples, visual design guidance, motion guidelines, and component interfaces while keeping accuracy fixes
- 2026-01-06 19:15Z: Minor accuracy fixes — clarified snapshot endpoint returns Blob URLs (not Redis key names), documented DELETE response format `{ reset: true }`, added 400 error cases for invalid JSON and artist_id validation, clarified admin 403 vs 500 error behavior
