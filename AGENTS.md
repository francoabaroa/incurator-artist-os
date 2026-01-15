# Agent Guidelines for Incurator

This document provides detailed guidelines for AI agents working on the Incurator codebase. Read `CLAUDE.md` first for project overview.

## Core Principles

1. **Read before writing** — Inspect files before modifying. Do not guess what code does.
2. **Small increments** — Complete one logical unit, verify it works, then proceed.
3. **Leave it better** — Update docs, tests, and ExecPlans as you work.
4. **Validate always** — Run tests and type checks after every meaningful change.

## Agent-Specific Notes

- Keep changes narrowly scoped and consistent with existing patterns; do not introduce new dependencies without a clear benefit.
- Prefer updating existing components and utilities over introducing parallel abstractions.
- Run `pnpm lint` before concluding work and address reported problems.
- Run the linter/formatter/typechecker after changes.
- Update documentation when features change so it stays accurate.
- Do not speculate about code you have not inspected. Read files first.

## Iterative Agent Workflow

When working on multi-step tasks, follow this loop:

1. **Understand first** — Read relevant code and docs before proposing changes. Do not speculate about code you have not inspected.
2. **Work in small increments** — Complete one logical unit, verify it works, then proceed to the next.
3. **Update progress continuously** — If using an ExecPlan, update the Progress section at every stopping point.
4. **Resolve ambiguities autonomously** — When ambiguity exists, make a decision, document the rationale, and proceed. Do not block on clarifications for minor details.
5. **Validate before moving on** — Run tests, lint, and verify behavior after each meaningful change. For UI changes, use Browser MCP to visually confirm the frontend renders correctly and check the browser console for errors.

## Workflow

### Starting a Task

1. **Understand the scope**
   - Read the relevant ExecPlan in `plans/` if one exists (see [PLANS.md](./PLANS.md) for format)
   - Inspect the files you'll modify
   - Check for existing tests

2. **Check current state**
   ```bash
   pnpm test             # Are tests passing?
   pnpm tsc --noEmit     # Any type errors?
   git status            # Clean working tree?
   ```

3. **For complex tasks, use an ExecPlan**
   - Tasks spanning 3+ files or steps
   - Refactors or migrations
   - Work that may span multiple sessions

### During Implementation

1. **Work iteratively**
   - Make a change
   - Run relevant tests
   - Verify behavior (logs, browser, etc.)
   - Commit when stable

2. **Update progress continuously**
   - If using an ExecPlan, update the Progress section at every stopping point
   - Add entries to Decision Log when making non-obvious choices

