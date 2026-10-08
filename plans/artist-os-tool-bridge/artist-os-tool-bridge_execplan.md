# Artist OS Tool Bridge: Enable Active Tool Execution via Incurator Backend

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document must be maintained in accordance with `PLANS.md` at the repository root.


## Purpose / Big Picture

Today, Artist OS sessions can only advise: the agent reads workspace files, gives text guidance, and updates local JSON. After this change, Artist OS sessions can act: the agent will call real Incurator backend capabilities (bio generation, press release drafting, audio mastering, and more) and deliver concrete outputs back into the workspace.

The user-visible success criterion: start an Artist OS session, ask for something that requires a backend tool (for example, "master my track" or "write me a professional bio"), and observe that the task completes with real output from the Incurator app rather than hallucinated or advisory-only text.

This plan establishes the foundation for production-grade tool integration. It keeps heavy provider integrations (Replicate, Fal.ai, OpenAI, matcher service) and their API secrets inside `incurator-app`, while Artist OS remains the orchestration and workspace layer. The architecture is designed to scale from two pilot tools to the full catalog of thirty-plus capabilities.


## Progress

- [x] (2026-02-12 23:06Z) Cross-repo discovery completed across Artist OS runner, skill files, and Incurator app auth/tool routes.
- [x] (2026-02-12 23:06Z) Architecture decision finalized: MCP custom tools for remote execution, Skills for workflow guidance and optional local helper scripts.
- [x] (2026-02-12 23:06Z) Self-contained ExecPlan authored.
- [x] (2026-02-12 23:23Z) Re-evaluated architecture against long-running harness, context engineering, MCP/code-execution, and skill-authoring guidance; kept core approach and clarified scope boundaries.
- [x] (2026-02-13 03:30Z) Comprehensive revision: added full code patterns, SDK verification, concrete auth middleware, blob transport detail, session mode implementation, skill update guidance, and expanded validation. Incorporated findings from Anthropic engineering blog resources on context engineering, skill authoring, tool design, and long-running agent harnesses.
- [x] (2026-02-13 00:45Z) ExecPlan execution started by agent session; implementation checklist derived from Milestones 1-4 plus validation gates.
- [x] (2026-02-13 00:53Z) Implemented `incurator-app` Agent API boundary: added service-token auth modules, `/api/agent/*` pilot routes (bio-generation, upload-audio, mastering), middleware public-route allowlist update, env var docs, and focused unit/route tests.
- [x] (2026-02-13 01:13Z) Implemented Artist OS MCP tool bridge: added `workspace-template/.incurator/incurator-tools.ts`, runner MCP wiring/allowlist updates, MCP audit logging, and env propagation from API layer to sandbox process.
- [x] (2026-02-13 01:13Z) Added session mode toggle end-to-end (`artist_ops` default, `feature_flow` optional): schema updates, API propagation, and mode-conditional runner instructions/feature-context inclusion.
- [x] (2026-02-13 01:13Z) Updated priority skills (`music-production`, `bio-writing`, `press-release`) with explicit MCP tool usage guidance and fallback notes.
- [x] (2026-02-13 01:13Z) End-to-end validation executed via `/api/artist-os/query`: verified live MCP tool invocation for text and mastering tools and structured failure handling when backend is unreachable.
- [x] (2026-02-13 01:13Z) Full validation completed in both repos (`test`, `test:all`, `tsc --noEmit`, lint where available) and docs/env examples updated.
- [x] (2026-02-13 20:50Z) Added artist workspace upload flow for mastering inputs: `POST /api/artist-os/files/upload` plus console UI upload controls targeting `releases/`.
- [x] (2026-02-13 20:59Z) Applied local-first text policy after product feedback: mastering remains the default bridged tool; remote text tools are opt-in via `ARTIST_OS_ENABLE_REMOTE_TEXT_TOOLS=true` (legacy `ARTIST_OS_ENABLE_REMOTE_BIO_TOOL` still supported).
- [x] (2026-02-13 20:59Z) Revalidated with tests/typecheck/lint and Browser MCP: upload controls render in console UI, and browser console is clean after form input naming fix.
- [x] (2026-02-13 21:01Z) Rebuilt base snapshot after template/skill updates so new sandbox sessions receive updated tool policy and upload guidance.


## Surprises & Discoveries

- Observation: Artist OS currently forces feature-by-feature execution through runner prompt instructions and `features.json`, which conflicts with ad-hoc "do this tool task now" prompts.
  Evidence: `workspace-template/.incurator/runner.ts` lines 97-100 (`Session Instructions: 1. Work on ONE feature at a time`) and `workspace-template/features.json` (all four initial features have `passes: false`).

- Observation: Artist OS skills exist but are guidance-only today; no `scripts/` executables are currently present in any skill directory.
  Evidence: Twenty-one skill directories exist under `workspace-template/.claude/skills/`, each containing only `SKILL.md`. No `scripts/` subdirectories found.

- Observation: Incurator app tool routes are Clerk/session-based and usage-gated through `withUsageCheck`; they cannot be called directly from sandbox without an alternate auth boundary.
  Evidence: `lib/auth/withUsageCheck.ts` calls `getUser()` which depends on `currentUser()` from Clerk. Every tool route wraps its handler with `withUsageCheck('tool_key', handler)`.

- Observation: Mastering is implemented as a proxy to an external matcher service via `/api/proxy-matcher`, not through a generic `/api/tools/production/mastering` route. The pattern is: upload blob, send blob URL to matcher service, matcher returns result, delete original blob.
  Evidence: `app/api/proxy-matcher/route.ts` makes `POST` to `${MATCHER_SERVICE_URL}/master/` with `Bearer ${MATCHER_API_TOKEN}`.

- Observation: The Claude Agent SDK in this repo exports `createSdkMcpServer` and `tool` from `@anthropic-ai/claude-agent-sdk`. The `tool()` function takes four arguments: name, description, a Zod raw shape for input schema, and an async handler that returns `CallToolResult`. The `query()` options accept `mcpServers: Record<string, McpServerConfig>` and `allowedTools: string[]`.
  Evidence: `node_modules/@anthropic-ai/claude-agent-sdk/entrypoints/agentSdkTypes.d.ts` lines 659-677 and 879.

- Observation: The SDK supports `settingSources: ["project"]` which enables native filesystem skill loading from `.claude/skills/`. The current runner does NOT use this; it manually reads skill frontmatter and injects summaries into the system prompt.
  Evidence: `agentSdkTypes.d.ts` lines 986-991 and `runner.ts` lines 407-438 (`loadSkillSummaries()`).

