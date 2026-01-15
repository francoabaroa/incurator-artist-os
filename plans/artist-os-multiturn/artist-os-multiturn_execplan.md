# Artist OS Multi-Turn Sessions (UI + CLI)

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document must be maintained in accordance with PLANS.md at the repository root.

## Purpose / Big Picture

After this change, a developer can run an Artist OS session, capture the session id emitted by the Claude Agent SDK, and continue the same conversation with follow-up prompts from both the console UI and the CLI. The console should surface the active session id, auto-fill it for follow-up prompts, and explain how to resume. The CLI should be able to run a first prompt, extract the session id from the SSE stream, and use it in a subsequent curl request. The behavior is observable by running the dev server, using the console at `/artist-os-console`, and seeing a follow-up prompt use the session id while the logs confirm the session was resumed.

## Progress

- [x] (2026-01-07 19:31Z) Authored initial ExecPlan for multi-turn session support.
- [x] (2026-01-07 19:45Z) Enhanced plan with verified file paths, accurate code context, detailed history hook update approach, and comprehensive validation steps.
- [x] (2026-01-07 20:07Z) Implemented session id capture in the sandbox runner, returned it from the API, and updated server-side types and tests.
- [x] (2026-01-07 20:08Z) Updated the console UI to surface session ids, auto-fill resume ids for follow-ups, and store session ids with history.
- [x] (2026-01-07 20:12Z) Updated docs and ran validation for UI and CLI resume flows.

## Surprises & Discoveries

- Existing `next dev` process held the `.next/dev/lock`, so `pnpm dev` could not start a new instance. UI validation used the already-running server on port 3000, which redirected `/artist-os-console` to `/sign-in`.
- Claude Agent SDK persists sessions under `~/.claude/projects` (configurable via `CLAUDE_CONFIG_DIR`), so resuming across cold sandboxes required persisting that directory inside the workspace snapshot.
- **Base snapshot rebuild required:** The runner.ts changes only take effect after rebuilding the base snapshot with `npx tsx scripts/build-base-snapshot.ts`. Until then, sessionId will be undefined in the done event because the sandbox uses the runner.ts from the blob-stored base snapshot, not the local file. This requires `BLOB_READ_WRITE_TOKEN`.

## Decision Log

- Decision: Expose the session id on the `done` SSE event as `sessionId` (camel case) and avoid a new API endpoint.
  Rationale: The existing SSE contract already returns `exitCode` and `manifest` in camel case, and emitting the session id there keeps the flow simple for UI and curl consumers.
  Date/Author: 2026-01-07 / Codex

- Decision: Capture the session id inside `workspace-template/.incurator/runner.ts` from the `system init` message and write it to `/vercel/sandbox/_agent_session.json`, then read it after the run completes and delete the file.
  Rationale: The session id is only available inside the sandbox process; writing an ephemeral file outside the workspace avoids parsing logs and prevents the id from persisting into the artist snapshot.
  Date/Author: 2026-01-07 / Codex

- Decision: Add a console-side "Use latest session" affordance instead of a multi-message chat UI.
  Rationale: The goal is multi-turn resume, not a full chat system, and the existing form already supports `resume_session_id` with minimal UI change.
  Date/Author: 2026-01-07 / Codex

- Decision: Add an `update` function to the history hook to associate returned sessionIds with history entries after runs complete.
  Rationale: The current `add()` is called before the run starts, so we need a way to update the entry with the sessionId returned in the `done` event. Storing the sessionId with the history entry enables "Resume this" functionality from history.
  Date/Author: 2026-01-07 / Codex

## Outcomes & Retrospective

- Captured Claude session IDs in the sandbox runner and exposed them through the API `done` SSE event.
- Console UI now displays session IDs, can auto-fill the latest ID for resume, and stores session IDs in history.
- Added history update helper and test coverage for session ID updates.
- Documented multi-turn resume flow in API docs and runbook.
- Added an explicit "Continue Session" CTA plus history resume selection that uses returned session IDs to make follow-ups obvious.

## Related Documents

- API reference to update: `docs/artist-os-api.md`
- Runbook usage to update: `docs/artist-os-runbook.md`

## Context and Orientation

### Key Terms