3. **Resolve ambiguities autonomously**
   - Make a reasonable decision
   - Document the rationale
   - Proceed (don't block on minor clarifications)

### Completing a Task

1. **Run full validation**
   ```bash
   pnpm test:all
   pnpm tsc --noEmit
   pnpm lint
   ```

2. **Update documentation**
   - Update `CLAUDE.md` if you added major features
   - Update relevant `docs/` files
   - Update ExecPlan Outcomes section

3. **Commit with clear message** (see Commit Style below)

## Fix Loops

When a task fails or produces unexpected results, work in short fix loops:

1. **Analyze** — Read the failing test output and relevant code
2. **Explain** — State why it fails (write it down)
3. **Propose** — Identify the smallest change that will fix it
4. **Apply** — Make the change
5. **Verify** — Run tests, confirm the fix works
6. **Continue** — Only move on when green

Do not make multiple speculative changes at once.

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

## Commit & PR Guidelines

### Pre-Commit Checklist

After completing a relevant unit of work that works (verified via tests or user confirmation):
1. Re-run all tests: `pnpm test:all`
2. Run type checking: `pnpm tsc --noEmit`
3. Run linting: `pnpm lint`
4. Fix any failing tests or lint issues
5. Update documentation under `/docs` if needed
6. Commit with a clear, imperative message

### Commit Style

Use prefix style with imperative mood and concise subjects:
- `fix:` — Bug fixes
- `add:` — New features
- `improve:` — Enhancements to existing features
- `nit:` — Small cleanups
- `docs:` — Documentation updates
- `chore:` — Maintenance tasks

Group related changes into a single commit; avoid mixing unrelated refactors with feature work.

**Example:**
```
add: artist-os query endpoint with SSE streaming

- Implements /api/artist-os/query route
- Adds snapshot persistence to Vercel Blob
- Includes KV-based artist locking
```

### PR Requirements

- Clear description of what changed and why
- Linked issues (e.g., `Closes #123`)
- Screenshots or GIFs for UI changes
- Test plan (commands/output)
- Notes on migrations/env changes
- Before opening: run `pnpm test:all` and, if schema changed, `pnpm db:generate && pnpm db:push` locally

## Code Patterns

### API Routes (Next.js App Router)

```typescript
// app/api/artist-os/query/route.ts
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  
  // Validate input
  // Process request
  // Return response
  
  return Response.json({ success: true });
}
```

### SSE Streaming

```typescript
export async function POST(req: Request) {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };
      
      // Do work, call send() to emit events
      send("status", { phase: "starting" });
      
      controller.close();
    },
  });
  
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}
```

### Database Queries (Drizzle)

```typescript
import { db } from "@/lib/db";
import { users, artists } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Select
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
});

// Insert
await db.insert(artists).values({
  userId,
  name: "Artist Name",
});

// Update
await db.update(artists)
  .set({ name: "New Name" })
  .where(eq(artists.id, artistId));
```

### Zod Validation

```typescript
import { z } from "zod";

const QueryRequestSchema = z.object({
  artist_id: z.string().min(1),
  prompt: z.string().min(1).max(10000),
  resume_session_id: z.string().optional(),
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = QueryRequestSchema.safeParse(body);
  
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }
  
  const { artist_id, prompt } = parsed.data;
  // ...
}
```

## Testing Guidelines

### Framework & Setup

- **Framework**: Vitest for the app; Jest for `services/video-processing` E2E.
- **Setup**: `test-utils/vitest-setup.ts` (router, intl, DOM mocks).
- Write deterministic tests; prefer Testing Library for React components.
- Add/rename env vars? Update `.env.example` and cover branches where relevant.
- Always write tests as you build new features and fixes.

### Unit Tests (Vitest)

```typescript
// lib/artist-os/__tests__/lock.test.ts
import { describe, it, expect, vi } from "vitest";
import { acquireArtistLock } from "../lock";

describe("acquireArtistLock", () => {
  it("acquires lock for available artist", async () => {
    const lock = await acquireArtistLock("artist_123", 60000);
    expect(lock).not.toBeNull();
    await lock?.release();
  });
  
  it("returns null when artist is locked", async () => {
    const lock1 = await acquireArtistLock("artist_456", 60000);
    const lock2 = await acquireArtistLock("artist_456", 60000);
    
    expect(lock1).not.toBeNull();
    expect(lock2).toBeNull();
    
    await lock1?.release();
  });
});
```

### Testing API Routes

```typescript
// __tests__/api/artist-os/query.test.ts
import { describe, it, expect } from "vitest";
import { POST } from "@/app/api/artist-os/query/route";

describe("POST /api/artist-os/query", () => {
  it("returns 400 for missing artist_id", async () => {
    const req = new Request("http://localhost/api/artist-os/query", {
      method: "POST",
      body: JSON.stringify({ prompt: "Hello" }),
    });
    
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
```

## Artist OS Specifics

### Understanding the Sandbox Lifecycle

```
1. Lock acquired (KV)
2. Sandbox created (Vercel Sandbox SDK)
3. Base snapshot restored (contains runner + deps)
4. Artist snapshot restored (contains their workspace state)
5. Agent runner executed (Claude Agent SDK)
6. Workspace exported as new snapshot
7. Sandbox stopped, lock released
```

### Key Files to Know

| File | Purpose |
|------|---------|
| `lib/artist-os/lock.ts` | Redis-based artist locking |
| `lib/artist-os/snapshot.ts` | Blob upload/download for workspaces |
| `lib/artist-os/sandbox.ts` | Sandbox creation and lifecycle |
| `lib/artist-os/validation.ts` | Zod schemas for workspace files |
| `workspace-template/CLAUDE.md` | Instructions for the agent inside sandbox |
| `workspace-template/.incurator/runner.ts` | Agent harness that runs in sandbox |

### Testing Artist OS Locally

1. Pull Vercel environment:
   ```bash
   vercel env pull
   ```

2. Start dev server:
   ```bash
   pnpm dev
   ```

3. Test the endpoint:
   ```bash
   curl -X POST http://localhost:3000/api/artist-os/query \
     -H "Content-Type: application/json" \
     -d '{"artist_id":"test_001","prompt":"What is in my workspace?"}' \
     --no-buffer
   ```

4. Observe SSE events streaming back.

### Debugging Sandboxes

- View active sandboxes: Vercel Dashboard → Project → Observability → Sandboxes
- Sandbox logs stream to your terminal via SSE
- If sandbox hangs, it will timeout (max 15 min in our config)
- Force stop via `/api/artist-os/stop` endpoint

## ExecPlan Usage

For full details on ExecPlans, see [PLANS.md](./PLANS.md).

### When to Create an ExecPlan

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

### ExecPlan Location

```
plans/
  └── {feature-name}/
      ├── {feature}_execplan.md    # Main plan
      ├── {feature}_overview.md    # Current state analysis (optional)
      ├── {feature}_design.md      # Target architecture (optional)
      └── {feature}_validation.md  # Test plan (optional)
```

### Companion Documents

For complex features, create supporting documents alongside the ExecPlan:

| Document | Purpose |
|----------|---------|
| `{feature}_execplan.md` | Master plan orchestrating the work |
| `{feature}_overview.md` | Current state inventory, data flows, and technical analysis |
| `{feature}_design.md` | Target architecture, data model, and API specifications |
| `{feature}_validation.md` | Test plan, parity strategy, and acceptance criteria |

Not every feature needs all four documents. Use judgment: a simple feature might only need the ExecPlan, while a major refactor benefits from the full set.

### Maintaining an ExecPlan

1. **Progress section** — Update at every stopping point with timestamps
2. **Decision Log** — Record non-obvious decisions with rationale
3. **Surprises & Discoveries** — Note unexpected behaviors or findings
4. **Outcomes & Retrospective** — Fill at completion

### Reading an ExecPlan

1. Read "Purpose / Big Picture" for context
2. Check "Progress" for current state
3. Read the next incomplete milestone
4. Follow "Concrete Steps" for exact commands
5. Use "Validation and Acceptance" to verify completion

## Don'ts

- **Don't guess** — Read the code first
- **Don't make sweeping changes** — Small, incremental modifications
- **Don't skip tests** — Run `pnpm test` frequently
- **Don't introduce new patterns** — Follow existing conventions
- **Don't add dependencies without justification** — Keep the stack minimal
- **Don't commit broken code** — Validate before every commit
- **Don't ignore lint errors** — Fix them or explain why they're false positives
- **Don't hardcode secrets** — Use environment variables
- **Don't forget to update docs** — Stale docs are worse than no docs

## Quick Commands Reference

```bash
# Development
pnpm dev                    # Start Next.js dev server
pnpm build                  # Production build
pnpm start                  # Start production server

# Testing
pnpm test                   # Run unit tests
pnpm test:watch             # Watch mode
pnpm test:coverage          # With coverage
pnpm test:all               # All tests including services

# Code Quality
pnpm lint                   # ESLint
pnpm tsc --noEmit           # Type check

# Database
pnpm db:generate            # Generate migration
pnpm db:push                # Push schema changes
pnpm db:migrate             # Run migrations
pnpm db:studio              # Open Drizzle Studio
pnpm db:seed                # Seed database

# Environment
vercel env pull             # Pull env vars from Vercel
vercel link                 # Link to Vercel project
```
