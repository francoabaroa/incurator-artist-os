# Artist OS Console json-render Message History

This ExecPlan is a living document. The sections Progress, Surprises and Discoveries, Decision Log, and Outcomes and Retrospective must be kept up to date as work proceeds.

This document must be maintained in accordance with PLANS.md at the repository root.


## Purpose / Big Picture

Add a deterministic json-render pathway to the Artist OS Console Message History so the agent can render structured, interactive UI (cards, metrics, timelines, checklists, contract red flags, financial breakdowns, press releases, and more) instead of only markdown text. After this change, the console can display rich, skill-specific views by parsing a json-render code fence inside agent messages, while keeping the existing Streamdown markdown rendering as the fallback.

**Key Benefits:**
- **Skill-Appropriate Visualization**: Contract red flags get severity badges, not just bullet points; analytics get real metric cards with trends
- **Interactive Elements**: Checklists users can visually scan, timelines they can navigate, copy buttons on templates
- **Copy-Ready Content**: Press releases and bios with one-click copy actions
- **Data-Bound Updates**: Metrics that can display workspace data through valuePath bindings
- **Consistent Design Language**: All 20+ skills share a cohesive visual system aligned to the console theme
- **Progressive Enhancement**: Falls back gracefully to markdown if JSON parsing fails

The behavior is observable by running pnpm dev, opening http://localhost:3000/artist-os-console, and running a query whose response includes a json-render fenced block. The Message History should render a structured UI block (with cards, tables, or timelines) instead of raw JSON, while the rest of the response still renders as normal markdown. If the JSON is invalid, the UI should fall back to a readable error block plus the raw JSON.


## Progress

- [x] (2026-01-15 20:40Z) ExecPlan drafted and saved.
- [x] (2026-01-15 21:15Z) ExecPlan revised with complete catalog, examples, and implementation details.
- [x] (2026-01-15 22:12Z) Create overview document of current Message History, SSE log format, and agent output structure.
- [x] (2026-01-15 22:12Z) Design and document the json-render catalog, action schema, and skill-to-component mapping.
- [x] (2026-01-15 23:25Z) Implement json-render catalog, component registry, and UI components with console theme styling.
- [x] (2026-01-15 23:25Z) Integrate json-render parsing and rendering into Message History, including tests for parsing and patch application.
- [x] (2026-01-15 23:25Z) Update agent instructions and add a json-render skill for structured outputs.
- [x] (2026-01-15 23:25Z) Validate end to end (dev server, Browser MCP snapshot, tests, typecheck, lint) and update docs.


## Surprises and Discoveries

- Sandbox agent output did not match the catalog on the first manual prompt (missing props, checklist items), which surfaced a Checklist runtime error. Added a defensive guard to keep rendering stable when items are missing.


## Decision Log

- Decision: Use a Markdown code fence with info string json-render as the trigger for structured UI rendering inside Message History.
  Rationale: The agent already produces text blocks; a fence is a simple, explicit delimiter that is easy to parse and keeps the rest of the message readable as markdown.
  Date/Author: 2026-01-15 / Codex

- Decision: Support both full tree JSON and JSONL patch streams inside json-render fences, with a keyed-tree normalization step before rendering.
  Rationale: Full trees are easier to author and debug, while JSONL patches preserve the streaming concept and keep compatibility with the json-render model of progressive updates.
  Date/Author: 2026-01-15 / Codex

- Decision: Keep actions limited to safe, UI-local behaviors in the console (copy, open URL, apply prompt) and do not mutate workspace files from Message History.
  Rationale: The console is a dev surface, not an authenticated workspace editor, so actions must be non-destructive and side effect free by default.
  Date/Author: 2026-01-15 / Codex

- Decision: Add a dedicated json-render skill under workspace-template/.claude/skills and keep the full catalog there, while CLAUDE.md only points to it.
  Rationale: The catalog is long; keeping it in a skill avoids bloating the always-loaded CLAUDE.md and follows the existing skill discovery pattern.
  Date/Author: 2026-01-15 / Codex

- Decision: Implement charts (Bar, Line, Pie) with pure CSS and inline SVG rather than adding a charting library.
  Rationale: Keeps bundle size small, avoids new dependencies, and the charts are simple data visualizations not interactive dashboards.
  Date/Author: 2026-01-15 / Codex

- Decision: Use CSS variables from console.css for theming all json-render components.
  Rationale: Ensures visual consistency with the existing Message History styling and makes theme changes propagate automatically.
  Date/Author: 2026-01-15 / Codex

- Decision: Guard Checklist rendering against missing items to prevent runtime errors when json-render payloads omit required fields.
  Rationale: Renderer does not validate props, so components must be resilient to partial payloads until agent output is fully aligned with the catalog.
  Date/Author: 2026-01-15 / Codex


## Outcomes and Retrospective

- Implemented json-render catalog, registry, and 40+ components with console theme styling.
- Added json-render parsing with fence splitting, JSONL patch application, and error handling; integrated in Message History with JsonRenderBlock.
- Added json-render skill and updated workspace-template/CLAUDE.md plus docs.
- Validation: Browser MCP confirmed structured UI rendering; pnpm test:all (emits the agent session-file warning), pnpm tsc --noEmit, pnpm lint all pass.


## Related Documents

- Overview: plans/artist-os-console-json-render/artist-os-console-json-render_overview.md - Current state inventory and analysis.
- Design: plans/artist-os-console-json-render/artist-os-console-json-render_design.md - Target architecture and specifications.
- Validation: plans/artist-os-console-json-render/artist-os-console-json-render_validation.md - Test plan and acceptance criteria.


## Context and Orientation

The Artist OS Console lives in src/app/artist-os-console. The Message History UI is implemented in src/app/artist-os-console/components/MessageHistory.tsx and renders agent output using Streamdown. Message content arrives through SSE logs from src/app/api/artist-os/query/route.ts, which streams stdout lines from the sandbox runner. The sandbox runner (workspace-template/.incurator/runner.ts) logs assistant messages as JSON arrays of content blocks, which Message History parses into text and tool_use blocks. The current parsing only understands those two block types and does not support structured UI.

### Current Skills Inventory

The workspace has 20+ skills that produce different types of structured information:

| Skill | Output Types | Primary Components |
|-------|--------------|-------------------|
| data-analytics | Metrics, benchmarks, platform dashboards, trend analysis | Metric, ProgressBar, BarChart, Table, KeyValueList, Alert |
| music-finance | Revenue breakdowns, budgets, tax calculations, deal analysis | FinancialBreakdown, Table, Metric, Alert, Checklist |
| campaign-planning | Release timelines, content calendars, budget allocations | Timeline, ContentCalendar, Checklist, FinancialBreakdown, Metric |
| contract-review | Red flags, term comparisons, severity ratings | RedFlagList, Table, Alert, KeyValueList, ProConList |
| release-distribution | Checklists, timelines, metadata guidance | Checklist, Timeline, Table, Alert, MilestoneTracker |
| press-release | Formatted press releases, AP-style documents | PressRelease, Text, Button (copy action) |
| bio-writing | Artist bios at different lengths | Bio, Text, Button (copy action) |
| marketing-copy | Email templates, social copy | EmailTemplate, Text, BulletList |
| epk-press-kit | EPK checklists, one-sheets | Checklist, Bio, Table, KeyValueList |
| songwriting-aid | Chord progressions, rhyme schemes, song structures | ChordProgression, RhymeScheme, SongStructure, Callout |
| music-production | Technical checklists, gear lists | Checklist, KeyValueList, Table |
| visual-identity | Color palettes, brand guidelines | Palette, BulletList, Callout, Card |
| booking-outreach | Email templates, venue research | EmailTemplate, Table, Checklist |
| collaboration-networking | Outreach templates, split sheets | EmailTemplate, Table, KeyValueList |
| fan-engagement | Engagement metrics, newsletter templates | Metric, EmailTemplate, Checklist |
| social-media-strategy | Platform comparisons, posting schedules | Table, ContentCalendar, Metric |
| mental-wellness | Reflective prompts, grounding exercises | Callout, Quote, Checklist, Text |
| general-guidance | Decision frameworks, advice | Callout, BulletList, ProConList |
| session-handover | Progress summaries, next steps | Checklist, KeyValueList, Timeline |
| skill-authoring | Skill structure guides | Checklist, Text, Callout |

