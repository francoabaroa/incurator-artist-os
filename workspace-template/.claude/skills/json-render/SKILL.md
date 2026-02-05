---
name: json-render
description: Structured UI output for the Artist OS Console using json-render fences. Use when you want to present rich, visual blocks (metrics, tables, checklists, timelines, documents, templates, or cards) instead of plain markdown.
---

# json-render

Use json-render when the response benefits from structured UI. The console will render a JSON tree inside a fenced code block with info string `json-render`.

## When to Use

- Metrics, dashboards, or analytics summaries
- Tables, comparisons, and key-value lists
- Checklists, timelines, calendars, and milestones
- Press releases, bios, and templates with copy buttons
- Contract red flags or financial breakdowns
- Creative outputs like chord progressions and song structures

## Output Format

Wrap a valid json-render payload inside a fenced block:

```json-render
{ "root": "root", "elements": { "root": { "key": "root", "type": "Card", "props": { "title": "Example" }, "children": [] } } }
```

You can also stream JSONL patches (one JSON object per line) using the keyed format:

```json-render
{"op":"set","path":"/root","value":"main"}
{"op":"add","path":"/elements/main","value":{"key":"main","type":"Card","props":{"title":"Dashboard"},"children":[]}}
```

## Actions

Use these named actions only:

- copy_to_clipboard: { text: string }
- open_url: { url: string }
- apply_prompt: { prompt: string, userId?: string|null, artistId?: string|null, resumeSessionId?: string|null, ownedArtistIds?: string|null }

## Component Catalog (Summary)

Layout:
- Card, Section, Stack, Grid, Divider, Spacer

Typography:
- Heading, Text, Caption, Quote, Code, BulletList, NumberedList

Actions:
- Button, ButtonGroup, Link

Status:
- Alert, Badge, Callout, EmptyState

Metrics:
- Metric, MetricGrid, ProgressBar, Benchmark

Charts:
- BarChart, LineChart, PieChart

Tables:
- Table, ComparisonTable, KeyValueList

Planning:
- Checklist, Timeline, ReleaseTimeline, ContentCalendar, MilestoneTracker

Documents:
- PressRelease, Bio, EmailTemplate

Creative:
- ChordProgression, RhymeScheme, SongStructure, CreativePrompt

Financial:
- FinancialBreakdown, RecoupmentCalculator, TaxReserve

Contracts:
- RedFlagList, TermsComparison, ProConList

Visual:
- Palette, ImagePlaceholder

## Skill Examples

### data-analytics

```json-render
{
  "root": "analytics-card",
  "elements": {
    "analytics-card": {
      "key": "analytics-card",
      "type": "Card",
      "props": { "title": "Analytics Snapshot" },
      "children": ["metrics", "chart"]
    },
    "metrics": {
      "key": "metrics",
      "type": "MetricGrid",
      "props": { "title": "Key Metrics", "columns": 3 },
      "children": ["m1", "m2", "m3"]
    },
    "m1": { "key": "m1", "type": "Metric", "props": { "label": "Followers", "value": 12800, "format": "number" } },
    "m2": { "key": "m2", "type": "Metric", "props": { "label": "Monthly Listeners", "value": 54000, "format": "number" } },
    "m3": { "key": "m3", "type": "Metric", "props": { "label": "Save Rate", "value": 22, "format": "percent" } },
    "chart": {
      "key": "chart",
      "type": "BarChart",
      "props": {
        "title": "Streams by Source",
        "data": [
          { "label": "Release Radar", "value": 18000 },
          { "label": "Your Library", "value": 12000 },
          { "label": "Playlists", "value": 10000 }
        ],
        "format": "streams"
      }
    }
  }
}
```

### music-finance

```json-render
{
  "root": "finance",
  "elements": {
    "finance": {
      "key": "finance",
      "type": "Card",
      "props": { "title": "Revenue Breakdown" },
      "children": ["total", "breakdown", "tax"]
    },
    "total": {
      "key": "total",
      "type": "Metric",
      "props": { "label": "Total Gross Income", "value": 28500, "format": "currency" }
    },
    "breakdown": {
      "key": "breakdown",
      "type": "FinancialBreakdown",
      "props": {
        "title": "Revenue by Source",
        "type": "revenue",
        "currency": "USD",
        "total": 28500,
        "categories": [
          { "name": "Live", "amount": 12000, "percent": 42 },
          { "name": "Streaming", "amount": 6500, "percent": 23 },
          { "name": "Merch", "amount": 5500, "percent": 19 }
        ],
        "showChart": true,
        "showPercentages": true
      }
    },
    "tax": {
      "key": "tax",
      "type": "TaxReserve",
      "props": {
        "income": 28500,
        "reservePercentage": 25,
        "reserveAmount": 7125,
        "breakdown": { "selfEmployment": 4026, "federalIncome": 2528, "stateIncome": 571 },
        "currency": "USD"
      }
    }
  }
}
```

### campaign-planning

