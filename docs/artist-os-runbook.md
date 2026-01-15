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

The follow-up response will have full context from the previous conversation.

## Artist OS Console (Dev)

Run the web console for end-to-end testing:

1. Start the dev server: `pnpm dev`
2. Open `http://localhost:3000/artist-os-console`
3. Enter a user ID, artist ID, and prompt, then click **Start Session**
4. Watch the timeline and logs stream in real time
5. Open the debug drawer to run admin actions (requires `ARTIST_OS_ADMIN_TOKEN`)

The console auto-fills `x-artist-ids` with the artist ID by default. Uncheck the option to test ownership mismatches.