### Json-render Concept

Json-render is a UI rendering approach where the model outputs a JSON tree restricted to a predefined component catalog. The renderer maps component types to React components so the UI stays deterministic and guardrailed. The core flow is:

1. **Define a Catalog** — Specify allowed components, their props (via Zod schemas), and available actions
2. **Agent Outputs JSON** — The agent generates structured JSON matching the catalog schema
3. **Renderer Displays UI** — React components render the JSON tree with consistent styling

In this plan, the agent will embed json-render payloads inside a Markdown code fence labeled json-render. Message History will detect those fences, parse the JSON, and render it through @json-render/react using a local catalog and registry.

Agent instructions are defined in workspace-template/CLAUDE.md and skill definitions live under workspace-template/.claude/skills. A new json-render skill will document the catalog, output format, and examples so the agent can use it on demand.


## Plan of Work

### Phase 1: Inventory and overview

Create plans/artist-os-console-json-render/artist-os-console-json-render_overview.md to capture the current Message History flow, SSE log format, and how assistant content is encoded. Include the key files, the log parsing behavior, and how Streamdown is used today so future contributors can reason about the change without re-reading the entire console implementation.

### Phase 2: Design and validation documents

Create plans/artist-os-console-json-render/artist-os-console-json-render_design.md with the catalog definition, the action schema, the parsing rules for json-render fences, and the mapping between skills and component categories. Create plans/artist-os-console-json-render/artist-os-console-json-render_validation.md with unit test scenarios for parsing and manual UI checks in the console.

### Phase 3: Catalog, registry, and component implementation

Add @json-render/core and @json-render/react as dependencies and update next.config.ts to transpile those packages. Create a new json-render module under src/app/artist-os-console/json-render that exports the catalog, component registry, and shared helpers. Implement the 40+ components defined in the Complete Component Catalog section with a shared visual language aligned to console.css (light surface, soft shadows, muted text). Keep components simple and dependency free by using CSS and inline SVG instead of a charting library.

### Phase 4: Message History integration

Update Message History to detect json-render fences inside text blocks, parse them into a UITree, and render them with the json-render Renderer. The fallback path remains Streamdown for any text outside the fence and for parse errors. Add a JsonRenderBlock component that handles parsing, error states, and optional toggling of raw JSON for debugging. Add a shared parsing helper so use-sse-stream and Message History do not duplicate parsing logic.

### Phase 5: Agent instructions and skill wiring

Add a new skill at workspace-template/.claude/skills/json-render/SKILL.md with a frontmatter summary and the full catalog specification. Update workspace-template/CLAUDE.md with a short section that instructs the agent to load the json-render skill when it wants to present structured UI, and to use json-render fences when returning the JSON. Include comprehensive examples for each skill category.

### Phase 6: Validation, docs, and polish

Run unit tests, typecheck, and lint. Start the dev server and use Browser MCP to validate that json-render blocks render correctly in Message History, that markdown still works, and that no console errors appear. Update docs/artist-os-runbook.md with a short section describing how to request json-render output in the console.


## Concrete Steps

From the repository root, add dependencies and update Next.js transpilation:

    pnpm add @json-render/core @json-render/react

Edit next.config.ts to include the new packages in transpilePackages:

    transpilePackages: ["shiki", "@json-render/core", "@json-render/react"],

Create the json-render module structure:

    mkdir -p src/app/artist-os-console/json-render/components

Create the following new files and wire them together:

