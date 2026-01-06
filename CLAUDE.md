# Incurator

Incurator is an AI-powered music technology platform connecting independent artists with industry mentors. The "Artist OS" feature runs autonomous AI agents in isolated sandboxes to manage artist careers.

## Quick Reference

```bash
pnpm dev              # Start Next.js dev server (localhost:3000)
pnpm test             # Run Vitest unit tests
pnpm test:all         # Run all tests including service tests
pnpm lint             # ESLint
pnpm tsc --noEmit     # Type check
pnpm db:studio        # Open Drizzle Studio
```

## Project Structure

```
app/                  # Next.js App Router (pages, API routes, i18n)
components/           # Shared React components
lib/                  # Core logic
  ├── db/             # Drizzle schema, migrations
  ├── auth/           # Authentication utilities
  ├── artist-os/      # Artist OS sandbox orchestration
  └── utils/          # Shared utilities
services/             # Backend microservices
  ├── websocket/      # Real-time communication
  ├── video-processing/
  ├── matcher/        # Python audio matching
  ├── doc-extractor/  # Elixir document extraction
  └── tailored-resources/
scripts/              # Build and maintenance scripts
plans/                # ExecPlans for complex features (see PLANS.md)
workspace-template/   # Artist OS agent workspace scaffold
docs/                 # Architecture decisions and guides
```

## Code Style

- **TypeScript strict mode** — No `any` types without justification
- **File naming**: kebab-case (`artist-profile.tsx`)
- **Components**: PascalCase, named function declarations (not arrow functions)
- **Imports**: Use `@/*` alias from repo root
- **React**: Server components by default; `"use client"` only when needed
- **State**: React hooks and context; no Redux

## Before You Code

1. Read relevant files before making changes — do not guess
2. Check `plans/` for existing ExecPlans on the feature (see [PLANS.md](./PLANS.md) for format)
3. Run `pnpm test` to understand current test coverage
4. For Artist OS work, review `lib/artist-os/` and the ExecPlan at `plans/artist-os-mvp/`

## Comprehensive Validation Strategy

When building features, validate your code at **all layers** to ensure correctness.

### Backend Validation

1. **Unit Tests** — Run `pnpm test` to verify business logic, utilities, and API routes.
2. **Server Logs** — Start the dev server with `pnpm dev` and monitor terminal output for errors, warnings, and request logs.
3. **Type Checking** — Run `pnpm tsc --noEmit` to catch TypeScript errors before runtime.
4. **Linting** — Run `pnpm lint` to catch code quality issues.

### Frontend Validation

1. **Visual Testing** — Use the Browser MCP to:
   - Navigate to pages and take screenshots
   - Inspect the browser console for `console.log`, errors, and warnings
   - Analyze network requests and API responses
   - Test user interactions (clicks, form submissions, navigation)
2. **Manual Testing** — Navigate to `http://localhost:3000` in your browser and verify behavior end-to-end.

### Validation Workflow

For every feature or fix:
1. Write and run backend tests (`pnpm test`)
2. Start the dev server (`pnpm dev`) and check server logs
3. Use Browser MCP to visually verify frontend behavior
4. Run type checking (`pnpm tsc --noEmit`) and linting (`pnpm lint`)
5. Only proceed to the next task when all validation passes

### Pre-Commit Checklist

Run before every commit:

```bash
pnpm test:all         # All tests pass
pnpm tsc --noEmit     # No type errors
pnpm lint             # No lint errors
```

Fix any failing tests or lint issues before committing. Update documentation under `/docs` if needed.

## Visual Testing & Browser Debugging (Browser MCP)

Use the **Browser MCP** (`cursor-ide-browser`) to visually inspect and debug the running application. This gives you "eyes" on the frontend.

**Workflow:**
1. **Start the dev server** — Run `pnpm dev` to launch the app at `http://localhost:3000`.
2. **Use Browser MCP** — Connect to the running browser to:
   - Navigate to pages (`browser_navigate`) and take snapshots (`browser_snapshot`)
   - Take screenshots (`browser_take_screenshot`) for visual verification
   - Read console messages (`browser_console_messages`) for logs, errors, and warnings
   - Analyze network requests (`browser_network_requests`) and responses
   - Automate browser actions: clicks (`browser_click`), typing (`browser_type`), navigation
3. **Verify behavior visually** — After implementing UI changes, use the MCP to confirm the frontend renders correctly.
4. **Run unit tests** — After visual verification, run `pnpm test` to ensure all automated tests pass.

**Key capabilities:**
- **Snapshots**: Capture accessibility snapshot of the current page (better than screenshots for understanding structure)
- **Screenshots**: Capture the current page state for visual verification
- **Console access**: Read `console.log`, errors, and warnings from the browser
- **Network inspection**: Analyze API calls, request/response payloads, and timing
- **Reliable automation**: Uses Playwright under the hood with automatic waiting

**When to use:**
- After implementing or modifying UI components
- When debugging frontend issues or unexpected behavior
- To verify responsive layouts and visual styling
- To inspect API interactions from the browser's perspective

## Handling New Libraries & Docs (Context7 MCP)

When introducing a new library or major version, do not rely on memory of old APIs; they may be inaccurate.

