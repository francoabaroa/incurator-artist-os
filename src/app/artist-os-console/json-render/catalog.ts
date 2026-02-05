import { createCatalog } from "@json-render/core";
import { z } from "zod";

export const ToneSchema = z.enum([
  "default",
  "muted",
  "success",
  "warning",
  "danger",
  "info",
]);
export type Tone = z.infer<typeof ToneSchema>;

export const SizeSchema = z.enum(["xs", "sm", "md", "lg", "xl"]);
export type Size = z.infer<typeof SizeSchema>;

export const AlignSchema = z.enum(["start", "center", "end", "stretch"]);
export type Align = z.infer<typeof AlignSchema>;

export const DirectionSchema = z.enum(["horizontal", "vertical"]);
export type Direction = z.infer<typeof DirectionSchema>;

export const TrendSchema = z.enum(["up", "down", "neutral"]);
export type Trend = z.infer<typeof TrendSchema>;

export const SeveritySchema = z.enum(["low", "medium", "high", "critical"]);
export type Severity = z.infer<typeof SeveritySchema>;

export const StatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "blocked",
  "skipped",
]);
export type Status = z.infer<typeof StatusSchema>;

export const FormatSchema = z.enum([
  "number",
  "currency",
  "percent",
  "text",
  "streams",
  "date",
]);
export type Format = z.infer<typeof FormatSchema>;

export const ActionConfirmSchema = z.object({
  title: z.string(),
  message: z.string(),
  variant: z.enum(["default", "danger"]).nullable(),
});

export const ActionRefSchema = z.object({
  name: z.string(),
  params: z.record(z.string(), z.unknown()).nullable(),
  confirm: ActionConfirmSchema.nullable(),
});
export type ActionRef = z.infer<typeof ActionRefSchema>;

export const ChartDatumSchema = z.object({
  label: z.string(),
  value: z.number(),
});
export type ChartDatum = z.infer<typeof ChartDatumSchema>;

export const TableColumnSchema = z.object({
  key: z.string(),
  label: z.string(),
  align: z.enum(["left", "center", "right"]).nullable(),
  format: z
    .enum(["text", "currency", "percent", "number", "date", "badge"])
    .nullable(),
  tone: ToneSchema.nullable(),
});
export type TableColumn = z.infer<typeof TableColumnSchema>;

const KeyValueItemSchema = z.object({
  label: z.string(),
  value: z.union([z.string(), z.number()]),
  tone: ToneSchema.nullable(),
  format: FormatSchema.nullable(),
});