- **Session ID**: A unique identifier returned by the Claude Agent SDK that identifies a conversation context. Passing this ID when resuming allows Claude to continue with full context from prior exchanges.
- **SSE (Server-Sent Events)**: A streaming protocol where the server sends events to the client as text lines formatted as `event: name` and `data: json`, separated by blank lines.
- **Resume Session ID**: The session ID passed as input to resume a prior conversation (what the user provides).
- **Returned Session ID**: The session ID returned by the current run (what we capture and store).

### Current Architecture

The Artist OS query route is implemented in `src/app/api/artist-os/query/route.ts`. It accepts JSON with `artist_id`, `prompt`, and optional `resume_session_id`, then streams SSE events. The current events are `status`, `log`, `done`, and `error`. The `done` event data is typed as `DoneData` in `src/lib/artist-os/types.ts` and currently contains `ok`, `exitCode`, and `manifest` but no session id.

The sandbox runner lives in `workspace-template/.incurator/runner.ts`. It uses the Claude Agent SDK `query` function and iterates streaming messages. The SDK emits an initial system message with `type === "system"` and `subtype === "init"` that includes `session_id`. The runner currently does NOT capture this id—it processes `message.type === "assistant"` (for output) and `message.type === "result"` (for exit status). The runner already accepts `RESUME_SESSION_ID` from env (line 103) and passes it to `query({ options: { resume: resumeSessionId } })` (line 117), so resume already works when a valid session id is supplied.

The server-side agent orchestration is in `src/lib/artist-os/agent.ts`. The `runAgent` function currently returns `Promise<number>` (just exitCode). After the runner completes, there is no mechanism to retrieve the session id. We will write the session id to an ephemeral file in the sandbox and read it using the existing `readSandboxFile` helper from `src/lib/artist-os/snapshot.ts` (exported at line 97).

The console UI is under `src/app/artist-os-console/`. The form in `components/QueryForm.tsx` already includes a "Resume Session ID" field. SSE events are consumed by `hooks/use-sse-stream.ts`, which stores the full `DoneData` in `state.result`. The main page `page.tsx` wires the form, stream, and history together. Prompt history is stored in `localStorage` via `lib/history.ts` and `hooks/use-prompt-history.ts`.

### Key Files Summary

| File | Purpose |
|------|---------|
| `workspace-template/.incurator/runner.ts` | Sandbox-side runner that invokes Claude Agent SDK |
| `src/lib/artist-os/agent.ts` | Server-side orchestration, spawns runner in sandbox |
| `src/lib/artist-os/types.ts` | Type definitions including DoneData |
| `src/lib/artist-os/snapshot.ts` | Snapshot utilities including readSandboxFile |
| `src/app/api/artist-os/query/route.ts` | API route that streams SSE |
| `src/app/artist-os-console/page.tsx` | Console page wiring |
| `src/app/artist-os-console/lib/types.ts` | Console-side types including HistoryEntry |
| `src/app/artist-os-console/lib/history.ts` | History storage utilities |
| `src/app/artist-os-console/hooks/use-prompt-history.ts` | History React hook |
| `src/app/artist-os-console/hooks/use-sse-stream.ts` | SSE streaming hook (stores DoneData) |
| `src/app/artist-os-console/components/QueryForm.tsx` | Query form with resume field |
| `src/app/artist-os-console/components/ResultPanel.tsx` | Results display |
| `src/app/artist-os-console/components/DebugDrawer.tsx` | Debug drawer |
| `__tests__/artist-os/query-route.test.ts` | API route tests |

## Files to Modify

### Backend

1. `workspace-template/.incurator/runner.ts` — Capture session id from system init message, write to file, log when resuming
2. `src/lib/artist-os/agent.ts` — Change return type to `{ exitCode, sessionId }`, read session file after run
3. `src/lib/artist-os/types.ts` — Add `sessionId?: string` to `DoneData`
4. `src/app/api/artist-os/query/route.ts` — Destructure new return type, include sessionId in done event
5. `__tests__/artist-os/query-route.test.ts` — Update mock return value and assertions

### Console UI

