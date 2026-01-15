# Incurator Artist OS MVP — Filesystem-First Agent in Vercel Sandbox

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document must be maintained in accordance with PLANS.md at the repository root.


## Purpose / Big Picture

Incurator Artist OS is an autonomous AI agent that manages an independent music artist's career from a single, persistent workspace. After this change, artists can send natural language queries to the agent ("prepare my next single release", "what's on my task list today?", "draft a marketing plan for Q2"), and the agent will read their workspace state, execute multi-step plans, update files, and stream progress back in real time.

The agent runs inside a Vercel Sandbox (isolated Linux microVM), stores its durable state in a tarball snapshot persisted to Vercel Blob, and exposes a single API route that clients call to interact. This architecture ensures:

1. **Isolation**: Agent-generated code runs in an ephemeral VM, not your production servers
2. **Durability**: Every run ends with a snapshot; the agent can resume from exactly where it left off
3. **Security**: Long-lived secrets (API keys, Blob tokens) never enter the sandbox
4. **Observability**: All stdout/stderr streams to the client in real time

**What you can do after this change:**
- Call `POST /api/artist-os/query` with an artist ID and prompt
- Watch real-time SSE logs as the agent works
- See workspace changes persisted across sessions
- Verify the agent refuses dangerous operations (posting without approval, rm -rf, etc.)


## Progress

- [x] (2026-01-05 23:12Z) Phase 1: Project scaffolding and dependencies
- [x] (2026-01-05 23:12Z) Phase 2: Base snapshot creation tooling
- [x] (2026-01-05 23:12Z) Phase 3: API route implementation (`/api/artist-os/query`)
- [x] (2026-01-05 23:12Z) Phase 4: Agent runner implementation (`.incurator/runner.ts`)
- [x] (2026-01-05 23:12Z) Phase 5: Guardrails and validation layer
- [x] (2026-01-05 23:12Z) Phase 6: Skills and CLAUDE.md configuration
- [x] (2026-01-05 23:12Z) Phase 7: Integration testing and validation
- [x] (2026-01-05 23:12Z) Phase 8: Documentation and handoff


## Surprises & Discoveries

(To be filled during implementation)

- Observation: Vercel KV now provisions Redis with a `REDIS_URL` connection string instead of REST API tokens.
  Evidence: Vercel dashboard shows only `REDIS_URL` for the new Redis database.

- Observation: Vite/Vitest config bundling fails when the project path includes a `*` character.
  Evidence: `pnpm test` reported "config path contains the \"*\" character" and esbuild errors; resolved by using `--configLoader=runner` and ESM-safe `import.meta.url`.

- Observation: `@vercel/blob` server SDK currently only allows `access: \"public\"` in type definitions.
  Evidence: TypeScript error when using `access: \"private\"` in snapshot uploads.


## Decision Log

- Decision: Use Vercel Blob as the primary snapshot store
  Rationale: Native Vercel integration, S3-backed durability, simple server SDK. No vendor lock-in concerns for text/JSON workspaces under 10MB.
  Date/Author: 2026-01-05 / Franco

- Decision: Use `node24` runtime for sandboxes
  Rationale: Latest LTS available in Vercel Sandbox; better performance and ESM support than node22.
  Date/Author: 2026-01-05 / Franco

- Decision: API layer performs all Blob IO (Strategy A)
  Rationale: Prevents secret exfiltration. Agent never sees storage credentials. Simpler security model. Trade-off is moving bytes through API, but workspaces are small.
  Date/Author: 2026-01-05 / Franco

- Decision: ANTHROPIC_API_KEY passed into sandbox for agent model calls
  Rationale: The Claude Agent SDK running inside the sandbox needs to call Claude's API. This is a necessary trade-off for MVP. **Clarification on secret handling:** Blob tokens never enter the sandbox (all storage IO is proxied by the API layer). The ANTHROPIC_API_KEY does enter the sandbox because the agent runner needs it to make model calls. Future improvement could proxy model calls through the API layer, but this adds latency and complexity.
  Date/Author: 2026-01-05 / Franco

- Decision: Lock + reject (409) for concurrent artist requests
  Rationale: Artists rarely make concurrent requests. Simpler than queuing for MVP. Client can implement retry.
  Date/Author: 2026-01-05 / Franco

- Decision: Use Redis native connection (`REDIS_URL`) with `ioredis` for locking instead of `@vercel/kv`.
  Rationale: New Vercel Redis provides a standard connection string, not REST tokens; native Redis client avoids REST dependency.
  Date/Author: 2026-01-05 / Franco

- Decision: 5-minute warm sandbox policy for interactive sessions
  Rationale: Active CPU pricing means idle sandboxes are cheap. Improves responsiveness for follow-up queries.
  Date/Author: 2026-01-05 / Franco

- Decision: Use immutable snapshots with KV pointer instead of overwriting `workspace-latest.tar.gz`
  Rationale: Vercel Blob caches reads for up to 60 seconds after overwrite, causing stale data bugs. Immutable names + KV pointer for "latest" provides immediate consistency. Bonus: old snapshots retained for free rollback capability.
  Date/Author: 2026-01-05 / Franco

- Decision: Add workspace manifest (`.index/manifest.json`) for in-workspace indexing
  Rationale: Manifest tracks file hashes, sizes, and update times for audit trail and workspace health monitoring. **Note (MVP clarification):** The manifest is for in-workspace indexing only; we still hydrate full tarballs on restore and export full tarballs on snapshot. Lazy-loading of individual files from Blob is deferred to post-MVP if workspace sizes become a performance concern.
  Date/Author: 2026-01-05 / Franco

- Decision: Use structured JSONL commit log (`.trace/commits.jsonl`) for audit trail
  Rationale: Vague audit logs are hard to debug. Structured JSONL format enables "what changed when" queries, accountability, and future rollback/undo features.
  Date/Author: 2026-01-05 / Franco

- Decision: Implement safe write semantics (default-deny overwrite, path traversal blocking)
  Rationale: Agents hallucinate. Without explicit protection, they'll overwrite critical files. Append-first approach for journals/logs prevents data loss.
  Date/Author: 2026-01-05 / Franco

- Decision: Defer KV + FS split for hot data to post-MVP
  Rationale: Separating frequently-read JSON into KV vs narrative Markdown in filesystem is elegant but may be overkill for MVP. Revisit if contention issues arise.
  Date/Author: 2026-01-05 / Franco

- Decision: Implement Feature List Pattern (features.json with passes/fails)
  Rationale: Per Anthropic's "Effective harnesses for long-running agents" research, agents tend to one-shot complex tasks or declare victory prematurely. A structured feature list with passes/fails status forces incremental work and clear completion criteria.
  Date/Author: 2026-01-05 / Franco

- Decision: Use formal Agent Skills format (SKILL.md with YAML frontmatter)
  Rationale: Anthropic's open Agent Skills standard provides progressive disclosure - only skill name/description loaded into system prompt, full content loaded when triggered. This optimizes the "attention budget" for context engineering.
  Date/Author: 2026-01-05 / Franco

- Decision: Implement init.sh pattern for session initialization
  Rationale: Per Anthropic's research, agents waste context figuring out how to start. An init.sh script ensures every session begins from a known-good state with verification before new work begins.
  Date/Author: 2026-01-05 / Franco

- Decision: Add compaction strategy for long-running sessions
  Rationale: Context is a finite resource with diminishing returns. Implement compaction hooks that summarize history while preserving architectural decisions, unresolved bugs, and key state. Clear redundant tool outputs.
  Date/Author: 2026-01-05 / Franco

- Decision: Implement structured note-taking pattern for agentic memory
  Rationale: Enhanced progress/claude-progress.md with current session status, recent accomplishments, active blockers, next steps, and key decisions. Acts as persistent memory that survives context resets.
  Date/Author: 2026-01-05 / Franco

- Decision: Embrace "Bash is all you need" philosophy
  Rationale: Per Vercel's d0 agent research, removing 80% of custom tools and using Bash primitives (grep, cat, find, sed) increased success rate from 80% to 100%, reduced tokens by 37%, and was 3.5x faster. Claude is heavily trained on Bash. Don't build tools for what Unix already solves.
  Date/Author: 2026-01-05 / Franco

- Decision: Minimize dedicated tools to irreversible actions only
  Rationale: Every tool is a choice you're making for the model. Models make better choices when we stop making choices for them. Reserve dedicated tools for: (1) irreversible actions (posts, emails), (2) external APIs with strict validation, (3) approval workflows.
  Date/Author: 2026-01-05 / Franco

- Decision: Use file system as agent memory and context
  Rationale: Agent stores intermediate results to files (`> /tmp/results.txt`), reads them back later. File system is 50+ years of proven abstraction. Progressive context disclosure via filesystem navigation beats pre-loading everything.
  Date/Author: 2026-01-05 / Franco

- Decision: Implement Swiss Cheese security model (layered defense)
  Rationale: No single security layer is perfect. Combine: (1) model alignment, (2) system prompt prohibitions, (3) harness guardrails (canUseTool/disallowedTools, hooks, safe-fs), (4) sandbox isolation (Vercel Sandbox with network/filesystem restrictions).
  Date/Author: 2026-01-05 / Franco

- Decision: Frame runner.ts as "Agent Harness" (operating system layer)
  Rationale: Per 2026 Agent Harness research, the harness is the OS that wraps the model (CPU) and manages context (RAM). This mental model clarifies responsibilities: harness handles boot sequence (prompts, hooks), context curation, and standard drivers (tools). The agent application runs on top.
  Date/Author: 2026-01-05 / Franco

- Decision: Optimize for KV-cache hit rate as primary performance metric
  Rationale: KV-cache directly affects latency and cost. Cached input tokens cost 10x less than uncached (0.30 vs 3 USD/MTok on Claude). Keep prompt prefix stable (no timestamps!), make context append-only, mark cache breakpoints explicitly.
  Date/Author: 2026-01-05 / Franco

- Decision: Mask tools instead of removing them dynamically
  Rationale: Adding/removing tools mid-iteration invalidates KV-cache (tool definitions live at context start). Instead, mask tool selection via logit constraints. Design action names with consistent prefixes (task_*, release_*, marketing_*) for easy group masking.
  Date/Author: 2026-01-05 / Franco

- Decision: Implement reversible compaction before irreversible summarization
  Rationale: Per Manus architecture, strip info that can be reconstructed from environment first. If agent wrote a file, rewrite history to reference path only (file exists, can be re-read). Only use summarization (irreversible) when compaction isn't enough, and use Structured Outputs (schemas) not free-form summaries.
  Date/Author: 2026-01-05 / Franco

- Decision: Implement Layered Action Space (3 tiers)
  Rationale: Per Manus research, don't give agent 100+ tools. Layer 1: Atomic Functions (~10-20 schema-safe tools). Layer 2: Sandbox Utilities (installed CLIs accessed via shell - ffmpeg, jq). Layer 3: Packages & APIs (agent writes scripts that call APIs, prints only summary). Large outputs piped to files, not context.
  Date/Author: 2026-01-05 / Franco

- Decision: Implement todo.md recitation pattern for attention manipulation
  Rationale: Per Manus research, agents drift off-topic in long contexts. By constantly rewriting a todo.md with current objectives, agent pushes global plan into recent attention span, avoiding "lost-in-the-middle" issues. Natural language attention bias without architectural changes.
  Date/Author: 2026-01-05 / Franco

- Decision: Keep failed actions in context (don't hide errors)
  Rationale: Erasing failure removes evidence. When model sees failed action + stack trace, it implicitly updates beliefs and shifts prior away from similar actions. Error recovery is key indicator of agentic behavior. Leave wrong turns in context.
  Date/Author: 2026-01-05 / Franco

- Decision: Introduce variation to prevent few-shot trapping
  Rationale: If context is full of similar action-observation pairs, model mimics the pattern even when suboptimal. Introduce structured variation: alternate serialization templates, minor phrasing changes, slight format noise. Prevents overgeneralization and drift.
  Date/Author: 2026-01-05 / Franco

- Decision: Build infrastructure to delete (Bitter Lesson)
  Rationale: Per Sutton's Bitter Lesson applied to agents, general methods using computation beat hand-coded knowledge. Every model release has different optimal agent structure. Build harness that allows ripping out "smart" logic. Over-engineered control flow breaks on next model update.
  Date/Author: 2026-01-05 / Franco

- Decision: Treat harness trajectories as training dataset
  Rationale: Competitive advantage is not the prompt, it's the trajectories the harness captures. Every agent failure late in workflow = data for training next iteration. Log structured traces that can feed back into model improvement.
  Date/Author: 2026-01-05 / Franco

- Decision: Use header-based auth for MVP (`x-user-id` or `Authorization: Bearer`) and ownership by explicit header or artist-id prefix match.
  Rationale: The repo has no existing auth provider. Header-based identity keeps the MVP runnable while enabling 401/403 coverage and ownership checks.
  Date/Author: 2026-01-05 / Codex

- Decision: Require `ARTIST_OS_ADMIN_TOKEN` for snapshot/stop admin routes.
  Rationale: Admin endpoints should not be publicly callable. A simple shared secret is sufficient for MVP and keeps the API explicit.
  Date/Author: 2026-01-05 / Codex

- Decision: Default rate limits to 10 requests/min per user and 5 requests/min per artist.
  Rationale: Conservative limits prevent abuse while keeping interactive usage smooth. Values are configurable via env.
  Date/Author: 2026-01-05 / Codex

- Decision: Marketing approval flow is instruction-based, not enforced at harness level (MVP limitation).
  Rationale: The ExecPlan validation scenario #6 describes an approval flow where posting requests create entries in `marketing/approval.json`. For MVP, this is documented in CLAUDE.md but NOT enforced by harness guardrails. Enforcement would require either (1) intent detection (complex NLP), or (2) a dedicated "RequestApproval" tool that intercepts all posting attempts. Since no external social API tool exists in MVP, the risk is mitigated (agent can claim to post but has no actual API). Post-MVP should add explicit approval tools.
  Date/Author: 2026-01-05 / Codex

- Decision: Allow `WORKSPACE_ROOT` override for workspace-template modules in tests.
  Rationale: Enables deterministic unit tests for safe-fs and validation without sandbox-only paths.
  Date/Author: 2026-01-05 / Codex

- Decision: Use Vitest `--configLoader=runner` to avoid esbuild bundling failures on `*` path roots.
  Rationale: The repository path includes `*`, which breaks esbuild config bundling. Runner loader keeps tests runnable.
  Date/Author: 2026-01-05 / Codex

- Decision: Place Next.js API routes and libraries under `src/` to match existing repo structure.
  Rationale: The project is already configured with `src/app` and `@/*` aliasing. Keeping new files under `src/` aligns with current conventions.
  Date/Author: 2026-01-05 / Codex

- Decision: Use `access: \"public\"` for Blob uploads due to SDK type constraints.
  Rationale: The installed @vercel/blob version only accepts `public` access in type definitions. For MVP, Blob objects remain public but keyed under predictable paths.
  Date/Author: 2026-01-05 / Codex


## Outcomes & Retrospective

The Artist OS MVP scaffolding, sandbox orchestration, workspace template, and validation tooling are implemented end-to-end. API routes stream SSE status/log events, snapshots are immutable with Redis pointers, and admin controls exist for snapshot inspection and sandbox stops. The workspace runner includes safe write guardrails, schema validation, structured audit logs, skill summaries, compaction hooks, and progress handover updates. Unit tests cover locks, rate limiting, snapshot pointer updates, safe-fs behavior, and validation; documentation includes API and runbook guides. Remaining gaps are limited to running the base snapshot builder and full sandbox integration in an environment with real Vercel credentials.


## Related Documents

- Overview: `plans/artist-os-mvp/artist-os-mvp_overview.md` (current state analysis - create if needed)
- Design: This document serves as design specification
- Validation: `plans/artist-os-mvp/artist-os-mvp_validation.md` (test plan - create during Phase 7)
 
The overview and validation companion documents were created during implementation.


## Context and Orientation

This section explains the technology stack and key concepts for someone new to the project.

### What is Vercel Sandbox?

Vercel Sandbox is an isolated Linux microVM service that runs arbitrary code safely. Each sandbox:
- Is a Firecracker microVM with its own filesystem, process, and network namespace
- Runs Amazon Linux 2023 with Node.js 24 and common package managers (npm, pnpm, yarn)
- Can execute for up to 45 minutes (Hobby) or 5 hours (Pro/Enterprise)
- Is billed on "Active CPU" time—you only pay when code is actively running

The SDK (`@vercel/sandbox`) provides methods to:
- `Sandbox.create()` - spin up a new VM
- `sandbox.runCommand()` - execute shell commands with streaming stdout/stderr
- `sandbox.writeFiles()` / `sandbox.readFile()` - transfer files into/out of the sandbox
- `sandbox.stop()` - terminate the sandbox

### What is Vercel Blob?

Vercel Blob is S3-compatible object storage native to Vercel. The SDK (`@vercel/blob`) provides:
- `put(key, data, options)` - upload an object
- `head(key)` - get metadata without downloading
- `del(key)` - delete an object
- `list(options)` - list objects with pagination

Blob storage uses a read-write token (`BLOB_READ_WRITE_TOKEN`) for authentication. **This token must never enter the sandbox** to prevent exfiltration.

### What is the Claude Agent SDK?

The Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) wraps Claude Code's capabilities for programmatic use. It provides:
- File reading/writing/editing tools
- Shell command execution
- Multi-turn conversation with persistent state
- MCP (Model Context Protocol) tool integration

