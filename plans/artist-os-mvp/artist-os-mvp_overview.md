# Artist OS MVP Overview

## Inventory

- API routes live under `src/app/api/artist-os/`:
  - `src/app/api/artist-os/query/route.ts` handles the SSE lifecycle.
  - `src/app/api/artist-os/snapshot/route.ts` provides admin snapshot inspection/reset.
  - `src/app/api/artist-os/stop/route.ts` force-stops sandboxes.
- Core orchestration utilities are under `src/lib/artist-os/`:
  - `src/lib/artist-os/lock.ts` for Redis-based artist locks.
  - `src/lib/artist-os/snapshot.ts` for Blob snapshot download/upload and KV pointers.
  - `src/lib/artist-os/sandbox.ts` for warm sandbox management.
  - `src/lib/artist-os/agent.ts` to run the sandbox runner.
  - `src/lib/artist-os/rate-limit.ts` and `src/lib/artist-os/auth.ts` for access control.
- Workspace template lives in `workspace-template/` and is copied into sandboxes by the base snapshot script.
- Base snapshot script lives at `scripts/build-base-snapshot.ts`.
- Tests live under `__tests__/artist-os/`.

## Data Flows

1. Client sends POST to `/api/artist-os/query` with artist_id and prompt.
2. API validates auth, rate limits, and acquires Redis lock.
3. API gets or creates a sandbox, restores base snapshot, then restores artist snapshot (if any).
4. API launches the runner inside the sandbox, streaming stdout/stderr via SSE.
5. API exports workspace tarball to Blob and updates KV pointers.
6. API releases lock and either keeps sandbox warm or stops on error.

## Business Context

Artist OS provides a persistent workspace and an autonomous agent to manage artist operations. The key user-visible behavior is that each query results in streamed progress updates and durable workspace changes that persist across sessions.

## Technical Risks

- Vercel Blob cache staleness is mitigated by immutable snapshot keys and Redis pointers.
- Redis connection failures will block locking, rate limiting, and snapshot pointers.
- Sandbox warm reuse is in-memory and may not persist across serverless cold starts.
- Claude API credentials must be available to the sandbox runner to operate.
