# Artist OS Console json-render Design

## Target Architecture

The json-render integration lives under `src/app/artist-os-console/json-render` and is consumed by Message History.

Module structure:

- `src/app/artist-os-console/json-render/catalog.ts`: Defines the component catalog using `createCatalog` from `@json-render/core`, plus shared Zod schemas and a short catalog summary string for debugging.
- `src/app/artist-os-console/json-render/registry.tsx`: Maps catalog component names to React component implementations.
- `src/app/artist-os-console/json-render/parse.ts`: Splits text into `json-render` fenced segments, parses JSON (full tree or JSONL patch stream), enforces size and element caps, and normalizes to a renderable UI tree.
- `src/app/artist-os-console/json-render/actions.ts`: Defines safe action handlers (copy, open URL, apply prompt).
- `src/app/artist-os-console/json-render/types.ts`: Shared TypeScript types for component props, actions, and parse results.
- `src/app/artist-os-console/json-render/components/*.tsx`: Component implementations for the catalog.

Rendering pipeline:

1. Message History splits each text block by json-render fences.
2. Each json-render segment is passed to `JsonRenderBlock`, which parses the content and feeds it to `Renderer` from `@json-render/react`.
3. Text segments outside the fence continue to render via Streamdown.
4. If parsing fails, `JsonRenderBlock` shows a visible error state and can optionally reveal the raw JSON.

Actions and data binding:

- `ActionProvider` supplies handlers for `copy_to_clipboard`, `open_url`, and `apply_prompt`.
- `DataProvider` supplies a data context (initially `{}`) for `valuePath` lookups in components like `Metric` or `Table`.

## Data Model

UI trees are keyed by element key, with `root` pointing to the root key and `elements` mapping keys to elements. Elements have:

- `key`: unique string
- `type`: catalog component name
- `props`: component props validated by the catalog
- `children`: array of child keys (optional)

Json-render fences can contain either:

- A full JSON object with `root` and `elements`.
- JSONL patch lines (one JSON object per line) that set `/root` and add elements under `/elements/{key}`.

Normalization produces a `UITree` compatible with the json-render renderer.

## Interface Specifications

- `splitJsonRenderFences(text: string): ParsedSegment[]`: Returns alternating text and json-render segments.
- `parseJsonRenderContent(content: string): ParsedTree`: Parses either full tree JSON or JSONL patches, enforcing size and element caps.
- `buildActionHandlers(context): Record<string, ActionHandler>`: Returns handlers for the three supported actions.
- `JsonRenderBlock`: Component that consumes raw json-render content, renders `Renderer`, and handles error fallback.

Message History changes:

- Add `JsonRenderBlock` rendering for fenced segments.
- Use shared message parsing helper so `useSseStream` and Message History parse logic remains in sync.

Console Shell changes:

- Add an `onApplyPrompt` callback to update Query Form defaults when json-render `apply_prompt` actions are invoked.
- Provide `dataContext` (currently `{}`) to Message History for valuePath bindings.

## Migration Notes

This is additive. If json-render parsing fails, the message stays readable because text segments still render as markdown and the json-render segment shows a self-contained error block. No existing Streamdown rendering is removed.