The agent runs as a long-lived process inside the sandbox, receiving prompts and streaming responses.

### Manifest & Lazy Loading Pattern

As workspaces grow (50+ files), full tarball hydration on every run becomes slow. We solve this with a **manifest-based lazy loading** pattern:

1. **Manifest (`.index/manifest.json`)**: A lightweight index (~5KB) listing all files with their hashes, sizes, and modification times. Enables instant directory listings without hitting Blob.

2. **Hot Files**: Critical context files (`CLAUDE.md`, `profile/artist.json`, `progress/claude-progress.md`) are fetched in parallel immediately on startup.

3. **Lazy Fetch**: Other files are fetched from the workspace only when the agent requests them. Most runs only need 5-10 files, not 500.

**Manifest Structure:**

    {
      "version": 42,
      "lastUpdated": "2026-01-05T10:00:00Z",
      "files": {
        "profile/artist.json": { "hash": "abc123...", "size": 2048, "lastModified": "2026-01-04T..." },
        "tasks/backlog.json": { "hash": "def456...", "size": 4096, "lastModified": "2026-01-05T..." },
        ...
      },
      "hotFiles": ["CLAUDE.md", "profile/artist.json", "progress/claude-progress.md", "tasks/inbox.md"]
    }

**Benefits:**
- Agents can "list" the entire workspace instantly (0ms latency) by reading the in-memory manifest
- Only critical files are loaded upfront (reduces cold start time)
- Manifest is updated atomically on persist to prevent race conditions

### Architecture Overview

    ┌─────────────────────────────────────────────────────────────────────┐
    │                        Client (Web/Mobile)                          │
    │                    Sends prompt, receives SSE stream                │
    └─────────────────────────────────────────────────────────────────────┘
                                      │ HTTPS
                                      ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                    Next.js API Route                                │
    │                  POST /api/artist-os/query                          │
    │                                                                     │
    │  1. Acquire artist lock (Redis via Vercel)                          │
    │  2. Create/reuse sandbox                                            │
    │  3. Download snapshots from Blob                                    │
    │  4. Write snapshots into sandbox via writeFiles()                   │
    │  5. Run agent runner, stream output                                 │
    │  6. Read workspace tarball via readFile()                           │
    │  7. Upload snapshot to Blob                                         │
    │  8. Stop sandbox, release lock                                      │
    └─────────────────────────────────────────────────────────────────────┘
                                      │ Sandbox SDK
                                      ▼
    ┌─────────────────────────────────────────────────────────────────────┐
    │                      Vercel Sandbox (per artist)                    │
    │                    Isolated ephemeral Linux microVM                 │
    │                                                                     │
    │  /vercel/sandbox/workspace/                                         │
    │    ├── CLAUDE.md              (agent instructions)                  │
    │    ├── .incurator/                                                  │
    │    │   ├── runner.ts          (agent harness)                       │
    │    │   ├── schemas.ts         (Zod validation)                      │
    │    │   └── safe-fs.ts         (safe write semantics)                │
    │    ├── .index/                                                      │
    │    │   └── manifest.json      (file index for lazy loading)         │
    │    ├── .trace/                                                      │
    │    │   └── commits.jsonl      (structured audit trail)              │
    │    ├── profile/               (artist identity)                     │
    │    ├── tasks/                 (todo lists, backlog)                 │
    │    ├── releases/              (singles, EPs, albums)                │
    │    ├── marketing/             (campaigns, approvals)                │
    │    ├── finances/              (budgets, revenue)                    │
    │    └── progress/              (handover notes)                      │
    └─────────────────────────────────────────────────────────────────────┘

### File Paths (Repository-Relative)

After implementation, the following files will exist:

    app/
      api/
        artist-os/
          query/
            route.ts              # Main SSE endpoint
          snapshot/
            route.ts              # Admin: manual snapshot operations
          stop/
            route.ts              # Admin: force-stop sandbox
    lib/
      artist-os/
        lock.ts                   # Redis locking utilities
        snapshot.ts               # Blob upload/download + KV pointer helpers
        manifest.ts               # Workspace manifest management
        sandbox.ts                # Sandbox lifecycle management
        types.ts                  # Shared types for Artist OS
        validation.ts             # Zod schemas for workspace files
    scripts/
      build-base-snapshot.ts      # One-time script to create base snapshot
    workspace-template/
      CLAUDE.md                   # Agent instructions template
      init.sh                     # Session initialization script (run at start)
      features.json               # Feature list with passes/fails status
      .incurator/
        runner.ts                 # Agent runner harness
        schemas.ts                # Validation schemas
        safe-fs.ts                # Safe write semantics (append-first, path guards)
        audit.ts                  # Structured commit logging
      .index/
        manifest.json             # File index (hash, size, lastModified per file)
      .trace/
        commits.jsonl             # Structured audit trail (path, action, hash, timestamp)
      .claude/
        skills/                   # Agent Skills (formal SKILL.md format)
          release-checklist/
            SKILL.md              # Main skill file with YAML frontmatter
            detailed-checklist.md # Additional context (lazy-loaded)
          marketing-copy/
            SKILL.md              # Brand voice and content guidelines
      profile/
        artist.json.template      # Empty artist profile
      tasks/
        inbox.md                  # Empty inbox
        backlog.json              # Empty backlog
      progress/
        claude-progress.md        # Session handover notes (initializer vs maintainer pattern)
        last-run.json             # Structured last run metadata
      ...                         # Other scaffold directories


## Key Design Improvements (from Blueprint Analysis)

This section summarizes critical improvements incorporated from the Incurator Blueprint analysis.

### 1. Immutable Snapshots + KV Pointer (Critical)

**Problem:** Vercel Blob caches reads for up to 60 seconds after overwrite. Two requests 30 seconds apart would cause the second to read stale data, losing work.

**Solution:** 
- Upload snapshots with unique timestamp-based names (never overwrite)
- Store the "latest" pointer in Redis KV (immediate consistency)
- On restore, read KV first to get the actual snapshot URL

**Benefits:** No cache invalidation issues, old snapshots retained for free rollback.

### 2. Manifest & Lazy Loading (High Priority)

**Problem:** Full tarball hydration is slow as workspaces grow (50+ files).

**Solution:**
- Maintain `.index/manifest.json` with file hashes, sizes, and metadata
- Load only "hot files" on startup (CLAUDE.md, profile, progress)
- Lazy-fetch other files only when agent requests them

**Benefits:** Instant directory listings (0ms), reduced cold start time.

### 3. Structured Audit Trail (Medium-High Priority)

**Problem:** Vague audit logs are hard to debug. "Why did my goals disappear?"

**Solution:**
- Standardize on `.trace/commits.jsonl` JSONL format
- Each entry: `{path, action, hash, timestamp, sessionId, tool}`
- Append-only log for accountability

**Benefits:** "What changed when" queries, future rollback/undo capability.

### 4. Safe Write Semantics (Medium Priority)

**Problem:** Agents hallucinate and may overwrite critical files.

**Solution:**
- `write_file` fails if file exists (unless `allowOverwrite: true`)
- `append_file` for journals, logs, and progress notes
- Block path traversal (`..`, `/`)
- Protected paths list for critical files

**Benefits:** Prevents accidental data loss, enforces append-only for logs.

### 5. Progress Handover Pattern (Emphasized)

**Problem:** Agent forgets context between sessions.

**Solution:**
- **Initializer** (first run): Create scaffold + comprehensive progress notes
- **Maintainer** (subsequent): Read progress first, continue from where left off
- Always update `progress/claude-progress.md` and `progress/last-run.json`

**Benefits:** Session continuity, agent remembers what happened.

### 6. KV + FS Split (Post-MVP Consideration)

**Problem:** Multiple runs fighting over one big `state.json` file.

**Solution (deferred):**
- KV Store: Frequently-read JSON (profile, open tasks, metrics)
- Filesystem: Narrative Markdown, append-only logs

**Status:** Elegant but may be overkill for MVP. Implement if contention issues arise.


## Key Design Improvements (from Anthropic Agent Research)

This section incorporates critical patterns from Anthropic's published research on building effective long-running agents.

### 7. Feature List Pattern (High Priority)

> Source: "Effective harnesses for long-running agents" - Anthropic Engineering

**Problem:** Agents try to "one-shot" complex tasks or declare victory prematurely.

**Solution:**
- Create a structured JSON file (`features.json`) with all required capabilities
- Each feature has a `passes` field (initially `false`)
- Agent works on ONE feature at a time
- Agent can only change `passes` status, not remove or edit features
- Strongly-worded instructions: "It is unacceptable to remove or edit features"

**Implementation (`workspace-template/features.json`):**

    [
      {
        "id": "F001",
        "category": "core",
        "description": "Artist can send a prompt and receive a response",
        "steps": [
          "Connect to /api/artist-os/query endpoint",
          "Send a prompt via SSE",
          "Receive agent response stream"
        ],
        "passes": false
      },
      {
        "id": "F002",
        "category": "tasks",
        "description": "Agent can add tasks to the backlog",
        "steps": [
          "User asks to add a task",
          "Agent writes to tasks/backlog.json",
          "Task persists across sessions"
        ],
        "passes": false
      }
    ]

**Benefits:**
- Agent works incrementally, not all at once
- Clear definition of "done" for the entire system
- Prevents premature completion
- Enables progress tracking across sessions

### 8. Formal Agent Skills Format (High Priority)

> Source: "Agent Skills" - Anthropic Engineering

**Problem:** Skills are just markdown files with no structure for discovery or progressive disclosure.

**Solution:**
- Use the open Agent Skills standard with `SKILL.md` format
- YAML frontmatter with `name` and `description` (loaded into system prompt)
- Body contains full instructions (loaded only when skill is triggered)
- Additional files for deeper context (lazy-loaded as needed)

**Implementation (`workspace-template/.claude/skills/release-checklist/SKILL.md`):**

    ---
    name: release-checklist
    description: Steps and checklists for releasing a single, EP, or album. Use when artist asks to prepare, plan, or execute a music release.
    ---
    
    # Release Checklist Skill
    
    Use this guide when the artist asks to prepare, plan, or execute a release.
    
    ## When to Use This Skill
    - Artist mentions "release", "single", "EP", "album", "drop", "launch"
    - Planning distribution or marketing for new music
    - Preparing metadata, artwork, or promotional materials
    
    ## Pre-Release Checklist (4-6 weeks before)
    
    See [detailed-checklist.md](./detailed-checklist.md) for the complete timeline.
    
    1. Final master audio delivered
    2. Artwork finalized (3000x3000px minimum)
    3. Metadata prepared (see [metadata-template.json](./metadata-template.json))
    ...

**Progressive Disclosure Pattern:**
1. **System prompt**: Only skill name + description loaded (~100 tokens each)
2. **Triggered**: Full SKILL.md loaded when relevant (~500-2000 tokens)
3. **Deep dive**: Additional files loaded only when needed

**Benefits:**
- Minimal context overhead until skill is needed
- Structured discovery of capabilities
- Executable code can be bundled alongside instructions
- Portable across agent products

### 9. Visual Verification Pattern (Medium Priority)

> Source: "Effective harnesses for long-running agents" - Anthropic Engineering

**Problem:** Agent marks features as done without proper end-to-end testing.

**Solution:**
- Use browser automation (Playwright/Puppeteer MCP) for visual verification
- Agent tests features "as a human user would"
- Screenshots provide visual feedback for self-correction
- Catch bugs that aren't obvious from code alone

**Implementation Strategy:**
1. For API testing: Agent uses `curl` to verify SSE responses
2. For future UI: Add Playwright MCP for visual verification
3. Agent takes screenshot after each verification step
4. Agent self-corrects based on visual feedback

**When to Use:**
- After implementing any user-facing feature
- When debugging unexpected behavior
- Before marking a feature as "passes: true"

### 10. Init.sh Pattern for Repeatable Setup (Medium Priority)

> Source: "Effective harnesses for long-running agents" - Anthropic Engineering

**Problem:** Each agent session spends time figuring out how to run the development environment.

**Solution:**
- Initializer agent creates an `init.sh` script
- Script starts services, runs basic verification
- Every session starts by running `init.sh`
- Ensures environment is in a known-good state before new work

**Implementation (`workspace-template/init.sh`):**

    #!/bin/bash
    # Incurator Artist OS - Session Initialization Script
    
    echo "=== Incurator Artist OS Session Start ==="
    echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    
    # 1. Verify workspace structure
    echo "Checking workspace structure..."
    for dir in profile tasks releases marketing progress .trace .index; do
      if [ ! -d "$dir" ]; then
        echo "ERROR: Missing directory: $dir"
        exit 1
      fi
    done
    echo "✓ Workspace structure verified"
    
    # 2. Verify critical files exist
    echo "Checking critical files..."
    for file in CLAUDE.md profile/artist.json progress/claude-progress.md; do
      if [ ! -f "$file" ]; then
        echo "ERROR: Missing file: $file"
        exit 1
      fi
    done
    echo "✓ Critical files verified"
    
    # 3. Run basic end-to-end test (future: API health check)
    echo "Running basic verification..."
    # TODO: Add API health check when server is available
    echo "✓ Basic verification passed"
    
    echo "=== Session Ready ==="

**Session Start Sequence:**
1. Run `./init.sh` to verify environment
2. Read `progress/claude-progress.md` for context
3. Read `features.json` to identify next work item
4. Begin incremental work on highest-priority incomplete feature

### 11. Compaction Strategy for Long Sessions (Medium Priority)

> Source: "Effective context engineering for AI agents" - Anthropic Engineering

**Problem:** Long agent sessions exhaust context window, losing important information.