- src/app/artist-os-console/json-render/catalog.ts: define the catalog with createCatalog and export the catalog plus a short JSON catalog summary string for debugging.
- src/app/artist-os-console/json-render/registry.tsx: export the component registry mapping catalog names to React components.
- src/app/artist-os-console/json-render/parse.ts: parse json-render fences and apply JSONL patches to a keyed tree, then normalize to a UITree.
- src/app/artist-os-console/json-render/actions.ts: define safe action handlers and a helper for confirmation prompts.
- src/app/artist-os-console/json-render/types.ts: shared TypeScript types for components and actions.
- src/app/artist-os-console/json-render/index.ts: barrel export for the module.
- src/app/artist-os-console/json-render/components/*.tsx: implement all components from the catalog.

Update Message History to use the parser and renderer:

- src/app/artist-os-console/components/MessageHistory.tsx: split text blocks on json-render fences, render JsonRenderBlock for each fenced segment, and keep Streamdown for the rest.
- src/app/artist-os-console/components/JsonRenderBlock.tsx: new component that handles parsing, error states, and optional toggling of raw JSON for debugging.
- src/app/artist-os-console/hooks/use-sse-stream.ts: move the JSON array parsing helper into a shared utility if needed so parsing behavior stays in sync.
- src/app/artist-os-console/ConsoleShell.tsx: pass Message History any context needed for actions (for example, an onApplyPrompt callback and a data context object for valuePath lookups).

Add CSS variables for json-render components:

- src/app/artist-os-console/console.css: add json-render specific CSS variables and base component styles.

Add new skill and instructions:

    mkdir -p workspace-template/.claude/skills/json-render

- workspace-template/.claude/skills/json-render/SKILL.md: add catalog description, output format rules, and comprehensive examples.
- workspace-template/CLAUDE.md: add a brief section that points to the new skill and instructs when to use json-render fences.

Update docs:

- docs/artist-os-runbook.md: add a note that the console renders json-render fences in Message History and include a short example prompt.


## Validation and Acceptance

Unit tests should cover the parser and patch application behavior. Run pnpm test and expect all tests to pass, including new tests for json-render fence parsing and JSONL patch merging.

Manual console validation:

1. Run pnpm dev and open http://localhost:3000/artist-os-console.
2. Submit a prompt that asks the agent to respond with a json-render fence (for example: "Return a json-render block that shows a campaign timeline with a checklist and a metrics card").
3. Confirm that the Message History renders a structured UI block instead of raw JSON, with cards and lists aligned to the console theme.
4. Confirm that any text outside the fence still renders as markdown.
5. Confirm that invalid JSON inside a json-render fence renders a visible error block and the raw JSON instead of crashing the page.
6. Test each major component category: metrics, tables, timelines, checklists, documents (press release, bio), creative (chord progression, song structure), financial.
7. Test actions: copy_to_clipboard should copy text, open_url should open in new tab.
8. Use Browser MCP to take a snapshot and check the console log for errors or warnings.

Full validation:

- pnpm tsc --noEmit
- pnpm lint
- pnpm test


## Idempotence and Recovery

All changes are additive and safe to re-run. If a parsing change causes rendering errors, fall back to Streamdown by disabling json-render detection or by guarding parse failures to show raw JSON. If dependency updates cause build issues, remove the packages and revert the transpilePackages change to restore the pre-change console behavior.


## Artifacts and Notes

Json-render fence usage should be documented without using triple backticks in this file. The format is a Markdown code fence whose info string is json-render, containing either a full UI tree JSON object or JSONL patches, then a closing fence. Use that same format in the json-render skill examples.

Provide a small internal fixture in tests for a keyed tree like this:

    { "root": "card-1", "elements": { "card-1": { "key": "card-1", "type": "Card", "props": { "title": "Campaign Overview" }, "children": ["metric-1"] }, "metric-1": { "key": "metric-1", "type": "Metric", "props": { "label": "Followers", "value": 1200 } } } }


---


## Interfaces and Dependencies

### Dependencies

Use the existing React 19 and Zod 4 versions and add:

- @json-render/core for catalog definitions and shared types.
- @json-render/react for Renderer and provider components.

Update next.config.ts to transpile both packages.


### Shared Schemas and Types

Define these shared types in catalog.ts so component definitions stay consistent. Use .nullable() rather than .optional() for structured output compatibility.

    // Tone for semantic coloring
    const ToneSchema = z.enum(["default", "muted", "success", "warning", "danger", "info"]);
    type Tone = z.infer<typeof ToneSchema>;

    // Size for spacing and typography
    const SizeSchema = z.enum(["xs", "sm", "md", "lg", "xl"]);
    type Size = z.infer<typeof SizeSchema>;

    // Alignment for flex and grid layouts
    const AlignSchema = z.enum(["start", "center", "end", "stretch"]);
    type Align = z.infer<typeof AlignSchema>;

    // Direction for stack layouts
    const DirectionSchema = z.enum(["horizontal", "vertical"]);
    type Direction = z.infer<typeof DirectionSchema>;

    // Trend for metrics
    const TrendSchema = z.enum(["up", "down", "neutral"]);
    type Trend = z.infer<typeof TrendSchema>;

    // Severity for contract red flags and alerts
    const SeveritySchema = z.enum(["low", "medium", "high", "critical"]);
    type Severity = z.infer<typeof SeveritySchema>;

    // Status for timeline and milestone items
    const StatusSchema = z.enum(["pending", "in_progress", "completed", "blocked", "skipped"]);
    type Status = z.infer<typeof StatusSchema>;

    // Format for numbers and values
    const FormatSchema = z.enum(["number", "currency", "percent", "text", "streams", "date"]);
    type Format = z.infer<typeof FormatSchema>;

    // Action reference for buttons and interactive elements
    const ActionRefSchema = z.object({
      name: z.string(),
      params: z.record(z.string(), z.unknown()).nullable(),
      confirm: z.object({
        title: z.string(),
        message: z.string(),
        variant: z.enum(["default", "danger"]).nullable(),
      }).nullable(),
    });
    type ActionRef = z.infer<typeof ActionRefSchema>;

    // Chart data point
    const ChartDatumSchema = z.object({
      label: z.string(),
      value: z.number(),
    });
    type ChartDatum = z.infer<typeof ChartDatumSchema>;

    // Table column definition
    const TableColumnSchema = z.object({
      key: z.string(),
      label: z.string(),
      align: z.enum(["left", "center", "right"]).nullable(),
      format: z.enum(["text", "currency", "percent", "number", "date", "badge"]).nullable(),
      tone: ToneSchema.nullable(),
    });
    type TableColumn = z.infer<typeof TableColumnSchema>;


### Actions

Register these named actions in the catalog and implement handlers in actions.ts:

**copy_to_clipboard**
- params: { text: string }
- Copies the provided text to the system clipboard
- Shows brief toast/feedback on success

**open_url**
- params: { url: string }
- Opens the URL in a new browser tab
- Should validate URL format before opening

**apply_prompt**
- params: { prompt: string, userId: string | null, artistId: string | null, resumeSessionId: string | null, ownedArtistIds: string | null }
- Pre-fills the QueryForm with the provided values
- Does NOT auto-submit; user must click submit
- Useful for "try this prompt" suggestions

Actions should use window.confirm when ActionRef.confirm is present. Implementation example:

    // actions.ts
    export type ActionHandler = (params: Record<string, unknown>) => void | Promise<void>;

    export function createActionHandlers(context: {
      onApplyPrompt: (prompt: string, opts?: Record<string, string | null>) => void;
    }): Record<string, ActionHandler> {
      return {
        copy_to_clipboard: async ({ text }) => {
          await navigator.clipboard.writeText(String(text));
          // Optional: show toast
        },
        open_url: ({ url }) => {
          window.open(String(url), "_blank", "noopener,noreferrer");
        },
        apply_prompt: (params) => {
          context.onApplyPrompt(String(params.prompt), {
            userId: params.userId as string | null,
            artistId: params.artistId as string | null,
            resumeSessionId: params.resumeSessionId as string | null,
            ownedArtistIds: params.ownedArtistIds as string | null,
          });
        },
      };
    }


---


## Complete Component Catalog (40+ Components)

### Category 1: Layout and Structure

**Card**
- Description: Container with optional title, subtitle, and description. Primary building block for grouping content.
- Props:
  - title: string | null — Card header title
  - subtitle: string | null — Secondary text below title
  - description: string | null — Longer description text
  - tone: Tone | null — Border/accent color
  - padding: Size | null — Internal padding (default: md)
  - collapsible: boolean | null — Whether card can be collapsed
  - defaultCollapsed: boolean | null — Initial collapsed state
- hasChildren: true
- Use cases: Wrapping any grouped content, analytics summaries, skill output containers

**Section**
- Description: Semantic section with optional title. Lighter than Card, no border.
- Props:
  - title: string | null — Section heading
  - description: string | null — Section description
  - tone: Tone | null — Title color
- hasChildren: true
- Use cases: Dividing content within a Card, organizing long responses

**Stack**
- Description: Flexbox container for vertical or horizontal layouts.
- Props:
  - direction: Direction | null — "horizontal" or "vertical" (default: vertical)
  - gap: Size | null — Space between children (default: md)
  - align: Align | null — Cross-axis alignment
  - justify: Align | null — Main-axis alignment
  - wrap: boolean | null — Whether to wrap on overflow
- hasChildren: true
- Use cases: Arranging metrics in a row, stacking form-like content

**Grid**
- Description: CSS Grid container for multi-column layouts.
- Props:
  - columns: number (1-6) | null — Number of columns (default: 2)
  - gap: Size | null — Gap between cells (default: md)
  - minColumnWidth: number | null — Minimum column width in pixels for auto-fit
- hasChildren: true
- Use cases: Metric grids, comparison tables, card galleries

**Divider**
- Description: Horizontal or vertical divider line.
- Props:
  - label: string | null — Optional centered label text
  - tone: Tone | null — Line color
  - orientation: "horizontal" | "vertical" | null
- Use cases: Separating sections, breaking up long content

**Spacer**
- Description: Empty space for layout control.
- Props:
  - size: Size — Amount of space (xs through xl)
- Use cases: Adding breathing room between components


### Category 2: Typography and Text

**Heading**
- Description: Section heading with semantic level.
- Props:
  - text: string — Heading text content
  - level: "h1" | "h2" | "h3" | "h4" | null — HTML heading level (default: h2)
  - align: Align | null — Text alignment
  - tone: Tone | null — Text color
- Use cases: Section titles, card headers when Card title prop is insufficient

**Text**
- Description: Paragraph or inline text block.
- Props:
  - content: string — Text content (supports basic markdown: bold, italic, links)
  - tone: Tone | null — Text color
  - size: Size | null — Font size
  - align: Align | null — Text alignment
- Use cases: Explanatory text, descriptions, body content

**Caption**
- Description: Small muted text for labels and metadata.
- Props:
  - content: string — Caption text
  - tone: Tone | null — Text color (default: muted)
- Use cases: Timestamps, source citations, helper text

**Quote**
- Description: Block quote with optional attribution.
- Props:
  - content: string — Quote text
  - attribution: string | null — Who said it
  - tone: Tone | null — Border/accent color
- Use cases: Artist quotes in press releases, testimonials, lyric excerpts

**Code**
- Description: Inline or block code display.
- Props:
  - content: string — Code content
  - language: string | null — Syntax highlighting hint
  - inline: boolean | null — Inline vs block display
- Use cases: Technical instructions, command examples

**BulletList**
- Description: Unordered list of items.
- Props:
  - items: string[] — List items
  - tone: Tone | null — Bullet color
  - compact: boolean | null — Reduced spacing
- Use cases: Feature lists, requirements, tips

**NumberedList**
- Description: Ordered list of items.
- Props:
  - items: string[] — List items
  - tone: Tone | null — Number color
  - startFrom: number | null — Starting number
- Use cases: Step-by-step instructions, ranked items


### Category 3: Actions and Interactive Elements

**Button**
- Description: Clickable button that triggers an action.
- Props:
  - label: string — Button text
  - variant: Tone | null — Visual style (default, success, danger, etc.)
  - size: Size | null — Button size
  - action: ActionRef — Action to trigger on click
  - disabled: boolean | null — Disabled state
  - icon: string | null — Icon name (copy, download, external-link, etc.)
- Use cases: Copy to clipboard, open URLs, apply prompts

**ButtonGroup**
- Description: Horizontal group of related buttons.
- Props:
  - alignment: Align | null — Horizontal alignment
- hasChildren: true (expects Button children)
- Use cases: Multiple action options, pagination controls

**Link**
- Description: Inline or standalone hyperlink.
- Props:
  - label: string — Link text
  - href: string — URL
  - tone: Tone | null — Link color
  - external: boolean | null — Open in new tab
- Use cases: References, external resources, documentation links


### Category 4: Status and Feedback

**Alert**
- Description: Prominent notification banner.
- Props:
  - tone: Tone — Alert type (info, success, warning, danger)
  - title: string — Alert title
  - message: string | null — Detailed message
  - dismissible: boolean | null — Can be dismissed
  - action: ActionRef | null — Optional action button
- Use cases: Warnings about contract terms, success confirmations, important notices

**Badge**
- Description: Small inline label for status or categorization.
- Props:
  - text: string — Badge text
  - tone: Tone | null — Badge color
  - size: Size | null — Badge size
- Use cases: Status indicators, severity labels, category tags

**Callout**
- Description: Highlighted box for important information.
- Props:
  - title: string | null — Callout heading
  - body: string — Callout content
  - tone: Tone | null — Border/background color
  - icon: string | null — Icon name (lightbulb, warning, info, etc.)
  - action: ActionRef | null — Optional action button
- Use cases: Tips, warnings, key insights, diagnosis results

**EmptyState**
- Description: Placeholder when no data is available.
- Props:
  - title: string — Empty state heading
  - message: string | null — Explanation
  - icon: string | null — Illustrative icon
  - action: ActionRef | null — Suggested action
  - actionLabel: string | null — Action button text
- Use cases: No results, pending data, first-time setup


### Category 5: Data Display - Metrics

**Metric**
- Description: Single key performance indicator with optional trend.
- Props:
  - label: string — Metric name
  - value: string | number | null — Static value
  - valuePath: string | null — JSON Pointer to dynamic value in data context
  - format: Format | null — How to format the value
  - trend: Trend | null — up, down, or neutral indicator
  - trendValue: string | null — Trend percentage or description ("+15%")
  - benchmark: string | null — Reference benchmark ("20%+ is strong")
  - subtitle: string | null — Additional context
  - size: Size | null — Display size
- Use cases: Streaming counts, revenue figures, save rates, follower counts

**MetricGrid**
- Description: Responsive grid specifically for metrics.
- Props:
  - title: string | null — Grid title
  - columns: number (2-4) | null — Number of columns
- hasChildren: true (expects Metric children)
- Use cases: Dashboard-style KPI displays, analytics summaries

**ProgressBar**
- Description: Visual progress indicator.
- Props:
  - label: string | null — Progress label
  - value: number — Current value
  - max: number — Maximum value
  - tone: Tone | null — Bar color
  - format: "percent" | "number" | null — Label format
  - showValue: boolean | null — Display value text
- Use cases: Goal progress, completion rates, benchmarks vs actual

**Benchmark**
- Description: Value compared against a target benchmark.
- Props:
  - label: string — Benchmark name
  - current: number — Current value
  - target: number — Target/benchmark value
  - format: Format | null — Number format
  - stage: "beginner" | "builder" | "breakout" | "established" | "major" | null — Career stage reference
  - description: string | null — What the benchmark means
- Use cases: Save rate vs. stage benchmarks, performance comparisons


### Category 6: Data Display - Charts

**BarChart**
- Description: Horizontal or vertical bar chart.
- Props:
  - title: string | null — Chart title
  - data: ChartDatum[] | null — Static data
  - dataPath: string | null — JSON Pointer to data array
  - format: Format | null — Value format
  - orientation: "horizontal" | "vertical" | null
  - showValues: boolean | null — Display values on bars
  - height: number | null — Chart height in pixels
- Use cases: Revenue by region, platform comparison, monthly streams

**LineChart**
- Description: Time series or trend line chart.
- Props:
  - title: string | null — Chart title
  - data: ChartDatum[] | null — Static data
  - dataPath: string | null — JSON Pointer to data array
  - format: Format | null — Value format
  - showPoints: boolean | null — Display data points
  - height: number | null — Chart height in pixels
- Use cases: Stream trends over time, follower growth

**PieChart**
- Description: Proportional pie or donut chart.
- Props:
  - title: string | null — Chart title
  - data: ChartDatum[] | null — Static data
  - dataPath: string | null — JSON Pointer to data array
  - format: Format | null — Value format
  - donut: boolean | null — Donut style with center hole
  - showLegend: boolean | null — Display legend
- Use cases: Revenue stream breakdown, audience demographics


### Category 7: Data Display - Tables

**Table**
- Description: Tabular data display with formatting.
- Props:
  - title: string | null — Table title
  - columns: TableColumn[] — Column definitions
  - rows: Record<string, unknown>[] | null — Static row data
  - dataPath: string | null — JSON Pointer to row data
  - striped: boolean | null — Alternating row colors
  - compact: boolean | null — Reduced padding
  - sortable: boolean | null — Column sort enabled (client-side only)
- Use cases: Distributor comparisons, transaction lists, platform metrics

**ComparisonTable**
- Description: Side-by-side comparison with highlighting.
- Props:
  - title: string | null — Table title
  - headers: string[] — Column headers
  - rows: { label: string, values: { text: string, tone: Tone | null }[] }[]
- Use cases: Deal terms comparison (your deal vs. standards vs. red flags)

**KeyValueList**
- Description: Vertical list of label-value pairs.
- Props:
  - title: string | null — List title
  - items: { label: string, value: string | number, tone: Tone | null, format: Format | null }[]
  - compact: boolean | null — Reduced spacing
- Use cases: Profile summaries, metadata displays, quick facts


### Category 8: Planning and Workflow

**Checklist**
- Description: Interactive-styled checklist (display only in console).
- Props:
  - title: string | null — Checklist title
  - items: { id: string, label: string, done: boolean, note: string | null, required: boolean | null }[]
  - showProgress: boolean | null — Display completion progress
- Use cases: Release readiness, EPK completeness, distribution prep

**Timeline**
- Description: Vertical timeline of events or phases.
- Props:
  - title: string | null — Timeline title
  - items: { label: string, date: string | null, description: string | null, status: Status | null, icon: string | null }[]
  - showConnectors: boolean | null — Lines between items
- Use cases: Release rollout phases, career milestones

**ReleaseTimeline**
- Description: Specialized timeline for release campaigns.
- Props:
  - title: string | null — Timeline title
  - releaseDate: string — ISO date of release
  - phases: { name: string, startOffset: number, endOffset: number, tasks: string[], status: Status | null }[]
- Use cases: "Waterfall" release strategy visualization

**ContentCalendar**
- Description: Calendar view of scheduled content.
- Props:
  - title: string | null — Calendar title
  - startDate: string — First date shown
  - items: { date: string, channel: string, content: string, status: Status | null, tone: Tone | null }[]
  - showChannelIcons: boolean | null — Platform icons
- Use cases: Social media schedules, campaign content plans

**MilestoneTracker**
- Description: Goal milestones with completion status.
- Props:
  - title: string | null — Tracker title
  - items: { label: string, dueDate: string | null, completed: boolean, description: string | null, priority: "low" | "medium" | "high" | null }[]
  - showDates: boolean | null — Display due dates
- Use cases: Project milestones, quarterly goals


### Category 9: Domain-Specific - Documents

**PressRelease**
- Description: Formatted AP-style press release.
- Props:
  - headline: string — Main headline
  - subhead: string | null — Secondary headline
  - dateline: string — Location and date ("LOS ANGELES, CA — March 15, 2026")
  - body: string[] — Body paragraphs
  - quote: { text: string, attribution: string } | null — Artist quote
  - quote2: { text: string, attribution: string } | null — Secondary quote
  - boilerplate: string — About section
  - links: { label: string, url: string }[] | null — Resource links
  - copyable: boolean | null — Show copy button
- Use cases: Single announcements, album releases, tour announcements

**Bio**
- Description: Artist biography with copy functionality.
- Props:
  - length: "one_liner" | "short" | "medium" | "long" — Bio length indicator
  - content: string — Bio text
  - highlights: string[] | null — Key achievements to highlight
  - wordCount: number | null — Display word count
  - copyable: boolean | null — Show copy button
- Use cases: EPK bios, social media bios, press kit bios

**EmailTemplate**
- Description: Email template with placeholder highlighting.
- Props:
  - type: "booking" | "press" | "sync" | "collaboration" | "newsletter" | "other" — Template type
  - subject: string — Email subject line
  - greeting: string | null — Opening greeting
  - body: string — Email body
  - cta: string | null — Call to action line
  - signature: string | null — Signature block
  - placeholders: string[] | null — Placeholder tokens to highlight ("[VENUE_NAME]")
  - copyable: boolean | null — Show copy button
- Use cases: Booking outreach, press pitches, sync licensing queries


### Category 10: Domain-Specific - Creative

**ChordProgression**
- Description: Musical chord progression display.
- Props:
  - key: string — Musical key ("C Major", "A Minor")
  - progression: string[] — Chord sequence (["I", "V", "vi", "IV"] or ["C", "G", "Am", "F"])
  - tempo: number | null — BPM
  - mood: string | null — Emotional description
  - examples: string[] | null — Song examples using this progression
  - notes: string | null — Additional notes
- Use cases: Songwriting suggestions, music theory explanations

**RhymeScheme**
- Description: Lyric display with rhyme scheme highlighting.
- Props:
  - scheme: string — Rhyme pattern ("ABAB", "AABB", etc.)
  - lines: { text: string, group: string }[] — Lines with rhyme group assignments
  - description: string | null — Scheme explanation
- Use cases: Lyric analysis, rhyme pattern suggestions

**SongStructure**
- Description: Song section map visualization.
- Props:
  - sections: { name: string, bars: number | null, notes: string | null, active: boolean | null }[]
  - totalBars: number | null — Total song length
  - showBars: boolean | null — Display bar counts
- Use cases: Song arrangement, structure suggestions

**CreativePrompt**
- Description: Songwriting exercise or creative prompt.
- Props:
  - type: "constraint" | "object" | "seed_words" | "opposite" | "timed" | "other"
  - prompt: string — The creative prompt
  - timer: number | null — Suggested time limit in minutes
  - example: string | null — Example response
  - tips: string[] | null — Helpful tips
- Use cases: Writer's block exercises, creative challenges


### Category 11: Domain-Specific - Financial

**FinancialBreakdown**
- Description: Budget or revenue breakdown with visualization.
- Props:
  - title: string — Breakdown title
  - type: "budget" | "revenue" | "expense" | "projection"
  - currency: string — Currency code ("USD")
  - total: number — Total amount
  - categories: { name: string, amount: number, percent: number | null, tone: Tone | null, description: string | null }[]
  - showChart: boolean | null — Display pie/bar visualization
  - showPercentages: boolean | null — Display percentage column
- Use cases: Project budgets, revenue stream analysis, rule of thirds allocation

**RecoupmentCalculator**
- Description: Deal recoupment visualization.
- Props:
  - advance: number — Advance amount
  - royaltyRate: number — Royalty rate percentage
  - recoupableExpenses: number — Additional recoupable costs
  - estimatedRevenue: number | null — Projected revenue
  - breakEvenStreams: number | null — Streams needed to recoup
  - currency: string — Currency code
  - recouped: boolean | null — Whether currently recouped
- Use cases: Contract evaluation, deal analysis

**TaxReserve**
- Description: Tax reservation calculation display.
- Props:
  - income: number — Gross income
  - reservePercentage: number — Recommended reserve percentage
  - reserveAmount: number — Amount to set aside
  - breakdown: { selfEmployment: number, federalIncome: number, stateIncome: number | null } | null
  - currency: string
- Use cases: Financial planning, tax preparation guidance


### Category 12: Domain-Specific - Contracts

**RedFlagList**
- Description: Contract red flags with severity indicators.
- Props:
  - title: string — List title
  - items: { clause: string, severity: Severity, summary: string, recommendation: string | null, section: string | null }[]
  - showSeverityLegend: boolean | null — Display severity guide
- Use cases: Contract review results, deal term warnings

**TermsComparison**
- Description: Deal terms compared to industry standards.
- Props:
  - title: string — Comparison title
  - dealType: "recording" | "distribution" | "management" | "publishing" | "sync" | "360"
  - terms: { name: string, artistFriendly: string, industryStandard: string, redFlag: string, yourDeal: string | null, assessment: Tone | null }[]
- Use cases: Contract evaluation, negotiation preparation

**ProConList**
- Description: Pros and cons comparison.
- Props:
  - title: string — Comparison title
  - pros: string[] — Advantages
  - cons: string[] — Disadvantages
  - verdict: string | null — Overall assessment
- Use cases: Decision analysis, option evaluation


### Category 13: Domain-Specific - Visual

**Palette**
- Description: Color palette display.
- Props:
  - title: string | null — Palette name
  - swatches: { name: string, hex: string, description: string | null }[]
  - showHex: boolean | null — Display hex codes
  - copyable: boolean | null — Copy hex on click
- Use cases: Visual identity suggestions, brand color exploration

**ImagePlaceholder**
- Description: Placeholder for images with description.
- Props:
  - alt: string — Image description
  - aspectRatio: "square" | "portrait" | "landscape" | "wide" | null
  - caption: string | null — Image caption
- Use cases: Press kit layouts, visual identity mockups (actual images not supported in json-render)


---


## Implementation Details

### Catalog Definition (catalog.ts)

The catalog is defined using @json-render/core's createCatalog function. Here's the structure:

    import { createCatalog } from "@json-render/core";
    import { z } from "zod";

    // ... shared schemas defined above ...

    export const artistOSCatalog = createCatalog({
      name: "artist-os",
      components: {
        // Layout
        Card: {
          props: z.object({
            title: z.string().nullable(),
            subtitle: z.string().nullable(),
            description: z.string().nullable(),
            tone: ToneSchema.nullable(),
            padding: SizeSchema.nullable(),
            collapsible: z.boolean().nullable(),
            defaultCollapsed: z.boolean().nullable(),
          }),
          hasChildren: true,
          description: "Container card with optional title",
        },
        // ... all other components ...
      },
      actions: {
        copy_to_clipboard: {
          params: z.object({ text: z.string() }),
          description: "Copy text to clipboard",
        },
        open_url: {
          params: z.object({ url: z.string() }),
          description: "Open URL in new tab",
        },
        apply_prompt: {
          params: z.object({
            prompt: z.string(),
            userId: z.string().nullable(),
            artistId: z.string().nullable(),
            resumeSessionId: z.string().nullable(),
            ownedArtistIds: z.string().nullable(),
          }),
          description: "Pre-fill query form with prompt",
        },
      },
    });

    export const catalogComponentNames = artistOSCatalog.componentNames;


### Component Registry (registry.tsx)

The registry maps catalog component names to React components:

    import { Card, Section, Stack, Grid, ... } from "./components";
    import type { ComponentRenderProps } from "@json-render/react";

    export const artistOSRegistry: Record<string, React.ComponentType<ComponentRenderProps>> = {
      Card,
      Section,
      Stack,
      Grid,
      Divider,
      Spacer,
      Heading,
      Text,
      Caption,
      Quote,
      Code,
      BulletList,
      NumberedList,
      Button,
      ButtonGroup,
      Link,
      Alert,
      Badge,
      Callout,
      EmptyState,
      Metric,
      MetricGrid,
      ProgressBar,
      Benchmark,
      BarChart,
      LineChart,
      PieChart,
      Table,
      ComparisonTable,
      KeyValueList,
      Checklist,
      Timeline,
      ReleaseTimeline,
      ContentCalendar,
      MilestoneTracker,
      PressRelease,
      Bio,
      EmailTemplate,
      ChordProgression,
      RhymeScheme,
      SongStructure,
      CreativePrompt,
      FinancialBreakdown,
      RecoupmentCalculator,
      TaxReserve,
      RedFlagList,
      TermsComparison,
      ProConList,
      Palette,
      ImagePlaceholder,
    };


### Parsing and Tree Normalization (parse.ts)

The parser handles json-render fences within text blocks:

    // Regex to match json-render fenced code blocks
    const JSON_RENDER_FENCE_REGEX = /```json-render\n([\s\S]*?)```/g;

    interface ParsedSegment {
      type: "text" | "json-render";
      content: string;
    }

    interface KeyedTree {
      root: string | null;
      elements: Record<string, UIElement>;
    }

    export function splitJsonRenderFences(text: string): ParsedSegment[] {
      const segments: ParsedSegment[] = [];
      let lastIndex = 0;
      let match;

      while ((match = JSON_RENDER_FENCE_REGEX.exec(text)) !== null) {
        // Add text before the fence
        if (match.index > lastIndex) {
          segments.push({
            type: "text",
            content: text.slice(lastIndex, match.index),
          });
        }
        // Add the json-render content
        segments.push({
          type: "json-render",
          content: match[1],
        });
        lastIndex = match.index + match[0].length;
      }

      // Add remaining text
      if (lastIndex < text.length) {
        segments.push({
          type: "text",
          content: text.slice(lastIndex),
        });
      }

      return segments;
    }

    export function parseJsonRenderContent(content: string): KeyedTree {
      const trimmed = content.trim();

      // Check if it's JSONL (multiple lines starting with {)
      if (trimmed.includes("\n") && trimmed.split("\n").every(line => 
        line.trim() === "" || line.trim().startsWith("{")
      )) {
        return applyJsonLPatches(trimmed);
      }

      // Otherwise, parse as full tree JSON
      const parsed = JSON.parse(trimmed);
      if (!parsed.root || !parsed.elements) {
        throw new Error("Invalid keyed tree: missing root or elements");
      }
      return parsed as KeyedTree;
    }

    function applyJsonLPatches(jsonl: string): KeyedTree {
      const tree: KeyedTree = { root: null, elements: {} };
      const lines = jsonl.split("\n").filter(line => line.trim());

      for (const line of lines) {
        const patch = JSON.parse(line);
        if (patch.op === "set" && patch.path === "/root") {
          tree.root = patch.value;
        } else if (patch.op === "add" && patch.path.startsWith("/elements/")) {
          const key = patch.path.replace("/elements/", "");
          tree.elements[key] = patch.value;
        }
        // Add more patch operations as needed
      }

      return tree;
    }


### CSS Theme Integration

Add these CSS variables to console.css for json-render components:

    /* json-render theme variables */
    --jr-surface: var(--surface);
    --jr-surface-elevated: var(--surface-elevated);
    --jr-border: var(--border);
    --jr-border-strong: var(--border-strong);
    --jr-text: var(--text);
    --jr-text-muted: var(--text-muted);
    --jr-text-subtle: var(--text-subtle);
    
    /* Semantic colors */
    --jr-success: #22c55e;
    --jr-success-bg: #22c55e1a;
    --jr-warning: #eab308;
    --jr-warning-bg: #eab3081a;
    --jr-danger: #ef4444;
    --jr-danger-bg: #ef44441a;
    --jr-info: #3b82f6;
    --jr-info-bg: #3b82f61a;
    
    /* Severity colors */
    --jr-severity-low: var(--jr-text-muted);
    --jr-severity-medium: var(--jr-warning);
    --jr-severity-high: #f97316;
    --jr-severity-critical: var(--jr-danger);
    
    /* Spacing */
    --jr-space-xs: 4px;
    --jr-space-sm: 8px;
    --jr-space-md: 16px;
    --jr-space-lg: 24px;
    --jr-space-xl: 32px;
    
    /* Typography */
    --jr-font-xs: 11px;
    --jr-font-sm: 13px;
    --jr-font-md: 14px;
    --jr-font-lg: 16px;
    --jr-font-xl: 20px;
    
    /* Borders */
    --jr-radius: 8px;
    --jr-radius-sm: 4px;


