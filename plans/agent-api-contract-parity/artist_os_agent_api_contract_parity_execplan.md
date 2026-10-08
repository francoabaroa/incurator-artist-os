# Reach Parity With The Stable Incurator Agent API Contract

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document must be maintained in accordance with `PLANS.md` at the repository root.

## Purpose / Big Picture

After this change, Artist OS will stop guessing how the Incurator agent bridge works. Sessions that use backend tools will send the correct internal user header, call the versioned `v1` routes, initialize direct uploads instead of posting multipart blobs to the app, and treat mastering results as ZIP archives that must be unpacked before saving an audio file into the workspace.

The user-visible proof is straightforward. From the Artist OS console or API, an operator will provide the normal Artist OS auth user plus a separate numeric Incurator user id, upload a WAV into `releases/`, ask the agent to master it, and receive a real mastered WAV saved back into the workspace without any stale `blobUrl` or `fileUrl` assumptions. If the operator omits the Incurator user id or points `INCURATOR_API_URL` at an unreachable `localhost`, the system will fail early and truthfully instead of silently advertising tools that cannot work.

## Progress

- [x] (2026-03-09 17:29Z) Audited the current Artist OS bridge implementation, local docs, console UI, and tests against the new app-side `agent_api_contract_stabilization_execplan.md`.
- [x] (2026-03-09 17:29Z) Confirmed four parity gaps in this repo: stale upload transport, stale mastering request shape, ambiguous actor identity forwarding, and misleading WAV/MP3/FLAC mastering guidance.
- [x] (2026-03-09 17:29Z) Authored this self-contained Artist OS parity ExecPlan.
- [x] (2026-03-09 17:48Z) Began executing the plan, re-read `CLAUDE.md`, `PLANS.md`, the app-side stabilization ExecPlan, and the live Artist OS worktree to establish the real implementation state before editing.
- [x] (2026-03-09 18:05Z) Added separate `x-incurator-user-id` handling across auth parsing, query routing, session metadata persistence, console request state, history restore, and sandbox env propagation via `AGENT_INCURATOR_USER_ID`.
- [x] (2026-03-09 18:05Z) Replaced the stale bridge implementation with a `v1`-aware client that preflights `/api/agent/v1/capabilities`, sends canonical agent headers, uses upload-init plus direct Blob `PUT`, and routes remote bio generation through the same client.
- [x] (2026-03-09 18:05Z) Rewrote mastering around WAV-only inputs, ZIP archive download, single-WAV extraction, and deterministic `.zip` preservation on extraction failure.
- [x] (2026-03-09 18:05Z) Updated console copy, upload validation, docs, env comments, and parity tests so they all describe WAV-only mastering and sandbox-reachable `INCURATOR_API_URL` requirements consistently.
- [x] (2026-03-09 18:08Z) Ran the focused parity suite, then `pnpm test:all`, `pnpm typecheck`, and `pnpm lint`; all passed.
- [x] (2026-03-09 18:19Z) Performed browser verification of `/artist-os-console`, rebuilt the base snapshot twice to refresh workspace-template runtime dependencies, and ran live SSE mastering attempts against the local `incurator-app`.
- [ ] Manual live mastering success remains blocked by environment-specific runtime state outside this repo: a refreshed base snapshot was required, and the reachable app now enforces real artist ownership for `x-agent-incurator-user-id`, so a synthetic local artist id cannot complete mastering end to end without a valid app-side artist/user pairing.

## Surprises & Discoveries

- Observation: the current MCP bridge still implements the superseded multipart upload contract.
  Evidence: `workspace-template/.incurator/incurator-tools.ts` posts `FormData` to `api/agent/files/upload-audio`, expects `blobUrl`, then sends `fileUrl` into mastering.

