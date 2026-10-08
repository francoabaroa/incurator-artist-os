# JSON Render Query Triggers

## Context

The agent needs stronger, proactive instruction to use `json-render`.
Passive wording like "when you want to use structured UI" is often too weak and leads to markdown-only responses.

This document captures natural artist queries that should trigger `json-render` outputs and provides an example payload format.

## Natural Queries That Should Trigger json-render

1. "Show me my streaming stats" -> `MetricGrid` + `BarChart`
2. "What's my release plan for the next single?" -> `ReleaseTimeline` + `Checklist`
3. "Break down my income this quarter" -> `FinancialBreakdown` + `PieChart`
4. "Review this contract" -> `RedFlagList` + `TermsComparison`
5. "Write me a press release for my new EP" -> `PressRelease`
6. "What do I need to do before release day?" -> `Checklist`
7. "Help me with chord progressions for a melancholic vibe" -> `ChordProgression`

## Test Queries for json-render

### 1) Financial/Revenue
Expected components: `FinancialBreakdown`, `Metric`

- "Break down my streaming revenue from last quarter"
- "How much do I owe my producer from the royalty split?"
- "What should I set aside for taxes this year?"

### 2) Analytics/Stats
Expected components: `MetricGrid`, `BarChart`

- "Show me how my latest single is performing"
- "Compare my Spotify vs Apple Music streams"
- "What are my key metrics right now?"

### 3) Release Planning
Expected components: `ReleaseTimeline`, `Checklist`

- "Help me plan my next single release"
- "What's my content calendar for the EP rollout?"
- "What do I need to do before release day?"

### 4) Contract Review
Expected components: `RedFlagList`, `TermsComparison`

- "What should I look out for in this label deal?"
- "Is this distribution agreement fair?"
- "What are the red flags in a 360 deal?"

### 5) Press/Marketing
Expected components: `PressRelease`, `Bio`, `EmailTemplate`

- "Write a press release for my new album"
- "I need a short bio for a festival submission"
- "Draft an email to pitch my music to a playlist curator"

### 6) Creative Assistance
Expected components: `ChordProgression`, `SongStructure`

- "Give me some chord progressions for a sad song"
- "Help me structure a verse-chorus-bridge layout"
- "I'm stuck on lyrics - give me some writing prompts"

### 7) Decision Making
Expected components: `ProConList`, `ComparisonTable`

- "Should I sign with this distributor or stay independent?"
- "What are the pros and cons of releasing an EP vs singles?"

## Example Output

For the query "Break down my streaming revenue", the agent should produce a structured payload instead of markdown prose.

```json-render
{
  "root": "revenue-card",
  "elements": {
    "revenue-card": {
      "key": "revenue-card",
      "type": "Card",
      "props": { "title": "Q4 2025 Revenue Breakdown" },
      "children": ["total", "breakdown", "chart"]
    },
    "total": {
      "key": "total",
      "type": "Metric",
      "props": { "label": "Total Revenue", "value": 4250, "format": "currency" }
    },
    "breakdown": {
      "key": "breakdown",
      "type": "FinancialBreakdown",
      "props": {
        "title": "Revenue by Source",
        "type": "revenue",
        "currency": "USD",
        "total": 4250,
        "categories": [
          { "name": "Spotify", "amount": 2100, "percent": 49 },
          { "name": "Apple Music", "amount": 1200, "percent": 28 },
          { "name": "YouTube", "amount": 650, "percent": 15 },
          { "name": "Other DSPs", "amount": 300, "percent": 7 }
        ],
        "showChart": true,
        "showPercentages": true
      }
    }
  }
}
```

## Note

The intended prompt-level behavior is to prefer strong defaults (for relevant query types) such as "always use `json-render` for structured planning/analysis responses," rather than optional phrasing.