---


## Example JSON Outputs by Skill

### Data Analytics Skill Example

When the agent analyzes Spotify streaming data:

    {
      "root": "analytics-card",
      "elements": {
        "analytics-card": {
          "key": "analytics-card",
          "type": "Card",
          "props": { "title": "Your Spotify Analytics (Last 30 Days)", "padding": "md" },
          "children": ["metrics-grid", "benchmark-alert", "chart"]
        },
        "metrics-grid": {
          "key": "metrics-grid",
          "type": "MetricGrid",
          "props": { "columns": 4 },
          "children": ["streams", "saves", "followers", "save-rate"]
        },
        "streams": {
          "key": "streams",
          "type": "Metric",
          "props": {
            "label": "Monthly Streams",
            "value": 45000,
            "format": "streams",
            "trend": "up",
            "trendValue": "+12%"
          }
        },
        "saves": {
          "key": "saves",
          "type": "Metric",
          "props": { "label": "Saves", "value": 9900, "format": "number", "trend": "up", "trendValue": "+8%" }
        },
        "followers": {
          "key": "followers",
          "type": "Metric",
          "props": { "label": "Followers", "value": 12500, "format": "number", "trend": "neutral" }
        },
        "save-rate": {
          "key": "save-rate",
          "type": "Benchmark",
          "props": {
            "label": "Save Rate",
            "current": 22,
            "target": 20,
            "format": "percent",
            "stage": "builder"
          }
        },
        "benchmark-alert": {
          "key": "benchmark-alert",
          "type": "Alert",
          "props": {
            "tone": "success",
            "title": "Above Benchmark!",
            "message": "Your 22% save rate exceeds the 20% builder-stage target. This indicates strong fan commitment."
          }
        },
        "chart": {
          "key": "chart",
          "type": "BarChart",
          "props": {
            "title": "Streams by Source",
            "data": [
              { "label": "Release Radar", "value": 18000 },
              { "label": "Your Library", "value": 12000 },
              { "label": "Playlists", "value": 10000 },
              { "label": "Search", "value": 5000 }
            ],
            "format": "streams"
          }
        }
      }
    }


