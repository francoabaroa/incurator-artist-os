# Artist OS API

## POST /api/artist-os/query

**Description:** Run an Artist OS session and stream progress via SSE.

**Headers:**
- `Content-Type: application/json`
- `x-user-id: <user_id>` (or `Authorization: Bearer <user_id>`)
- Optional: `x-incurator-user-id: <numeric_internal_user_id>` for app-backed tools such as mastering or remote bio generation
- Optional: `x-artist-ids: artist_a,artist_b` for explicit ownership checks

**Body:**

```
{
  "artist_id": "user_123_demo",
  "prompt": "What tasks are on my list?",
  "resume_session_id": "optional-session-id",
  "session_mode": "artist_ops"
}
```

`session_mode` options:
- `artist_ops` (default): prioritize the user's immediate request; text workflows are local-first and enabled backend tools are used when needed.
- `feature_flow`: enforce one-feature-at-a-time workflow from `features.json`.

For new sessions, omitting `session_mode` defaults to `artist_ops`. For resumed sessions, the server preserves the original mode automatically when session metadata is available. If that metadata is missing, the request is rejected with `400` so the session cannot resume unsafely. If you send a conflicting `session_mode` together with `resume_session_id`, the request is rejected with `400`.
If a resumed session already has a stored `x-incurator-user-id`, omitting the header reuses that value automatically. Supplying a different `x-incurator-user-id` on resume is rejected with `400`.

Without `x-incurator-user-id`, local workspace tools still work, but app-backed tools are not registered for the session.

**Responses:**

- `200 OK` with `text/event-stream`
- `401 Unauthorized` when user identity is missing
- `403 Forbidden` when the user does not own the artist
- `409 Conflict` when artist is locked
- `429 Too Many Requests` when rate limited

**Sample SSE stream:**

```
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

event: status
data: {"phase":"snapshot_export"}

event: done
data: {"ok":true,"exitCode":0,"sessionId":"session-abc123","sessionMode":"artist_ops","manifest":{"artist_id":"user_123_demo",...}}
```

The `sessionId` can be passed as `resume_session_id` in subsequent requests to continue the conversation with full context from the previous session.

## POST /api/artist-os/files/upload

**Description:** Upload an audio file into the artist workspace (under `releases/`) so the agent can process it in later runs (for example mastering).

**Headers:**
- `x-user-id: <user_id>` (or `Authorization: Bearer <user_id>`)
- Optional: `x-artist-ids: artist_a,artist_b` for explicit ownership checks

**Multipart form fields:**
- `artist_id` (required)
- `file` (required, WAV only for mastering workflows)
- `path` (optional, must be under `releases/`; default is `releases/<filename>`)

**Responses:**
- `200 OK` with `{ ok: true, data: { artist_id, path, size, type }, manifest }`
- `401 Unauthorized`
- `403 Forbidden`
- `409 Conflict` when artist lock is busy

## GET /api/artist-os/snapshot

**Description:** Admin inspection of latest snapshot pointers.

**Headers:**
- `x-admin-token: <ARTIST_OS_ADMIN_TOKEN>`

**Query:**
- `artist_id=<artist_id>`

**Response:**

```
{
  "latest": "snapshots/artist_123/workspace-...tar.gz",
  "manifest": "snapshots/artist_123/manifest-...json"
}
```

## DELETE /api/artist-os/snapshot

**Description:** Admin reset of snapshot pointers.

**Headers:**
- `x-admin-token: <ARTIST_OS_ADMIN_TOKEN>`

**Body:**

```
{ "artist_id": "artist_123" }
```

## POST /api/artist-os/stop

**Description:** Force-stop a sandbox by artist or sandbox id.

**Headers:**
- `x-admin-token: <ARTIST_OS_ADMIN_TOKEN>`

**Body:**

```
{ "artist_id": "artist_123" }
```

or

```
{ "sandbox_id": "sandbox_abc" }
```
