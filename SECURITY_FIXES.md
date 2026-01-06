# Vuln 1: Authentication Bypass via Header Spoofing – `src/lib/artist-os/auth.ts:1-30`

- **Severity:** Critical  
- **Category:** authentication_bypass  
- **Confidence:** 9/10

## Description

The authentication and authorization system currently relies on user-controllable HTTP headers (`x-user-id`, `x-incurator-user`, `x-artist-ids`) without any cryptographic verification. The `getAuthUserId()` function extracts user identity directly from request headers, and `userOwnsArtist()` accepts an `x-artist-ids` header, which allows any caller to claim ownership of any artist. In addition, the `Authorization: Bearer` token is used as a user ID directly without JWT validation.

## Exploit Scenario

An attacker can directly invoke the API to impersonate any user and access any artist’s workspace:

```bash
curl -X POST https://target-app.com/api/artist-os/query \
  -H "Content-Type: application/json" \
  -H "x-user-id: victim_user_id" \
  -H "x-artist-ids: target_artist_id" \
  -d '{"artist_id":"target_artist_id","prompt":"Show me all files"}'
```

This bypasses both authentication (`401`) and authorization (`403`) checks. As a result, an attacker could:

- Execute agent commands inside any user's sandbox
- Read and modify any artist's workspace data
- Exfiltrate sensitive artist information

## Evidence from Codebase

The ExecPlan documentation (`plans/artist-os-mvp_execplan.md`) confirms this is an intentional MVP shortcut:

> "Decision: Use header-based auth for MVP (x-user-id or Authorization: Bearer) and ownership by explicit header or artist-id prefix match. Rationale: The repo has no existing auth provider."

Currently, there is no authentication middleware, no Clerk integration, and no upstream proxy configuration to validate these headers.

## Recommendation

**Implement proper authentication before production deployment:**

1. Add JWT validation for the `Authorization: Bearer` token using a library such as [`jose`](https://github.com/panva/jose)
2. Integrate Clerk middleware (already listed as a technology in `CLAUDE.md`) to validate sessions
3. Remove trust in user-controllable headers such as `x-user-id` and `x-artist-ids`
4. If header-trust is required for a reverse proxy setup, add middleware that strips/overrides these headers and document the required proxy configuration