- Observation: Artist OS currently forwards the Artist OS auth user directly into the app-side usage actor header slot.
  Evidence: `src/lib/artist-os/agent.ts` exports `AGENT_REQUEST_USER_ID`, and `workspace-template/.incurator/incurator-tools.ts` maps that value to `x-agent-user-id`. The app-side stabilized contract expects a separate numeric internal user id via `x-agent-incurator-user-id`.

- Observation: session resume metadata currently preserves only artist ownership and session mode, not the remote billing actor.
  Evidence: `src/lib/artist-os/session-metadata.ts` stores `artistId`, `sessionMode`, and `storedAt`, so a resumed session can lose the Incurator actor context even if the first turn had it.

- Observation: the console and upload route still promise that MP3 and FLAC files can be mastered, but the stabilized backend upload contract only accepts WAV input.
  Evidence: `src/app/artist-os-console/components/QueryForm.tsx` advertises “WAV, MP3, and FLAC”; `src/app/api/artist-os/files/upload/route.ts` accepts `.wav`, `.mp3`, and `.flac`; the app-side upload route only allows WAV content types.

- Observation: this workspace path contains a literal `*`, which can break some Vite/Vitest config-loading flows in local validation.
  Evidence: prior local validation needed a symlink or copy without `*` in the path for Vitest to run reliably.

- Observation: the current worktree is already partially migrated, but the implementation and the tests still disagree about which contract is real.
  Evidence: new files such as `__tests__/artist-os/session-metadata.test.ts` and `__tests__/artist-os/runner-config.test.ts` exist, while `src/app/api/artist-os/query/route.ts`, `src/lib/artist-os/agent.ts`, `src/app/artist-os-console/components/QueryForm.tsx`, and `workspace-template/.incurator/incurator-tools.ts` still retain old identity or transport behavior.

- Observation: updating `.incurator` code is not enough for live validation; the base snapshot must be rebuilt, and new runtime dependencies must be declared inside `workspace-template/.incurator/package.json`, not only at the repo root.
  Evidence: the first live SSE run exposed missing remote tools until the base snapshot was rebuilt; the second run failed with `ERR_MODULE_NOT_FOUND` for `fflate` inside `/vercel/sandbox/workspace/.incurator/archive.ts` until the dependency was added to the workspace-template package manifest and the snapshot was rebuilt again.

- Observation: the local `incurator-app` instance now serves the expected `v1` capability manifest, but live mastering still requires a real app-side artist/user relationship.
  Evidence: a direct `POST /api/agent/v1/files/upload-audio` probe against `http://localhost:3001` returned `403 FORBIDDEN` with `x-agent-incurator-user-id does not belong to x-agent-artist-id` for a synthetic test pair, and the live SSE run invoked `mcp__incurator-tools__incurator_master_track` but could not complete mastering with synthetic ids.

## Decision Log

- Decision: keep Artist OS authentication and Incurator usage identity as two separate concepts.
  Rationale: `x-user-id` is how Artist OS authorizes who may operate on an artist workspace. The app-side bridge requires a numeric internal Incurator user id for usage tracking. Reusing one field for both concerns is the root of the current identity drift. Artist OS will accept a separate public header `x-incurator-user-id` and forward it to the app as `x-agent-incurator-user-id`.
  Date/Author: 2026-03-09 / Codex

- Decision: store the Incurator internal user id in session metadata and enforce consistency on resume.
  Rationale: if a session is resumed without the same remote actor, later tool calls can bill the wrong user or fail unexpectedly. This is the same class of problem that `session_mode` persistence already solves.
  Date/Author: 2026-03-09 / Codex

- Decision: target only the app-side `v1` surface from Artist OS and use the capability manifest as a contract preflight.
  Rationale: the app-side plan keeps legacy aliases only as a migration safety net. Leaving Artist OS on the old unversioned paths would preserve drift. The bridge client will call `/api/agent/v1/capabilities`, validate the returned contract, and then use only the versioned paths it advertises.
  Date/Author: 2026-03-09 / Codex

