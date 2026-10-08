# Verified quick wins

## Scope and survey

This checkout is a small Next.js 16.1.1 / React 19.2.3 Artist OS experiment, not the full platform described in CLAUDE.md. It has two pages, four route handlers, a developer console, and a sandbox workspace template. There is no Clerk integration, database, payment processor, or services directory here. Financial components display calculations; the remote mastering tool can invoke backend work.

The query flow validates input, reads header identity, checks artist ownership, resolves Redis session metadata, rate-limits and locks the artist, restores Blob snapshots into a sandbox, streams Claude logs, exports a snapshot, and releases resources. Upload shares the lock/snapshot lifecycle. Admin routes inspect/reset pointers and stop cached sandboxes. The console persists prompt history locally and renders agent-generated JSON. The harness applies file guards, schemas, manifests and audit logs; its bridge calls Incurator's versioned API.

Survey covered routes and core libraries in depth, console state/parsing/actions, render components, harness guards/client/tools/archive handling, templates, build scripts, dependencies, configs, workflows, tests and active plans. Installed dependency source confirmed ioredis tuple errors and Sandbox command exit-code semantics. Existing work was preserved in seven focused commits before this batch. Baseline: 27 files / 198 tests pass; TypeScript and lint pass. Baseline build is still running.

## Ordered quick wins

1. Input safety — reject prototype-bearing JSON patch paths in `src/app/artist-os-console/json-render/parse.ts`; untrusted agent output can currently mutate Object.prototype through installed core path helpers. Cover add/set/replace/remove regressions.
2. Rate limiting — check all Redis transaction replies in `src/lib/artist-os/rate-limit.ts`; command errors and missing counters must never admit requests.
3. Snapshot correctness — check command exit codes in `src/lib/artist-os/snapshot.ts`; failed extraction or archive creation must stop before running against bad state or publishing stale bytes.
4. Stream correctness — preserve CRLF across network chunks in `src/app/artist-os-console/lib/stream-sse.ts`; split delimiters currently discard events.
5. Test coverage — include existing `.test.tsx` files in `vitest.config.ts`; the full-suite command currently silently omits component tests.

Each item gets a separate commit after affected tests, type checking and lint. Add regression tests only for demonstrated bugs. Run `pnpm test:all`, `pnpm tsc --noEmit`, `pnpm lint`, and `pnpm build` at closeout. No deployment, real agent runs, storage changes, or external-service mutations.

## Candidates deferred, prioritized

1. `src/lib/artist-os/auth.ts`, query/upload routes: caller-supplied identity and ownership headers are trusted. Replace with authenticated identity and authoritative ownership before public use; changing the dev API contract needs agreement.
2. `src/lib/artist-os/snapshot.ts`: snapshots containing user work and `.claude-state` are published with public access. Private storage migration, access review, retention and atomic pointer publication need a separate migration plan.
3. `workspace-template/.incurator/guardrails.ts`, `safe-fs.ts`, `incurator-tools.ts`, upload route: lexical path checks do not establish symlink confinement; Bash guards are not an OS security boundary. Harden filesystem capabilities and restore/archive boundaries together.
4. `workspace-template/.incurator/archive.ts`, `incurator-agent-client.ts`, upload route: unbounded ZIP expansion/downloads and multipart buffering, no bridge request deadlines. Establish resource limits and cancellation for long operations.
5. `src/app/api/artist-os/query/route.ts`, `sandbox.ts`: disconnect cleanup, nonzero agent exits reported with `ok: true`, post-save cleanup errors, process-local sandbox cache and force-released locks need a lifecycle/response-contract pass.
6. `src/app/artist-os-console/json-render/parse.ts`, `JsonRenderBlock.tsx`, hooks: validate tree cycles and props, synchronize provider data, and test overlapping requests/storage failures.
7. `CLAUDE.md`, `README.md`, `package.json`, `.github/workflows/`: stale platform documentation, harness typecheck masks failures, no deterministic CI gate. Review supported SDK versions and separate app/harness validation.

## Progress

- [x] 2026-10-07: Survey and existing-work commits; baseline tests/types/lint green.
- [x] 2026-10-07: Prototype patch guard; four regressions fail before and pass after; types/lint pass.
- [ ] Redis reply validation.
- [ ] Snapshot exit checks.
- [ ] SSE chunk regression.
- [ ] Component test discovery.
- [ ] Full validation and final report.

## Decisions and outcomes

Keep public APIs, dependencies and intended successful flows unchanged. Larger security findings are recorded as code-level findings, not claims about live deployment exposure. Do not rebuild the external base snapshot. Revert only this batch's changes if a proposed fix cannot be validated. Final results pending.
