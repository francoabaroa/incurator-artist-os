why do we have a workspace-template instead of hosting this on blob? and practicing the full e2e lifecycle of running claude agent sdk in vercel sandbox?
should we shift to long-lived sandboxes for multi-turn sessions (e.g., 10m timeout with extend-on-activity)? current behavior resumes only the Claude session while still doing full sandbox create/restore/export per prompt, so the timeline resets each time.
if we go long-lived, do we want to:
- reuse warm sandboxes within a TTL and label phases as "sandbox_reuse" vs "sandbox_create" for clarity?
- store a durable artist -> sandboxId mapping in Redis to reuse across serverless instances?
- extend sandbox timeout on each prompt and decide when to wind down (idle timeout)?
- decide persistence strategy: export snapshot every turn vs only on idle/timeout vs periodic checkpoints?
- handle failure modes: sandbox crash, cold start, or stale mapping cleanup?
- consider cost/limits and concurrency (one active sandbox per artist vs queuing)?
