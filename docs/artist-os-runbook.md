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
