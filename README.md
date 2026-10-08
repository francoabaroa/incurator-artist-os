# Incurator Artist OS

Artist OS runs a Claude agent in a Vercel Sandbox and saves each artist's workspace as a Vercel Blob snapshot. A developer console streams progress, displays generated documents and structured UI, resumes sessions, and uploads WAV files for mastering workflows.

This repository contains the standalone Artist OS experiment: a Next.js app and its sandbox agent template. The Incurator backend is a separate service used by optional remote tools.

## Local setup

Use Node.js 22 and pnpm 10.19.0, the package-manager version pinned in `package.json`.

```bash
pnpm install --frozen-lockfile
```

If `.env.local` does not already exist, copy `.env.example` to it. Replace the placeholders with development credentials; environment files are ignored by Git. Next.js loads `.env.local` automatically.

| Variable | Purpose |
| --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Read and write workspace snapshots |
| `REDIS_URL` | Artist locks, rate limits, snapshot pointers, and session metadata |
| `ANTHROPIC_API_KEY` | Run the Claude agent |
| `ARTIST_OS_ADMIN_TOKEN` | Protect snapshot inspection/reset and sandbox stop endpoints |

Sandbox creation also requires Vercel authentication. The installed SDK supports `VERCEL_OIDC_TOKEN`; use credentials for the intended development project. The four variables above alone do not authenticate Sandbox creation.

```bash
pnpm dev
```

Open [the developer console](http://localhost:3000/artist-os-console). Rendering the console does not require running an agent. Submitting a query or upload uses the configured Redis, Blob, and Sandbox services; agent execution also uses Anthropic.

### Base workspace snapshot

Before the first agent run, the configured Blob store must contain `snapshots/base/workspace-base.tar.gz`. To create or refresh it, run this from the repository root with development credentials in `.env.local`:

```bash
pnpm dlx tsx --env-file=.env.local scripts/build-base-snapshot.ts
```

This is an external operation: it creates a sandbox, installs the harness dependencies, and **overwrites the shared base snapshot** in the configured Blob store. Rebuild intentionally after changes to `workspace-template/` so future sessions receive the updated runner and skills. It is not part of the local build or test suite.

### Optional Incurator tools

To enable mastering through the separate Incurator backend, configure `INCURATOR_API_URL` and a matching `ARTIST_OS_SERVICE_TOKEN` in both services. The URL must be reachable from the sandbox; `localhost` on your computer is not the sandbox's localhost.

Requests using backend tools need `x-incurator-user-id`, the numeric internal Incurator user ID. Remote text generation is opt-in via `ARTIST_OS_ENABLE_REMOTE_TEXT_TOOLS=true`; text workflows are local-first by default. See the [tool bridge runbook](docs/artist-os-runbook.md#agent-tool-bridge-local).

## API and session flow

A query validates its input and identity headers, resolves session metadata, checks rate limits, and locks the artist. It then restores the base and artist snapshots, runs the agent, streams status/log events, saves a new snapshot, and releases resources.

```bash
curl -N http://localhost:3000/api/artist-os/query \
  -H 'Content-Type: application/json' \
  -H 'x-user-id: user_123' \
  -d '{"artist_id":"user_123_demo","prompt":"What is in my workspace?","session_mode":"artist_ops"}'
```

`artist_ops` is the default mode for artist requests. `feature_flow` follows the workspace's `features.json` checklist. To continue a session, pass the returned `sessionId` as `resume_session_id`; the server preserves its mode and checks stored artist/backend-actor metadata.

| Endpoint | Purpose |
| --- | --- |
| `POST /api/artist-os/query` | Run or resume a session; stream SSE events |
| `POST /api/artist-os/files/upload` | Upload a WAV file under `releases/` (up to 100 MiB; existing files are rejected) |
| `GET /api/artist-os/snapshot` | Inspect latest snapshot pointers; admin-only |
| `DELETE /api/artist-os/snapshot` | Reset snapshot pointers; admin-only |
| `POST /api/artist-os/stop` | Stop a cached sandbox and release its lock; admin-only |

Full request formats and responses are in [the API reference](docs/artist-os-api.md).

## Development checks

```bash
pnpm test:all
pnpm tsc --noEmit
pnpm lint
pnpm build
```

`pnpm test` and `pnpm test:all` currently run the same Vitest suite, including `.test.ts` and `.test.tsx` files. The tests mock remote integrations; passing them does not verify a live sandbox or backend deployment. Use `pnpm test:watch` during development and `pnpm test:coverage` for coverage.

The production build downloads Geist fonts from Google Fonts and needs network access. After building, use `pnpm start` to serve the production app locally.

The app typecheck excludes `workspace-template/`. The separate `pnpm typecheck:harness` command currently masks its known SDK type errors and is **not a passing release gate**; inspect its output when changing the harness.

## Repository map

| Path | Contents |
| --- | --- |
| `src/app/api/artist-os/` | Query, upload, snapshot, and stop routes |
| `src/app/artist-os-console/` | Console, SSE handling, prompt history, and JSON rendering |
| `src/lib/artist-os/` | Identity helpers, locking, rate limits, sessions, sandbox lifecycle, and snapshots |
| `workspace-template/.incurator/` | Agent runner, tools, schemas, file guards, and audit/manifest helpers |
| `workspace-template/.claude/skills/` | Artist workflow guidance included in the base snapshot |
| `scripts/build-base-snapshot.ts` | Publish the base workspace archive |
| `__tests__/` | App, console, and harness unit/regression tests |
| `docs/` and `plans/` | API/runbook documentation and implementation plans |

## Current boundaries

This is a development experiment, not a production authentication boundary. Query and upload routes trust caller-supplied identity/ownership headers; there is no verified login or authoritative ownership lookup in this repository. Snapshots are currently uploaded with public Blob access and can contain artist files and session state. Use non-sensitive development data until those boundaries are addressed.

Warm sandbox caches are process-local, so the admin stop endpoint cannot locate every sandbox across server instances. Snapshot retention, stronger filesystem confinement, bounded archive processing, and lifecycle hardening remain follow-up work. See [PLAN.md](PLAN.md) for the prioritized findings and completed quick wins.

Additional references: [runbook](docs/artist-os-runbook.md), [skill strategy](SKILLS_STRATEGY.md), and [ExecPlan format](PLANS.md).