- Decision: keep the Artist OS mastering tool outcome-oriented even though the backend now returns a ZIP archive.
  Rationale: artists ask for a mastered track, not an archive transport artifact. The bridge will download the ZIP, extract the single WAV payload, and write that WAV to the requested `outputPath`. If extraction is ambiguous or invalid, the bridge will save the archive alongside the requested output path with a `.zip` suffix and return a structured error that explains what happened.
  Date/Author: 2026-03-09 / Codex

- Decision: narrow Artist OS mastering guidance to WAV-only until the app-side contract truthfully supports other input formats end to end.
  Rationale: the stabilized backend upload route accepts only WAV uploads. Continuing to advertise MP3/FLAC mastering in Artist OS would be knowingly false. The bridge may keep a user-friendly optional `bitDepths` input, but it will default to `["24"]` and it will not promise non-WAV mastering results.
  Date/Author: 2026-03-09 / Codex

- Decision: do not register remote MCP tools when the bridge is configured but the Incurator internal user id is absent.
  Rationale: advertising unusable tools causes the model to waste turns and obscures the real problem. The runner should instead inject a brief note explaining that backend tools are disabled until `x-incurator-user-id` is provided.
  Date/Author: 2026-03-09 / Codex

- Decision: add `fflate` in both the repo root and `workspace-template/.incurator/package.json`.
  Rationale: the root dependency is required for unit tests and local TypeScript resolution, while the workspace-template package manifest is what the base snapshot installer actually uses inside sandboxes. Only updating one location leaves either local tests or live sandbox runs broken.
  Date/Author: 2026-03-09 / Codex

## Outcomes & Retrospective

The Artist OS repo now matches the stabilized `v1` bridge contract in code, tests, console UX, and docs. Requests can carry a separate `x-incurator-user-id`, resumed sessions preserve that actor safely, remote tools register only when that actor is present, mastering uses upload-init plus direct upload plus ZIP extraction, and both focused and full validation suites passed (`pnpm test:all`, `pnpm typecheck`, `pnpm lint`).

Browser verification of `http://localhost:3000/artist-os-console` confirmed the new numeric Incurator user field, WAV-only upload copy, and a clean browser console. Live SSE validation also confirmed that the updated runner now exposes `mcp__incurator-tools__incurator_master_track` and that the agent selects it during a mastering request.

The only remaining gap is environment-specific, not code-specific: a successful live mastering completion needs an app-side artist id that truly belongs to the provided internal Incurator user id. Synthetic local ids are rejected by the reachable `incurator-app` instance with `403 FORBIDDEN`, so this ExecPlan is complete from the Artist OS side and only blocked from demonstrating a successful mastered WAV by missing valid cross-system test identities.

## Related Documents

- Repository guidance: `PLANS.md`
- Existing broad bridge plan: `plans/artist-os-tool-bridge/artist-os-tool-bridge_execplan.md`
- App-side stabilization plan: `/Users/francoabaroa/Documents/Repos/career/incurator/incurator-app/plans/agent-api-contract-stabilization/agent_api_contract_stabilization_execplan.md`
- Current local API docs: `docs/artist-os-api.md`
- Current local runbook: `docs/artist-os-runbook.md`

## Context and Orientation

Artist OS is the orchestration layer. A browser or API client calls `src/app/api/artist-os/query/route.ts`. That route authenticates the caller with `x-user-id`, checks artist ownership, creates or restores a sandbox, and then calls `runAgent()` in `src/lib/artist-os/agent.ts`. `runAgent()` launches `workspace-template/.incurator/runner.ts` inside the sandbox. The runner builds a system prompt, registers built-in tools plus optional Incurator MCP tools from `workspace-template/.incurator/runner-config.ts`, and the model performs work. The custom backend bridge lives in `workspace-template/.incurator/incurator-tools.ts`.

