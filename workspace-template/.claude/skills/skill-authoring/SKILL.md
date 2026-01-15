---
name: skill-authoring
description: Guidelines for creating effective Agent Skills that conform to the open specification. Use when asked to create a new skill, improve an existing skill, document a workflow as a skill, or when discussing skill best practices.
---

# Skill Authoring Guide

This skill teaches how to create effective Agent Skills that follow the open specification and best practices.

## When to Use This Skill

- Artist or user asks to "create a skill", "add a new skill", "document this workflow"
- Improving or refactoring an existing skill
- Discussing skill organization or best practices
- When a workflow should be captured as reusable knowledge

## Skill Structure

A skill is a directory containing at minimum a `SKILL.md` file:

```
skill-name/
├── SKILL.md              # Required: instructions + metadata
├── scripts/              # Optional: executable code
├── references/           # Optional: additional documentation
└── assets/               # Optional: templates, resources
```

## SKILL.md Format

### Required YAML Frontmatter

```yaml
---
name: skill-name
description: A description of what this skill does AND when to use it.
---
```

### Frontmatter Rules

| Field | Required | Constraints |
|-------|----------|-------------|
| `name` | Yes | Max 64 chars. Lowercase letters, numbers, hyphens only. Must match directory name. |
| `description` | Yes | Max 1024 chars. Non-empty. Include WHAT it does AND WHEN to use it. |
| `license` | No | License name or reference to bundled license file. |
| `compatibility` | No | Environment requirements if any. |
| `metadata` | No | Arbitrary key-value pairs for additional info. |

### Name Conventions

**Use gerund form (verb + -ing):**
- ✅ `processing-pdfs`, `managing-tasks`, `writing-copy`
- ✅ `release-checklist`, `session-handover` (noun phrases also acceptable)
- ❌ `helper`, `utils`, `tools` (too vague)
- ❌ `PDF-Processing` (no uppercase)
- ❌ `-pdf` or `pdf-` (no leading/trailing hyphens)

### Writing Effective Descriptions

The description is CRITICAL for skill discovery. Claude uses it to decide when to trigger the skill.

**Include both WHAT and WHEN:**

```yaml
# ❌ Bad - Too vague
description: Helps with PDFs.

# ✅ Good - Specific triggers
description: Extracts text and tables from PDF files, fills forms, merges documents. Use when working with PDF files or when the user mentions PDFs, forms, or document extraction.
```

**Include trigger keywords:**
- Action words the user might say
- File types or domain terms
- Related concepts and synonyms

**Write in third person:**
- ✅ "Processes Excel files and generates reports"
- ❌ "I can help you process Excel files"

## Body Content Best Practices

### Keep It Concise

- SKILL.md body should be under 500 lines
- Claude is already smart—only add context it doesn't have
- Every token competes for attention

### Structure for Progressive Disclosure

```markdown
# Skill Name

## When to Use This Skill
- Trigger condition 1
- Trigger condition 2

## Quick Start
[Most common use case, concise]

## Detailed Instructions
[Step-by-step for complex workflows]

## Advanced Features
See [REFERENCE.md](REFERENCE.md) for details  ← Link to separate file

## Output Files
- List of files this skill creates or modifies
```

### Use Reference Files for Deep Content

Keep references ONE level deep from SKILL.md:

```markdown
# In SKILL.md
**Basic usage**: [instructions here]
**Advanced features**: See [advanced.md](advanced.md)
**API reference**: See [reference.md](reference.md)
```

## Adding Scripts

Include scripts for deterministic operations:

```
skill-name/
├── SKILL.md
└── scripts/
    ├── validate.py      # Validation script
    └── process.sh       # Processing script
```

**In SKILL.md, make execution intent clear:**
- "Run `python scripts/validate.py input.json`" (execute)
- "See `scripts/validate.py` for the algorithm" (read as reference)

**Script best practices:**
- Handle errors explicitly (don't punt to Claude)
- Include helpful error messages
- Document dependencies
- Avoid "magic numbers" without explanation

## Workflow Pattern

For multi-step tasks, provide checklists:

```markdown
## Release Workflow

Copy this checklist and track progress:

- [ ] Step 1: Gather requirements
- [ ] Step 2: Validate inputs
- [ ] Step 3: Execute changes
- [ ] Step 4: Verify results
```

## Anti-Patterns to Avoid

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| Vague descriptions | Skill won't trigger reliably | Include specific trigger words |
| Over 500 lines | Consumes too much context | Split into reference files |
| Deeply nested refs | Claude may partially read | Keep refs one level deep |
| Time-sensitive info | Will become stale | Use "old patterns" section |
| Multiple options | Confuses the agent | Provide clear defaults |
| Inconsistent terms | Hard to follow | Pick one term, use it everywhere |

## Creating a New Skill

1. **Create the directory:**
   ```bash
   mkdir -p .claude/skills/{skill-name}
   ```

2. **Create SKILL.md with:**
   - Proper YAML frontmatter (name matching directory, rich description)
   - "When to Use This Skill" section
   - Clear instructions
   - Output files list

3. **Test the skill:**
   - Ask Claude to perform a task that should trigger it
   - Verify it loads the skill
   - Iterate on description if it doesn't trigger

4. **Add reference files** if content exceeds 500 lines

## Example: Minimal Skill

```markdown
---
name: task-management
description: Creates, updates, and prioritizes tasks in the backlog. Use when the artist asks to add a task, check tasks, prioritize work, or manage their to-do list.
---

# Task Management

## When to Use This Skill
- Artist says "add task", "new task", "to-do"
- Checking or listing current tasks
- Prioritizing or reordering work

## Adding a Task

1. Read `tasks/backlog.json`
2. Add new task with required fields:
   - `id`: Unique identifier (e.g., "task_001")
   - `title`: Brief description
   - `status`: One of "pending", "in_progress", "blocked", "done"
   - `created_at`: ISO timestamp
3. Write updated JSON back

## Output Files
- `tasks/backlog.json` — Task list
- `tasks/inbox.md` — Quick capture notes
```

## Skill Quality Checklist

Before finalizing a skill:

- [ ] Name is lowercase with hyphens, matches directory
- [ ] Description includes WHAT it does AND WHEN to use it
- [ ] Description has specific trigger keywords
- [ ] SKILL.md is under 500 lines
- [ ] "When to Use" section is present
- [ ] Instructions are clear and actionable
- [ ] Output files are documented
- [ ] Reference files are one level deep (if any)
- [ ] No time-sensitive information
- [ ] Consistent terminology throughout