**Solution:**
- Implement automatic compaction when context approaches limit
- Summarize message history, preserving critical details
- Clear old tool results (they're not needed after use)
- Maintain last 5 recently accessed files in memory

**Key Insight: Context as Finite Resource**
> "Context must be treated as a finite resource with diminishing marginal returns. Like humans, who have limited working memory capacity, LLMs have an 'attention budget' that they draw on when parsing large volumes of context."

**What to Preserve During Compaction:**
- Architectural decisions and rationale
- Unresolved bugs or blockers
- Current implementation state
- Key file modifications made

**What to Discard:**
- Redundant tool outputs
- Verbose intermediate results
- Exploratory dead-ends
- Already-committed changes

**Implementation Notes:**
- The Claude Agent SDK has built-in compaction (`compact` command)
- For our runner, implement compaction hook when context exceeds 80% of limit
- Write compaction summary to `progress/session-{timestamp}.md` before clearing

### 12. Structured Note-Taking (Agentic Memory) (High Priority)

> Source: "Effective context engineering for AI agents" - Anthropic Engineering

**Problem:** Agent loses track of progress across tool calls and sessions.

**Solution:**
- Agent maintains structured notes persisted outside context window
- Notes pulled back into context at session start
- Acts like a "to-do list" that survives context resets

**Implementation:**
Our existing `progress/claude-progress.md` serves this purpose, but we should enhance it:


### 13. "Bash is All You Need" Philosophy (Critical)

> Source: Anthropic Claude Agent SDK team, Vercel d0 agent team
> Key insight: "We removed 80% of our agent's tools. It got better."

**The Problem with Many Tools:**
- Discovering how to use 100 custom tools consumes massive context
- Every tool is a choice you're making for the model
- Models make better choices when we stop making choices for them

**The Solution: Unix Primitives + File System**

Claude is heavily trained on Bash. Instead of building 50 separate tools, give the agent:
- `grep` - search files and data
- `cat` - read files
- `ls`, `find` - discover content
- `sed`, `awk` - transform data
- `wc` - count/analyze
- `|` (pipe) - compose operations
- `>`, `>>` - store results to files

**The "Vercel Revelation":**

    # Old approach: 15+ custom tools
    tools: {
      GetEntityJoins, LoadCatalog, RecallContext, LoadEntityDetails, 
      SearchCatalog, ClarifyIntent, SearchSchema, GenerateAnalysisPlan, 
      FinalizeQueryPlan, JoinPathFinder, SyntaxValidator, ExecuteSQL, 
      FormatResults, VisualizeData, ExplainResults
    }
    
    # New approach: 2 tools (100% success rate, 3.5x faster)
    tools: {
      ExecuteCommand,  // Bash in sandbox
      ExecuteSQL,      // Only for irreversible DB operations
    }

**Our Strategy:**

| Use Case | Approach |
|----------|----------|
| Search workspace | `grep -r "pattern" .` via Bash |
| Read files | `cat file.md` or native Read tool |
| Count/analyze | `wc -l`, `grep -c` via Bash |
| Transform data | `sed`, `awk`, `jq` via Bash |
| Store intermediate results | `command > /tmp/results.txt` |
| Compose operations | Pipe: `grep "task" | wc -l` |
| Complex logic | Write and run ad-hoc scripts |
| Irreversible actions | Dedicated tools (approval, posting) |

**When to Use Dedicated Tools (not Bash):**
1. **Irreversible actions** - social posts, emails, payments
2. **External API calls** - where you want strict schema validation
3. **Approval workflows** - human-in-the-loop gates

**File System as Memory:**
- Store intermediate results: `echo "$RESULT" > .cache/search_results.txt`
- Build context progressively: agent reads what it needs
- Skills as folders: agent `cd`s into skill directory and reads instructions

**Implementation Note:**
Our Vercel Sandbox gives the agent full Linux environment. The agent should:
1. Use `grep`, `find`, `cat` to explore the workspace
2. Use `|` (pipe) to compose commands efficiently
3. Store results to files for later reference
4. Write scripts for complex multi-step logic

### 14. Sub-Agent Architecture for High-Context Tasks (Medium Priority)

> Source: "Building agents with the Claude Agent SDK" - Anthropic Engineering

**Problem:** Some tasks require extensive exploration that pollutes the main context.

**Solution:**
- Spin up sub-agents for research/exploration tasks
- Sub-agent performs 50+ steps but returns only a summary
- Main agent stays focused on coordination

**Example Use Cases:**
- Research sub-agent: explores all releases, returns summary
- Analysis sub-agent: reads all contracts, extracts key terms
- Planning sub-agent: explores options, returns recommendation

**Benefits:**
- Main agent context stays clean
- Parallel execution possible (sub-agents for different tasks)
- Each sub-agent has fresh, focused context

**Implementation (Future):**
    
    // In runner, spawn sub-agent for research
    const researchResult = await runSubAgent({
      prompt: "Research all marketing campaigns and summarize effectiveness",
      cwd: WORKSPACE,
      returnSummaryOnly: true,  // Don't return full trace
    });
    
    // Main agent receives condensed result
    // Not 50 tool calls, just the summary

### 15. Deterministic Verification Pattern (High Priority)

> Source: Claude Agent SDK team
> Key insight: "If you can verify the work, the agent can self-correct. If you can't verify, reliability drops."

**The Verification Hierarchy:**

| Type | Reliability | Example |
|------|-------------|---------|
| Deterministic | Highest | Lint code, validate JSON, compile |
| Semi-deterministic | High | Run tests, check API response |
| Model-based | Medium | LLM judges output quality |
| Human-only | Lowest | Creative writing, subjective tasks |

**Our Verification Strategy:**

1. **JSON Validation** (deterministic)
   - All JSON files validated against Zod schemas
   - Agent gets immediate feedback on invalid writes

2. **Feature Testing** (semi-deterministic)
   - Agent runs `./init.sh` to verify environment
   - Future: Playwright MCP for UI verification

3. **Progress Checks** (semi-deterministic)
   - Agent checks features.json for completion status
   - Agent verifies commits.jsonl for audit trail

**Implementation via Hooks:**

    hooks: {
      PreToolUse: [{
        hooks: [async (input) => {
          const toolName = input.tool || input.tool_name;
          
          // HOOK: Prevent writing without reading
          if (toolName === "Write" && !hasReadFile(input.path)) {
            throw new Error("You must read the file before editing it.");
          }
          
          // HOOK: Validate JSON before write
          if (input.path?.endsWith(".json")) {
            try {
              JSON.parse(input.content);
            } catch {
              throw new Error("Invalid JSON. Fix and retry.");
            }
          }
          
          return { continue: true };
        }],
      }],
    }

### 16. Swiss Cheese Security Model (Critical)

> Source: Claude Agent SDK team
> Key insight: "Use a layered approach - no single layer is perfect, but together they're robust."

**The Layers:**

    ┌─────────────────────────────────────────────────────────────┐
    │ Layer 1: MODEL ALIGNMENT                                     │
    │ Claude's built-in refusal training (first line of defense)  │
    └─────────────────────────────────────────────────────────────┘
                              ▼
    ┌─────────────────────────────────────────────────────────────┐
    │ Layer 2: SYSTEM PROMPT                                       │
    │ CLAUDE.md instructions forbidding dangerous actions         │
    └─────────────────────────────────────────────────────────────┘
                              ▼
    ┌─────────────────────────────────────────────────────────────┐
    │ Layer 3: HARNESS GUARDRAILS                                  │
    │ canUseTool/disallowedTools, hooks, safe-fs.ts               │
    └─────────────────────────────────────────────────────────────┘
                              ▼
    ┌─────────────────────────────────────────────────────────────┐
    │ Layer 4: SANDBOX ISOLATION                                   │
    │ Vercel Sandbox - agent can't escape VM                      │
    │ - Network: No internet access from sandbox                  │
    │ - Filesystem: Can't touch files outside workspace           │
    │ - Secrets: BLOB_TOKEN, API keys never enter sandbox         │
    └─────────────────────────────────────────────────────────────┘

**Our Implementation:**
- **Layer 1**: Claude's training (free)
- **Layer 2**: CLAUDE.md with explicit prohibitions
- **Layer 3**: `canUseTool`, `disallowedTools`, `safe-fs.ts`, Zod validation
- **Layer 4**: Vercel Sandbox (already in architecture)

**Implementation:**
Our existing `progress/claude-progress.md` serves this purpose, but we should enhance it:

    # Claude Progress Notes
    
    ## Current Session
    - **Started**: 2026-01-05T10:30:00Z
    - **Working On**: Feature F003 - Task inbox management
    - **Status**: In progress - 3 of 5 steps complete
    
    ## Recent Accomplishments
    - [2026-01-05] Completed F001: Basic prompt/response flow
    - [2026-01-05] Completed F002: Task backlog creation
    
    ## Active Blockers
    - None
    
    ## Next Steps
    1. Complete inbox.md parsing
    2. Test task addition end-to-end
    3. Mark F003 as passes: true
    
    ## Key Decisions Made
    - Tasks stored in JSON for validation, inbox in Markdown for readability
    - Using ISO 8601 timestamps everywhere

**When to Update:**
- At session start (read and verify)
- After completing a significant step
- Before any compaction
- At session end (mandatory)


## Key Design Improvements (from Agent Harness Architecture 2026)

This section incorporates critical patterns from the 2026 Agent Harness research and Manus context engineering insights.

### 17. The Agent Harness as Operating System (Foundational)

> Source: "The importance of Agent Harness in 2026" - Peak Ji / Manus team
> Key insight: "The gap between models becomes clear the longer and more complex a task gets. It comes down to durability."

**The Computer Metaphor:**

    ┌────────────────────────────────────────────────────────────────┐
    │                    AGENT (Application)                          │
    │              The specific user logic running on top             │
    │                  "Incurator Artist Manager"                     │
    └────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
    ┌────────────────────────────────────────────────────────────────┐
    │              AGENT HARNESS (Operating System)                   │
    │                                                                 │
    │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐│
    │  │ Prompt       │ │ Tool        │ │ Lifecycle Hooks           ││
    │  │ Presets      │ │ Handling    │ │ (PreToolUse, PostToolUse) ││
    │  └──────────────┘ └──────────────┘ └──────────────────────────┘│
    │                                                                 │
    │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐│
    │  │ Filesystem   │ │ Planning    │ │ Sub-Agent                 ││
    │  │ Access       │ │ Primitives  │ │ Management                ││
    │  └──────────────┘ └──────────────┘ └──────────────────────────┘│
    │                                                                 │
    │                     runner.ts = The OS                          │
    └────────────────────────────────────────────────────────────────┘
                  │                            │
                  ▼                            ▼
    ┌─────────────────────┐      ┌─────────────────────────────────┐
    │   MODEL (CPU)       │      │   CONTEXT WINDOW (RAM)          │
    │   Claude Sonnet 4.5 │      │   Limited, volatile working     │
    │   Raw processing    │      │   memory (~200k tokens)         │
    │   power             │      │   Careful management required   │
    └─────────────────────┘      └─────────────────────────────────┘

**What the Harness Provides (runner.ts responsibilities):**
- **Boot Sequence**: Load CLAUDE.md, hot files, skill summaries into context
- **Context Curation**: Compaction, offloading, retrieving on demand
- **Standard Drivers**: Tool handling with consistent interfaces
- **Lifecycle Hooks**: PreToolUse, PostToolUse for validation and auditing
- **Sub-Agent Management**: Spawn research tasks that return summaries only

**Our Implementation:**
Our `workspace-template/.incurator/runner.ts` IS the Agent Harness. It:
1. Runs `init.sh` (boot sequence)
2. Loads hot files and skill summaries (context curation)
3. Configures tools and hooks (standard drivers)
4. Validates outputs and logs to commits.jsonl (lifecycle management)

### 18. KV-Cache Optimization for Cost and Latency (Critical)

> Source: Manus context engineering
> Key insight: "The KV-cache hit rate is the single most important metric for a production-stage AI agent."

**The Economics:**
| Scenario | Cost (Claude Sonnet) |
|----------|---------------------|
| Cached input tokens | 0.30 USD/MTok |
| Uncached input tokens | 3.00 USD/MTok |
| **Savings** | **10x cheaper** |

**Cache Invalidation Rules:**
- LLMs use autoregressive decoding
- Even a single-token difference invalidates cache from that token forward
- Tool definitions live at the front of context after serialization
- Any tool change = cache miss for entire subsequent context

**Best Practices (implement in runner.ts):**

1. **Keep prompt prefix stable:**
   
       // ❌ BAD: Timestamp at start kills cache
       const systemPrompt = `Current time: ${new Date().toISOString()}
       You are the Incurator Artist Manager...`;
       
       // ✅ GOOD: Timestamp at end, after stable content
       const systemPrompt = `You are the Incurator Artist Manager...
       
       Current session: ${new Date().toISOString()}`;

2. **Make context append-only:**
   - Never modify previous actions or observations
   - Don't rewrite tool outputs retroactively
   - Append new content, don't insert

3. **Deterministic serialization:**
   
       // ❌ BAD: Object key order may vary
       JSON.stringify(artistProfile);
       
       // ✅ GOOD: Sorted keys for deterministic output
       JSON.stringify(artistProfile, Object.keys(artistProfile).sort());

**Implementation Note:**
Our Vercel Sandbox runs with fresh context each call, but within a session we should maximize cache hits for multi-turn interactions.

### 19. Mask, Don't Remove - Dynamic Action Space (High Priority)

> Source: Manus architecture
> Key insight: "Avoid dynamically adding or removing tools mid-iteration."

**The Problem:**
- Tool definitions serialize near front of context (before/after system prompt)
- Adding/removing tools invalidates KV-cache for ALL subsequent content
- Previous actions referring to removed tools confuse the model

**The Solution: Token Logit Masking**

Instead of removing tools, mask their selection at decode time:

    // Don't do this - breaks cache
    const tools = getToolsForCurrentState(state);  // Dynamic list
    
    // Do this - tools are fixed, selection is masked
    const tools = ALL_TOOLS;  // Always the same
    const allowedPrefixes = getToolPrefixes(state);  // ["task_", "release_"]

**Tool Naming Convention (for easy masking):**

    // Design action names with consistent prefixes
    const TOOLS = {
      // Task management group
      task_create: { ... },
      task_update: { ... },
      task_complete: { ... },
      
      // Release management group
      release_create: { ... },
      release_schedule: { ... },
      
      // Marketing group
      marketing_draft: { ... },
      marketing_approve: { ... },
    };

**Masking Modes:**
| Mode | Prefill | Use Case |
|------|---------|----------|
| Auto | `<\|im_start\|>assistant` | Model chooses any action or text |
| Required | `<\|im_start\|>assistant<tool_call>` | Must call some tool |
| Specified | `<\|im_start\|>assistant<tool_call>{"name": "task_` | Must call task_* tool |

### 20. Layered Action Space Architecture (Critical)

> Source: Manus architecture
> Key insight: "Instead of giving the agent 100+ tools, use a Layered Action Space."

**The Three Layers:**

    ┌────────────────────────────────────────────────────────────────┐
    │ Layer 3: PACKAGES & APIS (Code Execution)                      │
    │                                                                 │
    │ For heavy computation, agent writes scripts that call APIs     │
    │ and print only summaries. Pre-load API keys in environment.    │
    │                                                                 │
    │ Example: "Analyze my streaming stats" →                        │
    │   Agent writes Python script that calls Spotify API,           │
    │   processes data, prints summary. Not 1000 data points.        │
    └────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
    ┌────────────────────────────────────────────────────────────────┐
    │ Layer 2: SANDBOX UTILITIES (CLI Tools via Shell)               │
    │                                                                 │
    │ Don't make these LLM "tools" - install in Linux environment.   │
    │ Agent uses them via run_shell tool.                            │
    │                                                                 │
    │ Examples: ffmpeg, jq, format converters, MCP CLIs              │
    │ Advantage: Large outputs piped to files, not context           │
    │                                                                 │
    │   grep -r "release" . > /tmp/release_mentions.txt              │
    │   jq '.tasks[]' backlog.json > /tmp/tasks.txt                  │
    └────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
    ┌────────────────────────────────────────────────────────────────┐
    │ Layer 1: ATOMIC FUNCTIONS (Schema-Safe Tools)                  │
    │                                                                 │
    │ Keep this small: ~10-20 tools maximum                          │
    │ These are cached well by LLM provider                          │
    │                                                                 │
    │ Our core tools:                                                 │
    │ - Read, Write, Edit, MultiEdit (file operations)               │
    │ - Bash (gateway to Layer 2)                                    │
    │ - Glob, Grep (workspace navigation)                            │
    │ - approve_action (HITL for irreversible actions)               │
    └────────────────────────────────────────────────────────────────┘

**Our Implementation Strategy:**

| Need | Layer | Implementation |
|------|-------|----------------|
| Read files | 1 | `Read` tool or `cat` via Bash |
| Search workspace | 2 | `grep -r "pattern" .` via Bash |
| Parse JSON | 2 | `jq` via Bash |
| Analyze data | 3 | Agent writes script, runs it |
| Social post | 1 | `approve_action` tool (needs HITL) |

### 21. The 5 Pillars of Context Engineering (Consolidated)

> Source: Manus team, summarizing patterns across top agents
> Key insight: "Context Rot—where performance degrades as the context window fills up—starts around 128k-200k tokens."

**The Five Pillars:**

    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │  OFFLOAD    │  │   REDUCE    │  │  RETRIEVE   │  │   ISOLATE   │  │    CACHE    │
    │             │  │             │  │             │  │             │  │             │
    │ Move data   │  │ Summarize/  │  │ Pull back   │  │ Split across│  │ Save states │
    │ to files    │  │ prune       │  │ when needed │  │ sub-agents  │  │ off-context │
    └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
         ↓                ↓                ↓                ↓                ↓
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │ Write       │  │ Compact     │  │ Lazy load   │  │ Research    │  │ progress/   │
    │ results to  │  │ tool calls  │  │ from        │  │ sub-agent   │  │ claude-     │
    │ files, not  │  │ to paths    │  │ manifest    │  │ returns     │  │ progress.md │
    │ context     │  │ only        │  │             │  │ summary     │  │             │
    └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘

**Our Implementation Mapping:**

| Pillar | Our Implementation |
|--------|-------------------|
| Offload | File system as memory; `grep > /tmp/results.txt` |
| Reduce | Reversible compaction (paths not content); structured summaries |
| Retrieve | Manifest-based lazy loading; hot files only at start |
| Isolate | Sub-agent architecture for research tasks |
| Cache | `progress/claude-progress.md`; `features.json` state |

### 22. Two-Stage Context Reduction (Critical)

> Source: Manus architecture (Peak)
> Key insight: "Compaction is reversible. Summarization is not."

**Stage A: Compaction (Reversible) - Do This First**

Strip information that can be reconstructed from the environment:

    # Before compaction (in chat history):
    ToolCall: Write("releases/single-001/metadata.json", {
      "title": "Summer Vibes",
      "artist": "DJ Artist",
      "release_date": "2026-03-15",
      "isrc": "USRC12345678",
      ... (500 more lines)
    })
    ToolResult: "File written successfully"
    
    # After compaction (in chat history):
    ToolCall: Write("releases/single-001/metadata.json")
    ToolResult: "File written (500 lines)"

**Why this works:** The file exists in the sandbox. If agent needs content, it can `cat releases/single-001/metadata.json`. No information is permanently lost.

**Stage B: Summarization (Irreversible) - Only When Necessary**

When compaction isn't enough, summarize using **Structured Outputs**:

    // ❌ BAD: Free-form summarization
    "Please summarize what you did in the last 10 steps."
    
    // ✅ GOOD: Schema-forced summarization
    const SummarySchema = z.object({
      modified_files: z.array(z.string()),
      features_completed: z.array(z.string()),
      current_goal: z.string(),
      next_steps: z.array(z.string()),
      blockers: z.array(z.string()),
    });

**Critical:** Always keep the last 3-5 messages in their raw, full form. This preserves "flow" and "tone" of the agent, preventing jarring behavior shifts after summarization.

**Trigger Points:**
- Compaction: When context reaches 60% of limit (~120k tokens)
- Summarization: When context reaches 80% of limit (~160k tokens)

### 23. Attention Recitation Pattern (todo.md)

> Source: Manus architecture
> Key insight: "By constantly rewriting the todo list, the agent recites its objectives into the end of the context."

**The Problem: Lost-in-the-Middle**

In long contexts (~50+ tool calls), the model "forgets" initial objectives:
- Goals stated at the beginning drift out of attention window
- Agent starts doing random related things
- Quality degrades noticeably

**The Solution: Recitation**

Agent maintains and constantly rewrites a todo.md file:

    # Current Objectives (Updated: 2026-01-05T14:30:00Z)
    
    ## Active Goal
    Prepare single release "Summer Vibes" for March 15 drop
    
    ## Immediate Tasks
    - [x] Create release folder structure
    - [x] Draft metadata.json
    - [ ] Upload artwork (3000x3000 minimum)  ← CURRENT
    - [ ] Prepare distribution checklist
    - [ ] Draft social announcement copy
    
    ## Constraints
    - Must complete by session end
    - Artwork must be approved format
    - No external API calls without approval

**Why This Works:**
- Writing to end of context = high attention during next step
- Natural language biases model toward stated objectives
- No special architecture needed - just file writes
- Serves as progress tracking too

**Implementation:**
Add to `CLAUDE.md` instructions:

    ## Attention Management
    
    Maintain `_current/todo.md` as your working memory:
    - Update it after each significant action
    - Always include: current goal, immediate tasks, constraints
    - This file should reflect your understanding of the objective
    
    Read it at the start of each major decision to stay on track.

### 24. Error Retention Strategy (Don't Hide Failures)

> Source: Manus architecture
> Key insight: "Erasing failure removes evidence. Without evidence, the model can't adapt."

**The Problem:**

Common impulse: hide errors, retry silently, reset state.
This feels cleaner but prevents learning:

    # Hidden error approach (BAD)
    try:
      result = execute_tool(action)
    except:
      # Silently retry
      result = execute_tool(action)  # Hope it works this time

**The Solution: Leave Wrong Turns In**

When model sees a failed action + observation, it:
- Implicitly updates internal beliefs
- Shifts prior away from similar actions
- Reduces chance of repeating same mistake

    # Error retention approach (GOOD)
    ToolCall: Write("releases/metadata.json", invalid_json)
    ToolResult: Error - JSON parse failed at line 15: unexpected token '}'
    
    # Model now knows:
    # 1. This specific JSON was malformed
    # 2. Line 15 had the issue
    # 3. Don't repeat this pattern

**Error Recovery is a Key Capability Indicator:**
- Can the agent recover from tool failures?
- Can it learn from its mistakes within a session?
- This is still underrepresented in benchmarks

**Our Implementation:**
- Don't catch and suppress tool errors
- Log all errors to `commits.jsonl` with full details
- Include error messages in agent's context
- Let the agent self-correct

### 25. Anti-Few-Shot Trapping (Variation Injection)

> Source: Manus architecture
> Key insight: "If your context is full of similar past action-observation pairs, the model will follow that pattern even when it's no longer optimal."

**The Problem: Pattern Mimicry**

Language models are excellent mimics. After seeing 10 similar loops:

    ToolCall: task_create({"title": "Task 1", "priority": "high"})
    ToolResult: {"id": "t001", "status": "created"}
    
    ToolCall: task_create({"title": "Task 2", "priority": "high"})
    ToolResult: {"id": "t002", "status": "created"}
    
    ... (8 more identical patterns)

Model starts blindly following the pattern, even when it should do something different (like `task_update` or stop creating tasks).

**The Solution: Structured Variation**

Introduce controlled randomness to break patterns:

1. **Vary serialization templates:**
   
       // Sometimes return this format:
       {"id": "t001", "status": "created"}
       
       // Sometimes return this format:
       {status: "created", task_id: "t001", timestamp: "..."}

2. **Vary phrasing in observations:**
   
       // Rotate between:
       "Task created successfully"
       "Created task t001"
       "Successfully added new task"
       "Task t001 is now in the system"

3. **Minor formatting noise:**
   
       // Sometimes extra whitespace, different key ordering, etc.

**Implementation Note:**
This isn't about being sloppy - it's strategic variation to prevent overfitting to patterns within a session.

### 26. Build to Delete (The Bitter Lesson)

> Source: Rich Sutton's "Bitter Lesson" applied to agents
> Key insight: "General methods that use computation beat hand-coded human knowledge every time."

**The Pattern We're Seeing:**
- Manus refactored their harness 5 times in 6 months
- LangChain re-architected Open Deep Research 3 times in a year
- Vercel removed 80% of their tools

**Why This Happens:**

Every new model release has a different optimal way to structure agents:
- Capabilities that required complex pipelines in 2024
- Are now handled by a single context-window prompt in 2026
- Your "smart" logic from last month is now fighting the model

**Survival Strategy:**

1. **Keep infrastructure lightweight:**
   - Don't over-engineer control flow
   - Avoid complex state machines
   - Prefer simple loops with clear exit conditions

2. **Build modular architecture:**
   
       // ✅ GOOD: Can rip out and replace
       const contextBuilder = buildContext(state);
       const tools = selectTools(state);
       const result = await runAgent(contextBuilder, tools);
       
       // ❌ BAD: Tightly coupled, hard to change
       const result = await complexOrchestrator.executeWithRetries(
         state, toolChain, validationPipeline, recoveryHandler
       );

3. **Assume today's code is temporary:**
   - Document why you built something, not just what
   - Make it easy to delete entire modules
   - Don't build abstractions for one use case

**Our Application:**
- `runner.ts` should be simple: load context → run agent → save state
- Skills are folders that can be added/removed without code changes
- Tools are minimal - Bash handles most things

### 27. Harness Trajectories as Training Data

> Source: Agent Harness 2026
> Key insight: "Competitive advantage is no longer the prompt. It is the trajectories your harness captures."

**The New Bottleneck: Context Durability**

Labs need data to detect exactly when models:
- Stop following instructions (after 100th step)
- Start reasoning incorrectly
- Get "tired" during long tasks

**Our Data Advantage:**

Every run of Incurator captures:

    // .trace/commits.jsonl - File changes
    {"timestamp": "...", "tool": "Write", "path": "...", "hash": "...", "success": true}
    {"timestamp": "...", "tool": "Write", "path": "...", "hash": "...", "success": false, "error": "..."}
    
    // .trace/runs/{sessionId}.jsonl - Full trajectory
    {"step": 1, "action": "Read", "target": "profile/artist.json", "tokens": 1500}
    {"step": 2, "action": "Bash", "command": "grep release .", "tokens": 200}
    {"step": 3, "action": "Write", "target": "tasks/backlog.json", "tokens": 800}
    ...

**What This Enables:**

1. **Failure Analysis:**
   - Which step did the agent go off track?
   - What pattern preceded the failure?
   - How can we prevent this in the future?

2. **Hill Climbing:**
   - Compare traces of successful vs failed runs
   - Identify optimal action sequences
   - Improve prompts based on real data

3. **Future Training:**
   - Trajectories can feed into model fine-tuning
   - Every Incurator run improves the system

**Implementation:**
Add to `audit.ts`:

    export async function logTrajectoryStep(step: TrajectoryStep) {
      const runLogPath = path.join(WORKSPACE, ".trace", "runs", `${SESSION_ID}.jsonl`);
      await fs.appendFile(runLogPath, JSON.stringify(step) + "\n");
    }


## Plan of Work

This section describes the implementation in eight phases. Each phase builds on the previous and produces testable artifacts.


### Phase 1: Project Scaffolding and Dependencies

**Goal:** Set up the project structure and install all required dependencies.

**What exists after this phase:**
- Package dependencies installed
- TypeScript configuration for the new modules
- Empty file stubs for the API routes and libraries

**Dependencies to install (check cause these might already be installed):**

    @vercel/sandbox           # Sandbox SDK
    @vercel/blob              # Blob storage SDK
    ioredis                   # Redis client for locking
    @anthropic-ai/claude-agent-sdk  # Agent framework
    zod                       # Runtime validation
    ms                        # Time parsing utility

**File structure to create:**

Create the directory structure shown in "File Paths" above. Each file can start as a minimal stub with TODO comments.

**Verification:**
- Run `pnpm install` successfully
- Run `pnpm tsc --noEmit` with no errors


### Phase 2: Base Snapshot Creation Tooling

**Goal:** Build a script that creates and uploads a reusable base snapshot containing the runner, dependencies, and workspace scaffold.

**Why this matters:** Without a base snapshot, every sandbox run would spend 5-15 seconds installing npm packages. The base snapshot pre-installs everything once.

**Implementation details:**

The script `scripts/build-base-snapshot.ts` will:
1. Create a temporary sandbox
2. Write the workspace template files into `/vercel/sandbox/workspace`
3. Run `npm install` (or `pnpm install`) to install agent dependencies
4. Create a tarball of the workspace
5. Upload to Blob at key `snapshots/base/workspace-base.tar.gz`
6. Stop the sandbox

**Key code structure:**

    // scripts/build-base-snapshot.ts
    import { Sandbox } from "@vercel/sandbox";
    import { put } from "@vercel/blob";
    import ms from "ms";
    
    async function buildBaseSnapshot() {
      console.log("Creating sandbox for base snapshot...");
      
      const sandbox = await Sandbox.create({
        runtime: "node24",
        timeout: ms("15m"),
        resources: { vcpus: 2 },
      });
      
      try {
        // 1. Write workspace template files
        await sandbox.writeFiles([
          { path: "/vercel/sandbox/workspace/CLAUDE.md", content: CLAUDE_MD_CONTENT },
          { path: "/vercel/sandbox/workspace/.incurator/runner.ts", content: RUNNER_TS_CONTENT },
          { path: "/vercel/sandbox/workspace/.incurator/schemas.ts", content: SCHEMAS_TS_CONTENT },
          { path: "/vercel/sandbox/workspace/.incurator/package.json", content: PACKAGE_JSON_CONTENT },
          // ... other scaffold files
        ]);
        
        // 2. Install dependencies inside the sandbox
        const install = await sandbox.runCommand({
          cmd: "bash",
          args: ["-lc", "cd /vercel/sandbox/workspace/.incurator && npm install"],
          stdout: process.stdout,
          stderr: process.stderr,
        });
        
        if (install.exitCode !== 0) {
          throw new Error("npm install failed");
        }
        
        // 3. Create tarball
        await sandbox.runCommand({
          cmd: "bash",
          args: ["-lc", "tar -czf /vercel/sandbox/_base.tar.gz -C /vercel/sandbox/workspace ."],
          stdout: process.stdout,
          stderr: process.stderr,
        });
        
        // 4. Read tarball bytes (readFile returns a stream)
        const tarBytes = await readSandboxFile(sandbox, "/vercel/sandbox/_base.tar.gz");
        
        // 5. Upload to Blob
        await put("snapshots/base/workspace-base.tar.gz", tarBytes, {
          access: "private",
          addRandomSuffix: false,
        });
        
        console.log("Base snapshot uploaded successfully!");
        
      } finally {
        await sandbox.stop();
      }
    }
    
    async function readSandboxFile(sandbox: Sandbox, filePath: string) {
      const stream = await sandbox.readFile({ path: filePath });
      if (!stream) throw new Error(`Missing file: ${filePath}`);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    }

**Verification:**
- Run `npx tsx scripts/build-base-snapshot.ts`
- Confirm Blob contains `snapshots/base/workspace-base.tar.gz`
- Download and inspect the tarball to verify contents


### Phase 3: API Route Implementation

**Goal:** Implement the main `/api/artist-os/query` SSE endpoint that orchestrates the full lifecycle.

**Request format:**

    POST /api/artist-os/query
    Content-Type: application/json
    
    {
      "artist_id": "artist_123",
      "prompt": "What tasks are on my list for today?",
      "resume_session_id": null  // optional: resume previous session
    }

**Response format:** Server-Sent Events (SSE) stream with events:
- `status` - lifecycle phases (sandbox_create, restore_base, restore_artist, agent_run_start, etc.)
- `log` - stdout/stderr from the agent
- `done` - final result with exit code and manifest key
- `error` - if something goes wrong

**Auth + rate limiting (Phase 3 additions):**
- Require a valid user session (use existing auth provider)
- Verify the user owns `artist_id` before continuing
- Enforce rate limits per user and per artist (Redis-based sliding window or fixed window)

**Implementation structure:**

    // app/api/artist-os/query/route.ts
    
    import { Sandbox } from "@vercel/sandbox";
    import { acquireArtistLock } from "@/lib/artist-os/lock";
    import { restoreBaseSnapshot, restoreArtistSnapshot, exportArtistSnapshot } from "@/lib/artist-os/snapshot";
    import ms from "ms";
    
    export async function POST(req: Request) {
      const { artist_id, prompt, resume_session_id } = await req.json();
      
      // 0. Authenticate and authorize
      const userId = await validateAuth(req);
      if (!userId) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      
      const ownsArtist = await userOwnsArtist(userId, artist_id);
      if (!ownsArtist) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
      
      // 0b. Rate limiting (per user + per artist)
      const rateOk = await checkRateLimit({ userId, artistId: artist_id });
      if (!rateOk) {
        return Response.json({ error: "Rate limit exceeded" }, { status: 429 });
      }
      
      // 1. Acquire lock
      const lock = await acquireArtistLock(artist_id, ms("20m"));
      if (!lock) {
        return Response.json({ error: "Artist is busy" }, { status: 409 });
      }
      
      // 2. Create SSE stream
      const stream = new ReadableStream({
        async start(controller) {
          const send = (event: string, data: unknown) => {
            controller.enqueue(new TextEncoder().encode(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
            ));
          };
          
          let sandbox: Sandbox | null = null;
          
          try {
            // 3. Create sandbox
            send("status", { phase: "sandbox_create" });
            sandbox = await Sandbox.create({
              runtime: "node24",
              timeout: ms("15m"),
              resources: { vcpus: 2 },
            });
            
            // 4. Restore base snapshot
            send("status", { phase: "restore_base" });
            await restoreBaseSnapshot(sandbox);
            
            // 5. Restore artist snapshot (if exists)
            send("status", { phase: "restore_artist" });
            await restoreArtistSnapshot(sandbox, artist_id);
            
            // 6. Run agent
            send("status", { phase: "agent_run_start" });
            const exitCode = await runAgent(sandbox, prompt, resume_session_id, (log) => {
              send("log", log);
            });
            
            // 7. Export snapshot
            send("status", { phase: "snapshot_export" });
            const manifest = await exportArtistSnapshot(sandbox, artist_id);
            
            // 8. Done
            send("done", { ok: true, exitCode, manifest });
            
          } catch (e) {
            send("error", { message: String(e) });
          } finally {
            if (sandbox) await sandbox.stop();
            await lock.release();
            controller.close();
          }
        },
      });
      
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
        },
      });
    }