6. `src/app/artist-os-console/lib/types.ts` — Add `sessionId?: string` to `HistoryEntry`
7. `src/app/artist-os-console/lib/history.ts` — Handle sessionId in parse/write, add updateEntry function
8. `src/app/artist-os-console/hooks/use-prompt-history.ts` — Add `update` function to modify existing entries
9. `src/app/artist-os-console/page.tsx` — Track last history entry id, update with sessionId on completion, pass latestSessionId to QueryForm
10. `src/app/artist-os-console/components/QueryForm.tsx` — Accept latestSessionId prop, add "Use Latest" button
11. `src/app/artist-os-console/components/ResultPanel.tsx` — Display returned session id
12. `src/app/artist-os-console/components/DebugDrawer.tsx` — Display input resume id and output session id
13. `src/app/artist-os-console/components/PromptHistory.tsx` — Display sessionId if present, optionally add "Resume this" quick action

### Documentation

14. `docs/artist-os-api.md` — Add sessionId to done event example
15. `docs/artist-os-runbook.md` — Add multi-turn curl examples

## Plan of Work

### Phase 1: Backend Session ID Capture

This phase modifies the sandbox runner to capture the session id from the Claude Agent SDK and makes it available to the API route.

#### Step 1.1: Update runner.ts to capture session id

The Claude Agent SDK emits a system init message at the start of the query. We need to detect this message and write the session id to a file outside the workspace directory.

In `workspace-template/.incurator/runner.ts`:

1. Find the for-await loop that iterates `response` (around line 345). Before the existing `if (message.type === "assistant")` check, add detection for the system init message:

```typescript
// Capture session id from system init message
if (message.type === "system" && "subtype" in message && message.subtype === "init") {
  const initMessage = message as { session_id?: string };
  if (initMessage.session_id) {
    const sessionData = JSON.stringify({
      sessionId: initMessage.session_id,
      createdAt: new Date().toISOString()
    });
    await fs.writeFile("/vercel/sandbox/_agent_session.json", sessionData, "utf-8");
  }
}
```

2. Find where `resumeSessionId` is checked (around line 103). After the check, add a log line:

```typescript
const resumeSessionId = process.env.RESUME_SESSION_ID || undefined;
if (resumeSessionId) {
  console.log(`Resuming session: ${resumeSessionId}`);
}
```

#### Step 1.2: Update agent.ts return type

In `src/lib/artist-os/agent.ts`:

1. Import `readSandboxFile` from `./snapshot`:

```typescript
import { readSandboxFile } from "./snapshot";
```

2. Change the function signature from:

```typescript
export async function runAgent(
  sandbox: Sandbox,
  prompt: string,
  resumeSessionId: string | undefined,
  onLog: (log: LogData) => void
): Promise<number> {
```

To:

```typescript
export async function runAgent(
  sandbox: Sandbox,
  prompt: string,
  resumeSessionId: string | undefined,
  onLog: (log: LogData) => void
): Promise<{ exitCode: number; sessionId?: string }> {
```

3. After `sandbox.runCommand` completes (around line 44), replace the `return result.exitCode ?? 0;` with:

```typescript
const exitCode = result.exitCode ?? 0;

// Read session id file if it exists
let sessionId: string | undefined;
try {
  const sessionFileBytes = await readSandboxFile(sandbox, "/vercel/sandbox/_agent_session.json");
  const sessionData = JSON.parse(sessionFileBytes.toString("utf-8"));
  sessionId = sessionData.sessionId;
  // Clean up the ephemeral file
  await sandbox.runCommand({ cmd: "rm", args: ["-f", "/vercel/sandbox/_agent_session.json"] });
} catch {
  // File may not exist if agent crashed before writing
  sessionId = undefined;
}

return { exitCode, sessionId };
```

#### Step 1.3: Update types.ts

In `src/lib/artist-os/types.ts`, add `sessionId` to the `DoneData` interface:

```typescript
export interface DoneData {
  ok: boolean;
  exitCode: number;
  sessionId?: string;
  manifest: SnapshotManifest;
}
```

#### Step 1.4: Update route.ts

In `src/app/api/artist-os/query/route.ts`:

1. Change the runAgent call (around line 80) from:

```typescript
const exitCode = await runAgent(
  sandbox,
  prompt,
  resume_session_id,
  (log: LogData) => send("log", log)
);
```

To:

```typescript
const { exitCode, sessionId } = await runAgent(
  sandbox,
  prompt,
  resume_session_id,
  (log: LogData) => send("log", log)
);
```