### Contract Review Skill Example

When analyzing a recording deal:

    {
      "root": "contract-analysis",
      "elements": {
        "contract-analysis": {
          "key": "contract-analysis",
          "type": "Card",
          "props": { "title": "Contract Analysis: Recording Deal", "tone": "warning" },
          "children": ["summary-alert", "red-flags", "terms-grid", "next-steps"]
        },
        "summary-alert": {
          "key": "summary-alert",
          "type": "Alert",
          "props": {
            "tone": "danger",
            "title": "2 Critical Issues Found",
            "message": "This contract has perpetuity terms and cross-collateralization clauses that require immediate negotiation."
          }
        },
        "red-flags": {
          "key": "red-flags",
          "type": "RedFlagList",
          "props": {
            "title": "Issues Identified",
            "items": [
              {
                "clause": "Section 4.2: Rights Assignment",
                "severity": "critical",
                "section": "4.2",
                "summary": "You give up masters for life of copyright (forever)",
                "recommendation": "Request reversion after 7-10 years or upon recoupment"
              },
              {
                "clause": "Section 8.1: Cross-Collateralization",
                "severity": "high",
                "section": "8.1",
                "summary": "Album 2 revenue pays for Album 1 losses",
                "recommendation": "Request per-project accounting"
              },
              {
                "clause": "Section 6.3: Controlled Composition",
                "severity": "medium",
                "section": "6.3",
                "summary": "Mechanical royalties capped at 75% statutory rate",
                "recommendation": "Strike clause or negotiate full statutory rate"
              }
            ],
            "showSeverityLegend": true
          }
        },
        "terms-grid": {
          "key": "terms-grid",
          "type": "TermsComparison",
          "props": {
            "title": "Your Deal vs. Industry Standards",
            "dealType": "recording",
            "terms": [
              {
                "name": "Royalty Rate",
                "artistFriendly": "20%+",
                "industryStandard": "15-18%",
                "redFlag": "<12%",
                "yourDeal": "14%",
                "assessment": "warning"
              },
              {
                "name": "Term",
                "artistFriendly": "1 album firm",
                "industryStandard": "1+2 options",
                "redFlag": "1+5 options",
                "yourDeal": "1+4 options",
                "assessment": "warning"
              },
              {
                "name": "Rights Reversion",
                "artistFriendly": "Upon recoupment",
                "industryStandard": "7-10 years",
                "redFlag": "Life of copyright",
                "yourDeal": "Life of copyright",
                "assessment": "danger"
              }
            ]
          }
        },
        "next-steps": {
          "key": "next-steps",
          "type": "Checklist",
          "props": {
            "title": "Recommended Next Steps",
            "items": [
              { "id": "1", "label": "Schedule consultation with entertainment lawyer", "done": false, "required": true },
              { "id": "2", "label": "Draft counter-proposal on reversion clause", "done": false, "required": true },
              { "id": "3", "label": "Request un-crossed accounting terms", "done": false, "required": true },
              { "id": "4", "label": "Ask for full statutory mechanical rate", "done": false, "required": false }
            ],
            "showProgress": true
          }
        }
      }
    }