- Observation: Tool routes in incurator-app follow two distinct patterns. Synchronous tools (bio-generation, venue-finder, press-release, campaign) return results immediately. Asynchronous tools (stem-separator, autotune, sample-generator) return a prediction ID that must be polled via GET with status checks.
  Evidence: `app/api/tools/marketing/bio-generation/route.ts` (sync) vs `app/api/tools/production/stem-separator/route.ts` (POST returns `predictionId`, GET polls status).

- Observation: Anthropic's advanced tool use features (Tool Search Tool, Programmatic Tool Calling, Tool Use Examples) are configured at the Messages API/tool-definition level and are not currently first-class Agent SDK features. The SDK supports `betas` generally, but does not expose dedicated Tool Search/PTC configuration in `query()` options.
  Evidence: Anthropic documentation specifies `anthropic-beta: advanced-tool-use-2025-11-20` header for Messages API calls. The SDK types include `betas` but no explicit Tool Search/PTC options in `query()` (`agentSdkTypes.d.ts`).

- Observation: Route-level source-blob cleanup in mastering must use `try/catch` around `await del(...)`; chaining `.catch()` is unsafe in tests where mocks may return non-Promise values.
  Evidence: Initial mastering route tests returned 500 due `TypeError` in `finally` when `del` mock returned `undefined`; switched to `try/catch` and tests passed.

- Observation: Sandbox-based Agent runs cannot reach host-local `http://localhost:3001`; MCP calls fail with `SERVICE_UNREACHABLE` unless `INCURATOR_API_URL` points to a network-reachable endpoint.
  Evidence: Direct host curl to `http://localhost:3001/api/agent/tools/marketing/bio-generation` succeeded, while sandbox MCP calls in SSE repeatedly returned connection failures against `http://localhost:3001`.

- Observation: Runner/template changes did not apply to sandbox sessions until the base snapshot was rebuilt.
  Evidence: Before rebuilding base snapshot, SSE sessions did not expose MCP tools. After `npx tsx scripts/build-base-snapshot.ts`, sessions showed `mcp__incurator-tools__*` tool invocations.

- Observation: Product expectation is to keep text workflows (bio, press, campaign copy) primarily inside Artist OS skills/workspace and reserve backend bridge usage for operations that require external processing.
  Evidence: User review feedback requested avoiding backend text-generation dependency by default while keeping both apps active.

- Observation: `incurator-app` does not currently provide a runnable lint gate in this environment (`lint` script missing; `pnpm exec eslint` unavailable).
  Evidence: `pnpm lint` failed with `Command "lint" not found`; `pnpm exec eslint .` failed with `Command "eslint" not found`.


## Decision Log

- Decision: Use MCP custom tools (`createSdkMcpServer`) in Artist OS runner for all remote Incurator API operations.
  Rationale: Remote tool execution needs typed inputs, structured error handling, and deterministic behavior. The `tool()` helper provides Zod schema validation, and handlers run in the same Node.js process as the runner, so they have direct access to `process.env` for service tokens. This is stronger than freeform Bash invocation of scripts because the agent cannot hallucinate CLI flags, and tool inputs are validated before any network call is made. The SDK confirms `createSdkMcpServer` is the intended pattern for custom in-process tools.
  Date/Author: 2026-02-12 / Codex

- Decision: Keep Skills as the workflow brain and discovery layer; do not make Skills the primary remote transport layer.
  Rationale: Anthropic's skill authoring docs describe three levels: metadata (always loaded, ~100 tokens), instructions (loaded when triggered, <5k tokens), and resources/scripts (loaded as needed). Skills excel at progressive disclosure of workflow knowledge. Remote API calls benefit from typed contracts and structured error handling that MCP tools provide. The correct split is: Skills tell the agent when and how to use a capability; MCP tools execute the capability. Skills may optionally include local `scripts/` for non-remote helper tasks (file format validation, report assembly) where deterministic shell execution is the right abstraction.
  Date/Author: 2026-02-12 / Codex

- Decision: Add a dedicated agent namespace in `incurator-app` (`/api/agent/*`) instead of reusing existing user-facing `/api/tools/*` directly.
  Rationale: Existing routes depend on Clerk session context via `getUser()` -> `currentUser()`. Injecting fake sessions into a sandbox HTTP client would be fragile and insecure. An explicit service boundary using `ARTIST_OS_SERVICE_TOKEN` allows agent calls without browser session cookies. For MVP, service-token auth is sufficient and requests must not require Clerk-registered users. Existing `/api/tools/*` routes remain completely untouched, avoiding any regression risk.
  Date/Author: 2026-02-12 / Codex

- Decision: For MVP, do not require Clerk/user-table resolution on agent routes.
  Rationale: Current Artist OS auth is token/header-based and may represent actors that are not yet provisioned in Clerk. Blocking on Clerk mapping would break MVP flows. Enforce service token now; defer strict Clerk identity and full usage parity to a follow-up phase.
  Date/Author: 2026-02-12 / Codex

- Decision: Start with a narrow pilot: one synchronous text tool (bio generation) plus one file-transport tool (mastering), then expand.
  Rationale: This validates two fundamentally different integration patterns. Bio generation is synchronous text-in/text-out with no file handling. Mastering requires uploading binary audio from sandbox to incurator-app, calling an external service, and downloading the result back. Proving both patterns work confirms the bridge architecture handles the full range of tool types. Per "Writing effective tools for agents," starting with a few thoughtful tools targeting high-impact workflows is better than trying to expose everything at once.
  Date/Author: 2026-02-12 / Codex

- Decision: Defer Tool Search Tool, Programmatic Tool Calling, and other advanced Messages API features.
  Rationale: These features require `advanced-tool-use-2025-11-20` behavior at the API/tool-definition layer. Our runtime uses the Claude Agent SDK `query()` abstraction, which does not currently provide first-class Tool Search/PTC configuration primitives. With only two to five initial tools, context overhead from tool definitions is negligible (well under the 10K+ token threshold where Tool Search Tool becomes beneficial). We will revisit when tool count exceeds thirty or when the SDK adds native support.
  Date/Author: 2026-02-12 / Codex

- Decision: Add tool-use examples and strict schema discipline to MCP tool contracts even without formal Tool Use Examples API support.
  Rationale: Per "Writing effective tools for agents," tool descriptions should include realistic examples, unambiguous parameter names, and documented return shapes. Even though the Agent SDK does not support the `input_examples` API field, embedding usage patterns in tool descriptions and companion skill docs achieves the same effect at the harness level.
  Date/Author: 2026-02-12 / Codex

- Decision: Add `session_mode` toggle rather than removing or permanently modifying feature-flow behavior.
  Rationale: Per "Effective harnesses for long-running agents," the feature checklist pattern is valuable for initializer sessions that bootstrap an artist's workspace. But it conflicts with operations sessions where the artist says "do this now." A mode toggle preserves both behaviors. Default mode for API calls should be `artist_ops` (respond to user's immediate request); `feature_flow` keeps the original one-feature-at-a-time progression for onboarding.
  Date/Author: 2026-02-12 / Codex