2. Change the done event (around line 87) from:

```typescript
send("done", { ok: true, exitCode, manifest });
```

To:

```typescript
send("done", { ok: true, exitCode, sessionId, manifest });
```

#### Step 1.5: Update tests

In `__tests__/artist-os/query-route.test.ts`:

1. Find the "streams SSE events on success" test (around line 110). Change:

```typescript
runAgent.mockResolvedValue(0);
```

To:

```typescript
runAgent.mockResolvedValue({ exitCode: 0, sessionId: "test-session-123" });
```

2. Add an assertion after verifying the response contains `event: done`:

```typescript
expect(text).toContain('"sessionId":"test-session-123"');
```

### Phase 2: Console UI Updates

This phase updates the console UI to display session ids and enable easy resume.

#### Step 2.1: Update console types

In `src/app/artist-os-console/lib/types.ts`, add `sessionId` to `HistoryEntry`:

```typescript
export interface HistoryEntry {
  id: string;
  timestamp: string;
  userId: string;
  artistId: string;
  prompt: string;
  resumeSessionId?: string;
  sessionId?: string;  // The session id returned by this run
}
```

#### Step 2.2: Update history utilities

In `src/app/artist-os-console/lib/history.ts`:

1. Update `toHistoryEntry` to handle the new `sessionId` field:

```typescript
return {
  id: record.id,
  timestamp: record.timestamp,
  userId: record.userId,
  artistId: record.artistId,
  prompt: record.prompt,
  resumeSessionId:
    typeof record.resumeSessionId === "string"
      ? record.resumeSessionId
      : undefined,
  sessionId:
    typeof record.sessionId === "string"
      ? record.sessionId
      : undefined,
};
```

2. Add a new `updateHistoryEntry` function:

```typescript
export function updateHistoryEntry(
  id: string,
  updates: Partial<Pick<HistoryEntry, "sessionId">>,
  storage?: Storage | null
): HistoryEntry[] {
  const current = readHistory(storage);
  const updated = current.map((entry) =>
    entry.id === id ? { ...entry, ...updates } : entry
  );
  writeHistory(updated, storage);
  return updated;
}
```

#### Step 2.3: Update history hook

In `src/app/artist-os-console/hooks/use-prompt-history.ts`:

1. Import `updateHistoryEntry`:

```typescript
import {
  clearHistory,
  readHistory,
  writeHistory,
  updateHistoryEntry,
  MAX_HISTORY_ENTRIES,
} from "../lib/history";
```

2. Modify the `add` function to return the entry id:

```typescript
const add = useCallback(
  (entry: Omit<HistoryEntry, "id" | "timestamp">): string => {
    const nextEntry: HistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    setEntries((current) => {
      const next = [nextEntry, ...current].slice(0, MAX_HISTORY_ENTRIES);
      writeHistory(next);
      return next;
    });

    return nextEntry.id;
  },
  []
);
```

3. Add an `update` function:

```typescript
const update = useCallback(
  (id: string, updates: Partial<Pick<HistoryEntry, "sessionId">>) => {
    setEntries((current) => {
      const updated = current.map((entry) =>
        entry.id === id ? { ...entry, ...updates } : entry
      );
      writeHistory(updated);
      return updated;
    });
  },
  []
);
```

4. Update the return statement:

```typescript
return { entries, add, update, clear };
```

#### Step 2.4: Update console page

In `src/app/artist-os-console/page.tsx`:

1. Add state to track the last history entry id:

```typescript
const [lastHistoryId, setLastHistoryId] = useState<string | null>(null);
```

2. Derive `latestSessionId` from run state:

```typescript
const latestSessionId = state.result?.sessionId;
```

3. Update `handleSubmit` to track the entry id:

```typescript
const handleSubmit = (params: ConsoleQueryParams) => {
  setLastRequest(params);
  const entryId = add({
    userId: params.userId,
    artistId: params.artistId,
    prompt: params.prompt,
    resumeSessionId: params.resumeSessionId,
  });
  setLastHistoryId(entryId);
  void start(params);
};
```

4. Add a `useEffect` to update history with sessionId when run completes:

```typescript
import { useState, useEffect, type CSSProperties } from "react";

// Add this after the existing useState calls:
useEffect(() => {
  if (
    lastHistoryId &&
    !state.isStreaming &&
    state.result?.sessionId
  ) {
    update(lastHistoryId, { sessionId: state.result.sessionId });
    setLastHistoryId(null);
  }
}, [lastHistoryId, state.isStreaming, state.result?.sessionId, update]);
```

5. Update the `usePromptHistory` destructuring:

```typescript
const { entries, add, update, clear } = usePromptHistory();
```

6. Pass `latestSessionId` to QueryForm:

```typescript
<QueryForm
  key={formSeed}
  initialValues={formDefaults}
  isStreaming={state.isStreaming}
  latestSessionId={latestSessionId}
  onStop={stop}
  onSubmit={handleSubmit}
/>
```

#### Step 2.5: Update QueryForm

In `src/app/artist-os-console/components/QueryForm.tsx`:

1. Add `latestSessionId` to the props interface:

```typescript
interface QueryFormProps {
  onSubmit: (params: ConsoleQueryParams) => void;
  onStop: () => void;
  isStreaming: boolean;
  initialValues?: Partial<ConsoleQueryParams>;
  latestSessionId?: string;
}
```

2. Destructure the new prop:

```typescript
export default function QueryForm({
  onSubmit,
  onStop,
  isStreaming,
  initialValues,
  latestSessionId,
}: QueryFormProps) {
```

3. Add a "Use Latest" button next to the resume session id input. Replace the resume field label block with:

```tsx
<div className="flex flex-col gap-2">
  <span className="text-xs uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
    Resume Session ID (optional)
  </span>
  <div className="flex gap-2">
    <input
      className="flex-1 rounded-lg border border-[var(--console-border)] bg-black/30 px-3 py-2 text-sm font-medium text-[var(--console-text)] outline-none transition focus:border-[var(--console-accent)]"
      disabled={isStreaming}
      onChange={(event) => setResumeSessionId(event.target.value)}
      placeholder="session_abc"
      value={resumeSessionId}
    />
    <button
      type="button"
      disabled={isStreaming || !latestSessionId}
      onClick={() => setResumeSessionId(latestSessionId ?? "")}
      className="rounded-lg border border-[var(--console-border)] bg-black/30 px-3 py-2 text-xs uppercase tracking-[0.2em] text-[var(--console-text-muted)] transition hover:text-[var(--console-text)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      Use Latest
    </button>
  </div>
</div>
```

#### Step 2.6: Update ResultPanel

In `src/app/artist-os-console/components/ResultPanel.tsx`, add a Session ID row to the dl grid (after the Checksum row):

```tsx
<div>
  <dt className="text-[10px] uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
    Session ID
  </dt>
  <dd className="mt-1 break-all font-mono text-xs text-[var(--console-text)]">
    {result.sessionId ?? "-"}
  </dd>
</div>
```

#### Step 2.7: Update DebugDrawer

In `src/app/artist-os-console/components/DebugDrawer.tsx`, add two rows to the Run Summary section (after Exit Code):

```tsx
<div>
  <span className="uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
    Resume ID (input)
  </span>
  <p className="mt-1 break-all font-mono text-[var(--console-text)]">
    {request?.resumeSessionId || "-"}
  </p>
</div>
<div>
  <span className="uppercase tracking-[0.2em] text-[var(--console-text-muted)]">
    Session ID (output)
  </span>
  <p className="mt-1 break-all font-mono text-[var(--console-text)]">
    {runState.result?.sessionId || "-"}
  </p>
</div>
```

#### Step 2.8: Update PromptHistory (optional enhancement)

In `src/app/artist-os-console/components/PromptHistory.tsx`, display the sessionId if present:

```tsx
{entry.sessionId ? (
  <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[var(--console-accent)]">
    Session: {entry.sessionId.slice(0, 20)}...
  </p>
) : null}
```

### Phase 3: Documentation

#### Step 3.1: Update API docs

In `docs/artist-os-api.md`, update the Sample SSE stream section to include sessionId:

```
event: done
data: {"ok":true,"exitCode":0,"sessionId":"session-abc123","manifest":{"artist_id":"user_123_demo",...}}
```

Add a note after the sample:

> The `sessionId` can be passed as `resume_session_id` in subsequent requests to continue the conversation with full context from the previous session.

#### Step 3.2: Update runbook

