# Artist OS Console json-render Overview

## Inventory

The Artist OS Console UI lives in `src/app/artist-os-console`. Message History currently renders assistant output as Streamdown markdown, and tool use blocks are rendered with custom badges and icons.

Key files in the current flow:

- `src/app/artist-os-console/components/MessageHistory.tsx`: Parses console log lines into `ConsoleMessageBlock` arrays, then renders text blocks via Streamdown and tool blocks with custom styling.
- `src/app/artist-os-console/hooks/use-sse-stream.ts`: Starts the SSE stream, appends log entries to state, and attempts to parse assistant output JSON into `parsedBlocks` on each log line.
- `src/app/artist-os-console/lib/stream-sse.ts`: Low-level SSE parser that yields events (`status`, `log`, `done`, `error`).
- `src/app/artist-os-console/ConsoleShell.tsx`: Parent container wiring the query form, Message History, stream viewer, and result panel; defines theme variables.
- `src/app/artist-os-console/console.css`: Base console styling including the Message History look and Streamdown typography overrides.
- `src/app/api/artist-os/query/route.ts`: SSE API route that streams `status`, `log`, `done`, and `error` events.
- `workspace-template/.incurator/runner.ts`: Emits assistant messages to stdout as JSON arrays of content blocks, which become the console log lines.

## Data Flows

1. `POST /api/artist-os/query` starts an SSE stream. It sends `status` events during sandbox phases and `log` events for stdout/stderr lines produced by the sandbox runner.
2. `useSseStream` consumes SSE events from `streamSSE`. For each `log`, it appends a `ConsoleLogEntry` containing the raw `chunk` plus a parsed `parsedBlocks` if the chunk is a JSON array of content blocks.
3. `MessageHistory` receives the log entries and filters to those with `parsedBlocks`. It renders text blocks using Streamdown and tool blocks using a custom UI.
4. The sandbox runner prints assistant messages with `console.log(JSON.stringify(message.message.content))`. Those lines are JSON arrays of blocks with `type: "text"` or `type: "tool_use"`.

## Business Context

The console is a developer-facing surface for observing and debugging Artist OS sessions. Message History is where the agent’s responses are visible. Today, content is limited to markdown text with tool-use previews. The json-render feature will allow these messages to include structured UI blocks for richer, skill-specific output.

## Technical Risks

- Parsing assumptions: Message History and `useSseStream` each implement their own JSON parsing; if they diverge, behavior can drift. A shared parser reduces this risk.
- Streamed output size: Long responses can create very large JSON payloads. The json-render parser should cap payload size and element count to prevent UI performance issues.
- UI fallback: If JSON parsing fails, the console must degrade to readable output rather than breaking the entire message render.
- Actions: Json-render actions must be limited to safe UI-local behavior (copy, open URL, apply prompt) to avoid side effects.