Use the **Context7 MCP** to fetch up-to-date documentation:
1. First, call `resolve-library-id` with the library name to get the Context7-compatible ID.
2. Then, call `query-docs` with the resolved ID and a topic to get current docs.

Prefer patterns and APIs confirmed from docs over legacy snippets or assumptions. This is especially important for fast-moving libraries like Next.js, React, Drizzle, etc.

## Key Technologies

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Clerk |
| AI | Claude Agent SDK, Vercel AI SDK |
| Sandbox | Vercel Sandbox (isolated Linux VMs) |
| Storage | Vercel Blob (snapshots), Redis (locks, pointers) |
| Testing | Vitest (app), Jest (services) |

## Artist OS Architecture

The Artist OS runs Claude agents in Vercel Sandbox (ephemeral Linux microVMs):

```
Client Request
    │
    ▼
API Route (/api/artist-os/query)
    │
    ├── 1. Acquire artist lock (Vercel KV)
    ├── 2. Create sandbox (Vercel Sandbox SDK)
    ├── 3. Restore base + artist snapshots (Vercel Blob)
    ├── 4. Run agent runner (Claude Agent SDK)
    ├── 5. Export snapshot to Blob
    ├── 6. Release lock, stop sandbox
    └── 7. Stream logs via SSE throughout
```

Key locations:
- `app/api/artist-os/` — API routes
- `lib/artist-os/` — Snapshot, lock, sandbox utilities
- `workspace-template/` — Files that go into artist workspaces
- `scripts/build-base-snapshot.ts` — Creates reusable base snapshot

## Environment Variables

Required in `.env.local`:

```
BLOB_READ_WRITE_TOKEN      # Vercel Blob storage
REDIS_URL                  # Redis connection (Vercel KV)
ANTHROPIC_API_KEY          # Claude API key
ARTIST_OS_ADMIN_TOKEN      # Admin route authentication
```

Optional tuning:

```
ARTIST_OS_RATE_LIMIT_WINDOW=1m
ARTIST_OS_RATE_LIMIT_USER=10
ARTIST_OS_RATE_LIMIT_ARTIST=5
ARTIST_OS_WARM_TTL=5m
ARTIST_OS_SANDBOX_TIMEOUT=15m
```

Run `vercel env pull` to populate from Vercel.

**Never commit secrets.**

## Commit & PR Guidelines

### Commit Style

Use prefix style with imperative mood and concise subjects:
- `fix:` — Bug fixes
- `add:` — New features
- `improve:` — Enhancements to existing features
- `nit:` — Small cleanups
- `docs:` — Documentation updates
- `chore:` — Maintenance tasks

Group related changes into a single commit; avoid mixing unrelated refactors with feature work.

### PR Requirements

- Clear description of what changed and why
- Linked issues (e.g., `Closes #123`)
- Screenshots or GIFs for UI changes
- Test plan (commands/output)
- Notes on migrations/env changes
- Before opening: run `pnpm test:all` and, if schema changed, `pnpm db:generate && pnpm db:push` locally

## Common Tasks

### Adding a new API route
1. Create `app/api/{category}/{feature}/route.ts`
2. Export async `GET`, `POST`, etc. functions
3. Add tests in `__tests__/api/` or co-located

### Modifying database schema
1. Edit `lib/db/schema.ts`
2. Run `pnpm db:generate` to create migration
3. Run `pnpm db:push` to apply locally
4. Test, then commit migration files

### Working on Artist OS
1. Read the ExecPlan: `plans/artist-os-mvp/artist-os-mvp_execplan.md`
2. Check Progress section for current state
3. Update Progress as you complete work
4. Test with: `curl -X POST http://localhost:3000/api/artist-os/query ...`

## ExecPlans

When writing complex features or significant refactors, use an ExecPlan (as described in [PLANS.md](./PLANS.md)) from design to implementation. They are under `/plans`.

### When to Use an ExecPlan

Use an ExecPlan when:
- The task spans 3+ distinct steps or files
- You are refactoring, migrating, or modernizing existing code
- The work involves unknowns that require research or prototyping
- Multiple people (or agent sessions) may work on the task over time
- You want a clear audit trail of decisions and progress

Skip the ExecPlan for:
- Single-file bug fixes or small changes
- Straightforward feature additions that can be completed in one session
- Tasks where the path forward is already clear and low-risk

### Companion Documents

For complex features, create supporting documents alongside the ExecPlan in `plans/{feature_name}/`:

| Document | Purpose |
|----------|---------|
| `{feature}_execplan.md` | Master plan orchestrating the work |
| `{feature}_overview.md` | Current state inventory, data flows, and technical analysis |
| `{feature}_design.md` | Target architecture, data model, and API specifications |
| `{feature}_validation.md` | Test plan, parity strategy, and acceptance criteria |

Not every feature needs all four documents. Use judgment: a simple feature might only need the ExecPlan, while a major refactor benefits from the full set.

## Getting Help

- **PLANS.md**: `./PLANS.md` — ExecPlan format and phased workflow guide
- **ExecPlans**: `plans/` — Detailed specs for complex features
- **Docs**: `docs/` — Architecture decisions and guides
- **Tests**: Co-located `*.test.ts` or `tests/` directory
- **Types**: `types/` directory for shared interfaces