In `docs/artist-os-runbook.md`, add a new section "Multi-Turn Sessions":

```markdown
## Multi-Turn Sessions

The Artist OS supports multi-turn conversations by passing the session ID from a previous run.

### Step 1: Initial Request

Run an initial prompt and capture the session ID from the `done` event:

    curl -X POST http://localhost:3000/api/artist-os/query \
      -H "Content-Type: application/json" \
      -H "x-user-id: demo_user" \
      -H "x-artist-ids: demo_user_artist" \
      -d '{"artist_id":"demo_user_artist","prompt":"List the files in my workspace."}' \
      --no-buffer 2>&1 | tee /tmp/run1.txt

    # Extract sessionId from the done event
    SESSION_ID=$(grep '^data:' /tmp/run1.txt | tail -1 | sed 's/^data: //' | jq -r '.sessionId')
    echo "Session ID: $SESSION_ID"

### Step 2: Resume with Follow-up

Use the session ID to continue the conversation:

    curl -X POST http://localhost:3000/api/artist-os/query \
      -H "Content-Type: application/json" \
      -H "x-user-id: demo_user" \
      -H "x-artist-ids: demo_user_artist" \
      -d "{\"artist_id\":\"demo_user_artist\",\"prompt\":\"Now describe what you found.\",\"resume_session_id\":\"$SESSION_ID\"}" \
      --no-buffer

When resuming, the log stream will include a line like:

    Resuming session: session-abc123

The follow-up response will have full context from the previous conversation.
```

## Concrete Steps

From the repository root, run the following commands in order.

### Backend Changes

    # Step 1: Apply runner.ts changes
    # Edit workspace-template/.incurator/runner.ts as described in Phase 1, Step 1.1

    # Step 2: Apply agent.ts changes
    # Edit src/lib/artist-os/agent.ts as described in Phase 1, Step 1.2

    # Step 3: Apply types.ts changes
    # Edit src/lib/artist-os/types.ts as described in Phase 1, Step 1.3

    # Step 4: Apply route.ts changes
    # Edit src/app/api/artist-os/query/route.ts as described in Phase 1, Step 1.4

    # Step 5: Apply test changes
    # Edit __tests__/artist-os/query-route.test.ts as described in Phase 1, Step 1.5

    # Verify backend changes compile
    pnpm tsc --noEmit

    # Run tests
    pnpm test

### Console UI Changes

    # Steps 6-13: Apply UI changes as described in Phase 2
    # Edit files in src/app/artist-os-console/

    # Verify UI changes compile
    pnpm tsc --noEmit

    # Run all tests
    pnpm test

### Documentation Changes

    # Steps 14-15: Update docs as described in Phase 3
    # Edit docs/artist-os-api.md and docs/artist-os-runbook.md

### Final Validation

    pnpm lint
    pnpm test
    pnpm dev

## Validation and Acceptance

### UI Validation

1. Start the dev server: `pnpm dev`
2. Open `http://localhost:3000/artist-os-console`
3. Run an initial prompt with valid user and artist ids
4. Verify the Results panel shows "Session ID" with a value
5. Verify the history entry shows a truncated session id
6. Click "Use Latest" button and verify the resume field populates
7. Submit a follow-up prompt referencing prior context (e.g., "What did we just discuss?")
8. Verify the logs include "Resuming session: <id>"
9. Verify the run completes with a new snapshot manifest
10. Open the debug drawer and verify:
    - "Resume ID (input)" shows the session id from the previous run
    - "Session ID (output)" shows the new session id

### CLI Validation

First request (save output):

    curl -X POST http://localhost:3000/api/artist-os/query \
      -H "Content-Type: application/json" \
      -H "x-user-id: demo_user" \
      -H "x-artist-ids: demo_user_artist" \
      -d '{"artist_id":"demo_user_artist","prompt":"List the top-level folders."}' \
      --no-buffer 2>&1 | tee /tmp/run1.txt

Extract session id:

    SESSION_ID=$(grep '^data:' /tmp/run1.txt | tail -1 | sed 's/^data: //' | jq -r '.sessionId')
    echo "Session ID: $SESSION_ID"