### Campaign Planning Skill Example

For a release rollout plan:

    {
      "root": "campaign-plan",
      "elements": {
        "campaign-plan": {
          "key": "campaign-plan",
          "type": "Card",
          "props": { "title": "Single Release Campaign: 'Midnight'", "padding": "md" },
          "children": ["timeline", "budget", "calendar-preview"]
        },
        "timeline": {
          "key": "timeline",
          "type": "ReleaseTimeline",
          "props": {
            "title": "Release Rollout (8 Weeks)",
            "releaseDate": "2026-02-14",
            "phases": [
              {
                "name": "The Tease",
                "startOffset": -28,
                "endOffset": -14,
                "tasks": ["Cryptic social post", "10-sec audio snippet", "Announce title + date + pre-save"],
                "status": "completed"
              },
              {
                "name": "The Build",
                "startOffset": -14,
                "endOffset": -1,
                "tasks": ["Pre-save campaign push", "Behind-the-scenes content", "Story behind the song video", "Daily countdown"],
                "status": "in_progress"
              },
              {
                "name": "Launch Day",
                "startOffset": 0,
                "endOffset": 0,
                "tasks": ["Out Now announcement (AM)", "Performance video (PM)", "Engagement marathon"],
                "status": "pending"
              },
              {
                "name": "Sustain",
                "startOffset": 1,
                "endOffset": 28,
                "tasks": ["Fan reaction reposts", "UGC amplification", "Milestone celebrations", "Acoustic version drop (Week 2)"],
                "status": "pending"
              }
            ]
          }
        },
        "budget": {
          "key": "budget",
          "type": "FinancialBreakdown",
          "props": {
            "title": "Budget Allocation (Rule of Thirds)",
            "type": "budget",
            "currency": "USD",
            "total": 1000,
            "categories": [
              { "name": "Production", "amount": 330, "percent": 33, "description": "Visualizer, content templates, photo assets" },
              { "name": "Promotion", "amount": 330, "percent": 33, "description": "Meta Ads, TikTok Spark Ads, micro-influencers" },
              { "name": "Reserve", "amount": 340, "percent": 34, "description": "Amplify winning content, respond to opportunities", "tone": "info" }
            ],
            "showChart": true,
            "showPercentages": true
          }
        },
        "calendar-preview": {
          "key": "calendar-preview",
          "type": "ContentCalendar",
          "props": {
            "title": "Week -1 Content Calendar",
            "startDate": "2026-02-07",
            "items": [
              { "date": "2026-02-07", "channel": "instagram", "content": "Final countdown begins - 7 days", "status": "pending" },
              { "date": "2026-02-08", "channel": "tiktok", "content": "Story behind the song pt. 1", "status": "pending" },
              { "date": "2026-02-10", "channel": "instagram", "content": "5 days - snippet with lyrics", "status": "pending" },
              { "date": "2026-02-12", "channel": "all", "content": "Pre-save final push", "status": "pending" },
              { "date": "2026-02-14", "channel": "all", "content": "OUT NOW", "status": "pending", "tone": "success" }
            ],
            "showChannelIcons": true
          }
        }
      }
    }