**Locking implementation (`lib/artist-os/lock.ts`):**

    import Redis from "ioredis";
    
    const redis = new Redis(process.env.REDIS_URL!);
    
    export async function acquireArtistLock(artistId: string, ttlMs: number) {
      const key = `lock:artist:${artistId}`;
      const token = crypto.randomUUID();
      
      // NX = only set if not exists, PX = expire in milliseconds
      const result = await redis.set(key, token, "PX", ttlMs, "NX");
      if (result !== "OK") return null;
      
      return {
        async release() {
          // Atomically check-and-delete if we still own the lock
          const script = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
              return redis.call("del", KEYS[1])
            else
              return 0
            end
          `;
          await redis.eval(script, 1, key, token);
        },
      };
    }

**Snapshot helpers (`lib/artist-os/snapshot.ts`):**

> **CRITICAL: Immutable Snapshots + KV Pointer Pattern**
>
> Vercel Blob caches reads for up to 60 seconds after an overwrite. If we naively overwrite
> `workspace-latest.tar.gz`, two requests 30 seconds apart will cause Run 2 to fetch stale
> data and lose Run 1's work. The fix: immutable snapshot names + KV pointer for "latest".

    import { Sandbox } from "@vercel/sandbox";
    import { put, head } from "@vercel/blob";
    import Redis from "ioredis";
    import { createHash } from "crypto";
    
    const redis = new Redis(process.env.REDIS_URL!);
    const WORKSPACE = "/vercel/sandbox/workspace";
    const BASE_KEY = "snapshots/base/workspace-base.tar.gz";
    
    export async function restoreBaseSnapshot(sandbox: Sandbox) {
      const tarBytes = await downloadBlob(BASE_KEY);
      await sandbox.writeFiles([
        { path: "/vercel/sandbox/_base.tar.gz", content: Buffer.from(tarBytes) },
      ]);
      await sandbox.runCommand({
        cmd: "bash",
        args: ["-lc", `mkdir -p ${WORKSPACE} && tar -xzf /vercel/sandbox/_base.tar.gz -C ${WORKSPACE} && rm /vercel/sandbox/_base.tar.gz`],
      });
    }
    
    export async function restoreArtistSnapshot(sandbox: Sandbox, artistId: string) {
      // READ KV POINTER FIRST (immediate consistency, no caching)
      const latestKey = await redis.get(`snapshot:${artistId}:latest`);
      
      if (!latestKey) {
        // No existing snapshot; first run for this artist
        await scaffoldNewArtist(sandbox, artistId);
        return;
      }
      
      // Fetch the immutable snapshot (always fresh since we have exact key)
      const tarBytes = await downloadBlob(latestKey);
      await sandbox.writeFiles([
        { path: "/vercel/sandbox/_artist.tar.gz", content: Buffer.from(tarBytes) },
      ]);
      await sandbox.runCommand({
        cmd: "bash",
        args: ["-lc", `tar -xzf /vercel/sandbox/_artist.tar.gz -C ${WORKSPACE} && rm /vercel/sandbox/_artist.tar.gz`],
      });
    }
    
    export async function exportArtistSnapshot(sandbox: Sandbox, artistId: string) {
      // Create tarball (excluding node_modules to save space)
      await sandbox.runCommand({
        cmd: "bash",
        args: ["-lc", `tar -czf /vercel/sandbox/_export.tar.gz --exclude='.incurator/node_modules' -C ${WORKSPACE} .`],
      });
      
      const tarBytes = await readSandboxFile(sandbox, "/vercel/sandbox/_export.tar.gz");
      
      // Calculate checksum
      const checksum = createHash("sha256").update(tarBytes).digest("hex");
      const timestamp = Date.now();
      
      // IMMUTABLE SNAPSHOT: Upload with unique timestamp-based name
      const snapshotKey = `snapshots/${artistId}/workspace-${timestamp}.tar.gz`;
      await put(snapshotKey, tarBytes, { 
        access: "private", 
        addRandomSuffix: false  // We're already adding timestamp
      });
      
      // UPDATE KV POINTER (immediate consistency, no cache issues)
      await redis.set(`snapshot:${artistId}:latest`, snapshotKey);
      
      // Upload manifest (also immutable, for debugging/history)
      const manifest = {
        artist_id: artistId,
        snapshot_key: snapshotKey,
        snapshot_version: "1.0.0",
        created_at: new Date().toISOString(),
        checksum_sha256: checksum,
        workspace_size_bytes: tarBytes.byteLength,
      };
      const manifestKey = `snapshots/${artistId}/manifest-${timestamp}.json`;
      await put(manifestKey, JSON.stringify(manifest, null, 2), {
        access: "private",
        addRandomSuffix: false,
        contentType: "application/json",
      });
      
      // Also update a "latest manifest" pointer in KV for quick lookups
      await redis.set(`snapshot:${artistId}:latest-manifest`, manifestKey);
      
      return manifest;
    }
    
    async function readSandboxFile(sandbox: Sandbox, filePath: string): Promise<Buffer> {
      const stream = await sandbox.readFile({ path: filePath });
      if (!stream) throw new Error(`Missing file: ${filePath}`);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    }
    
    async function downloadBlob(key: string): Promise<Uint8Array> {
      const meta = await head(key);
      const res = await fetch(meta.url);
      if (!res.ok) throw new Error(`Failed to fetch blob ${key}`);
      return new Uint8Array(await res.arrayBuffer());
    }
    
    async function scaffoldNewArtist(sandbox: Sandbox, artistId: string) {
      // Create initial artist profile
      const artistJson = JSON.stringify({
        id: artistId,
        name: "",
        genres: [],
        created_at: new Date().toISOString(),
      }, null, 2);
      
      // Create initial workspace manifest for lazy loading
      const workspaceManifest = JSON.stringify({
        version: 0,
        lastUpdated: new Date().toISOString(),
        files: {},
        hotFiles: ["CLAUDE.md", "profile/artist.json", "progress/claude-progress.md", "tasks/inbox.md"],
      }, null, 2);
      
      await sandbox.runCommand({
        cmd: "bash",
        args: ["-lc", `mkdir -p ${WORKSPACE}/{profile,tasks,releases,brand,marketing,finances,contracts,logs,progress,.index,.trace}`],
      });
      
      await sandbox.writeFiles([
        { path: `${WORKSPACE}/profile/artist.json`, content: artistJson },
        { path: `${WORKSPACE}/tasks/inbox.md`, content: "# Inbox\n\nNo new items.\n" },
        { path: `${WORKSPACE}/tasks/backlog.json`, content: "[]" },
        { path: `${WORKSPACE}/progress/claude-progress.md`, content: "# Progress\n\nNew artist workspace initialized.\n" },
        { path: `${WORKSPACE}/.index/manifest.json`, content: workspaceManifest },
        { path: `${WORKSPACE}/.trace/commits.jsonl`, content: "" },
      ]);
    }
    
**Manifest helpers (`lib/artist-os/manifest.ts`):**

The workspace manifest (`.index/manifest.json`) powers fast listings and lazy loading. It should be updated on every file write and delete.

    import * as fs from "fs/promises";
    import * as path from "path";
    import { createHash } from "crypto";
    
    const WORKSPACE = "/vercel/sandbox/workspace";
    const MANIFEST_PATH = path.join(WORKSPACE, ".index", "manifest.json");
    const DEFAULT_HOT_FILES = [
      "CLAUDE.md",
      "profile/artist.json",
      "progress/claude-progress.md",
      "tasks/inbox.md",
    ];
    
    interface ManifestEntry {
      hash: string;
      size: number;
      lastModified: string;
    }
    
    export interface WorkspaceManifest {
      version: number;
      lastUpdated: string;
      files: Record<string, ManifestEntry>;
      hotFiles: string[];
    }
    
    export async function readManifest(): Promise<WorkspaceManifest> {
      const content = await fs.readFile(MANIFEST_PATH, "utf-8");
      return JSON.parse(content) as WorkspaceManifest;
    }
    
    export async function writeManifest(manifest: WorkspaceManifest) {
      await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    }
    
    export async function updateManifestEntry(relativePath: string, content: string | Buffer) {
      const manifest = await readManifest();
      const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
      const hash = createHash("sha256").update(buffer).digest("hex");
      
      manifest.files[relativePath] = {
        hash,
        size: buffer.byteLength,
        lastModified: new Date().toISOString(),
      };
      manifest.lastUpdated = new Date().toISOString();
      
      await writeManifest(manifest);
    }
    
    export async function removeManifestEntry(relativePath: string) {
      const manifest = await readManifest();
      delete manifest.files[relativePath];
      manifest.lastUpdated = new Date().toISOString();
      await writeManifest(manifest);
    }
    
    export async function ensureManifest(): Promise<WorkspaceManifest> {
      try {
        return await readManifest();
      } catch {
        const manifest: WorkspaceManifest = {
          version: 0,
          lastUpdated: new Date().toISOString(),
          files: {},
          hotFiles: DEFAULT_HOT_FILES,
        };
        await writeManifest(manifest);
        return manifest;
      }
    }
    
**Why Immutable Snapshots + KV Pointer Works:**

| Problem | Solution |
|---------|----------|
| Blob caches stale data for 60s after overwrite | Blobs are immutable (never overwritten) → no cache invalidation issues |
| Need to know which snapshot is "latest" | KV is a database → immediate consistency, no caching |
| Risk of losing work | Old snapshots naturally accumulate → free versioning/rollback capability |
| Extra infrastructure needed | Uses KV we already have for locking |

**Verification:**
- Start local dev server with `vercel env pull` (for OIDC token)
- Call the endpoint with `curl`:

      curl -X POST http://localhost:3000/api/artist-os/query \
        -H "Content-Type: application/json" \
        -d '{"artist_id":"test_artist_001","prompt":"What is in my task inbox?"}' \
        --no-buffer

- Observe SSE events streaming
- Confirm snapshot appears in Blob after run completes


### Phase 4: Agent Runner Implementation

**Goal:** Build the harness that runs inside the sandbox, loads context, invokes the Claude Agent SDK, enforces guardrails, and writes handover notes.

**Key file:** `workspace-template/.incurator/runner.ts`

The runner is responsible for:
1. **Running init.sh** to verify environment is in known-good state
2. **Loading context** in deterministic order (CLAUDE.md → profile → progress → features → skills)
3. **Progressive skill loading** - only name/description in system prompt, full content on demand
4. **Feature-based incremental work** - identify next incomplete feature from features.json
5. Configuring agent permissions (no shell escapes, no dangerous commands)
6. Auditing all file operations via structured commits.jsonl
7. Validating JSON files on write
8. **Updating features.json** - mark features as passes: true after verification
9. **Writing progress handover** notes before exit

**Agent Loop Pattern (from Anthropic research):**

    ┌─────────────────────────────────────────────────────────────┐
    │                    AGENT SESSION LOOP                        │
    │                                                              │
    │  1. GATHER CONTEXT                                           │
    │     - Run init.sh to verify environment                      │
    │     - Read progress/claude-progress.md                       │
    │     - Read features.json to find next work item              │
    │     - Load relevant skills on demand                         │
    │                                                              │
    │  2. TAKE ACTION                                              │
    │     - Work on ONE feature at a time                          │
    │     - Make incremental changes                               │
    │     - Commit to git with descriptive messages                │
    │                                                              │
    │  3. VERIFY WORK                                              │
    │     - Test feature end-to-end                                │
    │     - Use visual verification when applicable                │
    │     - Only mark feature as passes: true after verification   │
    │                                                              │
    │  4. REPEAT or EXIT                                           │
    │     - Update progress notes                                  │
    │     - Log commits.jsonl                                      │
    │     - Continue to next feature or exit                       │
    └─────────────────────────────────────────────────────────────┘

**Implementation:**

    // workspace-template/.incurator/runner.ts
    
    import { query } from "@anthropic-ai/claude-agent-sdk";
    import { validateWorkspaceFiles } from "./validation";
    import { appendAuditLog, writeProgressHandover } from "./audit";
    import { execSync } from "child_process";
    import * as fs from "fs/promises";
    import * as path from "path";
    
    const WORKSPACE = "/vercel/sandbox/workspace";
    
    async function main() {
      // 0. Run init.sh to verify environment
      console.log("Running session initialization...");
      try {
        execSync("./init.sh", { cwd: WORKSPACE, stdio: "inherit" });
      } catch (e) {
        console.error("init.sh failed - environment may be corrupted");
        throw e;
      }
      
      // 1. Load prompt from environment
      const promptB64 = process.env.PROMPT_B64;
      if (!promptB64) throw new Error("PROMPT_B64 not set");
      const prompt = Buffer.from(promptB64, "base64").toString("utf-8");
      
      // 2. Load context files in deterministic order
      const claudeMd = await loadFile("CLAUDE.md");
      const artistProfile = await loadFile("profile/artist.json");
      const progress = await loadFile("progress/claude-progress.md");
      const features = await loadFile("features.json");
      
      // 3. Load skill metadata (progressive disclosure - name/description only)
      const skillSummaries = await loadSkillSummaries();
      
      // 4. Identify next incomplete feature
      const featuresData = JSON.parse(features || "[]");
      const nextFeature = featuresData.find((f: any) => !f.passes);
      const featureContext = nextFeature 
        ? `\n## Next Feature to Work On\n${JSON.stringify(nextFeature, null, 2)}`
        : "\n## All Features Complete!\nReview and verify all features are working correctly.";
      
      const systemContext = `
    ${claudeMd}
    
    ## Artist Profile
    ${artistProfile}
    
    ## Current Progress
    ${progress}
    
    ## Feature Status
    Total: ${featuresData.length}, Passing: ${featuresData.filter((f: any) => f.passes).length}
    ${featureContext}
    
    ## Available Skills
    ${skillSummaries}
    
    ## Session Instructions
    1. Work on ONE feature at a time
    2. Test the feature thoroughly before marking passes: true
    3. Update progress notes after each significant step
    4. Do NOT remove or edit feature descriptions - only change passes status
      `.trim();
      
      // 5. Configure agent with guardrails
      const resumeSessionId = process.env.RESUME_SESSION_ID || undefined;
      
      const response = query({
        prompt,
        options: {
          model: "claude-sonnet-4-5",
          systemPrompt: systemContext,
          cwd: WORKSPACE,
          
          // Allow read + write, but gate dangerous operations
          tools: [
            "Read", "Glob", "Grep",
            "Write", "Edit", "MultiEdit",
            "Bash",  // Gated by canUseTool
          ],
          
          disallowedTools: [],
          
          // Permission mode: require approval for destructive actions
          permissionMode: "acceptEdits",
          
          // Session resumption
          resume: resumeSessionId,
          
          // Block dangerous shell patterns
          canUseTool: async (toolName, input) => {
            if (toolName === "Bash") {
              const command = input.command || "";
              const dangerous = ["rm -rf", "mkfs", "dd if=", "curl | bash", "wget | bash", "chmod 777", "sudo rm", ":(){ :|:& };:"];
              if (dangerous.some((pattern) => command.includes(pattern))) {
                return { behavior: "deny", message: "Dangerous command blocked" };
              }
            }
            return { behavior: "allow" };
          },
          
          // Hook: audit and validate on every file write
          hooks: {
            PreToolUse: [{
              hooks: [async (input) => {
                const toolName = input.tool || input.tool_name;
                if (["Write", "Edit", "MultiEdit"].includes(toolName)) {
                  await appendAuditLog(toolName, input);
                }
                return { continue: true };
              }],
            }],
            
            PostToolUse: [{
              hooks: [async (input) => {
                const filePath = input.path || input.file_path;
                if (filePath && filePath.endsWith(".json")) {
                  const valid = await validateWorkspaceFiles(filePath);
                  if (!valid.success) {
                    console.error(`Validation failed for ${filePath}: ${valid.error}`);
                    // Restore from backup would happen here
                  }
                }
                return { continue: true };
              }],
            }],
          },
        },
      });
      
      let finalResult: { messages?: unknown[]; exitCode?: number } | null = null;
      
      for await (const message of response) {
        if (message.type === "assistant") {
          console.log(message.content);
          continue;
        }
        
        if (message.type === "result") {
          finalResult = message;
        }
      }
      
      if (!finalResult) {
        throw new Error("Agent did not return a result");
      }
      
      // 6. Write progress handover
      await writeProgressHandover(finalResult);
      
      // 7. Exit with agent's exit code
      process.exit(finalResult.exitCode || 0);
    }
    
    async function loadFile(relativePath: string): Promise<string> {
      const fullPath = path.join(WORKSPACE, relativePath);
      try {
        return await fs.readFile(fullPath, "utf-8");
      } catch {
        return `(File not found: ${relativePath})`;
      }
    }
    
    /**
     * Progressive Disclosure: Load only skill name and description
     * Full SKILL.md content is loaded on-demand when skill is triggered
     */
    async function loadSkillSummaries(): Promise<string> {
      const skillsDir = path.join(WORKSPACE, ".claude/skills");
      const summaries: string[] = [];
      
      try {
        const skills = await fs.readdir(skillsDir, { withFileTypes: true });
        
        for (const skill of skills) {
          if (!skill.isDirectory()) continue;
          
          const skillMdPath = path.join(skillsDir, skill.name, "SKILL.md");
          try {
            const content = await fs.readFile(skillMdPath, "utf-8");
            // Extract YAML frontmatter
            const match = content.match(/^---\n([\s\S]*?)\n---/);
            if (match) {
              const yaml = match[1];
              const name = yaml.match(/name:\s*(.+)/)?.[1] || skill.name;
              const desc = yaml.match(/description:\s*(.+)/)?.[1] || "";
              summaries.push(`- **${name}**: ${desc} (load with: Read .claude/skills/${skill.name}/SKILL.md)`);
            }
          } catch {
            // Skill directory exists but no SKILL.md - skip
          }
        }
      } catch {
        return "(No skills directory found)";
      }
      
      return summaries.length > 0 ? summaries.join("\n") : "(No skills installed)";
    }
    
    main().catch((e) => {
      console.error("Runner error:", e);
      process.exit(1);
    });

**Audit module with structured commits.jsonl (`workspace-template/.incurator/audit.ts`):**

> **Structured Audit Trail Pattern**
>
> Instead of vague log entries, we use a standardized JSONL format in `.trace/commits.jsonl`.
> This enables "what changed when" queries, accountability, and future rollback/undo features.

    import * as fs from "fs/promises";
    import * as path from "path";
    import { createHash } from "crypto";
    
    const WORKSPACE = "/vercel/sandbox/workspace";
    const COMMITS_LOG = path.join(WORKSPACE, ".trace", "commits.jsonl");
    
    // Structured commit entry format
    interface CommitEntry {
      path: string;
      action: "create" | "update" | "delete" | "append";
      hash: string;           // SHA-256 of content after change
      timestamp: string;      // ISO 8601
      sessionId?: string;     // For tracing across runs
      tool?: string;          // Which tool made the change
    }
    
    export async function appendCommitLog(
      filePath: string, 
      action: CommitEntry["action"], 
      content: string,
      tool?: string
    ) {
      const hash = createHash("sha256").update(content).digest("hex").slice(0, 12);
      
      const entry: CommitEntry = {
        path: filePath.replace(WORKSPACE + "/", ""),  // Relative path
        action,
        hash,
        timestamp: new Date().toISOString(),
        sessionId: process.env.SESSION_ID,
        tool,
      };
      
      await fs.appendFile(COMMITS_LOG, JSON.stringify(entry) + "\n");
    }
    
    // Legacy compatibility: also log to human-readable audit.log
    export async function appendAuditLog(tool: string, input: unknown) {
      const entry = {
        timestamp: new Date().toISOString(),
        tool,
        input: typeof input === "object" ? JSON.stringify(input) : String(input),
      };
      
      await fs.appendFile(
        path.join(WORKSPACE, "logs", "audit.log"), 
        JSON.stringify(entry) + "\n"
      );
    }
    
    /**
     * Progress Handover Pattern: Initializer vs Maintainer
     * 
     * First run (initializer): Creates scaffold + progress file
     * Subsequent runs (maintainer): Reads progress, makes incremental changes, updates handover
     * 
     * The agent should always:
     * 1. Read progress/claude-progress.md at session start
     * 2. Update it before session end with what was done and what's next
     * 3. Write structured metadata to progress/last-run.json
     */
    export async function writeProgressHandover(result: { messages?: unknown[]; exitCode?: number }) {
      const progressPath = path.join(WORKSPACE, "progress", "claude-progress.md");
      const lastRunPath = path.join(WORKSPACE, "progress", "last-run.json");
      
      // Summarize what happened
      const summary = `
    ## Run completed at ${new Date().toISOString()}
    
    - Messages exchanged: ${result.messages?.length || 0}
    - Exit status: ${result.exitCode || 0}
    - Session ID: ${process.env.SESSION_ID || "unknown"}
    
    ### What was accomplished
    (Agent should update this section during the run)
    
    ### Next steps for future sessions
    (Agent should fill this in before ending the run)
      `.trim();
      
      await fs.appendFile(progressPath, "\n\n" + summary);
      
      // Log the progress update as a commit
      const progressContent = await fs.readFile(progressPath, "utf-8");
      await appendCommitLog(progressPath, "update", progressContent, "writeProgressHandover");
      
      // Write structured last-run info
      const lastRunContent = JSON.stringify({
        completed_at: new Date().toISOString(),
        session_id: process.env.SESSION_ID,
        message_count: result.messages?.length || 0,
        exit_code: result.exitCode || 0,
      }, null, 2);
      
      await fs.writeFile(lastRunPath, lastRunContent);
      await appendCommitLog(lastRunPath, "update", lastRunContent, "writeProgressHandover");
    }
    
**Example commits.jsonl entries:**

    {"path":"tasks/backlog.json","action":"update","hash":"abc123def456","timestamp":"2026-01-05T10:30:00Z","sessionId":"sess_001","tool":"Write"}
    {"path":"marketing/campaigns.json","action":"create","hash":"789ghi012jkl","timestamp":"2026-01-05T10:31:00Z","sessionId":"sess_001","tool":"Write"}
    {"path":"progress/claude-progress.md","action":"append","hash":"mno345pqr678","timestamp":"2026-01-05T10:32:00Z","sessionId":"sess_001","tool":"writeProgressHandover"}

**Verification:**
- Ensure the runner can be executed with `npx tsx .incurator/runner.ts` inside a sandbox
- Test with a simple prompt like "List all files in the workspace"
- Verify audit log is written
- Verify progress handover is updated


### Phase 5: Guardrails and Validation Layer

**Goal:** Implement Zod schemas for all canonical JSON files, a validation layer that rejects invalid writes, and **safe write semantics** that prevent agents from accidentally overwriting critical files.

#### 5.1 Safe Write Semantics (`workspace-template/.incurator/safe-fs.ts`)

> **Why Safe Write Semantics Matter**
>
> Agents hallucinate. Without explicit protection, they'll overwrite critical files or traverse
> outside the workspace. The append-first, default-deny approach prevents data loss.

    import * as fs from "fs/promises";
    import * as path from "path";
    import { appendCommitLog } from "./audit";
    
    const WORKSPACE = "/vercel/sandbox/workspace";
    
    // Paths that should never be overwritten without explicit approval
    const PROTECTED_PATHS = [
      "profile/artist.json",
      "CLAUDE.md",
      ".incurator/",
      ".index/manifest.json",
    ];
    
    // Paths that should only use append operations
    const APPEND_ONLY_PATHS = [
      ".trace/commits.jsonl",
      "logs/",
      "progress/claude-progress.md",
    ];
    
    interface WriteOptions {
      allowOverwrite?: boolean;  // Default: false - fail if file exists
      forceWrite?: boolean;      // Default: false - bypass protection (dangerous)
    }
    
    /**
     * Safe file write with default-deny on overwrite.
     * 
     * @throws Error if file exists and allowOverwrite is false
     * @throws Error if path traversal is detected
     * @throws Error if attempting to overwrite protected path
     */
    export async function safeWriteFile(
      relativePath: string,
      content: string,
      options: WriteOptions = {}
    ): Promise<{ success: true; action: "create" | "update" }> {
      const { allowOverwrite = false, forceWrite = false } = options;
      
      // GUARD 1: Block path traversal
      if (relativePath.includes("..") || relativePath.startsWith("/")) {
        throw new Error(`Path traversal blocked: ${relativePath}`);
      }
      
      // GUARD 2: Block hidden files (except allowed ones)
      const allowedHidden = [".index/", ".trace/", ".incurator/", ".claude/"];
      if (relativePath.startsWith(".") && !allowedHidden.some(p => relativePath.startsWith(p))) {
        throw new Error(`Hidden file access blocked: ${relativePath}`);
      }
      
      const fullPath = path.join(WORKSPACE, relativePath);
      
      // GUARD 3: Check if file exists
      let fileExists = false;
      try {
        await fs.access(fullPath);
        fileExists = true;
      } catch {
        fileExists = false;
      }
      
      // GUARD 4: Block overwrite of protected paths
      if (fileExists && !forceWrite) {
        const isProtected = PROTECTED_PATHS.some(p => relativePath.startsWith(p));
        if (isProtected) {
          throw new Error(`Cannot overwrite protected path: ${relativePath}. Use explicit approval.`);
        }
      }
      
      // GUARD 5: Block overwrite if not explicitly allowed
      if (fileExists && !allowOverwrite && !forceWrite) {
        throw new Error(
          `File already exists: ${relativePath}. ` +
          `Use allowOverwrite: true to update, or append_file for logs/journals.`
        );
      }
      
      // GUARD 6: Block write to append-only paths
      const isAppendOnly = APPEND_ONLY_PATHS.some(p => relativePath.startsWith(p));
      if (isAppendOnly && fileExists) {
        throw new Error(
          `${relativePath} is append-only. Use appendFile() instead of writeFile().`
        );
      }
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      
      // Write the file
      await fs.writeFile(fullPath, content, "utf-8");
      
      // Log the commit
      const action = fileExists ? "update" : "create";
      await appendCommitLog(relativePath, action, content, "safeWriteFile");
      
      return { success: true, action };
    }
    
    /**
     * Safe file append - always allowed, creates file if missing.
     * Preferred for journals, logs, and progress notes.
     */
    export async function safeAppendFile(
      relativePath: string,
      content: string
    ): Promise<{ success: true }> {
      // GUARD 1: Block path traversal
      if (relativePath.includes("..") || relativePath.startsWith("/")) {
        throw new Error(`Path traversal blocked: ${relativePath}`);
      }
      
      const fullPath = path.join(WORKSPACE, relativePath);
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      
      // Append to file (creates if missing)
      await fs.appendFile(fullPath, content, "utf-8");
      
      // Read full content for commit hash
      const fullContent = await fs.readFile(fullPath, "utf-8");
      await appendCommitLog(relativePath, "append", fullContent, "safeAppendFile");
      
      return { success: true };
    }
    
    /**
     * Safe file read with path traversal protection.
     */
    export async function safeReadFile(relativePath: string): Promise<string | null> {
      if (relativePath.includes("..") || relativePath.startsWith("/")) {
        throw new Error(`Path traversal blocked: ${relativePath}`);
      }
      
      try {
        return await fs.readFile(path.join(WORKSPACE, relativePath), "utf-8");
      } catch {
        return null;
      }
    }
    
    /**
     * List directory with path traversal protection.
     */
    export async function safeListDirectory(relativePath: string): Promise<string[]> {
      if (relativePath.includes("..")) {
        throw new Error(`Path traversal blocked: ${relativePath}`);
      }
      
      const fullPath = path.join(WORKSPACE, relativePath || ".");
      
      try {
        const entries = await fs.readdir(fullPath, { withFileTypes: true });
        return entries.map(e => e.isDirectory() ? `${e.name}/` : e.name);
      } catch {
        return [];
      }
    }

#### 5.2 Zod Schemas for Validation

**Schemas to define (`workspace-template/.incurator/schemas.ts`):**

    import { z } from "zod";
    
    // Artist profile schema
    export const ArtistProfileSchema = z.object({
      id: z.string(),
      name: z.string(),
      genres: z.array(z.string()),
      created_at: z.string().datetime(),
      bio: z.string().optional(),
      links: z.object({
        spotify: z.string().url().optional(),
        instagram: z.string().url().optional(),
        tiktok: z.string().url().optional(),
        website: z.string().url().optional(),
      }).optional(),
    });
    
    // Task backlog schema
    export const TaskSchema = z.object({
      id: z.string(),
      title: z.string(),
      description: z.string().optional(),
      status: z.enum(["pending", "in_progress", "blocked", "done"]),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      due_date: z.string().datetime().optional(),
      created_at: z.string().datetime(),
      completed_at: z.string().datetime().optional(),
      tags: z.array(z.string()).optional(),
    });
    
    export const TaskBacklogSchema = z.array(TaskSchema);
    
    // Release schema
    export const ReleaseSchema = z.object({
      id: z.string(),
      title: z.string(),
      type: z.enum(["single", "ep", "album"]),
      status: z.enum(["planning", "production", "mastering", "distribution", "released"]),
      release_date: z.string().optional(),  // ISO date
      isrc: z.string().nullable(),  // Never invent ISRC
      upc: z.string().nullable(),   // Never invent UPC
      tracks: z.array(z.object({
        title: z.string(),
        duration_seconds: z.number().optional(),
        isrc: z.string().nullable(),
      })).optional(),
      artwork_ref: z.string().optional(),  // Blob key reference
      created_at: z.string().datetime(),
    });
    
    export const ReleasesSchema = z.array(ReleaseSchema);
    
    // Marketing campaign schema
    export const CampaignSchema = z.object({
      id: z.string(),
      name: z.string(),
      status: z.enum(["draft", "pending_approval", "approved", "active", "completed"]),
      budget_usd: z.number().nonnegative().optional(),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      platforms: z.array(z.enum(["instagram", "tiktok", "youtube", "facebook", "twitter", "spotify"])),
      created_at: z.string().datetime(),
    });
    
    export const CampaignsSchema = z.array(CampaignSchema);
    
    // Budget schema
    export const BudgetSchema = z.object({
      year: z.number(),
      total_usd: z.number().nonnegative(),
      categories: z.array(z.object({
        name: z.string(),
        allocated_usd: z.number().nonnegative(),
        spent_usd: z.number().nonnegative(),
      })),
    });
    
    // Approval schema (for gating social posts)
    export const ApprovalSchema = z.object({
      pending: z.array(z.object({
        id: z.string(),
        type: z.enum(["social_post", "campaign_launch", "contract_sign", "payment"]),
        description: z.string(),
        created_at: z.string().datetime(),
        requires_human: z.boolean(),
      })),
      approved: z.array(z.object({
        id: z.string(),
        approved_at: z.string().datetime(),
        approved_by: z.string(),
      })),
    });
    
    // Schema registry
    export const SCHEMA_REGISTRY: Record<string, z.ZodSchema> = {
      "profile/artist.json": ArtistProfileSchema,
      "tasks/backlog.json": TaskBacklogSchema,
      "releases/releases.json": ReleasesSchema,
      "marketing/campaigns.json": CampaignsSchema,
      "marketing/approval.json": ApprovalSchema,
    };

**Validation implementation (`workspace-template/.incurator/validation.ts`):**

    import * as fs from "fs/promises";
    import * as path from "path";
    import { SCHEMA_REGISTRY } from "./schemas";
    
    const WORKSPACE = "/vercel/sandbox/workspace";
    
    type ValidationResult = 
      | { success: true }
      | { success: false; error: string };
    
    export async function validateWorkspaceFiles(relativePath: string): Promise<ValidationResult> {
      const schema = SCHEMA_REGISTRY[relativePath];
      if (!schema) {
        // No schema defined; allow by default
        return { success: true };
      }
      
      try {
        const fullPath = path.join(WORKSPACE, relativePath);
        const content = await fs.readFile(fullPath, "utf-8");
        const data = JSON.parse(content);
        
        const result = schema.safeParse(data);
        if (!result.success) {
          return {
            success: false,
            error: result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; "),
          };
        }
        
        return { success: true };
      } catch (e) {
        return { success: false, error: String(e) };
      }
    }
    
    export async function validateAllWorkspaceFiles(): Promise<ValidationResult[]> {
      const results: ValidationResult[] = [];
      
      for (const relativePath of Object.keys(SCHEMA_REGISTRY)) {
        const fullPath = path.join(WORKSPACE, relativePath);
        try {
          await fs.access(fullPath);
          results.push(await validateWorkspaceFiles(relativePath));
        } catch {
          // File doesn't exist; skip
        }
      }
      
      return results;
    }

**Verification:**
- Write a test that creates invalid JSON and confirms validation fails
- Test with valid JSON and confirm it passes
- Ensure the runner's hook correctly validates on write


### Phase 6: Skills and CLAUDE.md Configuration

**Goal:** Create the agent instructions (CLAUDE.md) and skill definitions that guide the agent's behavior.

**CLAUDE.md (`workspace-template/CLAUDE.md`):**

    # Incurator Artist OS
    
    You are the AI operating system for an independent music artist. Your workspace
    at /vercel/sandbox/workspace is your source of truth. Read files to understand
    context; write files to make progress.
    
    ## Core Principles
    
    1. **Filesystem is truth.** Always read workspace files before answering questions.
       Never make up information that should be in files.
    
    2. **Never post publicly without approval.** If asked to post to social media or
       publish content, add an entry to marketing/approval.json and inform the artist
       that approval is required.
    
    3. **Never invent ISRCs, UPCs, or identifiers.** These are assigned by distributors.
       Use null if unknown.
    
    4. **Session handover is mandatory.** Before ending any session, update
       progress/claude-progress.md with what you did and what comes next.
       Read it at the start of every session to understand where you left off.
    
    5. **Use existing data.** Check profile/artist.json for artist identity,
       releases/releases.json for discography, tasks/backlog.json for pending work.
    
    6. **Safe writes only.** Never overwrite files without checking if they exist first.
       Use append for journals and logs. Never traverse outside the workspace.
    
    ## Session Handover Pattern (Initializer vs Maintainer)
    
    Your sessions follow one of two patterns:
    
    **INITIALIZER (first run for this artist):**
    - Workspace is fresh with scaffold files only
    - Your job: Gather artist info, create initial profile, set up task structure
    - Write comprehensive progress notes for future sessions
    
    **MAINTAINER (subsequent runs):**
    - FIRST: Read progress/claude-progress.md to understand current state
    - SECOND: Read progress/last-run.json for structured metadata
    - THEN: Continue from where the previous session left off
    - FINALLY: Update progress notes with what you accomplished and next steps
    
    Always check progress/ directory first to determine which mode you're in.
    
    ## Workspace Structure
    
    - profile/          Artist identity and preferences
    - tasks/            Inbox, backlog, today's priorities
    - releases/         Singles, EPs, albums with timelines
    - brand/            Voice guidelines, bio templates
    - marketing/        Campaigns, content calendar, approvals
    - finances/         Budgets, revenue tracking
    - contracts/        Reviews and analysis (never store originals)
    - logs/             Audit trail (append-only)
    - progress/         Handover notes between sessions
    - .index/           Workspace manifest (do not edit directly)
    - .trace/           Audit trail - commits.jsonl (append-only)
    
    ## File Write Rules
    
    1. **Check before write**: List/read files before writing to avoid overwrites
    2. **Append for logs**: Use append operations for logs/, .trace/, and journals
    3. **No path traversal**: Never use ".." or absolute paths
    4. **Protected files**: Do not overwrite CLAUDE.md, .incurator/*, or .index/*
    
    ## Skills Available
    
    See .claude/skills/ for detailed guidance on:
    - release-checklist: How to plan and execute a release
    - marketing-copy: Brand voice and content guidelines
    
    ## What NOT to do
    
    - Do not execute rm -rf, sudo, or destructive shell commands
    - Do not access URLs outside the workspace without explicit permission
    - Do not store secrets, passwords, or API keys in workspace files
    - Do not make up artist statistics, streaming numbers, or financial data
    - Do not overwrite files without checking if they exist first

**Release Checklist Skill (`workspace-template/.claude/skills/release-checklist/SKILL.md`):**

    ---
    name: release-checklist
    description: Steps and checklists for releasing a single/EP/album
    ---
    
    # Release Checklist Skill
    
    Use this guide when the artist asks to prepare, plan, or execute a release.
    
    ## Pre-Release Checklist (4-6 weeks before)
    
    1. Final master audio delivered
    2. Artwork finalized (3000x3000px minimum)
    3. Metadata prepared:
       - Track titles (final)
       - Featured artists (if any)
       - Songwriters and producers
       - Genre/subgenre
       - Explicit content flag
    4. ISRC requested from distributor (do NOT invent one)
    5. Release date confirmed
    
    ## Distribution Checklist (3-4 weeks before)
    
    1. Upload to distributor
    2. Submit for playlist pitching
    3. Create pre-save link
    4. Update releases/releases.json with status: "distribution"
    
    ## Marketing Checklist (2-3 weeks before)
    
    1. Create content calendar
    2. Draft announcement copy
    3. Prepare visual assets
    4. Schedule posts (but await approval!)
    5. Update marketing/campaigns.json
    
    ## Release Day
    
    1. Verify all platforms are live
    2. Post announcement (after approval)
    3. Update releases/releases.json with status: "released"
    4. Track early performance
    
    ## Output Files to Update
    
    - releases/releases.json (add/update release entry)
    - releases/{id}/timeline.json (add timeline events)
    - releases/{id}/deliverables.json (track asset status)
    - tasks/today.md (add next actions)
    - marketing/campaigns.json (if campaign created)

**Verification:**
- Create a test sandbox with the CLAUDE.md and skill files
- Run the agent with a prompt like "Help me plan my next single release"
- Verify the agent reads the skill and follows the checklist


### Phase 7: Integration Testing and Validation

**Goal:** Create comprehensive tests that verify the full system works end-to-end.

**Test scenarios:**

1. **New artist onboarding:**
   - Call API with a fresh artist_id
   - Verify scaffold files are created
   - Verify snapshot is persisted

2. **Subsequent session:**
   - Call API with existing artist_id
   - Verify previous state is restored
   - Make a change (add a task)
   - Verify change persists to next session

3. **Concurrency rejection:**
   - Start a long-running request
   - Attempt a second request with same artist_id
   - Verify 409 response

4. **Validation enforcement:**
   - Ask agent to write invalid JSON
   - Verify validation fails
   - Verify workspace is not corrupted

5. **Guardrail enforcement:**
   - Ask agent to "rm -rf /"
   - Verify command is blocked
   - Verify agent explains why

6. **Approval flow:**
   - Ask agent to "post my new single announcement to Instagram"
   - Verify agent creates approval request instead of posting
   - Verify marketing/approval.json is updated

7. **Immutable snapshots + KV pointer:**
   - Complete two runs for the same artist in quick succession
   - Verify each run creates a new immutable snapshot with timestamp
   - Verify KV pointer is updated to point to the latest snapshot
   - Verify second run sees changes from first run (no stale cache)

8. **Safe write semantics:**
   - Ask agent to overwrite an existing file without `allowOverwrite`
   - Verify operation is blocked with clear error message
   - Ask agent to write with path traversal (`../etc/passwd`)
   - Verify path traversal is blocked
   - Ask agent to append to a log file
   - Verify append succeeds

9. **Structured audit trail:**
   - Complete a run that modifies several files
   - Verify `.trace/commits.jsonl` contains structured entries
   - Verify each entry has path, action, hash, timestamp

10. **Progress handover:**
    - Complete first run (initializer pattern)
    - Verify `progress/claude-progress.md` is created with handover notes
    - Complete second run
    - Verify agent reads and continues from previous progress

11. **Feature list pattern:**
    - Verify `features.json` exists with multiple features (all passes: false initially)
    - Complete a run that implements one feature
    - Verify agent updates passes: true for that feature only
    - Verify agent does NOT delete or edit feature descriptions
    - Verify subsequent run picks up next incomplete feature

12. **Init.sh verification:**
    - Corrupt the workspace (delete a required directory)
    - Start a new session
    - Verify init.sh fails and reports the error
    - Verify agent does not proceed with corrupted environment

13. **Progressive skill loading:**
    - Verify system prompt contains only skill names and descriptions
    - Ask agent to plan a release (should trigger release-checklist skill)
    - Verify agent loads full SKILL.md content on demand
    - Verify additional skill files are loaded only when referenced

14. **Incremental work pattern:**
    - Start a session with multiple incomplete features
    - Verify agent works on only ONE feature per session
    - Verify agent commits work to git with descriptive message
    - Verify agent updates progress notes before exit

15. **Authentication + authorization:**
    - Call API without auth, verify 401
    - Call API with auth but non-owned artist_id, verify 403

16. **Rate limiting:**
    - Exceed per-user or per-artist limit
    - Verify 429 response with clear error message

**Test implementation location:** `__tests__/artist-os/`

**Verification:**
- Run tests with `pnpm test`
- All scenarios pass
- Coverage includes happy path and error cases


### Phase 8: Documentation and Handoff

**Goal:** Document the system for future developers and operators.

**Documentation to create:**

1. **README section** for the artist-os feature
2. **API documentation** with request/response examples
3. **Operational runbook** for common tasks:
   - Creating a new base snapshot
   - Manually stopping a stuck sandbox
   - Inspecting an artist's workspace
   - Recovering from a corrupted snapshot
   - Snapshot retention and cleanup (keep last N, delete older)

**Verification:**
- A developer unfamiliar with the system can follow the docs to:
  - Run the system locally
  - Make a test API call
  - Inspect the resulting snapshot


## Concrete Steps

This section provides exact commands to run at each phase. Update as work proceeds.

### Phase 1 Commands

    # From repository root
    pnpm add @vercel/sandbox @vercel/blob ioredis @anthropic-ai/claude-agent-sdk zod ms
    pnpm add -D @types/ms
    
    # Create directory structure
    mkdir -p app/api/artist-os/{query,snapshot,stop}
    mkdir -p lib/artist-os
    mkdir -p scripts
    mkdir -p workspace-template/.incurator
    mkdir -p workspace-template/.claude/skills/release-checklist
    mkdir -p workspace-template/.claude/skills/marketing-copy
    mkdir -p workspace-template/{profile,tasks,releases,brand,marketing,finances,contracts,logs,progress}
    
    # Verify TypeScript compiles
    pnpm tsc --noEmit

### Phase 2 Commands

    # Pull Vercel environment (for OIDC token and Blob credentials)
    vercel env pull
    
    # Run base snapshot builder
    npx tsx scripts/build-base-snapshot.ts
    
    # Verify snapshot exists in Blob (use Vercel dashboard or CLI)

### Phase 3 Commands

    # Start local dev server
    pnpm dev
    
    # Test the endpoint
    curl -X POST http://localhost:3000/api/artist-os/query \
      -H "Content-Type: application/json" \
      -d '{"artist_id":"test_artist_001","prompt":"Hello! What is in my workspace?"}' \
      --no-buffer

Expected output (SSE events):

    event: status
    data: {"phase":"sandbox_create"}
    
    event: status
    data: {"phase":"restore_base"}
    
    event: status
    data: {"phase":"restore_artist"}
    
    event: status
    data: {"phase":"agent_run_start"}
    
    event: log
    data: {"stream":"stdout","chunk":"Reading workspace files...\n"}
    
    ...more log events...
    
    event: status
    data: {"phase":"snapshot_export"}
    
    event: done
    data: {"ok":true,"exitCode":0,"manifest":{"artist_id":"test_artist_001",...}}


## Validation and Acceptance

The implementation is complete when:

1. **Base snapshot exists** at `snapshots/base/workspace-base.tar.gz` in Blob

2. **New artist flow works:**
   - POST to `/api/artist-os/query` with fresh artist_id
   - Receive SSE stream with all phases
   - Snapshot appears at `snapshots/{artist_id}/workspace-{timestamp}.tar.gz`
   - Manifest appears at `snapshots/{artist_id}/manifest-{timestamp}.json`
   - KV pointer `snapshot:{artist_id}:latest` points to the latest snapshot key
   - KV pointer `snapshot:{artist_id}:latest-manifest` points to the latest manifest key

3. **State persistence works:**
   - First call: ask agent to "Add a task: Review distribution contract"
   - Second call: ask "What tasks do I have?"
   - Agent should mention the previously added task

4. **Concurrency lock works:**
   - Start long request (ask agent to "Think about my career for 60 seconds")
   - During that, POST another request with same artist_id
   - Receive 409 status code

5. **Validation works:**
   - Ask agent to create a release with invalid status value
   - Agent should receive validation error
   - Workspace file should not be corrupted

6. **Guardrails work:**
   - Ask agent to "Delete all files in the system"
   - Agent should refuse
   - Audit log should record the blocked attempt

7. **Approval flow works:**
   - Ask agent to "Post my new single to Instagram"
   - Agent should NOT post
   - marketing/approval.json should have a new pending entry


## Idempotence and Recovery

**Safe to re-run:**
- Base snapshot creation (overwrites `snapshots/base/workspace-base.tar.gz`; acceptable for admin-only workflow, optionally keep versioned base snapshots)
- API calls (each creates fresh sandbox; artist snapshots are immutable and versioned by timestamp with KV pointer)
- Tests (use isolated artist IDs)

**Recovery procedures:**

If a sandbox is stuck:
- Use `/api/artist-os/stop` endpoint with sandbox_id
- Or wait for timeout (max 15 minutes for this implementation)

If a snapshot is corrupted:
- Update KV pointer `snapshot:{artist_id}:latest` to a previous snapshot key
- If no previous snapshot exists, delete the pointer to trigger a fresh scaffold on next run
- Document the rollback choice in the ops runbook

If lock is stuck:
- Use the Vercel Redis dashboard to delete key `lock:artist:{artist_id}`
- Or wait for TTL (20 minutes)


## Artifacts and Notes

(To be filled with transcripts and evidence during implementation)


## Interfaces and Dependencies

### NPM Packages (with versions)

    @vercel/sandbox: ^1.1.2
    @vercel/blob: ^2.0.0
    ioredis: ^5.9.0
    @anthropic-ai/claude-agent-sdk: ^0.1.76
    zod: ^4.3.5
    ms: ^2.1.3

### Environment Variables Required

    BLOB_READ_WRITE_TOKEN    # For Vercel Blob access
    REDIS_URL                # For Redis locks (auto-set when linked)
    ANTHROPIC_API_KEY        # For Claude Agent SDK

### Key Types and Interfaces

    // lib/artist-os/types.ts
    
    export interface QueryRequest {
      artist_id: string;
      prompt: string;
      resume_session_id?: string;
    }
    
    export interface SSEEvent {
      event: "status" | "log" | "done" | "error";
      data: StatusData | LogData | DoneData | ErrorData;
    }
    
    export interface StatusData {
      phase: string;
    }
    
    export interface LogData {
      stream: "stdout" | "stderr";
      chunk: string;
    }
    
    export interface DoneData {
      ok: boolean;
      exitCode: number;
      manifest: SnapshotManifest;
    }
    
    export interface ErrorData {
      message: string;
    }
    
    export interface SnapshotManifest {
      artist_id: string;
      snapshot_version: string;
      created_at: string;
      checksum_sha256: string;
      workspace_size_bytes: number;
    }
    
    export interface ArtistLock {
      release: () => Promise<void>;
    }

---

## Appendix A: Risk Mitigation Summary

| Risk | Impact | Mitigation |
|------|--------|------------|
| Race condition (concurrent artist runs) | Data corruption | Per-artist lock with 409 rejection |
| Secret exfiltration from sandbox | Security breach | API-layer Blob IO; no storage tokens in sandbox |
| JSON corruption | Broken workspace | Zod validation + rollback on failure |
| npm install cold start | Poor UX (5-15s delay) | Base snapshot with pre-installed deps |
| Approval bypass (social posting) | Reputation damage | Hard-coded check in runner; approval.json gating |
| Sandbox timeout | Lost work | Snapshot at regular intervals (future enhancement) |
| **Blob cache stale data (60s window)** | Lost work between runs | Immutable snapshots + KV pointer for "latest" |
| **Agent overwrites critical files** | Data loss | Safe write semantics: default-deny overwrite, path traversal blocking |
| **Slow workspace hydration (50+ files)** | Poor UX | Manifest-based lazy loading; only fetch hot files upfront |
| **Lost audit trail / "what happened?"** | No accountability | Structured commits.jsonl with path, action, hash, timestamp |
| **Session discontinuity** | Agent forgets context | Explicit progress handover pattern (initializer vs maintainer) |
| **Agent one-shots complex tasks** | Half-finished work, broken state | Feature list pattern with passes/fails status; incremental work |
| **Agent declares victory prematurely** | Missing functionality | Structured features.json that agent cannot delete, only update passes |
| **Skill context bloat** | Wasted attention budget | Progressive disclosure via SKILL.md frontmatter; lazy-load full content |
| **Environment drift between sessions** | Bugs from unknown state | init.sh script run at session start for verification |
| **Context window exhaustion** | Lost information in long sessions | Compaction strategy preserving key decisions; clear old tool results |
| **Too many tools pollute context** | Slow, expensive, unreliable | "Bash is all you need" - use Unix primitives, minimize dedicated tools |
| **Agent can't self-correct** | Stuck in error loops | Deterministic verification (JSON validation, linting, init.sh checks) |
| **Sub-task pollutes main context** | Lost focus, wasted tokens | Sub-agent architecture for high-context research tasks |
| **Single security layer fails** | Data exfiltration, damage | Swiss Cheese model: alignment + prompts + guardrails + sandbox |
| **KV-cache misses inflate cost 10x** | High latency, expensive | Stable prompt prefix (no timestamps at start); append-only context; deterministic serialization |
| **Tool changes break cache** | Expensive re-computation | Mask, don't remove tools; consistent tool name prefixes for group masking |
| **Context rot at 128k+ tokens** | Performance degradation | 5 pillars: offload to files, reduce via compaction, retrieve lazily, isolate to sub-agents, cache state |
| **Irreversible summarization loses info** | Critical context lost | Two-stage reduction: reversible compaction first (paths not content), structured summaries only when needed |
| **Lost-in-the-middle (goal drift)** | Agent forgets objectives | Attention recitation pattern: todo.md constantly rewritten to push goals into recent context |
| **Errors hidden from agent** | Repeated same mistakes | Error retention: leave failed actions + stack traces in context; model learns to avoid |
| **Few-shot trapping (pattern mimicry)** | Blind repetition of suboptimal patterns | Variation injection: rotate serialization templates, phrasing; break similar action-observation chains |
| **Over-engineered harness breaks on model update** | Wasted work, fragile system | Build to delete: lightweight infrastructure, modular architecture, assume code is temporary |
| **No feedback loop for improvement** | Stagnation, no learning | Harness as dataset: log full trajectories to .trace/runs/, analyze failures, enable future training |


## Appendix B: Future Enhancements (Post-MVP)

1. **Vercel Workflow integration** - For multi-day approval waits without burning compute
2. **Vercel Queues** - For scheduled background tasks (daily standups, campaign automation)
3. **MCP tool integration** - Connect to music analysis APIs, social platforms, contract analysis
4. **Snapshot versioning** - Keep last N snapshots for rollback capability (note: immutable snapshots already accumulate, just need cleanup policy)
5. **Warm sandbox pool** - Pre-create sandboxes for instant response times
6. **Multi-agent orchestration** - Separate specialized agents for releases, marketing, finances
7. **KV + FS Split for Hot Data** - Separate frequently-read JSON into Redis KV (profile, open tasks, metrics) from narrative Markdown in filesystem. Avoids "hot file" contention. Consider if we see performance issues with current approach.
8. **Snapshot cleanup job** - Automated cleanup of old immutable snapshots (keep last N per artist)
9. **Manifest-based file diffing** - Use manifest hashes to show what changed between sessions


## Revision History

- 2026-01-05: Initial ExecPlan created from manual review and open question resolution
- 2026-01-05: Added critical improvements from Incurator Blueprint analysis:
  1. **Immutable Snapshots + KV Pointer** - Fixes Blob cache stale data bug (up to 60s stale reads after overwrite)
  2. **Manifest & Lazy Loading** - Added `.index/manifest.json` for instant directory listings and hot file optimization
  3. **Structured Audit Trail** - Standardized on `.trace/commits.jsonl` JSONL format for accountability and future rollback
  4. **Safe Write Semantics** - Added `safe-fs.ts` with default-deny overwrite, path traversal blocking, append-only paths
  5. **Progress Handover Pattern** - Emphasized initializer vs maintainer pattern in CLAUDE.md
  6. **KV + FS Split** - Documented as post-MVP enhancement (elegant but may be overkill for MVP)
- 2026-01-05: Added critical improvements from Anthropic Agent Research articles:
  7. **Feature List Pattern** - Added `features.json` with passes/fails status for incremental work and preventing premature completion (from "Effective harnesses for long-running agents")
  8. **Formal Agent Skills Format** - Updated skills to use SKILL.md with YAML frontmatter for progressive disclosure (from "Agent Skills")
  9. **Visual Verification Pattern** - Added browser automation strategy for end-to-end testing (from "Effective harnesses for long-running agents")
  10. **Init.sh Pattern** - Added session initialization script for repeatable environment verification (from "Effective harnesses for long-running agents")
  11. **Compaction Strategy** - Added context management for long sessions preserving key decisions (from "Effective context engineering for AI agents")
  12. **Structured Note-Taking** - Enhanced progress notes with current session, accomplishments, blockers, next steps (from "Effective context engineering for AI agents")
  - Updated Phase 4 with Agent Loop Pattern (gather context → take action → verify work → repeat)
  - Added progressive skill loading with loadSkillSummaries() function
  - Added 4 new test scenarios (11-14) for feature list, init.sh, skills, and incremental work
  - Added 6 new risk mitigations to Appendix A
- 2026-01-05: Added "Bash is All You Need" insights from Claude Agent SDK team and Vercel d0:
  13. **Bash is All You Need** - Embrace Unix primitives (grep, cat, find, sed, pipes) over custom tools. Vercel removed 80% of tools, got 100% success rate, 3.5x faster.
  14. **Sub-Agent Architecture** - Spin up sub-agents for high-context research tasks, return only summary to main agent.
  15. **Deterministic Verification** - If you can verify (lint, validate JSON, run script), agent can self-correct. Verification hierarchy: deterministic > semi-deterministic > model-based > human.
  16. **Swiss Cheese Security** - Layered defense: model alignment + system prompt + harness guardrails + sandbox isolation. No single layer is perfect, together they're robust.
  - Added 5 new decisions to Decision Log (Bash philosophy, minimal tools, filesystem memory, Swiss Cheese security)
- 2026-01-05: Incorporated ExecPlan review fixes (Claude Agent SDK API updates, sandbox readFile stream handling, safe file scaffolding, auth/rate limiting, manifest helpers, snapshot path consistency, dependency versions)
  - Added 4 new risk mitigations (tool pollution, self-correction, sub-agent, security layers)
- 2026-01-05: Added comprehensive Agent Harness Architecture 2026 insights from Manus team and "The importance of Agent Harness in 2026" research:
  17. **Agent Harness as Operating System** - Foundational mental model: Model=CPU, Context=RAM, Harness=OS, Agent=Application. runner.ts IS the operating system that handles boot sequence, context curation, and standard drivers.
  18. **KV-Cache Optimization** - Critical cost/latency metric. Keep prompt prefix stable (no timestamps at start!), append-only context, deterministic serialization. Cached tokens cost 10x less.
  19. **Mask, Don't Remove Tools** - Dynamic tool changes invalidate KV-cache. Instead mask via logit constraints. Design tool names with consistent prefixes (task_*, release_*) for easy group masking.
  20. **Layered Action Space** - Three tiers: Layer 1 (Atomic Functions, ~10-20 tools), Layer 2 (CLI via shell - ffmpeg, jq), Layer 3 (Agent writes scripts for APIs). Large outputs to files, not context.
  21. **5 Pillars of Context Engineering** - Consolidated framework: Offload (to files), Reduce (compaction), Retrieve (lazy load), Isolate (sub-agents), Cache (progress notes).
  22. **Two-Stage Context Reduction** - Stage A: Reversible compaction (paths not content, can be re-read). Stage B: Structured summarization only when needed (schemas, not free-form). Keep last 3-5 messages raw.
  23. **Attention Recitation Pattern** - Agent constantly rewrites todo.md to push objectives into recent attention span. Prevents "lost-in-the-middle" goal drift. Natural language attention bias.
  24. **Error Retention Strategy** - Leave failed actions + stack traces in context. Model implicitly learns to avoid similar mistakes. Error recovery is key agentic capability indicator.
  25. **Anti-Few-Shot Trapping** - Introduce structured variation (serialization templates, phrasing) to prevent pattern mimicry from similar action-observation pairs.
  26. **Build to Delete (Bitter Lesson)** - Infrastructure must be lightweight. Every model release has different optimal structure. Be ready to rip out "smart" logic. Don't over-engineer.
  27. **Harness Trajectories as Training Data** - Competitive advantage is captured trajectories, not prompts. Log full runs to .trace/runs/ for failure analysis, hill climbing, and future training.
  - Added 11 new decisions to Decision Log (harness as OS, KV-cache optimization, mask don't remove, layered action space, todo.md recitation, error retention, variation injection, build to delete, trajectories as dataset)
  - Added 11 new comprehensive design sections (17-27) covering complete Agent Harness architecture
  - Added 11 new risk mitigations to Appendix A (cache, context rot, summarization, goal drift, errors, few-shot, over-engineering, feedback loops)
  - Total ExecPlan now covers 27 key design improvements from 4 major sources: Blueprint, Anthropic Research, Bash Philosophy, and Agent Harness 2026

Change note (2026-01-05): Updated Progress, Surprises, Decision Log, and Outcomes to reflect the completed MVP implementation, added companion overview/validation docs, and documented the Vitest config loader workaround for `*` path roots.
Change note (2026-01-06): Added task status normalization in the runner and documented canonical task status values to prevent validation rollbacks.