- Decision: Do NOT enable `settingSources: ["project"]` in the SDK query options in this phase.
  Rationale: The runner currently loads skill summaries manually and injects them into the system prompt. Switching to native SDK skill loading would change how skills are discovered and loaded, potentially affecting context management and the progressive disclosure pattern we control today. This is a separate modernization task to tackle after the tool bridge is working. The manual approach gives us full control over what enters context and when.
  Date/Author: 2026-02-13 / Codex

- Decision: Refactor `incurator-app` bio generation into reusable core helper (`generateBioForArtist`) and keep existing `generateBio()` as a compatibility wrapper.
  Rationale: Agent routes need Clerk-independent generation for sandbox callers while preserving current user-facing route behavior. Extracting shared prompt/LLM logic avoids duplicated pipelines and keeps `/api/tools/marketing/bio-generation` unchanged.
  Date/Author: 2026-02-13 / Codex

- Decision: Include MCP tool names in `query()` `tools` alongside built-ins, and keep explicit `allowedTools` for phase-one scope control.
  Rationale: MCP invocation was not occurring when only built-in tools were listed. Adding explicit MCP names to `tools` enables model access while preserving tight allowlisting for the two pilot capabilities.
  Date/Author: 2026-02-13 / Codex

- Decision: Keep local E2E validation with structured error behavior and document network reachability as the remaining deployment precondition for true backend execution.
  Rationale: This validates bridge correctness, tool invocation, and resilience without blocking on local-network topology. Production or tunneled endpoints can satisfy the remaining connectivity requirement.
  Date/Author: 2026-02-13 / Codex

- Decision: Keep text generation local-first in Artist OS and gate remote text tools behind explicit opt-in configuration.
  Rationale: This preserves current product behavior, avoids accidental dependency on app-side text routes for core writing flows, and still keeps remote text generation available when operators want it. Implemented with `ARTIST_OS_ENABLE_REMOTE_TEXT_TOOLS=true` (legacy bio flag still supported).
  Date/Author: 2026-02-13 / Codex

- Decision: Add a first-class Artist OS upload endpoint for audio files into workspace `releases/` instead of relying only on tool-time uploads inside the sandbox.
  Rationale: Artists need a direct UI/API path to stage tracks before mastering requests. The endpoint writes the file into the artist snapshot so subsequent agent runs can detect and process it.
  Date/Author: 2026-02-13 / Codex


## Outcomes & Retrospective

Milestones 1-4 were implemented and validated. Artist OS now ships with backend mastering bridge enabled by default (`incurator_master_track`) and optional remote text bridge (`incurator_generate_bio`) gated behind `ARTIST_OS_ENABLE_REMOTE_TEXT_TOOLS=true`. New service-authenticated `incurator-app` agent routes back these capabilities, and `session_mode` defaults to `artist_ops` with optional `feature_flow`. Skills were updated to keep text workflows local-first unless remote text tools are explicitly enabled.

An artist-facing upload flow was added so tracks can be staged into workspace `releases/` before mastering. This includes `POST /api/artist-os/files/upload` and matching controls in the Artist OS console UI.

Cross-repo tests and type checks pass after the implementation. End-to-end SSE runs confirm the model invokes MCP tools and receives structured tool errors when backend connectivity is unavailable. The remaining gap for fully successful local backend execution is network reachability from sandbox to `INCURATOR_API_URL`; using a publicly reachable URL (or equivalent tunnel) resolves this.

Documentation and environment examples were updated in both repos to reflect the new service token and API URL requirements.


## Related Documents

- Repository guidance: `PLANS.md`
- Artist OS API docs: `docs/artist-os-api.md`
- Artist OS runbook: `docs/artist-os-runbook.md`
- Existing MVP plan context: `plans/artist-os-mvp/artist-os-mvp_execplan.md`


## Context and Orientation

This work spans two repositories on the same developer machine.

**Repository 1: `incurator-artist-os`** (this repo) is the orchestration runtime that runs the Claude Agent SDK inside Vercel Sandbox microVMs. The execution path for a user query is:

1. Browser hits `src/app/api/artist-os/query/route.ts` with a POST containing `artist_id` and `prompt`.
2. The route acquires a Redis lock for the artist, creates a sandbox, restores snapshots.
3. `src/lib/artist-os/agent.ts` (`runAgent()`) launches the runner process inside the sandbox.
4. `workspace-template/.incurator/runner.ts` runs inside the sandbox, calls `query()` from `@anthropic-ai/claude-agent-sdk`, and the Claude model does work using tools.
5. Results stream back via SSE to the browser.

The workspace scaffold lives under `workspace-template/` and gets copied into each sandbox. It includes the artist's profile, tasks, releases, and twenty-one advisory skills under `.claude/skills/`.

**Repository 2: `incurator-app`** is the current production web app at `/Users/francoabaroa/Documents/Repos/career/incurator/incurator-app`. It has thirty-plus tool routes under `app/api/tools/` organized by category (booking, contracts, marketing, production). Each route is protected by `withUsageCheck` which requires a Clerk browser session. The mastering capability lives at `app/api/proxy-matcher/` and proxies to an external matcher service.

**Repository assignment (authoritative):**

- **[INCURATOR_APP]** Any path starting with `incurator-app/` or absolute path `/Users/francoabaroa/Documents/Repos/career/incurator/incurator-app/**` must be edited in the `incurator-app` repository.
- **[ARTIST_OS]** Any path in this repository (`incurator-artist-os/**`, including `src/**` and `workspace-template/**`) must be edited here.
- If a step references both repos, execute changes in two separate working directories and validate each repo independently.

**Key terms used in this plan:**

- **Tool Bridge**: The integration layer that lets Artist OS call existing Incurator backend capabilities. Comprises agent API routes in incurator-app and MCP tool handlers in the Artist OS runner.

- **MCP custom tool**: A typed tool exposed to the Claude model through the `createSdkMcpServer()` function from the Claude Agent SDK. Defined with a Zod input schema and an async handler function. Runs in the same Node.js process as the runner inside the sandbox.

- **Skill**: A filesystem-based guidance document under `.claude/skills/{name}/SKILL.md` that tells the model when and how to approach a class of tasks. Skills have three loading levels: metadata (always in context, ~100 tokens per skill), instructions (loaded when the skill is relevant, <5k tokens), and resources/scripts (loaded as needed from subdirectories). In this repo, the runner manually reads skill frontmatter and injects summaries into the system prompt.

- **Agent API route**: A service-authenticated HTTP route under `incurator-app/app/api/agent/**` designed exclusively for Artist OS. Uses `ARTIST_OS_SERVICE_TOKEN` for authentication instead of Clerk sessions.

