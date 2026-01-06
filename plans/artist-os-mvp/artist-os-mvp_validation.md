# Artist OS MVP Validation Plan

## Test Scenarios

1. New artist onboarding creates scaffold files and persists snapshot.
2. Subsequent session restores state and persists new changes.
3. Concurrent requests for the same artist return 409.
4. Invalid JSON writes are rejected and restored.
5. Guardrails block destructive shell commands.
6. Approval flow writes to marketing/approval.json instead of posting.
7. Immutable snapshots with KV pointers update correctly across runs.
8. Safe write semantics block overwrites and path traversal.
9. Audit trail records structured commits.
10. Progress handover updates progress/claude-progress.md and last-run.json.
11. Feature list updates only passes fields.
12. init.sh fails when workspace is corrupted.
13. Skills load progressively from SKILL.md.
14. One feature per session pattern is followed.
15. Auth returns 401 without user identity, 403 for invalid ownership.
16. Rate limiting returns 429 when limits exceeded.

## Test Scaffolding

- Unit tests for core utilities are in `__tests__/artist-os/`.
- SSE routing behavior is covered in `__tests__/artist-os/query-route.test.ts`.
- Safe write and validation checks live in `__tests__/artist-os/safe-fs.test.ts` and `__tests__/artist-os/validation.test.ts`.

## Acceptance Criteria

- `pnpm test` passes with all Artist OS unit tests.
- `/api/artist-os/query` streams status/log/done events end-to-end when sandbox and env are configured.
- Snapshot pointers (`snapshot:{artistId}:latest`) update to the most recent run.
