# Artist OS Runbook

## Create a Base Snapshot

1. Ensure `BLOB_READ_WRITE_TOKEN` is set in `.env.local`.
2. Run:

```
npx tsx scripts/build-base-snapshot.ts
```

3. Verify Blob contains `snapshots/base/workspace-base.tar.gz`.

## Manually Stop a Sandbox

Call the stop endpoint with the admin token:

```
curl -X POST http://localhost:3000/api/artist-os/stop \
  -H "Content-Type: application/json" \
  -H "x-admin-token: <ARTIST_OS_ADMIN_TOKEN>" \
  -d '{"artist_id":"artist_123"}'
```

**Important limitation:** The stop endpoint only works for "warm" sandboxes cached in the current process's memory. In serverless deployments (Vercel), each function instance maintains its own sandbox cache. This means:

- If a sandbox is running in a different instance, `stopped: false` will be returned even though the sandbox exists.
- For stuck sandboxes not in the current instance's cache, rely on the sandbox timeout (default 15 minutes).
- The lock will auto-expire via TTL, allowing new requests to proceed.

For reliable sandbox termination across distributed deployments, consider:
- Using the Vercel Dashboard to view and terminate sandboxes.
- Implementing a Redis-based `artistId → sandboxId` mapping for cross-instance lookups (future enhancement).

## Inspect an Artist Workspace Snapshot

1. Fetch the latest snapshot pointer:

```
curl "http://localhost:3000/api/artist-os/snapshot?artist_id=artist_123" \
  -H "x-admin-token: <ARTIST_OS_ADMIN_TOKEN>"
```

2. Download the snapshot from Blob via the URL returned by Vercel Blob.

## Recover from a Corrupted Snapshot

1. Identify a previous snapshot key in Blob history.
2. Update the Redis pointer `snapshot:{artistId}:latest` to that key.
3. Optionally reset `snapshot:{artistId}:latest-manifest`.

## Snapshot Retention and Cleanup

Snapshots are immutable and accumulate over time. Consider a cleanup policy:

- Keep the latest N snapshots per artist.
- Delete older snapshots from Blob storage.
- Ensure Redis pointers reference valid keys.

## Security Note

Current Blob uploads use `access: public` due to SDK constraints. Treat snapshot URLs as sensitive and avoid sharing them outside trusted operators.

## Multi-Turn Sessions

The Artist OS supports multi-turn conversations by passing the session ID from a previous run.

**Important:** Session ID capture requires the runner code in the base snapshot. After updating `workspace-template/.incurator/runner.ts`, you must rebuild the base snapshot:

```
npx tsx scripts/build-base-snapshot.ts
```

This requires `BLOB_READ_WRITE_TOKEN` in your environment. See "Create a Base Snapshot" above.

### Step 1: Initial Request

Run an initial prompt and capture the session ID from the `done` event:

```
curl -X POST http://localhost:3000/api/artist-os/query \
  -H "Content-Type: application/json" \
  -H "x-user-id: demo_user" \
  -H "x-artist-ids: demo_user_artist" \
  -d '{"artist_id":"demo_user_artist","prompt":"List the files in my workspace."}' \
  --no-buffer 2>&1 | tee /tmp/run1.txt

# Extract sessionId from the done event
SESSION_ID=$(grep '^data:' /tmp/run1.txt | tail -1 | sed 's/^data: //' | jq -r '.sessionId')
echo "Session ID: $SESSION_ID"
```

### Step 2: Resume with Follow-up

Use the session ID to continue the conversation:

```
curl -X POST http://localhost:3000/api/artist-os/query \
  -H "Content-Type: application/json" \
  -H "x-user-id: demo_user" \
  -H "x-artist-ids: demo_user_artist" \
  -d "{\"artist_id\":\"demo_user_artist\",\"prompt\":\"Now describe what you found.\",\"resume_session_id\":\"$SESSION_ID\"}" \
  --no-buffer
```

When resuming, the log stream will include a line like:

```
Resuming session: session-abc123
```

The follow-up response will have full context from the previous conversation. When stored session metadata is available, the original `session_mode` is preserved automatically. If the metadata is missing or the request tries to change the stored backend actor, the resume is rejected with `400` instead of continuing unsafely.

## Artist OS Console (Dev)

Run the web console for end-to-end testing:

1. Start the dev server: `pnpm dev`
2. Open `http://localhost:3000/artist-os-console`
3. Enter a user ID, artist ID, and prompt, then click **Start Session**
4. Watch the timeline and logs stream in real time
5. Open the debug drawer to run admin actions (requires `ARTIST_OS_ADMIN_TOKEN`)

The console auto-fills `x-artist-ids` with the artist ID by default. Uncheck the option to test ownership mismatches.

The Message History also renders json-render fenced blocks into structured UI. Ask the agent to include a json-render fence in its response to see cards, tables, timelines, or checklists instead of raw JSON.

## Agent Tool Bridge (Local)

To enable backend tool execution from Artist OS sessions:

1. Configure both repos with the same `ARTIST_OS_SERVICE_TOKEN`.
2. Set `INCURATOR_API_URL` in `incurator-artist-os/.env.local` to a host that is reachable from the sandbox runtime. `http://localhost:3001` only works when the sandbox can actually reach that address; local development may require a tunnel or another reachable host alias.
3. By default, only backend processing tools (for example mastering) are enabled. Text tools remain local-first.
4. Optional: set `ARTIST_OS_ENABLE_REMOTE_TEXT_TOOLS=true` to enable remote text generation tools.
5. Start `incurator-app` on port 3001.
6. Start `incurator-artist-os` on port 3000.

App-backed tools also require the numeric internal Incurator user id on each run. Provide it with `x-incurator-user-id`. If you omit that header, the session still works, but mastering and other backend tools are intentionally disabled.

Test mastering flow via SSE after uploading audio to `releases/`:

```
curl -X POST http://localhost:3000/api/artist-os/query \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_test123" \
  -H "x-incurator-user-id: 123" \
  -d '{"artist_id":"user_test123_artist","prompt":"Master releases/track.wav and save to releases/track-mastered.wav","session_mode":"artist_ops"}' \
  --no-buffer
```

Optional remote bio generation test (only when `ARTIST_OS_ENABLE_REMOTE_TEXT_TOOLS=true`):

```
curl -X POST http://localhost:3000/api/artist-os/query \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_test123" \
  -H "x-incurator-user-id: 123" \
  -d '{"artist_id":"user_test123_artist","prompt":"Generate a professional bio and save it to brand/bio.md","session_mode":"artist_ops"}' \
  --no-buffer
```

Upload audio into workspace before mastering:

```
curl -X POST http://localhost:3000/api/artist-os/files/upload \
  -H "x-user-id: user_test123" \
  -F "artist_id=user_test123_artist" \
  -F "file=@/absolute/path/to/track.wav" \
  -F "path=releases/track.wav"
```