- **Session mode**: A configuration value (`artist_ops` or `feature_flow`) that controls whether the runner's system prompt prioritizes responding to the user's immediate request or enforces one-feature-at-a-time progression through `features.json`.

**Current state summary:**

- Artist OS has robust sandbox lifecycle management: snapshot persistence to Vercel Blob, Redis-based artist locking, SSE streaming, and session resumption.
- The runner exposes seven built-in tools (Read, Glob, Grep, Write, Edit, MultiEdit, Bash) with guardrails (path validation, dangerous command blocking, append-only enforcement).
- Twenty-one skills exist but are guidance-only; none have `scripts/` subdirectories or executable components.
- The runner forces feature-by-feature progression via `features.json` and hardcoded Session Instructions.
- Incurator app has the backend capabilities we want but behind Clerk-session-coupled auth.
- No `/api/agent/` namespace exists in incurator-app yet.
- The `agent.ts` file in this repo passes environment variables to the sandbox process but currently does not pass `INCURATOR_API_URL`, `ARTIST_OS_SERVICE_TOKEN`, or user identity information.


## Plan of Work

### Milestone 1 [INCURATOR_APP]: Build the Incurator Agent API Boundary

After this milestone, `incurator-app` will have a dedicated `/api/agent/*` route family that Artist OS can call with a service token. Two pilot tools (bio generation and mastering) and one file upload endpoint will be exposed. All existing `/api/tools/*` routes remain completely untouched. For MVP, agent routes must succeed with service-token auth even when the caller is not registered in Clerk.

**Why this milestone first:** The agent API boundary is the prerequisite for everything else. Without it, the MCP tools in Artist OS have nothing to call.

**1a. Create service auth middleware.**

Create `incurator-app/lib/auth/agentServiceAuth.ts`. This module exports a function `validateAgentServiceToken(request: NextRequest)` that reads the `Authorization` header, extracts the bearer token, and compares it against `process.env.ARTIST_OS_SERVICE_TOKEN`. If the token is missing or does not match, it throws an error with a 401-appropriate message. If it matches, it returns `{ authenticated: true }`.

Create `incurator-app/lib/auth/resolveAgentActor.ts`. This module exports a function `resolveAgentActor(request: NextRequest)` that reads `x-agent-artist-id` (required) and `x-agent-user-id` (optional opaque string for observability). It does **not** require Clerk lookup in MVP and must not 404 on missing Clerk users.

Create `incurator-app/lib/auth/withAgentServiceAuth.ts`. This module exports a higher-order function for agent routes:

    export function withAgentServiceAuth(
      handler: (request: NextRequest, context: { actor: AgentActor }) => Promise<Response>
    )

Internally it calls `validateAgentServiceToken`, then `resolveAgentActor`, then invokes the handler. No Clerk dependency is required in MVP. Error responses must follow the shared route envelope format: `{ ok: false, error: { code: string, message: string, retryable?: boolean }, requestId: string }`.

**1b. Update middleware to allow agent routes.**

In `incurator-app/middleware.ts`, add `/api/agent/(.*)` to the list of public routes that bypass Clerk authentication. The service token check happens inside the route handler via `withAgentServiceAuth`, not at the middleware level. This mirrors how other service-to-service routes are handled.

**1c. Create agent routes for pilot tools.**

Create `incurator-app/app/api/agent/tools/marketing/bio-generation/route.ts`. This POST route accepts a JSON body with bio configuration fields (same shape as the existing bio-generation tool expects) and returns `{ ok: true, data: { bio: string, style: string }, requestId: string }` on success or `{ ok: false, error: { code: string, message: string, retryable?: boolean }, requestId: string }` on failure. Internally it reuses the same generation logic that the existing `/api/tools/marketing/bio-generation/route.ts` uses. Wrap with `withAgentServiceAuth(handler)`.

Create `incurator-app/app/api/agent/files/upload-audio/route.ts`. This POST route accepts a multipart form upload (the sandbox will POST raw file bytes) and stores the file in Vercel Blob, returning `{ ok: true, data: { blobUrl: string, fileName: string, size: number }, requestId: string }`. This route should use service authentication but not increment usage on its own; usage is charged once at the downstream mastering route. (If introducing a distinct `agent_file_upload` metered key in the future, add it to `toolTypeEnum` + `ToolKey` + `PLAN_LIMITS` first.) The blob URL must be publicly accessible so the mastering service can read it.

Create `incurator-app/app/api/agent/tools/production/mastering/route.ts`. This POST route accepts `{ fileUrl: string, format?: string, bitDepths?: number[] }` and proxies to the matcher service using the same logic as the existing `/api/proxy-matcher/route.ts`. It deletes the source blob after the matcher service responds. Returns `{ ok: true, data: { resultUrl: string, format: string, duration?: number }, requestId: string }`. Error responses follow the shared envelope with `requestId`. Wrap with `withAgentServiceAuth(handler)`.

**1d. Add environment variable.**

Add `ARTIST_OS_SERVICE_TOKEN` to `incurator-app/.env.local` (and `.env.example` if it exists). Generate a random 64-character hex string for the token value.

**1e. Write tests.**

Add unit tests for `agentServiceAuth.ts`, `resolveAgentActor.ts`, and `withAgentServiceAuth.ts`. Test that missing tokens return 401, missing `x-agent-artist-id` returns 400, and valid token + artist id succeeds even without Clerk registration. Add route-level tests for each agent route verifying both success and error paths.

**Verification:** After this milestone, you can test the agent routes manually:

    cd "$INCURATOR_APP_REPO"
    pnpm dev -- -p 3001

    curl -X POST http://localhost:3001/api/agent/tools/marketing/bio-generation \
      -H "Authorization: Bearer <token>" \
      -H "x-agent-artist-id: artist_test456" \
      -H "x-agent-user-id: mvp_user_001" \
      -H "Content-Type: application/json" \
      -d '{"style": "professional", "length": "medium"}'

Expected response shape:

    { "ok": true, "data": { "bio": "...", "style": "professional" } }


### Milestone 2 [ARTIST_OS]: Add MCP Tool Bridge in Artist OS Runner

After this milestone, the Claude model inside the sandbox can call Incurator backend tools as first-class MCP tools with typed schemas and structured results. The tools appear in the agent's tool list alongside Read, Write, Bash, and others.

**2a. Create the MCP tool definitions file.**

Create `workspace-template/.incurator/incurator-tools.ts`. This file exports a function `createIncuratorMcpTools()` that returns a `McpSdkServerConfigWithInstance` (the return type of `createSdkMcpServer`).

The file imports `createSdkMcpServer` and `tool` from `@anthropic-ai/claude-agent-sdk`, and `z` from `zod`. It also imports `fs/promises` for local file operations.

Define two initial tools:

**Tool 1: `incurator_generate_bio`**

    tool(
      "incurator_generate_bio",
      "Generate a professional artist bio using the Incurator backend service. " +
      "Returns the generated bio text. The bio is also saved to the specified workspace file path. " +
      "Example: generate a 'professional' style bio and save to 'brand/bio-professional.md'.",
      {
        style: z.enum(["professional", "casual", "press", "social"]).describe("Bio style/tone"),
        length: z.enum(["short", "medium", "long"]).optional().describe("Bio length, defaults to medium"),
        outputPath: z.string().describe("Workspace-relative path to save the bio, e.g. 'brand/bio.md'"),
      },
      async (args) => { ... }
    )

The handler reads the artist profile from `profile/artist.json` in the workspace, constructs the request body, calls `${INCURATOR_API_URL}/api/agent/tools/marketing/bio-generation` with the service token and identity headers, parses the response, writes the bio to the specified `outputPath` in the workspace, and returns a `CallToolResult` with `content: [{ type: "text", text: JSON.stringify({ ok: true, bio: data.bio, savedTo: args.outputPath }) }]`.

On error, the handler returns `content: [{ type: "text", text: JSON.stringify({ ok: false, error: { code: "...", message: "...", retryable: boolean } }) }]` rather than throwing, so the model can reason about the failure.

**Tool 2: `incurator_master_track`**

    tool(
      "incurator_master_track",
      "Send an audio file from the workspace to the Incurator mastering service. " +
      "The file is uploaded, mastered by an external service, and the mastered result is saved back to the workspace. " +
      "Example: master 'releases/my-song.wav' and save to 'releases/my-song-mastered.wav'.",
      {
        inputPath: z.string().describe("Workspace-relative path to the audio file to master"),
        outputPath: z.string().describe("Workspace-relative path to save the mastered file"),
        format: z.enum(["wav", "mp3", "flac"]).optional().describe("Output format, defaults to wav"),
        bitDepths: z.array(z.number()).optional().describe("Bit depths array, e.g. [16, 24]"),
      },
      async (args) => { ... }
    )

The handler implements a five-step flow:

1. Read the local audio file from `${WORKSPACE_ROOT}/${args.inputPath}` using `fs.readFile`.
2. Upload the file bytes to `${INCURATOR_API_URL}/api/agent/files/upload-audio` as multipart form data with the service token. Parse the response to get `blobUrl`.
3. Call `${INCURATOR_API_URL}/api/agent/tools/production/mastering` with `{ fileUrl: blobUrl, format: args.format, bitDepths: args.bitDepths }` and the service token.
4. Download the mastered file from the `resultUrl` in the mastering response.
5. Write the mastered file to `${WORKSPACE_ROOT}/${args.outputPath}` using `fs.writeFile`.

Return structured result with output path, format, and metadata. On error at any step, return a structured error result. If the upload succeeds but mastering fails, note this in the error so the model knows the blob was already uploaded (the mastering route handles cleanup).

**Environment variable access:** The tool handlers read `INCURATOR_API_URL`, `ARTIST_OS_SERVICE_TOKEN`, `AGENT_REQUEST_USER_ID`, and `AGENT_ARTIST_ID` from `process.env`. These are set by `agent.ts` when launching the sandbox process.

**2b. Wire MCP tools into runner.ts.**

In `workspace-template/.incurator/runner.ts`, add an import for `createIncuratorMcpTools` from `./incurator-tools`. Before the `query()` call, conditionally create the MCP server only if the required environment variables are present:

    const incuratorApiUrl = process.env.INCURATOR_API_URL;
    const incuratorServiceToken = process.env.ARTIST_OS_SERVICE_TOKEN;

    const mcpServers: Record<string, unknown> = {};
    if (incuratorApiUrl && incuratorServiceToken) {
      try {
        mcpServers["incurator-tools"] = createIncuratorMcpTools();
      } catch (error) {
        console.error("Failed to initialize incurator MCP tools:", error);
      }
    }

Pass `mcpServers` in the `query()` options alongside the existing configuration. `allowedTools` supports wildcard patterns for MCP tools (for example, `mcp__incurator-tools__*`). For phase one, keep a tighter explicit allowlist to reduce blast radius, for example:

    allowedTools: [
      "mcp__incurator-tools__incurator_generate_bio",
      "mcp__incurator-tools__incurator_master_track"
    ]

When new MCP tools are added, append their exact names to this allowlist. After validation, you may widen to a server wildcard (`mcp__incurator-tools__*`) if you want lower maintenance overhead.

The existing `canUseTool` hook should log MCP tool calls to the audit trail. Add a case for tool names starting with `mcp__incurator-tools__` that logs the tool name and input to the audit log before allowing.

Keep all existing built-in tools (`Read`, `Glob`, `Grep`, `Write`, `Edit`, `MultiEdit`, `Bash`) and all existing guardrails unchanged.

**2c. Propagate environment variables from API layer to sandbox.**

In `src/lib/artist-os/agent.ts`, update the `env` object passed to `sandbox.runCommand` to include:

    if (process.env.INCURATOR_API_URL) {
      env.INCURATOR_API_URL = process.env.INCURATOR_API_URL;
    }
    if (process.env.ARTIST_OS_SERVICE_TOKEN) {
      env.ARTIST_OS_SERVICE_TOKEN = process.env.ARTIST_OS_SERVICE_TOKEN;
    }

The `runAgent` function signature should be extended to accept `requestUserId` and `artistId` parameters, which are then passed as env vars:

    env.AGENT_REQUEST_USER_ID = requestUserId;
    env.AGENT_ARTIST_ID = artistId;

Update `src/app/api/artist-os/query/route.ts` to pass these values when calling `runAgent`. The `artist_id` is already in the request body. The `requestUserId` should come from the authenticated request context (`getAuthUserId(req)`), not from request body parameters.

**2d. Add environment variables to this repo.**

Add `INCURATOR_API_URL` and `ARTIST_OS_SERVICE_TOKEN` to `.env.local`. During local development, `INCURATOR_API_URL` should point to `http://localhost:3001` (the incurator-app dev server on port 3001). The `ARTIST_OS_SERVICE_TOKEN` value must match between both repos.

**Verification:** After this milestone, start both dev servers and run a query:

    curl -X POST http://localhost:3000/api/artist-os/query \
      -H "Content-Type: application/json" \
      -H "x-user-id: user_test123" \
      -d '{"artist_id":"test_001","prompt":"Generate a professional bio for me and save it to brand/bio.md"}' \
      --no-buffer

Expected SSE events should include evidence of MCP tool invocation:

    event: log
    data: {"stream":"stdout","chunk":"Using tool incurator_generate_bio..."}

    event: log
    data: {"stream":"stdout","chunk":"Bio saved to brand/bio.md"}