The local bridge currently contains stale assumptions. It still believes the app upload route accepts raw multipart bytes and returns `blobUrl`. It still sends the ambiguous `x-agent-user-id` header. It still treats mastering results as direct audio downloads rather than archives. The console and docs reinforce these assumptions by telling operators that MP3 and FLAC inputs can be mastered and by using the same `x-user-id` concept for both Artist OS auth and app-side billing identity.

The stabilized app-side contract is now different. `POST /api/agent/v1/capabilities` describes the canonical headers and route shapes. `POST /api/agent/v1/files/upload-audio` accepts JSON `{ filename, contentType, fileSizeBytes }` and returns `{ uploadUrl, clientToken, pathname, method, expiresAt }`. The caller must then upload bytes directly to Blob with the provided client token. `POST /api/agent/v1/tools/production/mastering` accepts `{ pathname, format, bitDepths }`, where `bitDepths` is a string array such as `["24"]`, and it returns a download URL for a ZIP archive containing WAV output. The canonical app-side actor header is `x-agent-incurator-user-id`, not `x-agent-user-id`.

In this plan, “Artist OS auth user” means the external user identity used by `getAuthUserId()` and `userOwnsArtist()`. In this plan, “Incurator internal user id” means the numeric internal user id required by the app-side usage wrappers. In this plan, “capability manifest” means the app-side JSON document at `/api/agent/v1/capabilities` that names the canonical routes, headers, and request or response semantics for the bridge. In this plan, “direct upload” means the second HTTP request that sends raw WAV bytes to the returned `uploadUrl` with `Authorization: Bearer <clientToken>` and `x-content-type: audio/wav`.

## Plan of Work

The first milestone is to separate identity concerns in Artist OS itself. Extend `src/lib/artist-os/auth.ts` with a dedicated helper such as `getIncuratorUserId(req)` that reads `x-incurator-user-id`, trims it, and accepts only digits. Keep `getAuthUserId()` exactly about Artist OS auth. Update `src/app/api/artist-os/query/route.ts` so it reads the optional Incurator user id from the request and passes it into the sandbox run separately from `userId`. Update `src/lib/artist-os/agent.ts` so `runAgent()` receives `incuratorUserId?: string` and exports it into the sandbox as `AGENT_INCURATOR_USER_ID` rather than overloading `AGENT_REQUEST_USER_ID`. Extend `src/lib/artist-os/session-metadata.ts` so metadata stores optional `incuratorUserId` alongside `artistId` and `sessionMode`, and replace the current mode-only resume helper with one that resolves both `sessionMode` and `incuratorUserId` for resumed sessions. If a resumed request supplies a different Incurator user id than the stored one, return `400` instead of silently switching actors.

The second milestone is to update the console and request types so operators can actually provide the new internal app actor. Add `incuratorUserId?: string` to `src/app/artist-os-console/lib/types.ts`, `src/app/artist-os-console/lib/history.ts`, `src/app/artist-os-console/hooks/use-sse-stream.ts`, and `src/app/artist-os-console/components/QueryForm.tsx`. The console should show a separate field labeled clearly as the numeric Incurator user id required for app-backed tools. The normal Artist OS auth user field remains unchanged. When a console run is resumed from history, the Incurator user id must be restored with the rest of the session context. The upload panel itself does not need the Incurator id because it only stages local workspace files, but its copy must stop claiming that MP3 and FLAC mastering are supported today.

The third milestone is to replace the stale bridge helper logic with a versioned client that understands the app contract. Create a focused helper module under `workspace-template/.incurator/`, for example `incurator-agent-client.ts`. This module should own the capability manifest schema, the canonical header mapping, and low-level HTTP helpers. It must fetch `/api/agent/v1/capabilities`, validate that the backend advertises the expected version and required capabilities, memoize the result for the lifetime of the runner process, and expose helpers like `initializeAudioUpload()`, `uploadAudioBytes()`, `runMastering()`, and `generateBio()`. `callAgentJson()` should move into this helper so `workspace-template/.incurator/incurator-tools.ts` no longer hardcodes route paths or ambiguous headers. The helper must send `x-agent-artist-id` and `x-agent-incurator-user-id`; it must not send `x-agent-user-id` except in an explicit fallback branch if the capability manifest itself reports that the canonical header is unavailable, which should be treated as an unsupported backend contract.