### Press Release Skill Example

    {
      "root": "press-release",
      "elements": {
        "press-release": {
          "key": "press-release",
          "type": "PressRelease",
          "props": {
            "headline": "Luna Ray Announces Debut Album \"Midnight Blue\"",
            "subhead": "12-Track Collection Explores Themes of Loss, Rebirth, and Late-Night Revelations",
            "dateline": "LOS ANGELES, CA — March 15, 2026",
            "body": [
              "Indie-pop artist Luna Ray announces her highly anticipated debut album \"Midnight Blue,\" set for release on April 25, 2026, via Independent. The 12-track collection explores themes of loss, rebirth, and late-night revelations, blending atmospheric production with raw, confessional lyricism.",
              "Written and recorded over the course of a transformative year, \"Midnight Blue\" marks a new chapter for the Los Angeles-based artist. The album features collaborations with Grammy-nominated producer Alex Chen and includes previously released singles \"Shadows\" and \"Neon Dreams,\" which have collectively amassed over 8 million streams.",
              "A 20-date North American tour in support of the album will be announced in the coming weeks."
            ],
            "quote": {
              "text": "This album was my way of making sense of the most confusing year of my life. Every song is a different piece of the puzzle. I hope someone out there hears it and feels less alone.",
              "attribution": "Luna Ray"
            },
            "boilerplate": "Luna Ray is an indie-pop artist from Los Angeles whose music has been described as \"atmospheric confessionals for the overthinking generation.\" Since her 2023 debut single \"Shadows,\" she has amassed over 8 million streams and performed at Lollapalooza, SXSW, and a sold-out headline tour. Her music has been featured in Netflix's \"Heartstopper\" and Spotify's Fresh Finds. For more information, visit lunaray.com.",
            "links": [
              { "label": "Pre-save Album", "url": "https://ffm.to/midnightblue" },
              { "label": "Press Assets", "url": "https://lunaray.com/press" },
              { "label": "Instagram", "url": "https://instagram.com/lunaray" }
            ],
            "copyable": true
          }
        }
      }
    }