### Milestone 3 [ARTIST_OS]: Add Session Mode Toggle

After this milestone, Artist OS sessions can operate in two modes: `artist_ops` (respond to the user's immediate request, use tools as needed) and `feature_flow` (the existing one-feature-at-a-time behavior for onboarding). The default for API calls is `artist_ops`.

**3a. Add session mode to request schema.**

In `src/lib/artist-os/validation.ts`, add `session_mode` as an optional field to `QueryRequestSchema`:

    session_mode: z.enum(["artist_ops", "feature_flow"]).optional().default("artist_ops")

**3b. Propagate mode to runner.**

In `src/lib/artist-os/agent.ts`, accept `sessionMode` as a parameter and pass it as `env.SESSION_MODE = sessionMode`.

In `src/app/api/artist-os/query/route.ts`, extract `session_mode` from the parsed request body and pass it to `runAgent`.

**3c. Generate mode-aware system instructions in runner.**

In `workspace-template/.incurator/runner.ts`, read `process.env.SESSION_MODE` (defaulting to `"artist_ops"` if absent). Replace the hardcoded `Session Instructions` block with mode-conditional logic:

When mode is `artist_ops`, the session instructions should say:

    ## Session Instructions
    1. Prioritize the artist's current request. Use available tools to complete their task.
    2. If the task requires an Incurator tool, use it directly. Do not provide advisory-only responses when a tool can deliver a real result.
    3. Update progress notes after each significant step.
    4. If no specific request is given, check tasks/backlog.json for pending work.

When mode is `feature_flow`, keep the existing instructions:

    ## Session Instructions
    1. Work on ONE feature at a time
    2. Test the feature thoroughly before marking passes: true
    3. Update progress notes after each significant step
    4. Do NOT remove or edit feature descriptions - only change passes status

The feature context block (which reads `features.json` and identifies the next incomplete feature) should only be included when mode is `feature_flow`. In `artist_ops` mode, skip this block to save context tokens for tool execution.

**Verification:** Send a request with `session_mode: "artist_ops"` and a tool-backed prompt. Observe that the agent responds to the request directly instead of trying to work on `profile-bootstrap` from `features.json`.


### Milestone 4 [ARTIST_OS]: Update Skills to Reference MCP Tools

After this milestone, the priority skills explicitly reference MCP tools by name, so the model knows to invoke them instead of providing advisory-only responses.

The following skills need updates:

**`workspace-template/.claude/skills/music-production/SKILL.md`** — Add a section titled "Available Incurator Tools" near the top of the instructions body (after the frontmatter, within the first 50 lines). List:

    ## Available Incurator Tools

    When the artist needs mastering done (not just advice about mastering), use the
    `incurator_master_track` MCP tool directly. Do not attempt to process audio yourself.

    ### Mastering Workflow
    1. Confirm the artist has an audio file in the workspace (check releases/ directory).
    2. Use `incurator_master_track` with the input path and desired output path.
    3. The tool handles upload, mastering, and saving the result automatically.
    4. Update releases/releases.json with the mastered file path if applicable.
    5. Inform the artist of the result and output location.

    ### When NOT to use the tool
    - When the artist is asking for advice about mastering techniques (provide guidance instead).
    - When the artist wants to understand mastering concepts (use your knowledge).
    - When no audio file exists in the workspace yet.

**`workspace-template/.claude/skills/bio-writing/SKILL.md`** — Add:

    ## Available Incurator Tools

    When the artist needs a bio generated (not just advice about writing one), use the
    `incurator_generate_bio` MCP tool. The tool calls the Incurator backend which uses
    the artist's profile data and proprietary generation pipeline.

    ### Bio Generation Workflow
    1. Read profile/artist.json to confirm artist data is available.
    2. Determine the style (professional, casual, press, social) from the artist's request.
    3. Use `incurator_generate_bio` with the style and an output path (e.g. brand/bio-professional.md).
    4. The tool saves the generated bio to the workspace automatically.
    5. Present the bio to the artist for review.

    ### When NOT to use the tool
    - When the artist wants to write or edit a bio themselves (assist with their draft).
    - When providing feedback on an existing bio (review it directly).

**`workspace-template/.claude/skills/press-release/SKILL.md`** — Add a note that a `incurator_generate_press_release` tool will be available in a future update. For now, provide advisory guidance as the skill currently does.

Keep all existing skill content below these new sections. Do not remove any existing guidance, checklists, or templates. The new sections should be concise (under 30 lines each) and placed immediately after the frontmatter separator.

**Verification:** Start a session and ask "write me a professional bio." Observe that the model reads the bio-writing skill, sees the tool reference, and invokes `incurator_generate_bio` rather than generating text from its own knowledge.


### Milestone 5 [BOTH REPOS]: Expand Tool Catalog and Harden Contracts

After pilot success with bio generation and mastering, expand the tool catalog. This milestone is intentionally described at a higher level because the exact implementation will follow the patterns established in milestones 1 and 2.

**Phase 5a: Add synchronous text tools.** These follow the same pattern as bio generation.

1. Press release generation (`incurator_generate_press_release`).
2. Campaign generation (`incurator_generate_campaign`).
3. Booking email generation (`incurator_generate_booking_email`).

For each: add an agent route in incurator-app, add an MCP tool definition in incurator-tools.ts, update the corresponding skill file.

**Phase 5b: Add one asynchronous audio tool.** Either stem separator or autotune. These follow the mastering pattern but add polling: the agent route starts a prediction and returns a prediction ID, then the MCP tool handler polls a status endpoint until the prediction completes or fails. The polling loop runs inside the tool handler (not in model context), so the model only sees the final result. Set a maximum poll duration of 5 minutes with exponential backoff (1s, 2s, 4s, 8s, up to 30s intervals).

**Phase 5c: Standardize response envelopes.** Ensure all agent routes return consistent JSON:

    // Success
    { "ok": true, "data": { ... }, "requestId": "uuid" }

    // Error
    { "ok": false, "error": { "code": "string", "message": "string", "retryable": boolean }, "requestId": "uuid" }

Add the `requestId` to both repos' logging for cross-repo traceability.

**Phase 5d: Update remaining skills.** As each tool is added, update the corresponding skill file with tool references following the pattern from milestone 4.


## Concrete Steps

Set shell variables for both repositories.

    export ARTIST_OS_REPO="/Users/francoabaroa/Documents/Repos/career/incurator/*AGENTS_EXPERIMENTS/incurator-artist-os"
    export INCURATOR_APP_REPO="/Users/francoabaroa/Documents/Repos/career/incurator/incurator-app"

Run baseline validation in both repos before making any changes.

    cd "$ARTIST_OS_REPO"
    pnpm test
    pnpm tsc --noEmit

    cd "$INCURATOR_APP_REPO"
    pnpm test
    pnpm tsc --noEmit

Implement Milestone 1 in incurator-app. Start by reading existing auth and tool patterns.

    cd "$INCURATOR_APP_REPO"
    rg -n "withUsageCheck|getUser|checkUsage|incrementUsage" lib/auth/ lib/usage.ts

Create the three auth files, then the three route files, then update middleware. Run focused tests.

    pnpm test -- --runInBand
    pnpm tsc --noEmit

Implement Milestones 2 and 3 in incurator-artist-os. Start by reading the current runner and agent files.

    cd "$ARTIST_OS_REPO"
    rg -n "query\(|tools:|Session Instructions|PROMPT_B64" workspace-template/.incurator/runner.ts src/lib/artist-os/agent.ts

Create `incurator-tools.ts`, update `runner.ts`, update `agent.ts`, update `validation.ts`, update `query/route.ts`.

    pnpm test
    pnpm tsc --noEmit

Implement Milestone 4 skill updates.

    cd "$ARTIST_OS_REPO"
    # Read current skill files to understand their structure before editing
    head -60 workspace-template/.claude/skills/music-production/SKILL.md
    head -60 workspace-template/.claude/skills/bio-writing/SKILL.md
    head -60 workspace-template/.claude/skills/press-release/SKILL.md

Run full validation before completion.

    cd "$INCURATOR_APP_REPO"
    pnpm test
    pnpm tsc --noEmit
    pnpm lint

    cd "$ARTIST_OS_REPO"
    pnpm test:all
    pnpm tsc --noEmit
    pnpm lint

Manual end-to-end validation with both dev servers running on different ports.

    # Terminal 1: Start incurator-app on port 3001
    cd "$INCURATOR_APP_REPO"
    pnpm dev -- -p 3001

    # Terminal 2: Start artist-os on port 3000 with API URL pointing to incurator-app
    cd "$ARTIST_OS_REPO"
    INCURATOR_API_URL=http://localhost:3001 pnpm dev

    # Terminal 3: Test text tool
    curl -X POST http://localhost:3000/api/artist-os/query \
      -H "Content-Type: application/json" \
      -H "x-user-id: user_test123" \
      -d '{"artist_id":"test_001","prompt":"Write me a professional bio and save it to brand/bio.md","session_mode":"artist_ops"}' \
      --no-buffer

    # Terminal 3: Test mastering (requires an audio file in the workspace)
    curl -X POST http://localhost:3000/api/artist-os/query \
      -H "Content-Type: application/json" \
      -H "x-user-id: user_test123" \
      -d '{"artist_id":"test_001","prompt":"Master the track at releases/demo.wav and save to releases/demo-mastered.wav","session_mode":"artist_ops"}' \
      --no-buffer

Open `http://localhost:3000/artist-os-console` in a browser for the interactive test. Both text and audio tasks should produce real results.


## Validation and Acceptance

Acceptance is behavioral and must be demonstrated end-to-end.

**Behavior 1: Agent-backed text tool execution.** Given a valid Artist OS request in `artist_ops` mode, when the user asks for a bio, then the run uses the `incurator_generate_bio` MCP tool, the tool calls the incurator-app agent route, the response contains a real generated bio (not model-hallucinated text), and the bio is saved to the specified workspace file path. The SSE stream includes evidence of the MCP tool call.

**Behavior 2: Agent-backed mastering execution.** Given an audio file exists in the workspace, when the user asks for mastering, then the run reads the local file, uploads it via the agent upload route, calls the mastering route, downloads the result, and saves a mastered file to the workspace. The response includes the output file path. No provider secret (MATCHER_API_TOKEN, REPLICATE_API_TOKEN) appears in any log or response visible to the sandbox.

**Behavior 3: Session mode behavior.** Given `session_mode=artist_ops`, the session responds to the user's immediate request and uses tools as needed, instead of forcing feature checklist progression from `features.json`. Given `session_mode=feature_flow`, the session reverts to the original one-feature-at-a-time behavior. The default mode for API requests is `artist_ops`.

**Behavior 4: Regression safety.** All existing `/api/tools/*` flows in incurator-app continue to work unchanged (verified by existing tests passing). All existing Artist OS routes (`/api/artist-os/query`, `/stop`, `/snapshot`) remain backward compatible. Sessions without `INCURATOR_API_URL` set gracefully skip MCP tool registration and operate with existing built-in tools only.

**Behavior 5: MVP auth behavior (Clerk-independent).** Agent routes accept valid service-token calls even when the caller is not registered in Clerk. Missing/invalid service token still fails with 401. No route should 404 solely due to missing Clerk user mapping in MVP.

**Behavior 6: Error resilience.** When the incurator-app is unreachable or returns an error, the MCP tool handler returns a structured error result (not a crash), and the model can inform the user about the failure and suggest next steps. When the mastering upload succeeds but mastering itself fails, the error result notes this clearly.

**Testing gates that must all pass before this plan is complete:**

- All existing tests in both repos continue to pass.
- New tests for `agentServiceAuth`, `resolveAgentActor`, `withAgentServiceAuth`, and all three agent routes in incurator-app.
- New or updated tests for MCP tool registration, mode-conditional system instructions, and env propagation in incurator-artist-os.
- `pnpm tsc --noEmit` passes in both repos with zero errors.
- `pnpm lint` passes in both repos.
- At least one successful end-to-end run of each pilot tool, with SSE logs captured as evidence.


## Idempotence and Recovery

All steps in this plan are additive and safe to re-run.

If route implementation fails mid-way in incurator-app, the `/api/agent/*` additions can be disabled or removed without affecting any existing `/api/tools/*` route. No database schema migrations are required for this phase as scoped here (upload is not separately metered); the agent auth layer reuses existing user and team tables.

If MCP tool wiring fails in Artist OS, the runner gracefully degrades: when `INCURATOR_API_URL` is not set or `createIncuratorMcpTools()` throws, the `mcpServers` object remains empty and the runner operates with only its existing built-in tools. This is a controlled fallback, not a crash.

If the mastering flow fails after the upload step succeeds, the mastering agent route in incurator-app is responsible for cleaning up the temporary blob (same pattern as the existing proxy-matcher route). The MCP tool handler returns a structured error result that includes the step at which failure occurred.

If mode changes cause regressions, the default `session_mode` can be reverted to `feature_flow` by changing the default in `validation.ts` or by setting `SESSION_MODE=feature_flow` as an environment variable. The schema change is backward compatible: existing callers that do not send `session_mode` get the default.

If skill updates cause unexpected behavior (model ignores tools or over-uses them), the skill changes can be reverted independently. The MCP tools function regardless of skill content; skills only influence when the model chooses to use them.


## Artifacts and Notes

Expected successful SSE log sequence for a text tool run:

    event: status
    data: {"phase":"agent_run_start"}

    event: log
    data: {"stream":"stdout","chunk":"[{\"type\":\"text\",\"text\":\"I'll generate a professional bio for you.\"}]"}

    event: log
    data: {"stream":"stdout","chunk":"Using tool incurator_generate_bio..."}

    event: log
    data: {"stream":"stdout","chunk":"Bio generated and saved to brand/bio.md"}

    event: done
    data: {"ok":true,"exitCode":0}

Expected successful SSE log sequence for a mastering run:

    event: log
    data: {"stream":"stdout","chunk":"Uploading releases/demo.wav to agent upload endpoint..."}

    event: log
    data: {"stream":"stdout","chunk":"File uploaded, blob URL obtained. Calling mastering service..."}

    event: log
    data: {"stream":"stdout","chunk":"Mastering complete. Downloading result..."}

    event: log
    data: {"stream":"stdout","chunk":"Saved mastered output to releases/demo-mastered.wav"}

    event: done
    data: {"ok":true,"exitCode":0}

Expected error response from MCP tool when incurator-app is unreachable:

    {
      "ok": false,
      "error": {
        "code": "SERVICE_UNREACHABLE",
        "message": "Could not connect to Incurator API at http://localhost:3001. Is the server running?",
        "retryable": true
      }
    }

Keep these log snippets and actual test outputs in the final implementation PR description.


## Interfaces and Dependencies

**Dependencies already present in Artist OS and required by this plan:**

- `@anthropic-ai/claude-agent-sdk` (provides `createSdkMcpServer`, `tool`, `query`).
- `zod` (for MCP input schemas).
- `node:fs/promises` (for reading/writing workspace files in tool handlers).
- Existing Artist OS sandbox/snapshot/lock infrastructure (unchanged).

**Dependencies already present in Incurator app and reused:**

- Existing tool libraries under `lib/tools/**` (bio generation logic, etc.).
- Existing usage framework: `lib/usage.ts` (`checkUsage`, `incrementUsage`), `lib/config/limits.ts` (`PLAN_LIMITS`).
- Existing DB layer: `lib/db/queries.ts` (optional/future user lookup by `clerkUserId`; not required for MVP auth path).
- Existing blob storage: `@vercel/blob` (for temporary audio file hosting).
- Existing matcher service proxy pattern from `app/api/proxy-matcher/route.ts`.

**Dependencies intentionally deferred for phase one:**

- Anthropic Advanced Tool Use beta features (`advanced-tool-use-2025-11-20` header): Tool Search Tool, Programmatic Tool Calling, Tool Use Examples. These are configured at the Messages API/tool-definition layer and are not first-class Agent SDK options in the current runtime.
- Native SDK skill loading (`settingSources: ["project"]`). The manual approach gives us better control.
- External MCP servers for remote tool discovery.
- Clerk-backed identity mapping in Artist OS and incurator-app agent routes (deferred; MVP uses service token + opaque actor headers).

**New environment variables required in incurator-artist-os `.env.local`:**

- `INCURATOR_API_URL` — URL of the incurator-app instance (e.g. `http://localhost:3001` for local dev, `https://incurator.app` for production).
- `ARTIST_OS_SERVICE_TOKEN` — Shared service token matching the value in incurator-app.

**New environment variable required in incurator-app `.env.local`:**

- `ARTIST_OS_SERVICE_TOKEN` — Shared service token for authenticating agent API calls.

**Service auth contract for `/api/agent/*` routes:**

- Header `Authorization: Bearer <ARTIST_OS_SERVICE_TOKEN>` is required on every request.
- Header `x-agent-artist-id` is required for traceability and downstream policy decisions.
- Header `x-agent-user-id` is optional in MVP (opaque caller identifier for observability).
- In Artist OS `/api/artist-os/query`, `x-user-id` (or bearer identity) is used as request identity and forwarded as `x-agent-user-id`.

**MCP tool interfaces (stable names and shapes):**

`incurator_generate_bio`:
- Input: `{ style: "professional"|"casual"|"press"|"social", length?: "short"|"medium"|"long", outputPath: string }`.
- Output on success: `{ ok: true, bio: string, savedTo: string }`.
- Output on error: `{ ok: false, error: { code: string, message: string, retryable: boolean } }`.

`incurator_master_track`:
- Input: `{ inputPath: string, outputPath: string, format?: "wav"|"mp3"|"flac", bitDepths?: number[] }`.
- Output on success: `{ ok: true, outputPath: string, format: string, duration?: number }`.
- Output on error: `{ ok: false, error: { code: string, message: string, retryable: boolean, failedAtStep?: string } }`.

**Response envelope for all agent API routes:**

    // Success
    { "ok": true, "data": { ... }, "requestId": "uuid" }

    // Error
    { "ok": false, "error": { "code": string, "message": string, "retryable"?: boolean }, "requestId": "uuid" }


---

**Revision Note (2026-02-13 03:30Z):** Comprehensive revision of the original execplan. Added: verified SDK type signatures for `createSdkMcpServer` and `tool`; concrete code patterns for auth middleware, MCP tool definitions, and runner wiring; detailed blob upload/download flow for mastering; session mode implementation specifics; skill update patterns with explicit tool references; expanded validation criteria including error resilience and usage tracking parity; complete environment variable documentation; decision to defer `settingSources` migration. Incorporated insights from Anthropic engineering blog resources on context engineering, skill authoring best practices, tool design principles, and long-running agent harnesses, as well as OpenAI Codex engineering posts on agent loops and harness engineering. Architecture decisions reaffirmed: MCP custom tools for remote execution, Skills for progressive-disclosure workflow guidance.

**Revision Note (2026-02-13 00:27Z):** Patch revision to remove implementation ambiguities discovered during review. Updated: advanced-tool-use wording to reflect current SDK capability boundaries (`betas` exists, but no first-class Tool Search/PTC config); standardized error envelope language to match the shared `{ ok, data/error, requestId }` contract; clarified `allowedTools` guidance (Context7-verified wildcard support exists, but phase-one recommendation stays explicit for tighter control); added try/catch fallback around MCP server initialization; clarified identity source (request identity comes from authenticated request context, not request body); corrected Artist OS curl examples to include required auth header; and clarified upload metering scope to avoid requiring a new `ToolKey` migration in phase one.

**Revision Note (2026-02-13 00:31Z):** MVP auth and repo-boundary clarification pass. Updated the plan to explicitly separate responsibilities by repository, label each milestone with owning repo(s), and make MVP auth behavior Clerk-independent on `/api/agent/*` routes. Replaced required Clerk-user resolution with service-token auth + actor headers, updated middleware/wrapper/test guidance accordingly, and adjusted acceptance criteria so missing Clerk registration does not block MVP requests.