The fourth milestone is to rewrite the mastering MCP tool around the stabilized transport. Keep the existing high-level tool name `incurator_master_track`, but change its implementation. The tool should only accept WAV input under `releases/` and should default the app request to `format: "wav"` and `bitDepths: ["24"]` when the agent does not specify bit depths. First, it calls the versioned upload-init route with JSON metadata. Second, it uploads the raw WAV bytes directly to `uploadUrl` using `Authorization: Bearer <clientToken>` and `x-content-type: audio/wav`. Third, it calls the versioned mastering route with the returned `pathname`. Fourth, it downloads the resulting ZIP archive, extracts the single WAV file, and writes that WAV to the requested output path. If the archive contains zero WAV files, multiple WAV files, or invalid ZIP data, the tool must preserve the raw archive at a deterministic sibling path such as `<outputPath>.zip` and return a structured error with `failedAtStep: "extract_archive"`.

The fifth milestone is to align remote text tools and runtime registration behavior. Update `workspace-template/.incurator/runner-config.ts` so remote MCP tool registration depends on both bridge config presence and `AGENT_INCURATOR_USER_ID`. When bridge config exists but the internal user id is absent, do not register the remote tools and add a short session instruction that backend app tools are unavailable until the operator provides `x-incurator-user-id`. Update the optional remote bio tool to use the same versioned bridge client and canonical headers as mastering. This keeps the scope narrow: Artist OS still exposes only a curated subset of remote tools, but every enabled tool uses the same contract source.

The sixth milestone is to clean up local route validation, docs, and tests so they stop teaching the old contract. Update `src/app/api/artist-os/files/upload/route.ts`, its tests, the console upload copy, and `docs/artist-os-api.md` so mastering staging is described as WAV-only. Update `docs/artist-os-runbook.md` so the “Agent Tool Bridge (Local)” section no longer says `INCURATOR_API_URL=http://localhost:3001` without qualification. It must say that the URL must be reachable from the sandbox runtime and that local development may require a tunnel or another reachable host alias. The query route docs and examples must show both `x-user-id` and `x-incurator-user-id` when demonstrating app-backed tool usage.

## Concrete Steps

All commands below assume the repository root is `/Users/francoabaroa/Documents/Repos/career/incurator/*AGENTS_EXPERIMENTS/incurator-artist-os`.

Inspect the current local bridge files before editing:

    sed -n '1,220p' src/app/api/artist-os/query/route.ts
    sed -n '1,220p' src/lib/artist-os/agent.ts
    sed -n '1,240p' src/lib/artist-os/session-metadata.ts
    sed -n '1,260p' workspace-template/.incurator/runner-config.ts
    sed -n '1,360p' workspace-template/.incurator/incurator-tools.ts

Inspect the app-side target contract once before implementing:

    sed -n '1,220p' /Users/francoabaroa/Documents/Repos/career/incurator/incurator-app/plans/agent-api-contract-stabilization/agent_api_contract_stabilization_execplan.md
    sed -n '1,220p' /Users/francoabaroa/Documents/Repos/career/incurator/incurator-app/app/api/agent/files/upload-audio/route.ts
    sed -n '1,260p' /Users/francoabaroa/Documents/Repos/career/incurator/incurator-app/app/api/agent/tools/production/mastering/route.ts

If Vitest fails because of the literal `*` in this repo path, run validation through a temporary symlink without that character:

    ln -s "/Users/francoabaroa/Documents/Repos/career/incurator/*AGENTS_EXPERIMENTS/incurator-artist-os" /tmp/incurator-artist-os-parity
    cd /tmp/incurator-artist-os-parity