### Songwriting Aid Skill Example

    {
      "root": "songwriting-help",
      "elements": {
        "songwriting-help": {
          "key": "songwriting-help",
          "type": "Card",
          "props": { "title": "Breaking Through Your Block", "padding": "md" },
          "children": ["diagnosis", "exercise", "progression-help", "structure-reference"]
        },
        "diagnosis": {
          "key": "diagnosis",
          "type": "Callout",
          "props": {
            "icon": "lightbulb",
            "title": "Diagnosis: Blank Page Block",
            "body": "You're overwhelmed by possibilities and perfectionism. The cure is constraints. When you have infinite options, you freeze. Constraints force decisions and unlock creativity.",
            "tone": "info"
          }
        },
        "exercise": {
          "key": "exercise",
          "type": "CreativePrompt",
          "props": {
            "type": "seed_words",
            "prompt": "Write a verse using these three words: Bridge, Emergency, Velvet. You have 10 minutes. Don't edit. Just write.",
            "timer": 10,
            "example": "We're standing on a velvet bridge / watching the emergency below / The sirens sound like your voice / calling me to let go",
            "tips": [
              "Let the words force unexpected connections",
              "Don't worry about rhyming yet",
              "Bad output is still progress"
            ]
          }
        },
        "progression-help": {
          "key": "progression-help",
          "type": "ChordProgression",
          "props": {
            "key": "E Minor",
            "progression": ["i", "VII", "VI", "VII"],
            "mood": "Melancholic, cinematic, building tension",
            "examples": ["Mad World (Tears for Fears)", "Creep (Radiohead)", "Wake Me Up When September Ends (Green Day)"],
            "notes": "The borrowed VII (D major in E minor) creates unexpected brightness before resolving to the relative major. Great for verses that build into emotional choruses."
          }
        },
        "structure-reference": {
          "key": "structure-reference",
          "type": "SongStructure",
          "props": {
            "sections": [
              { "name": "Verse 1", "bars": 8, "notes": "Setup the scene" },
              { "name": "Pre-Chorus", "bars": 4, "notes": "Build tension" },
              { "name": "Chorus", "bars": 8, "notes": "Emotional release", "active": true },
              { "name": "Verse 2", "bars": 8, "notes": "Develop the story" },
              { "name": "Pre-Chorus", "bars": 4, "notes": null },
              { "name": "Chorus", "bars": 8, "notes": null },
              { "name": "Bridge", "bars": 8, "notes": "New perspective" },
              { "name": "Final Chorus", "bars": 8, "notes": "Resolution" }
            ],
            "showBars": true
          }
        }
      }
    }


### Music Finance Skill Example

    {
      "root": "finance-overview",
      "elements": {
        "finance-overview": {
          "key": "finance-overview",
          "type": "Card",
          "props": { "title": "Your Revenue Breakdown (2025)", "padding": "md" },
          "children": ["total-metric", "revenue-breakdown", "tax-reserve", "next-actions"]
        },
        "total-metric": {
          "key": "total-metric",
          "type": "Metric",
          "props": {
            "label": "Total Gross Income",
            "value": 28500,
            "format": "currency",
            "trend": "up",
            "trendValue": "+34% vs 2024",
            "size": "lg"
          }
        },
        "revenue-breakdown": {
          "key": "revenue-breakdown",
          "type": "FinancialBreakdown",
          "props": {
            "title": "Revenue by Source",
            "type": "revenue",
            "currency": "USD",
            "total": 28500,
            "categories": [
              { "name": "Live Performance", "amount": 12000, "percent": 42, "tone": "success" },
              { "name": "Streaming", "amount": 6500, "percent": 23, "description": "Spotify, Apple, etc." },
              { "name": "Merch", "amount": 5500, "percent": 19, "description": "Online + at shows" },
              { "name": "Sync Licensing", "amount": 3000, "percent": 11, "description": "1 TV placement" },
              { "name": "Other", "amount": 1500, "percent": 5, "description": "Teaching, session work" }
            ],
            "showChart": true,
            "showPercentages": true
          }
        },
        "tax-reserve": {
          "key": "tax-reserve",
          "type": "TaxReserve",
          "props": {
            "income": 28500,
            "reservePercentage": 25,
            "reserveAmount": 7125,
            "breakdown": {
              "selfEmployment": 4026,
              "federalIncome": 2528,
              "stateIncome": 571
            },
            "currency": "USD"
          }
        },
        "next-actions": {
          "key": "next-actions",
          "type": "Checklist",
          "props": {
            "title": "Financial Housekeeping",
            "items": [
              { "id": "1", "label": "Set aside $7,125 in tax reserve account", "done": false, "required": true },
              { "id": "2", "label": "Reconcile Q4 income and expenses", "done": false, "required": true },
              { "id": "3", "label": "Review streaming royalty statements for accuracy", "done": false },
              { "id": "4", "label": "Consider forming LLC (earning $28K+)", "done": false, "note": "Consult with CPA" }
            ],
            "showProgress": true
          }
        }
      }
    }


---


## Skill to Component Mapping Reference

This table summarizes which components each skill should primarily use:

| Skill | Primary Components | Secondary Components |
|-------|-------------------|---------------------|
| data-analytics | Metric, MetricGrid, BarChart, Benchmark | Table, Alert, KeyValueList, ProgressBar |
| music-finance | FinancialBreakdown, TaxReserve, Metric | Table, Checklist, Alert, RecoupmentCalculator |
| campaign-planning | ReleaseTimeline, ContentCalendar, Checklist | FinancialBreakdown, Metric, Card |
| contract-review | RedFlagList, TermsComparison, Alert | Table, ProConList, Checklist, KeyValueList |
| release-distribution | Checklist, Timeline, MilestoneTracker | Table, Alert, KeyValueList |
| press-release | PressRelease, Button | Text, Link |
| bio-writing | Bio, Button | Text, BulletList |
| marketing-copy | EmailTemplate, Text | BulletList, Button |
| epk-press-kit | Checklist, Bio, KeyValueList | Table, Card |
| songwriting-aid | ChordProgression, RhymeScheme, SongStructure | CreativePrompt, Callout, Text |
| music-production | Checklist, KeyValueList | Table, Callout |
| visual-identity | Palette, Callout | BulletList, Card |
| booking-outreach | EmailTemplate, Table | Checklist, KeyValueList |
| collaboration-networking | EmailTemplate, KeyValueList | Table, Checklist |
| fan-engagement | Metric, EmailTemplate | Checklist, Table |
| social-media-strategy | Table, ContentCalendar | Metric, ComparisonTable |
| mental-wellness | Callout, Quote, Checklist | Text, BulletList |
| general-guidance | Callout, ProConList, BulletList | Checklist, Text |
| session-handover | Checklist, KeyValueList, Timeline | Card, Text |


---


## Testing Strategy

### Unit Tests (parse.test.ts)

    describe("splitJsonRenderFences", () => {
      it("returns text-only when no fences", () => {...});
      it("extracts single fence correctly", () => {...});
      it("handles multiple fences with text between", () => {...});
      it("handles fence at start/end of text", () => {...});
    });

    describe("parseJsonRenderContent", () => {
      it("parses full keyed tree JSON", () => {...});
      it("applies JSONL patches to build tree", () => {...});
      it("throws on invalid JSON", () => {...});
      it("throws on missing root/elements", () => {...});
      it("respects element cap (200 elements)", () => {...});
      it("respects size cap (50KB)", () => {...});
    });

### Component Tests

Create snapshot tests for each major component with representative props:

    describe("Metric component", () => {
      it("renders value with correct format", () => {...});
      it("displays trend indicator", () => {...});
      it("shows benchmark when provided", () => {...});
    });

    describe("RedFlagList component", () => {
      it("renders all severity levels with correct colors", () => {...});
      it("shows recommendations when present", () => {...});
    });

### Integration Tests

Test the full flow from json-render fence to rendered UI:

    describe("JsonRenderBlock", () => {
      it("renders valid json-render content", () => {...});
      it("shows error state for invalid JSON", () => {...});
      it("falls back gracefully on unknown component types", () => {...});
    });


---


Revision History:

- 2026-01-15 20:40Z: Initial ExecPlan created for json-render integration in Message History.
- 2026-01-15 21:15Z: Comprehensive revision with complete 40+ component catalog, detailed prop schemas, example JSON outputs for all major skills, implementation details, CSS theming, skill-to-component mappings, testing strategy, and full action definitions.

Plan update 2026-01-15 22:12Z: Added overview, design, and validation companion documents and marked Phase 1 and Phase 2 progress complete.
Plan update 2026-01-15 23:25Z: Completed implementation, integration, skill updates, and validation.
