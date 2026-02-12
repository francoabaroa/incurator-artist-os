# json-render Issues

## Summary
This file captures the current, known issues in the json-render integration. It separates general integration issues from component-specific UI problems (notably contracts). Dev server styling was verified on `http://localhost:3000/artist-os-console`; production build behavior has not been verified.

## General Integration Issues
- Global CSS import is done in a component (`src/app/artist-os-console/ConsoleShell.tsx`) instead of a layout. Dev renders with styles, but this violates Next.js app-dir CSS rules and may fail in production builds, which would drop all `.jr-*` styles.
- `DataProvider` only reads `initialData` on mount and does not update with new props. `dataContext` updates (phase/result) will not flow into data bindings after first render, so `valuePath`/`dataPath` can appear blank or stale.
- `dataContext` only contains `{ phase, result }`. If JSON uses paths like `/metrics/revenue`, the UI will render empty because those paths don’t exist.
- The catalog (`artistOSCatalog`) is defined but not used to constrain or validate output. Invalid component types/props can reach the renderer and fall back to `UnknownComponent` or render poorly.
- Parser only accepts fenced blocks marked as ```json-render. If the agent emits ```json or plain JSON, it renders as text and no UI appears.
- Auth-based visibility is effectively disabled because `authState` is never passed into the provider stack. Elements with `visible: { auth: ... }` will be hidden.

## Component-Specific UI Issues

### Contracts
- `TermsComparison` renders a bare `<table>` with no `.jr-table` classes and no `.jr-terms` table styles. This shows as raw, unformatted table text (as seen in the contract screenshots).
- `RedFlagList` applies severity color classes to the entire `<li>`, so whole paragraphs turn red/orange instead of just headings or badges. This makes the section visually heavy (matches screenshots).
- `RedFlagList` can duplicate section labeling: `item.clause` may already include “Section X”, and the component adds `Section {item.section}` again, producing repeated labels (e.g., “Section 3.1” twice).

## What Was Not Verified
- A full live agent session that emits contract json-render output in the console.
- Production build behavior (`pnpm build`) to confirm whether global CSS import is stripped.