Run focused tests after each milestone:

    pnpm vitest run --configLoader=runner \
      __tests__/artist-os/agent.test.ts \
      __tests__/artist-os/query-route.test.ts \
      __tests__/artist-os/session-metadata.test.ts \
      __tests__/artist-os/upload-route.test.ts \
      __tests__/artist-os/runner-config.test.ts \
      __tests__/artist-os/incurator-tools.test.ts \
      __tests__/artist-os-console/history.test.ts

Expected outcome after the parity changes: the bridge tests assert `/api/agent/v1/...`, `pathname`, `clientToken`, `x-agent-incurator-user-id`, ZIP extraction behavior, and the new public `x-incurator-user-id` request plumbing.

Run the standard project gates after the focused tests pass:

    pnpm test
    pnpm typecheck
    pnpm lint

Expected outcome after the change: all three commands exit with status `0`. If Vitest still requires the symlink path, record that explicitly in `Outcomes & Retrospective`.

Start the app and Artist OS servers only after tests are green:

    cd /Users/francoabaroa/Documents/Repos/career/incurator/incurator-app
    pnpm dev

In another terminal:

    cd "/Users/francoabaroa/Documents/Repos/career/incurator/*AGENTS_EXPERIMENTS/incurator-artist-os"
    pnpm dev

Verify the app-side capabilities route manually with a real service token before the SSE run:

    curl -s "$INCURATOR_API_URL/api/agent/v1/capabilities" \
      -H "Authorization: Bearer $ARTIST_OS_SERVICE_TOKEN" | jq

The expected response must name `x-agent-incurator-user-id` as the canonical internal-user header and must describe mastering as a `pathname` plus ZIP/WAV flow.

Stage a WAV file locally:

    curl -X POST http://localhost:3000/api/artist-os/files/upload \
      -H "x-user-id: user_test123" \
      -F "artist_id=user_test123_artist" \
      -F "file=@/absolute/path/to/demo.wav" \
      -F "path=releases/demo.wav"

Run the manual SSE mastering flow with both identities:

    curl -X POST http://localhost:3000/api/artist-os/query \
      -H "Content-Type: application/json" \
      -H "x-user-id: user_test123" \
      -H "x-incurator-user-id: 123" \
      -H "x-artist-ids: user_test123_artist" \
      -d '{"artist_id":"user_test123_artist","prompt":"Master releases/demo.wav and save it to releases/demo-mastered.wav","session_mode":"artist_ops"}' \
      --no-buffer

Expected behavior after the change: the stream should show the mastering MCP tool being called, no `SERVICE_UNREACHABLE` or `INVALID_RESPONSE` error about `blobUrl`, and the snapshot manifest should include `releases/demo-mastered.wav`. If archive extraction fails, the stream should mention the saved archive path and the error code should identify `extract_archive`.

## Validation and Acceptance

Acceptance is behavioral.

First, Artist OS must preserve two distinct user concepts. When `/api/artist-os/query` is called with only `x-user-id`, local-only sessions still work, but app-backed tools are not registered and the session context explains why. When the same request also includes `x-incurator-user-id`, the sandbox receives a separate `AGENT_INCURATOR_USER_ID` and the bridge sends that value to the app as `x-agent-incurator-user-id`.

Second, the bridge must stop depending on stale transport assumptions. In the focused bridge tests, upload initialization must return `uploadUrl`, `clientToken`, and `pathname`; the bridge must perform a direct `PUT` upload with the client token; the mastering request body must contain `pathname`, `format: "wav"`, and string `bitDepths`; and no test may still assert `blobUrl` or `fileUrl`.

Third, mastering must remain artist-friendly. When the mocked backend returns a ZIP with one WAV file, `incurator_master_track` must extract that WAV and save it to the requested audio `outputPath`. When the mocked backend returns an invalid archive or an archive with an ambiguous layout, the tool must preserve the archive to a deterministic `.zip` path and return a structured error that tells the agent what happened.