Resume request:

    curl -X POST http://localhost:3000/api/artist-os/query \
      -H "Content-Type: application/json" \
      -H "x-user-id: demo_user" \
      -H "x-artist-ids: demo_user_artist" \
      -d "{\"artist_id\":\"demo_user_artist\",\"prompt\":\"Now describe them.\",\"resume_session_id\":\"$SESSION_ID\"}" \
      --no-buffer

Verify the log stream contains "Resuming session: <id>".

### Automated Tests

Run `pnpm test` and verify all tests pass. The updated test should assert that the done event includes `sessionId`.

## Idempotence and Recovery

All changes are additive. If the sandbox session file does not exist or cannot be parsed, the server sets `sessionId` to `undefined` and continues without error. The `/vercel/sandbox/_agent_session.json` file is deleted after each read, so repeated runs do not reuse stale data. The file is written outside the workspace directory (`/vercel/sandbox/` not `/vercel/sandbox/workspace/`), so it will not be captured in artist snapshots.

If a step fails mid-way, revert only the specific file and re-run the commands. No destructive migrations are involved.

## Artifacts and Notes

### Example done event with session id

    event: done
    data: {"ok":true,"exitCode":0,"sessionId":"session-xyz","manifest":{"artist_id":"demo_user_artist",...}}

### Example resume log line emitted by runner

    Resuming session: session-xyz

### Example session file written in sandbox

    {"sessionId":"session-abc123","createdAt":"2026-01-07T19:31:00.000Z"}

### HistoryEntry with sessionId

    {
      "id": "uuid-1234",
      "timestamp": "2026-01-07T19:31:00.000Z",
      "userId": "demo_user",
      "artistId": "demo_user_artist",
      "prompt": "List the files",
      "sessionId": "session-abc123"
    }

## Interfaces and Dependencies

Use the existing Claude Agent SDK already in `workspace-template/.incurator/runner.ts`. No new npm packages are required.

### Backend Interfaces

After implementation, these should be the resulting interfaces:

**`src/lib/artist-os/types.ts`**:

```typescript
export interface DoneData {
  ok: boolean;
  exitCode: number;
  sessionId?: string;
  manifest: SnapshotManifest;
}
```

**`src/lib/artist-os/agent.ts`**:

```typescript
export async function runAgent(
  sandbox: Sandbox,
  prompt: string,
  resumeSessionId: string | undefined,
  onLog: (log: LogData) => void
): Promise<{ exitCode: number; sessionId?: string }>
```

**`workspace-template/.incurator/runner.ts`**:
- Captures `message.session_id` from the `system/init` message
- Writes `{ sessionId, createdAt }` to `/vercel/sandbox/_agent_session.json`
- Logs "Resuming session: <id>" when `RESUME_SESSION_ID` is set

### Console Interfaces

**`src/app/artist-os-console/lib/types.ts`**:

```typescript
export interface HistoryEntry {
  id: string;
  timestamp: string;
  userId: string;
  artistId: string;
  prompt: string;
  resumeSessionId?: string;
  sessionId?: string;
}
```

**`src/app/artist-os-console/hooks/use-prompt-history.ts`**:

```typescript
function usePromptHistory(): {
  entries: HistoryEntry[];
  add: (entry: Omit<HistoryEntry, "id" | "timestamp">) => string;
  update: (id: string, updates: Partial<Pick<HistoryEntry, "sessionId">>) => void;
  clear: () => void;
}
```

**`src/app/artist-os-console/components/QueryForm.tsx`**:
- Props include `latestSessionId?: string`
- "Use Latest" button populates resume field

**`src/app/artist-os-console/components/ResultPanel.tsx`**:
- Displays `result.sessionId`

**`src/app/artist-os-console/components/DebugDrawer.tsx`**:
- Shows "Resume ID (input)" from request
- Shows "Session ID (output)" from result

---

**Change Notes:**

- 2026-01-07: Initial plan created to add multi-turn session support with session id capture, UI resume affordances, and CLI documentation.
- 2026-01-07: Enhanced plan with verified file paths and code context from actual codebase inspection. Added detailed history hook update approach with `update` function. Clarified input vs output session id terminology. Added comprehensive UI component updates. Added CLI extraction examples. Added HistoryEntry example artifact. Fixed line number references to be contextual rather than exact. Added useEffect pattern for updating history after run completes. Added pnpm tsc verification steps.