```json-render
{
  "root": "campaign",
  "elements": {
    "campaign": {
      "key": "campaign",
      "type": "Card",
      "props": { "title": "Single Release Plan" },
      "children": ["timeline", "calendar", "checklist"]
    },
    "timeline": {
      "key": "timeline",
      "type": "ReleaseTimeline",
      "props": {
        "title": "Rollout Timeline",
        "releaseDate": "2026-02-14",
        "phases": [
          { "name": "Tease", "startOffset": -28, "endOffset": -14, "tasks": ["Teaser post"], "status": "completed" },
          { "name": "Build", "startOffset": -14, "endOffset": -1, "tasks": ["Pre-save push"], "status": "in_progress" }
        ]
      }
    },
    "calendar": {
      "key": "calendar",
      "type": "ContentCalendar",
      "props": {
        "title": "Week -1",
        "startDate": "2026-02-07",
        "items": [
          { "date": "2026-02-07", "channel": "instagram", "content": "Countdown begins", "status": "pending" },
          { "date": "2026-02-10", "channel": "tiktok", "content": "Snippet", "status": "pending" }
        ],
        "showChannelIcons": true
      }
    },
    "checklist": {
      "key": "checklist",
      "type": "Checklist",
      "props": {
        "title": "Launch Checklist",
        "items": [
          { "id": "1", "label": "Finalize artwork", "done": true, "required": true },
          { "id": "2", "label": "Schedule teaser", "done": false, "required": true }
        ],
        "showProgress": true
      }
    }
  }
}
```

### contract-review

```json-render
{
  "root": "contract-analysis",
  "elements": {
    "contract-analysis": {
      "key": "contract-analysis",
      "type": "Card",
      "props": { "title": "Contract Analysis" },
      "children": ["summary", "flags", "terms"]
    },
    "summary": {
      "key": "summary",
      "type": "Alert",
      "props": { "tone": "danger", "title": "2 critical issues", "message": "Perpetuity rights and cross-collateralization." }
    },
    "flags": {
      "key": "flags",
      "type": "RedFlagList",
      "props": {
        "title": "Issues",
        "items": [
          { "clause": "Section 4.2", "severity": "critical", "summary": "Rights in perpetuity", "recommendation": "Request reversion", "section": "4.2" }
        ],
        "showSeverityLegend": true
      }
    },
    "terms": {
      "key": "terms",
      "type": "TermsComparison",
      "props": {
        "title": "Deal vs Standards",
        "dealType": "recording",
        "terms": [
          { "name": "Royalty", "artistFriendly": "20%+", "industryStandard": "15-18%", "redFlag": "<12%", "yourDeal": "14%", "assessment": "warning" }
        ]
      }
    }
  }
}
```

### release-distribution

```json-render
{
  "root": "distribution",
  "elements": {
    "distribution": {
      "key": "distribution",
      "type": "Card",
      "props": { "title": "Distribution Checklist" },
      "children": ["checklist"]
    },
    "checklist": {
      "key": "checklist",
      "type": "Checklist",
      "props": {
        "title": "Release Prep",
        "items": [
          { "id": "1", "label": "ISRCs assigned", "done": false, "required": true },
          { "id": "2", "label": "Metadata verified", "done": false, "required": true }
        ],
        "showProgress": true
      }
    }
  }
}
```

### press-release

```json-render
{
  "root": "press",
  "elements": {
    "press": {
      "key": "press",
      "type": "PressRelease",
      "props": {
        "headline": "Luna Ray Announces Debut Album \"Midnight Blue\"",
        "subhead": "12-track collection explores loss and rebirth",
        "dateline": "LOS ANGELES, CA - March 15, 2026",
        "body": ["Paragraph one...", "Paragraph two..."],
        "quote": { "text": "This album changed me.", "attribution": "Luna Ray" },
        "boilerplate": "About Luna Ray...",
        "links": [
          { "label": "Press Assets", "url": "https://example.com/press" }
        ],
        "copyable": true
      }
    }
  }
}
```

### bio-writing

```json-render
{
  "root": "bio",
  "elements": {
    "bio": {
      "key": "bio",
      "type": "Bio",
      "props": {
        "length": "short",
        "content": "Luna Ray is an indie-pop artist...",
        "highlights": ["8M streams", "SXSW 2025"],
        "wordCount": 86,
        "copyable": true
      }
    }
  }
}
```

### marketing-copy

```json-render
{
  "root": "marketing",
  "elements": {
    "marketing": {
      "key": "marketing",
      "type": "EmailTemplate",
      "props": {
        "type": "newsletter",
        "subject": "New single this Friday",
        "greeting": "Hey everyone,",
        "body": "We are dropping a new song...",
        "cta": "Pre-save here",
        "signature": "- Luna",
        "placeholders": ["[LINK]"],
        "copyable": true
      }
    }
  }
}
```

### epk-press-kit

```json-render
{
  "root": "epk",
  "elements": {
    "epk": {
      "key": "epk",
      "type": "Card",
      "props": { "title": "EPK Checklist" },
      "children": ["checklist", "bio"]
    },
    "checklist": {
      "key": "checklist",
      "type": "Checklist",
      "props": {
        "title": "EPK Items",
        "items": [
          { "id": "1", "label": "Press photos", "done": false },
          { "id": "2", "label": "Bio", "done": true }
        ]
      }
    },
    "bio": {
      "key": "bio",
      "type": "Bio",
      "props": { "length": "short", "content": "Short bio...", "copyable": true }
    }
  }
}
```