Fourth, resume behavior must be safe. When a resumed session has stored `incuratorUserId` metadata and the new request omits the header, the stored value is reused. When the new request provides a different `x-incurator-user-id`, the server returns `400` instead of silently changing the remote billing actor.

Fifth, the docs and console must align with reality. The console must display a separate field for the numeric Incurator user id. The upload copy and API docs must describe WAV-only mastering. The runbook must warn that `INCURATOR_API_URL` must be reachable from the sandbox runtime rather than assuming `localhost` works.

## Idempotence and Recovery

Make the new bridge client and new session-context plumbing additive first. Add the separate Incurator user id path and the `v1` helpers before deleting the old `blobUrl` or `fileUrl` code paths. Once the focused tests are green, remove the stale branches and stale docs in the same pass so the repository does not keep two competing client contracts.

No database migration is required in this repo. Redis session metadata keys are safe to overwrite because the payload is already versionless JSON controlled by this service. If resume metadata changes cause unexpected failures during development, the safe recovery path is to delete the affected `artist-os:session:*` keys in Redis for test sessions and retry with a fresh session.

If archive extraction work introduces too much risk, the safe intermediate checkpoint is to preserve the ZIP download and fail explicitly with a structured “archive not yet extracted” error while tests are being updated. Do not ship that checkpoint as complete. The end state of this plan is WAV output in the workspace, not a leaked transport artifact.

## Artifacts and Notes

The canonical public request shape for an app-backed Artist OS run should look like this:

    curl -X POST http://localhost:3000/api/artist-os/query \
      -H "Content-Type: application/json" \
      -H "x-user-id: user_test123" \
      -H "x-incurator-user-id: 123" \
      -H "x-artist-ids: user_test123_artist" \
      -d '{"artist_id":"user_test123_artist","prompt":"Master releases/demo.wav and save it to releases/demo-mastered.wav","session_mode":"artist_ops"}'

The canonical app upload-init response that the bridge must consume looks like this:

    {
      "ok": true,
      "data": {
        "uploadUrl": "https://blob.vercel-storage.com/?pathname=agent-audio/artist_123/request/demo.wav",
        "clientToken": "vercel_blob_client_...",
        "pathname": "agent-audio/artist_123/request/demo.wav",
        "method": "PUT",
        "expiresAt": "2026-03-09T..."
      },
      "requestId": "req_123"
    }

The direct Blob upload request must use the returned client token and WAV content type:

    PUT <uploadUrl>
    Authorization: Bearer <clientToken>
    x-content-type: audio/wav
    <raw wav bytes>

The canonical mastering success response that the bridge must translate into a workspace WAV looks like this:

    {
      "ok": true,
      "data": {
        "resultUrl": "https://cdn.example.com/mastered.zip",
        "archiveFormat": "zip",
        "containedAudioFormat": "wav",
        "duration": 180
      },
      "requestId": "req_456"
    }

## Interfaces and Dependencies

Use the libraries already present in this repository unless ZIP extraction proves impossible without a helper. If a ZIP helper is needed, add one lightweight library such as `fflate` and keep its use isolated to a small archive helper module under `workspace-template/.incurator/`. Do not shell out to `unzip` or another host binary, because sandbox tool availability is less predictable than a direct Node.js dependency.

Keep the public Artist OS auth interface small. `getAuthUserId()` remains the ownership and rate-limit user. `getIncuratorUserId()` is new and only concerns backend app tools. `runAgent()` must carry both values separately. `createIncuratorMcpConfig()` must remain the single place that decides whether remote tools are registered.

The bridge client should own the versioned contract knowledge. `workspace-template/.incurator/incurator-tools.ts` should stay focused on workspace-level behavior: reading files, validating paths, writing outputs, and translating backend results into artist-friendly artifacts. Route paths, capability manifest parsing, canonical agent headers, and direct-upload mechanics should live in the dedicated client helper instead of being scattered across each tool implementation.
