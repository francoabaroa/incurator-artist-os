---
name: session-handover
description: Ensures proper session handover by updating progress notes before ending. Use at the END of every session, when the user says goodbye, done, stop, or when wrapping up work. Also use at session START to read previous progress.
---

# Session Handover Skill

This skill ensures continuity between sessions by maintaining structured progress notes.

## When to Use This Skill

**At Session End:**
- User says "goodbye", "done", "stop", "that's all", "thanks"
- You've completed a significant piece of work
- Before any session termination

**At Session Start:**
- ALWAYS read progress/ files first to understand context
- Determine if you're an "initializer" (new workspace) or "maintainer" (continuing work)

## Session End Checklist

Before ending ANY session, complete these steps:

### 1. Update progress/claude-progress.md

Append a session entry using this template:

```markdown
---

## Session: {YYYY-MM-DDTHH:MM:SSZ}

### Accomplished
- {Bullet list of what was completed}
- {Be specific: files created, tasks done, decisions made}

### Next Steps
- {What should the next session focus on?}
- {Any pending tasks or follow-ups}

### Blockers
- {Any issues encountered}
- {Questions that need human input}

### Key Decisions
- {Any important choices made and why}
```

### 2. Update progress/last-run.json

Write structured metadata:

```json
{
  "completed_at": "{ISO timestamp}",
  "session_id": "{from environment if available}",
  "summary": "{One-line summary of session}",
  "features_updated": ["{list of feature IDs if any}"],
  "files_modified": ["{list of key files changed}"],
  "next_priority": "{What's most important next}"
}
```

### 3. Verify Changes Persisted

- Check that progress files were written successfully
- Confirm any JSON files validate correctly

## Session Start Checklist

When beginning a session:

1. **Read progress/claude-progress.md** — Understand what happened before
2. **Read progress/last-run.json** — Get structured context
3. **Check features.json** — Identify next incomplete feature
4. **Determine mode:**
   - **Initializer**: Workspace is fresh, gather info and set up
   - **Maintainer**: Continue from previous progress

## Anti-Patterns to Avoid

- ❌ Ending without updating progress notes
- ❌ Overwriting progress files (always APPEND to claude-progress.md)
- ❌ Vague summaries ("did some work")
- ❌ Forgetting to mention blockers or questions
- ❌ Starting a session without reading previous progress

## Output Files

- `progress/claude-progress.md` — Append-only session log
- `progress/last-run.json` — Structured last session metadata
