# Artist OS Skills Strategy

## Current Situation

Recent sessions show weak handoff quality:
- Progress and handover sections are mostly empty placeholders.
- Sessions resume from basic profile info with little continuity.
- The backlog can appear empty ("tasks were cleared"), even after recent planning.
- Initialization logs show workspace checks pass, but state continuity still feels shallow.

Example observed session pattern:
- `sandbox_create`
- `restore_base`
- `restore_artist`
- `agent_run_start`
- `snapshot_export`

This indicates the infrastructure pipeline is running, but memory/task continuity and richer context reconstruction need improvement.

## Why This Matters

If the system starts each run with low-fidelity context, the assistant behaves like a generic initializer instead of an ongoing operator. That reduces trust and causes repeated re-discovery of artist goals, current work, and pending tasks.

## Strategic Direction

Adopt **dynamic context discovery + skill-based specialization**:
- Dynamic context to rebuild session continuity from workspace artifacts.
- Skills to replace old hardcoded "chat assistant" silos with reusable knowledge/action modules.

References:
- [Cursor: Dynamic Context Discovery](https://cursor.com/blog/dynamic-context-discovery)
- [OpenAI Cookbook: Context Personalization](https://cookbook.openai.com/examples/agents_sdk/context_personalization)
- [HW Chase note](https://x.com/hwchase17/status/2011814697889316930?s=46&t=Y87gLAhOMPC_nS9jjjMQ-w)

## Migration Thesis: Old Chat Assistants -> Skills

The old app's assistant personas (for example: Distro, Prody, Finny, Contractly) are strong candidates for Skill migration.

Benefits of the new model:
- Unified context across domains (distribution, marketing, contracts, finance) in one agent thread.
- Fewer hardcoded assistant routes and prompt silos.
- Faster iteration using markdown instructions and workspace artifacts.

## Phase 1: Knowledge Skills (High Impact, Low Risk)

Port `lib/utils/prompts/*.ts` persona content into `SKILL.md` files.

| Old App Assistant | New Skill Name | Trigger Keywords |
| --- | --- | --- |
| Distribution (`Distro`) | `release-distribution` | distribution, DSP, spotify, upload, metadata, ISRC |
| Contracts (`Contractly`) | `contract-review` | contract, deal, sign, lawyer, royalty split, red flag |
| Finance (`Finny`) | `music-finance` | budget, tax, revenue, money, accounting, royalty |
| Production (`Prody`) | `music-production` | mix, master, recording, DAW, mic, vocal chain |
| Marketing | `marketing-strategy` | promotion, social media, content, rollout, release plan |
| Community (`Fansy`) | `fan-engagement` | fans, community, discord, patreon, engagement |
| Songwriting (`Muse`) | `songwriting-aid` | lyrics, chords, melody, writer's block, harmony |

## Phase 2: Action Skills (Text Generation Workflows)

Replace old generation endpoints with structured skill instructions.

| Old App Tool | New Skill Name | Implementation |
| --- | --- | --- |
| Bio Generator | `bio-writing` | `SKILL.md` with templates and style options (concise, narrative, etc.) |
| Email Generator | `booking-outreach` | `SKILL.md` with outreach templates for venues/promoters |
| Campaign Creator | `campaign-planning` | `SKILL.md` with campaign planning workflow |
| Press Release | `press-release` | `SKILL.md` with AP-style structure and examples |

Operational principle:
- Keep outputs filesystem-first (for example `marketing/bio.md`, `emails/venue-outreach.md`).
- Support iterative editing in-session rather than repeated API regeneration.

## Phase 3: Hybrid Skills (Skill + Script)

For media workflows that require non-LLM processing (audio/video), pair instructions with executable scripts.

Example:

```text
skills/audio-processing/
├── SKILL.md
└── scripts/
    ├── separate.py
    └── master.py
```

Prerequisite:
- Pass required provider secrets into sandbox environment (for example `REPLICATE_API_TOKEN`, `FAL_KEY`).

## Gaps to Address Alongside Skills

- Missing workspace reconstruction details from prior sessions.
- Missing "blueprint" style state capture for artist profile/goals/current projects.
- Need stronger artifact indexing/discovery so the agent can rehydrate context automatically.
- Need better task persistence diagnostics for backlog clear events.

## Immediate Priority

Start by porting **Chat Assistants -> Knowledge Skills** first. This is the fastest path to materially better assistant quality without introducing new runtime dependencies.

Recommended first two migrations:
1. `contract-review`
2. `music-finance`

## Open Investigation: Why Tasks Were Cleared

Track and debug task loss with explicit checkpoints:
- Verify task files are written before `snapshot_export`.
- Verify task files are restored after `restore_artist`.
- Add session-level logging around task read/write and reconciliation.
- Record whether "empty backlog" is true deletion vs missing discovery/indexing.

## Success Criteria

- Agent resumes with concrete continuity (current goals, active tasks, recent decisions).
- Backlog does not disappear unexpectedly across sessions.
- Skill invocation is visible and relevant to user intent.
- Artists experience one coherent assistant, not fragmented personas.
