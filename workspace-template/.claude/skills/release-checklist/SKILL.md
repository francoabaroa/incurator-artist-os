---
name: release-checklist
description: Steps and checklists for releasing a single/EP/album
---

# Release Checklist Skill

Use this guide when the artist asks to prepare, plan, or execute a release.

## Pre-Release Checklist (4-6 weeks before)

1. Final master audio delivered
2. Artwork finalized (3000x3000px minimum)
3. Metadata prepared:
   - Track titles (final)
   - Featured artists (if any)
   - Songwriters and producers
   - Genre/subgenre
   - Explicit content flag
4. ISRC requested from distributor (do NOT invent one)
5. Release date confirmed

## Distribution Checklist (3-4 weeks before)

1. Upload to distributor
2. Submit for playlist pitching
3. Create pre-save link
4. Update releases/releases.json with status: "distribution"

## Marketing Checklist (2-3 weeks before)

1. Create content calendar
2. Draft announcement copy
3. Prepare visual assets
4. Schedule posts (but await approval!)
5. Update marketing/campaigns.json

## Release Day

1. Verify all platforms are live
2. Post announcement (after approval)
3. Update releases/releases.json with status: "released"
4. Track early performance

## Output Files to Update

- releases/releases.json (add/update release entry)
- releases/{id}/timeline.json (add timeline events)
- releases/{id}/deliverables.json (track asset status)
- tasks/today.md (add next actions)
- marketing/campaigns.json (if campaign created)
