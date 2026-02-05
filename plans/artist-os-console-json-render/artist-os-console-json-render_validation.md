# Artist OS Console json-render Validation

## Test Scenarios

1. Happy path (full tree): a text block contains a single json-render fence with valid `root` and `elements`, and Message History renders the structured UI block.
2. Happy path (JSONL patches): a text block contains a json-render fence with JSONL lines that set `/root` and add `/elements/{key}` entries; the renderer shows the correct UI.
3. Error case: invalid JSON inside a fence results in a visible error block plus raw JSON text; the rest of the message still renders as markdown.
4. Edge case: fence at the start or end of a text block, or multiple fences with text between, is split correctly.
5. Safety caps: payloads larger than the size cap or element counts above the cap throw a parse error and fall back to error UI.
6. Actions: `copy_to_clipboard` and `open_url` handlers are invoked without throwing; `apply_prompt` updates the query form defaults.

## Parity Strategy

The existing behavior (Streamdown-only rendering) remains the fallback when no json-render fence is present or parsing fails. Parity is verified by comparing:

- Same prompt before and after: standard markdown-only responses should still render as Streamdown.
- Mixed responses: text outside a fence should render exactly as before.

## Test Scaffolding

- `__tests__/artist-os-console/json-render/parse.test.ts`: unit tests for fence splitting, full tree parsing, JSONL patch parsing, and cap errors.
- `__tests__/artist-os-console/json-render/json-render-block.test.tsx`: integration-style tests using server rendering to assert that valid trees render expected text and invalid JSON renders the error state.

Run tests with:

- `pnpm test`

## Acceptance Criteria

- When a console message includes a json-render fence with valid JSON, Message History shows a structured UI block.
- Markdown text outside fences still renders via Streamdown.
- Invalid JSON renders a visible error block and raw JSON without crashing the page.
- Actions (copy, open URL, apply prompt) work and do not mutate workspace state.
- Full validation passes: `pnpm test`, `pnpm tsc --noEmit`, `pnpm lint`.
- Manual verification via the console UI shows no browser errors and correct visual rendering.

## Results (2026-01-15 23:25Z)

- Manual: Browser MCP confirmed json-render Card/Metric/Checklist rendering in Message History with no console errors.
- Tests: `pnpm test:all` passed (note: `agent.test.ts` logs a missing session file warning but remains green).
- Typecheck: `pnpm tsc --noEmit` passed.
- Lint: `pnpm lint` passed.
