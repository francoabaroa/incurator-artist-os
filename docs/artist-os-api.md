# Artist OS API

## POST /api/artist-os/query

**Description:** Run an Artist OS session and stream progress via SSE.

**Headers:**
- `Content-Type: application/json`
- `x-user-id: <user_id>` (or `Authorization: Bearer <user_id>`)
- Optional: `x-artist-ids: artist_a,artist_b` for explicit ownership checks

**Body:**

```
{
  "artist_id": "user_123_demo",
  "prompt": "What tasks are on my list?",
  "resume_session_id": "optional-session-id"
}
```

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
data: {"ok":true,"exitCode":0,"sessionId":"session-abc123","manifest":{"artist_id":"user_123_demo",...}}
```

The `sessionId` can be passed as `resume_session_id` in subsequent requests to continue the conversation with full context from the previous session.

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