export const artistOSCatalog = createCatalog({
  name: "artist-os",
  components: {
    Card: {
      props: z.object({
        title: z.string().nullable(),
        subtitle: z.string().nullable(),
        description: z.string().nullable(),
        tone: ToneSchema.nullable(),
        padding: SizeSchema.nullable(),
        collapsible: z.boolean().nullable(),
        defaultCollapsed: z.boolean().nullable(),
      }),
      hasChildren: true,
      description: "Container card with optional title",
    },
    Section: {
      props: z.object({
        title: z.string().nullable(),
        description: z.string().nullable(),
        tone: ToneSchema.nullable(),
      }),
      hasChildren: true,
      description: "Lightweight section wrapper",
    },
    Stack: {
      props: z.object({
        direction: DirectionSchema.nullable(),
        gap: SizeSchema.nullable(),
        align: AlignSchema.nullable(),
        justify: AlignSchema.nullable(),
        wrap: z.boolean().nullable(),
      }),
      hasChildren: true,
      description: "Flex layout stack",
    },
    Grid: {
      props: z.object({
        columns: z.number().min(1).max(6).nullable(),
        gap: SizeSchema.nullable(),
        minColumnWidth: z.number().nullable(),
      }),
      hasChildren: true,
      description: "Grid layout",
    },
    Divider: {
      props: z.object({
        label: z.string().nullable(),
        tone: ToneSchema.nullable(),
        orientation: z.enum(["horizontal", "vertical"]).nullable(),
      }),
      description: "Divider line",
    },
    Spacer: {
      props: z.object({
        size: SizeSchema,
      }),
      description: "Spacer block",
    },
    Heading: {
      props: z.object({
        text: z.string(),
        level: z.enum(["h1", "h2", "h3", "h4"]).nullable(),
        align: AlignSchema.nullable(),
        tone: ToneSchema.nullable(),
      }),
      description: "Heading text",
    },
    Text: {
      props: z.object({
        content: z.string(),
        tone: ToneSchema.nullable(),
        size: SizeSchema.nullable(),
        align: AlignSchema.nullable(),
      }),
      description: "Body text",
    },
    Caption: {
      props: z.object({
        content: z.string(),
        tone: ToneSchema.nullable(),
      }),
      description: "Caption text",
    },
    Quote: {
      props: z.object({
        content: z.string(),
        attribution: z.string().nullable(),
        tone: ToneSchema.nullable(),
      }),
      description: "Block quote",
    },
    Code: {
      props: z.object({
        content: z.string(),
        language: z.string().nullable(),
        inline: z.boolean().nullable(),
      }),
      description: "Code block",
    },
    BulletList: {
      props: z.object({
        items: z.array(z.string()),
        tone: ToneSchema.nullable(),
        compact: z.boolean().nullable(),
      }),
      description: "Bullet list",
    },
    NumberedList: {
      props: z.object({
        items: z.array(z.string()),
        tone: ToneSchema.nullable(),
        startFrom: z.number().nullable(),
      }),
      description: "Numbered list",
    },
    Button: {
      props: z.object({
        label: z.string(),
        variant: ToneSchema.nullable(),
        size: SizeSchema.nullable(),
        action: ActionRefSchema,
        disabled: z.boolean().nullable(),
        icon: z.string().nullable(),
      }),
      description: "Action button",
    },
    ButtonGroup: {
      props: z.object({
        alignment: AlignSchema.nullable(),
      }),
      hasChildren: true,
      description: "Group of buttons",
    },
    Link: {
      props: z.object({
        label: z.string(),
        href: z.string(),
        tone: ToneSchema.nullable(),
        external: z.boolean().nullable(),
      }),
      description: "Hyperlink",
    },
    Alert: {
      props: z.object({
        tone: ToneSchema,
        title: z.string(),
        message: z.string().nullable(),
        dismissible: z.boolean().nullable(),
        action: ActionRefSchema.nullable(),
      }),
      description: "Alert banner",
    },
    Badge: {
      props: z.object({
        text: z.string(),
        tone: ToneSchema.nullable(),
        size: SizeSchema.nullable(),
      }),
      description: "Badge",
    },
    Callout: {
      props: z.object({
        title: z.string().nullable(),
        body: z.string(),
        tone: ToneSchema.nullable(),
        icon: z.string().nullable(),
        action: ActionRefSchema.nullable(),
      }),
      description: "Callout",
    },
    EmptyState: {
      props: z.object({
        title: z.string(),
        message: z.string().nullable(),
        icon: z.string().nullable(),
        action: ActionRefSchema.nullable(),
        actionLabel: z.string().nullable(),
      }),
      description: "Empty state",
    },
    Metric: {
      props: z.object({
        label: z.string(),
        value: z.union([z.string(), z.number(), z.null()]),
        valuePath: z.string().nullable(),
        format: FormatSchema.nullable(),
        trend: TrendSchema.nullable(),
        trendValue: z.string().nullable(),
        benchmark: z.string().nullable(),
        subtitle: z.string().nullable(),
        size: SizeSchema.nullable(),
      }),
      description: "Metric",
    },
    MetricGrid: {
      props: z.object({
        title: z.string().nullable(),
        columns: z.number().min(2).max(4).nullable(),
      }),
      hasChildren: true,
      description: "Metric grid",
    },
    ProgressBar: {
      props: z.object({
        label: z.string().nullable(),
        value: z.number(),
        max: z.number(),
        tone: ToneSchema.nullable(),
        format: z.enum(["percent", "number"]).nullable(),
        showValue: z.boolean().nullable(),
      }),
      description: "Progress bar",
    },
    Benchmark: {
      props: z.object({
        label: z.string(),
        current: z.number(),
        target: z.number(),
        format: FormatSchema.nullable(),
        stage: z
          .enum(["beginner", "builder", "breakout", "established", "major"])
          .nullable(),
        description: z.string().nullable(),
      }),
      description: "Benchmark",
    },
    BarChart: {
      props: z.object({
        title: z.string().nullable(),
        data: z.array(ChartDatumSchema).nullable(),
        dataPath: z.string().nullable(),
        format: FormatSchema.nullable(),
        orientation: z.enum(["horizontal", "vertical"]).nullable(),
        showValues: z.boolean().nullable(),
        height: z.number().nullable(),
      }),
      description: "Bar chart",
    },
    LineChart: {
      props: z.object({
        title: z.string().nullable(),
        data: z.array(ChartDatumSchema).nullable(),
        dataPath: z.string().nullable(),
        format: FormatSchema.nullable(),
        showPoints: z.boolean().nullable(),
        height: z.number().nullable(),
      }),
      description: "Line chart",
    },
    PieChart: {
      props: z.object({
        title: z.string().nullable(),
        data: z.array(ChartDatumSchema).nullable(),
        dataPath: z.string().nullable(),
        format: FormatSchema.nullable(),
        donut: z.boolean().nullable(),
        showLegend: z.boolean().nullable(),
      }),
      description: "Pie chart",
    },
    Table: {
      props: z.object({
        title: z.string().nullable(),
        columns: z.array(TableColumnSchema),
        rows: z.array(z.record(z.string(), z.unknown())).nullable(),
        dataPath: z.string().nullable(),
        striped: z.boolean().nullable(),
        compact: z.boolean().nullable(),
        sortable: z.boolean().nullable(),
      }),
      description: "Table",
    },
    ComparisonTable: {
      props: z.object({
        title: z.string().nullable(),
        headers: z.array(z.string()),
        rows: z.array(
          z.object({
            label: z.string(),
            values: z.array(
              z.object({
                text: z.string(),
                tone: ToneSchema.nullable(),
              })
            ),
          })
        ),
      }),
      description: "Comparison table",
    },
    KeyValueList: {
      props: z.object({
        title: z.string().nullable(),
        items: z.array(KeyValueItemSchema),
        compact: z.boolean().nullable(),
      }),
      description: "Key value list",
    },
    Checklist: {
      props: z.object({
        title: z.string().nullable(),
        items: z.array(
          z.object({
            id: z.string(),
            label: z.string(),
            done: z.boolean(),
            note: z.string().nullable(),
            required: z.boolean().nullable(),
          })
        ),
        showProgress: z.boolean().nullable(),
      }),
      description: "Checklist",
    },
    Timeline: {
      props: z.object({
        title: z.string().nullable(),
        items: z.array(
          z.object({
            label: z.string(),
            date: z.string().nullable(),
            description: z.string().nullable(),
            status: StatusSchema.nullable(),
            icon: z.string().nullable(),
          })
        ),
        showConnectors: z.boolean().nullable(),
      }),
      description: "Timeline",
    },
    ReleaseTimeline: {
      props: z.object({
        title: z.string().nullable(),
        releaseDate: z.string(),
        phases: z.array(
          z.object({
            name: z.string(),
            startOffset: z.number(),
            endOffset: z.number(),
            tasks: z.array(z.string()),
            status: StatusSchema.nullable(),
          })
        ),
      }),
      description: "Release timeline",
    },
    ContentCalendar: {
      props: z.object({
        title: z.string().nullable(),
        startDate: z.string(),
        items: z.array(
          z.object({
            date: z.string(),
            channel: z.string(),
            content: z.string(),
            status: StatusSchema.nullable(),
            tone: ToneSchema.nullable(),
          })
        ),
        showChannelIcons: z.boolean().nullable(),
      }),
      description: "Content calendar",
    },
    MilestoneTracker: {
      props: z.object({
        title: z.string().nullable(),
        items: z.array(
          z.object({
            label: z.string(),
            dueDate: z.string().nullable(),
            completed: z.boolean(),
            description: z.string().nullable(),
            priority: z.enum(["low", "medium", "high"]).nullable(),
          })
        ),
        showDates: z.boolean().nullable(),
      }),
      description: "Milestone tracker",
    },
    PressRelease: {
      props: z.object({
        headline: z.string(),
        subhead: z.string().nullable(),
        dateline: z.string(),
        body: z.array(z.string()),
        quote: z
          .object({
            text: z.string(),
            attribution: z.string(),
          })
          .nullable(),
        quote2: z
          .object({
            text: z.string(),
            attribution: z.string(),
          })
          .nullable(),
        boilerplate: z.string(),
        links: z
          .array(
            z.object({
              label: z.string(),
              url: z.string(),
            })
          )
          .nullable(),
        copyable: z.boolean().nullable(),
      }),
      description: "Press release",
    },
    Bio: {
      props: z.object({
        length: z.enum(["one_liner", "short", "medium", "long"]),
        content: z.string(),
        highlights: z.array(z.string()).nullable(),
        wordCount: z.number().nullable(),
        copyable: z.boolean().nullable(),
      }),
      description: "Artist bio",
    },
    EmailTemplate: {
      props: z.object({
        type: z.enum([
          "booking",
          "press",
          "sync",
          "collaboration",
          "newsletter",
          "other",
        ]),
        subject: z.string(),
        greeting: z.string().nullable(),
        body: z.string(),
        cta: z.string().nullable(),
        signature: z.string().nullable(),
        placeholders: z.array(z.string()).nullable(),
        copyable: z.boolean().nullable(),
      }),
      description: "Email template",
    },
    ChordProgression: {
      props: z.object({
        key: z.string(),
        progression: z.array(z.string()),
        tempo: z.number().nullable(),
        mood: z.string().nullable(),
        examples: z.array(z.string()).nullable(),
        notes: z.string().nullable(),
      }),
      description: "Chord progression",
    },
    RhymeScheme: {
      props: z.object({
        scheme: z.string(),
        lines: z.array(
          z.object({
            text: z.string(),
            group: z.string(),
          })
        ),
        description: z.string().nullable(),
      }),
      description: "Rhyme scheme",
    },
    SongStructure: {
      props: z.object({
        sections: z.array(
          z.object({
            name: z.string(),
            bars: z.number().nullable(),
            notes: z.string().nullable(),
            active: z.boolean().nullable(),
          })
        ),
        totalBars: z.number().nullable(),
        showBars: z.boolean().nullable(),
      }),
      description: "Song structure",
    },
    CreativePrompt: {
      props: z.object({
        type: z.enum([
          "constraint",
          "object",
          "seed_words",
          "opposite",
          "timed",
          "other",
        ]),
        prompt: z.string(),
        timer: z.number().nullable(),
        example: z.string().nullable(),
        tips: z.array(z.string()).nullable(),
      }),
      description: "Creative prompt",
    },
    FinancialBreakdown: {
      props: z.object({
        title: z.string(),
        type: z.enum(["budget", "revenue", "expense", "projection"]),
        currency: z.string(),
        total: z.number(),
        categories: z.array(
          z.object({
            name: z.string(),
            amount: z.number(),
            percent: z.number().nullable(),
            tone: ToneSchema.nullable(),
            description: z.string().nullable(),
          })
        ),
        showChart: z.boolean().nullable(),
        showPercentages: z.boolean().nullable(),
      }),
      description: "Financial breakdown",
    },
    RecoupmentCalculator: {
      props: z.object({
        advance: z.number(),
        royaltyRate: z.number(),
        recoupableExpenses: z.number(),
        estimatedRevenue: z.number().nullable(),
        breakEvenStreams: z.number().nullable(),
        currency: z.string(),
        recouped: z.boolean().nullable(),
      }),
      description: "Recoupment calculator",
    },
    TaxReserve: {
      props: z.object({
        income: z.number(),
        reservePercentage: z.number(),
        reserveAmount: z.number(),
        breakdown: z
          .object({
            selfEmployment: z.number(),
            federalIncome: z.number(),
            stateIncome: z.number().nullable(),
          })
          .nullable(),
        currency: z.string(),
      }),
      description: "Tax reserve",
    },
    RedFlagList: {
      props: z.object({
        title: z.string(),
        items: z.array(
          z.object({
            clause: z.string(),
            severity: SeveritySchema,
            summary: z.string(),
            recommendation: z.string().nullable(),
            section: z.string().nullable(),
          })
        ),
        showSeverityLegend: z.boolean().nullable(),
      }),
      description: "Red flag list",
    },
    TermsComparison: {
      props: z.object({
        title: z.string(),
        dealType: z.enum([
          "recording",
          "distribution",
          "management",
          "publishing",
          "sync",
          "360",
        ]),
        terms: z.array(
          z.object({
            name: z.string(),
            artistFriendly: z.string(),
            industryStandard: z.string(),
            redFlag: z.string(),
            yourDeal: z.string().nullable(),
            assessment: ToneSchema.nullable(),
          })
        ),
      }),
      description: "Terms comparison",
    },
    ProConList: {
      props: z.object({
        title: z.string(),
        pros: z.array(z.string()),
        cons: z.array(z.string()),
        verdict: z.string().nullable(),
      }),
      description: "Pro/con list",
    },
    Palette: {
      props: z.object({
        title: z.string().nullable(),
        swatches: z.array(
          z.object({
            name: z.string(),
            hex: z.string(),
            description: z.string().nullable(),
          })
        ),
        showHex: z.boolean().nullable(),
        copyable: z.boolean().nullable(),
      }),
      description: "Color palette",
    },
    ImagePlaceholder: {
      props: z.object({
        alt: z.string(),
        aspectRatio: z
          .enum(["square", "portrait", "landscape", "wide"])
          .nullable(),
        caption: z.string().nullable(),
      }),
      description: "Image placeholder",
    },
  },
  actions: {
    copy_to_clipboard: {
      params: z.object({ text: z.string() }),
      description: "Copy text to clipboard",
    },
    open_url: {
      params: z.object({ url: z.string() }),
      description: "Open URL in new tab",
    },
    apply_prompt: {
      params: z.object({
        prompt: z.string(),
        userId: z.string().nullable(),
        artistId: z.string().nullable(),
        resumeSessionId: z.string().nullable(),
        ownedArtistIds: z.string().nullable(),
      }),
      description: "Apply prompt to console form",
    },
  },
  validation: "strict",
});

export const catalogComponentNames = artistOSCatalog.componentNames;
export const catalogSummary = JSON.stringify(
  {
    components: artistOSCatalog.componentNames,
    actions: Object.keys(artistOSCatalog.actions ?? {}),
  },
  null,
  2
);