### songwriting-aid

```json-render
{
  "root": "songwriting",
  "elements": {
    "songwriting": {
      "key": "songwriting",
      "type": "Card",
      "props": { "title": "Songwriting Support" },
      "children": ["progression", "structure", "prompt"]
    },
    "progression": {
      "key": "progression",
      "type": "ChordProgression",
      "props": {
        "key": "E Minor",
        "progression": ["i", "VII", "VI", "VII"],
        "mood": "Melancholic"
      }
    },
    "structure": {
      "key": "structure",
      "type": "SongStructure",
      "props": {
        "sections": [
          { "name": "Verse", "bars": 8 },
          { "name": "Chorus", "bars": 8, "active": true }
        ],
        "showBars": true
      }
    },
    "prompt": {
      "key": "prompt",
      "type": "CreativePrompt",
      "props": {
        "type": "seed_words",
        "prompt": "Write a verse using: bridge, velvet, emergency",
        "timer": 10,
        "tips": ["No editing", "Let the words lead"]
      }
    }
  }
}
```

### music-production

```json-render
{
  "root": "production",
  "elements": {
    "production": {
      "key": "production",
      "type": "Checklist",
      "props": {
        "title": "Studio Checklist",
        "items": [
          { "id": "1", "label": "Backup session", "done": false },
          { "id": "2", "label": "Render stems", "done": false }
        ]
      }
    }
  }
}
```

### visual-identity

```json-render
{
  "root": "palette",
  "elements": {
    "palette": {
      "key": "palette",
      "type": "Palette",
      "props": {
        "title": "Brand Colors",
        "swatches": [
          { "name": "Midnight", "hex": "#1e293b" },
          { "name": "Neon", "hex": "#f97316" }
        ],
        "showHex": true,
        "copyable": true
      }
    }
  }
}
```

### booking-outreach

```json-render
{
  "root": "booking",
  "elements": {
    "booking": {
      "key": "booking",
      "type": "EmailTemplate",
      "props": {
        "type": "booking",
        "subject": "Booking inquiry",
        "greeting": "Hi [VENUE_NAME],",
        "body": "We would love to perform...",
        "signature": "- Luna",
        "placeholders": ["[VENUE_NAME]"],
        "copyable": true
      }
    }
  }
}
```

### collaboration-networking

```json-render
{
  "root": "collab",
  "elements": {
    "collab": {
      "key": "collab",
      "type": "KeyValueList",
      "props": {
        "title": "Split Sheet",
        "items": [
          { "label": "Writer A", "value": "50%" },
          { "label": "Writer B", "value": "50%" }
        ]
      }
    }
  }
}
```

### fan-engagement

```json-render
{
  "root": "fans",
  "elements": {
    "fans": {
      "key": "fans",
      "type": "Metric",
      "props": { "label": "Email Subscribers", "value": 3200, "format": "number" }
    }
  }
}
```

### social-media-strategy

```json-render
{
  "root": "social",
  "elements": {
    "social": {
      "key": "social",
      "type": "Table",
      "props": {
        "title": "Platform Focus",
        "columns": [
          { "key": "platform", "label": "Platform" },
          { "key": "goal", "label": "Goal" }
        ],
        "rows": [
          { "platform": "TikTok", "goal": "Discovery" },
          { "platform": "Instagram", "goal": "Community" }
        ]
      }
    }
  }
}
```

### mental-wellness

```json-render
{
  "root": "wellness",
  "elements": {
    "wellness": {
      "key": "wellness",
      "type": "Callout",
      "props": {
        "title": "Grounding Exercise",
        "body": "Name 5 things you can see...",
        "tone": "info",
        "icon": "lightbulb"
      }
    }
  }
}
```

### general-guidance

```json-render
{
  "root": "guidance",
  "elements": {
    "guidance": {
      "key": "guidance",
      "type": "ProConList",
      "props": {
        "title": "Option Review",
        "pros": ["Higher advance"],
        "cons": ["Longer term"],
        "verdict": "Negotiate term length"
      }
    }
  }
}
```

### session-handover

```json-render
{
  "root": "handover",
  "elements": {
    "handover": {
      "key": "handover",
      "type": "Checklist",
      "props": {
        "title": "Next Steps",
        "items": [
          { "id": "1", "label": "Review campaign notes", "done": false },
          { "id": "2", "label": "Schedule rehearsal", "done": false }
        ]
      }
    }
  }
}
```

### skill-authoring

```json-render
{
  "root": "authoring",
  "elements": {
    "authoring": {
      "key": "authoring",
      "type": "Checklist",
      "props": {
        "title": "Skill Checklist",
        "items": [
          { "id": "1", "label": "Define inputs", "done": false },
          { "id": "2", "label": "Add examples", "done": false }
        ]
      }
    }
  }
}
```
