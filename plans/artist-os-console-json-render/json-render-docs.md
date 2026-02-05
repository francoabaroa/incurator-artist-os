json-render
Docs
GitHub

Predictable. Guardrailed. Fast.
Let users generate dashboards, widgets, apps, and data visualizations from prompts — safely constrained to components you define.

Describe what you want to build...

Try: "Create a login form" or "Build a feedback form with rating"
json
stream
code

{
  "root": "card",
  "elements": {
    "card": {
      "key": "card",
      "type": "Card",
      "props": {
        "title": "Contact Us",
        "maxWidth": "md"
      },
      "children": [
        "name",
        "email",
        "message",
        "submit"
      ]
    },
    "name": {
      "key": "name",
      "type": "Input",
      "props": {
        "label": "Name",
        "name": "name"
      }
    },
    "email": {
      "key": "email",
      "type": "Input",
      "props": {
        "label": "Email",
        "name": "email"
      }
    },
    "message": {
      "key": "message",
      "type": "Textarea",
      "props": {
        "label": "Message",
        "name": "message"
      }
    },
    "submit": {
      "key": "submit",
      "type": "Button",
      "props": {
        "label": "Send Message",
        "variant": "primary"
      }
    }
  }
}
render

Contact Us
Name
Email
Message
Send Message
npm install @json-render/core @json-render/react

Get Started
GitHub
01
Define Your Catalog
Set the guardrails. Define which components, actions, and data bindings AI can use.

02
Users Prompt
End users describe what they want. AI generates JSON constrained to your catalog.

03
Render Instantly
Stream the response. Your components render progressively as JSON arrives.

Define your catalog
Components, actions, and validation functions.


import { createCatalog } from '@json-render/core';
import { z } from 'zod';

export const catalog = createCatalog({
  components: {
    Card: {
      props: z.object({
        title: z.string(),
        description: z.string().nullable(),
      }),
      hasChildren: true,
    },
    Metric: {
      props: z.object({
        label: z.string(),
        valuePath: z.string(),
        format: z.enum(['currency', 'percent']),
      }),
    },
  },
  actions: {
    export: { params: z.object({ format: z.string() }) },
  },
});
AI generates JSON
Constrained output that your components render natively.


{
  "key": "dashboard",
  "type": "Card",
  "props": {
    "title": "Revenue Dashboard",
    "description": null
  },
  "children": [
    {
      "key": "revenue",
      "type": "Metric",
      "props": {
        "label": "Total Revenue",
        "valuePath": "/metrics/revenue",
        "format": "currency"
      }
    }
  ]
}
Features
Guardrails
AI can only use components you define in the catalog

Streaming
Progressive rendering as JSON streams from the model

Data Binding
Two-way binding with JSON Pointer paths

Actions
Named actions handled by your application

Visibility
Conditional show/hide based on data or auth

Validation
Built-in and custom validation functions

Get started
npm install @json-render/core @json-render/react

Documentation
json-render
Docs
GitHub
json-render | AI-generated UI with guardrails

Skip to content
Navigation Menu
vercel-labs
json-render

Type / to search
Code
Issues
4
Pull requests
2
Actions
Projects
Security
Insights
Owner avatar
json-render
Public
vercel-labs/json-render
Go to file
t
Name		
ctate
ctate
more doc improvements
4f36dfb
 · 
18 hours ago
.github/workflows
add unit tests
yesterday
.husky
format
yesterday
apps/web
more doc improvements
18 hours ago
examples/dashboard
fix og
yesterday
packages
0.2.0
yesterday
.gitignore
init
yesterday
.npmrc
init
yesterday
AGENTS.md
type-check after each turn
yesterday
LICENSE
fix license
yesterday
README.md
better copy
yesterday
package.json
add unit tests
yesterday
pnpm-lock.yaml
fix docs menu
18 hours ago
pnpm-workspace.yaml
init
yesterday
turbo.json
fix check
yesterday
vitest.config.ts
add unit tests
yesterday
Repository files navigation
README
Apache-2.0 license
json-render
Predictable. Guardrailed. Fast.

Let end users generate dashboards, widgets, apps, and data visualizations from prompts — safely constrained to components you define.

npm install @json-render/core @json-render/react
Why json-render?
When users prompt for UI, you need guarantees. json-render gives AI a constrained vocabulary so output is always predictable:

Guardrailed — AI can only use components in your catalog
Predictable — JSON output matches your schema, every time
Fast — Stream and render progressively as the model responds
Quick Start
1. Define Your Catalog (what AI can use)
import { createCatalog } from '@json-render/core';
import { z } from 'zod';

const catalog = createCatalog({
  components: {
    Card: {
      props: z.object({ title: z.string() }),
      hasChildren: true,
    },
    Metric: {
      props: z.object({
        label: z.string(),
        valuePath: z.string(),      // Binds to your data
        format: z.enum(['currency', 'percent', 'number']),
      }),
    },
    Button: {
      props: z.object({
        label: z.string(),
        action: ActionSchema,        // AI declares intent, you handle it
      }),
    },
  },
  actions: {
    export_report: { description: 'Export dashboard to PDF' },
    refresh_data: { description: 'Refresh all metrics' },
  },
});
2. Register Your Components (how they render)
const registry = {
  Card: ({ element, children }) => (
    <div className="card">
      <h3>{element.props.title}</h3>
      {children}
    </div>
  ),
  Metric: ({ element }) => {
    const value = useDataValue(element.props.valuePath);
    return <div className="metric">{format(value)}</div>;
  },
  Button: ({ element, onAction }) => (
    <button onClick={() => onAction(element.props.action)}>
      {element.props.label}
    </button>
  ),
};
3. Let AI Generate
import { DataProvider, ActionProvider, Renderer, useUIStream } from '@json-render/react';

function Dashboard() {
  const { tree, send } = useUIStream({ api: '/api/generate' });

  return (
    <DataProvider initialData={{ revenue: 125000, growth: 0.15 }}>
      <ActionProvider actions={{
        export_report: () => downloadPDF(),
        refresh_data: () => refetch(),
      }}>
        <input
          placeholder="Create a revenue dashboard..."
          onKeyDown={(e) => e.key === 'Enter' && send(e.target.value)}
        />
        <Renderer tree={tree} components={registry} />
      </ActionProvider>
    </DataProvider>
  );
}
That's it. AI generates JSON, you render it safely.

Features
Conditional Visibility
Show/hide components based on data, auth, or complex logic:

{
  "type": "Alert",
  "props": { "message": "Error occurred" },
  "visible": {
    "and": [
      { "path": "/form/hasError" },
      { "not": { "path": "/form/errorDismissed" } }
    ]
  }
}
{
  "type": "AdminPanel",
  "visible": { "auth": "signedIn" }
}
Rich Actions
Actions with confirmation dialogs and callbacks:

{
  "type": "Button",
  "props": {
    "label": "Refund Payment",
    "action": {
      "name": "refund",
      "params": {
        "paymentId": { "path": "/selected/id" },
        "amount": { "path": "/refund/amount" }
      },
      "confirm": {
        "title": "Confirm Refund",
        "message": "Refund ${/refund/amount} to customer?",
        "variant": "danger"
      },
      "onSuccess": { "set": { "/ui/success": true } },
      "onError": { "set": { "/ui/error": "$error.message" } }
    }
  }
}
Built-in Validation
{
  "type": "TextField",
  "props": {
    "label": "Email",
    "valuePath": "/form/email",
    "checks": [
      { "fn": "required", "message": "Email is required" },
      { "fn": "email", "message": "Invalid email" }
    ],
    "validateOn": "blur"
  }
}
Packages
Package	Description
@json-render/core	Types, schemas, visibility, actions, validation
@json-render/react	React renderer, providers, hooks
Demo
git clone https://github.com/vercel-labs/json-render
cd json-render
pnpm install
pnpm dev
http://localhost:3000 — Docs & Playground
http://localhost:3001 — Example Dashboard
Project Structure
json-render/
├── packages/
│   ├── core/        → @json-render/core
│   └── react/       → @json-render/react
├── apps/
│   └── web/         → Docs & Playground site
└── examples/
    └── dashboard/   → Example dashboard app
How It Works
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ User Prompt │────▶│  AI + Catalog│────▶│  JSON Tree  │
│ "dashboard" │     │ (guardrailed)│     │(predictable)│
└─────────────┘     └──────────────┘     └─────────────┘
                                               │
                    ┌──────────────┐            │
                    │  Your React  │◀───────────┘
                    │  Components  │ (streamed)
                    └──────────────┘
Define the guardrails — what components, actions, and data bindings AI can use
Users prompt — end users describe what they want in natural language
AI generates JSON — output is always predictable, constrained to your catalog
Render fast — stream and render progressively as the model responds
License
Apache-2.0

About
AI → JSON → UI

json-render.dev
Resources
 Readme
License
 Apache-2.0 license
 Activity
 Custom properties
Stars
 3.2k stars
Watchers
 13 watching
Forks
 124 forks
Report repository
Releases
No releases published
Packages
No packages published
Contributors
2
@ctate
ctate Chris Tate
@vercel[bot]
vercel[bot]
Deployments
43
 Production 18 hours ago
 Preview yesterday
+ 41 deployments
Languages
TypeScript
97.8%
 
CSS
1.3%
 
JavaScript
0.9%
Footer
© 2026 GitHub, Inc.
Footer navigation
Terms
Privacy
Security
Status
Community
Docs
Contact
Manage cookies
Do not share my personal information


Directory structure:
└── docs/
    ├── layout.tsx
    ├── page.tsx
    ├── actions/
    │   └── page.tsx
    ├── ai-sdk/
    │   └── page.tsx
    ├── api/
    │   ├── core/
    │   │   └── page.tsx
    │   └── react/
    │       └── page.tsx
    ├── catalog/
    │   └── page.tsx
    ├── components/
    │   └── page.tsx
    ├── data-binding/
    │   └── page.tsx
    ├── installation/
    │   └── page.tsx
    ├── quick-start/
    │   └── page.tsx
    ├── streaming/
    │   └── page.tsx
    ├── validation/
    │   └── page.tsx
    └── visibility/
        └── page.tsx


Files Content:

================================================
FILE: apps/web/app/docs/layout.tsx
================================================
import Link from "next/link";
import { DocsMobileNav } from "@/components/docs-mobile-nav";

const navigation = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", href: "/docs" },
      { title: "Installation", href: "/docs/installation" },
      { title: "Quick Start", href: "/docs/quick-start" },
    ],
  },
  {
    title: "Core Concepts",
    items: [
      { title: "Catalog", href: "/docs/catalog" },
      { title: "Components", href: "/docs/components" },
      { title: "Data Binding", href: "/docs/data-binding" },
      { title: "Actions", href: "/docs/actions" },
      { title: "Visibility", href: "/docs/visibility" },
      { title: "Validation", href: "/docs/validation" },
    ],
  },
  {
    title: "Guides",
    items: [
      { title: "AI SDK Integration", href: "/docs/ai-sdk" },
      { title: "Streaming", href: "/docs/streaming" },
    ],
  },
  {
    title: "API Reference",
    items: [
      { title: "@json-render/core", href: "/docs/api/core" },
      { title: "@json-render/react", href: "/docs/api/react" },
    ],
  },
];

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DocsMobileNav />
      <div className="max-w-5xl mx-auto px-6 py-8 lg:py-12 flex gap-16">
        {/* Sidebar */}
        <aside className="w-48 shrink-0 hidden lg:block">
          <nav className="sticky top-20 space-y-6">
            {navigation.map((section) => (
              <div key={section.title}>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  {section.title}
                </h4>
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors block py-1"
                      >
                        {item.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 max-w-2xl">{children}</div>
      </div>
    </>
  );
}



================================================
FILE: apps/web/app/docs/page.tsx
================================================
export const metadata = {
  title: "Introduction | json-render",
};

export default function DocsPage() {
  return (
    <article>
      <h1 className="text-3xl font-bold mb-4">Introduction</h1>
      <p className="text-muted-foreground mb-8">
        Predictable. Guardrailed. Fast. Let users generate dashboards, widgets,
        apps, and data visualizations from prompts.
      </p>

      <h2 className="text-xl font-semibold mt-12 mb-4">What is json-render?</h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        json-render lets end users generate UI from natural language prompts —
        safely constrained to components you define. You set the guardrails:
        what components exist, what props they take, what actions are available.
        AI generates JSON that matches your schema, and your components render
        it natively.
      </p>

      <h2 className="text-xl font-semibold mt-12 mb-4">Why json-render?</h2>
      <div className="space-y-4 mb-8">
        <div>
          <h3 className="font-medium mb-1">Guardrailed</h3>
          <p className="text-sm text-muted-foreground">
            AI can only use components in your catalog. No arbitrary code
            generation.
          </p>
        </div>
        <div>
          <h3 className="font-medium mb-1">Predictable</h3>
          <p className="text-sm text-muted-foreground">
            JSON output matches your schema, every time. Actions are declared by
            name, you control what they do.
          </p>
        </div>
        <div>
          <h3 className="font-medium mb-1">Fast</h3>
          <p className="text-sm text-muted-foreground">
            Stream and render progressively as the model responds. No waiting
            for completion.
          </p>
        </div>
      </div>

      <h2 className="text-xl font-semibold mt-12 mb-4">How it works</h2>
      <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
        <li>
          Define the guardrails — what components, actions, and data bindings AI
          can use
        </li>
        <li>
          Users prompt — end users describe what they want in natural language
        </li>
        <li>
          AI generates JSON — output is always predictable, constrained to your
          catalog
        </li>
        <li>
          Render fast — stream and render progressively as the model responds
        </li>
      </ol>
    </article>
  );
}



================================================
FILE: apps/web/app/docs/actions/page.tsx
================================================
import Link from "next/link";
import { Code } from "@/components/code";

export const metadata = {
  title: "Actions | json-render",
};

export default function ActionsPage() {
  return (
    <article>
      <h1 className="text-3xl font-bold mb-4">Actions</h1>
      <p className="text-muted-foreground mb-8">
        Handle user interactions safely with named actions.
      </p>

      <h2 className="text-xl font-semibold mt-12 mb-4">Why Named Actions?</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Instead of AI generating arbitrary code, it declares <em>intent</em> by
        name. Your application provides the implementation. This is a core
        guardrail.
      </p>

      <h2 className="text-xl font-semibold mt-12 mb-4">Defining Actions</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Define available actions in your catalog:
      </p>
      <Code lang="typescript">{`const catalog = createCatalog({
  components: { /* ... */ },
  actions: {
    submit_form: {
      params: z.object({
        formId: z.string(),
      }),
      description: 'Submit a form',
    },
    export_data: {
      params: z.object({
        format: z.enum(['csv', 'pdf', 'json']),
        filters: z.object({
          dateRange: z.string().optional(),
        }).optional(),
      }),
    },
    navigate: {
      params: z.object({
        url: z.string(),
      }),
    },
  },
});`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">ActionProvider</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Provide action handlers to your app:
      </p>
      <Code lang="tsx">{`import { ActionProvider } from '@json-render/react';

function App() {
  const handlers = {
    submit_form: async (params) => {
      const response = await fetch('/api/submit', {
        method: 'POST',
        body: JSON.stringify({ formId: params.formId }),
      });
      return response.json();
    },
    
    export_data: async (params) => {
      const blob = await generateExport(params.format, params.filters);
      downloadBlob(blob, \`export.\${params.format}\`);
    },
    
    navigate: (params) => {
      window.location.href = params.url;
    },
  };

  return (
    <ActionProvider handlers={handlers}>
      {/* Your UI */}
    </ActionProvider>
  );
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">
        Using Actions in Components
      </h2>
      <Code lang="tsx">{`const Button = ({ element, onAction }) => (
  <button onClick={() => onAction(element.props.action, {})}>
    {element.props.label}
  </button>
);

// Or use the useAction hook
import { useAction } from '@json-render/react';

function SubmitButton() {
  const submitForm = useAction('submit_form');
  
  return (
    <button onClick={() => submitForm({ formId: 'contact' })}>
      Submit
    </button>
  );
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">
        Actions with Confirmation
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        AI can declare actions that require user confirmation:
      </p>
      <Code lang="json">{`{
  "type": "Button",
  "props": {
    "label": "Delete Account",
    "action": {
      "name": "delete_account",
      "params": { "userId": "123" },
      "confirm": {
        "title": "Delete Account?",
        "message": "This action cannot be undone.",
        "variant": "danger"
      }
    }
  }
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Action Callbacks</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Handle success and error states:
      </p>
      <Code lang="json">{`{
  "type": "Button",
  "props": {
    "label": "Save",
    "action": {
      "name": "save_changes",
      "params": { "documentId": "doc-1" },
      "onSuccess": {
        "set": { "/ui/savedMessage": "Changes saved!" }
      },
      "onError": {
        "set": { "/ui/errorMessage": "$error.message" }
      }
    }
  }
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Next</h2>
      <p className="text-sm text-muted-foreground">
        Learn about{" "}
        <Link
          href="/docs/visibility"
          className="text-foreground hover:underline"
        >
          conditional visibility
        </Link>
        .
      </p>
    </article>
  );
}



================================================
FILE: apps/web/app/docs/ai-sdk/page.tsx
================================================
import Link from "next/link";
import { Code } from "@/components/code";

export const metadata = {
  title: "AI SDK Integration | json-render",
};

export default function AiSdkPage() {
  return (
    <article>
      <h1 className="text-3xl font-bold mb-4">AI SDK Integration</h1>
      <p className="text-muted-foreground mb-8">
        Use json-render with the Vercel AI SDK for seamless streaming.
      </p>

      <h2 className="text-xl font-semibold mt-12 mb-4">Installation</h2>
      <Code lang="bash">npm install ai</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">API Route Setup</h2>
      <Code lang="typescript">{`// app/api/generate/route.ts
import { streamText } from 'ai';
import { generateCatalogPrompt } from '@json-render/core';
import { catalog } from '@/lib/catalog';

export async function POST(req: Request) {
  const { prompt, currentTree } = await req.json();
  
  const systemPrompt = generateCatalogPrompt(catalog);
  
  // Optionally include current UI state for context
  const contextPrompt = currentTree 
    ? \`\\n\\nCurrent UI state:\\n\${JSON.stringify(currentTree, null, 2)}\`
    : '';

  const result = streamText({
    model: 'anthropic/claude-opus-4.5',
    system: systemPrompt + contextPrompt,
    prompt,
  });

  return new Response(result.textStream, {
    headers: { 
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Client-Side Hook</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Use <code className="text-foreground">useUIStream</code> on the client:
      </p>
      <Code lang="tsx">{`'use client';

import { useUIStream } from '@json-render/react';

function GenerativeUI() {
  const { tree, isLoading, error, generate } = useUIStream({
    endpoint: '/api/generate',
  });

  return (
    <div>
      <button 
        onClick={() => generate('Create a dashboard with metrics')}
        disabled={isLoading}
      >
        {isLoading ? 'Generating...' : 'Generate'}
      </button>
      
      {error && <p className="text-red-500">{error.message}</p>}
      
      <Renderer tree={tree} registry={registry} />
    </div>
  );
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Prompt Engineering</h2>
      <p className="text-sm text-muted-foreground mb-4">
        The <code className="text-foreground">generateCatalogPrompt</code>{" "}
        function creates an optimized prompt that:
      </p>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-4">
        <li>Lists all available components and their props</li>
        <li>Describes available actions</li>
        <li>Specifies the expected JSON output format</li>
        <li>Includes examples for better generation</li>
      </ul>

      <h2 className="text-xl font-semibold mt-12 mb-4">
        Custom System Prompts
      </h2>
      <Code lang="typescript">{`const basePrompt = generateCatalogPrompt(catalog);

const customPrompt = \`
\${basePrompt}

Additional instructions:
- Always use Card components for grouping related content
- Prefer horizontal layouts (Row) for metrics
- Use consistent spacing with padding="md"
\`;`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Next</h2>
      <p className="text-sm text-muted-foreground">
        Learn about{" "}
        <Link
          href="/docs/streaming"
          className="text-foreground hover:underline"
        >
          progressive streaming
        </Link>
        .
      </p>
    </article>
  );
}



================================================
FILE: apps/web/app/docs/api/core/page.tsx
================================================
import { Code } from "@/components/code";

export const metadata = {
  title: "@json-render/core API | json-render",
};

export default function CoreApiPage() {
  return (
    <article>
      <h1 className="text-3xl font-bold mb-4">@json-render/core</h1>
      <p className="text-muted-foreground mb-8">
        Core types, schemas, and utilities.
      </p>

      <h2 className="text-xl font-semibold mt-12 mb-4">createCatalog</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Creates a catalog definition.
      </p>
      <Code lang="typescript">{`function createCatalog(config: CatalogConfig): Catalog

interface CatalogConfig {
  components: Record<string, ComponentDefinition>;
  actions?: Record<string, ActionDefinition>;
  validationFunctions?: Record<string, ValidationFunctionDef>;
}

interface ComponentDefinition {
  props: ZodObject;
  hasChildren?: boolean;
  description?: string;
}

interface ActionDefinition {
  params?: ZodObject;
  description?: string;
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">
        generateCatalogPrompt
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Generates a system prompt for AI models.
      </p>
      <Code lang="typescript">{`function generateCatalogPrompt(catalog: Catalog): string`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">evaluateVisibility</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Evaluates a visibility condition against data and auth state.
      </p>
      <Code lang="typescript">{`function evaluateVisibility(
  condition: VisibilityCondition | undefined,
  data: Record<string, unknown>,
  auth?: AuthState
): boolean

type VisibilityCondition =
  | { path: string }
  | { auth: 'signedIn' | 'signedOut' | string }
  | { and: VisibilityCondition[] }
  | { or: VisibilityCondition[] }
  | { not: VisibilityCondition }
  | { eq: [DynamicValue, DynamicValue] }
  | { gt: [DynamicValue, DynamicValue] }
  | { gte: [DynamicValue, DynamicValue] }
  | { lt: [DynamicValue, DynamicValue] }
  | { lte: [DynamicValue, DynamicValue] };`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Types</h2>

      <h3 className="text-lg font-semibold mt-8 mb-4">UIElement</h3>
      <Code lang="typescript">{`interface UIElement {
  key: string;
  type: string;
  props: Record<string, unknown>;
  children?: UIElement[];
  visible?: VisibilityCondition;
  validation?: ValidationSchema;
}`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">UITree</h3>
      <Code lang="typescript">{`interface UITree {
  root: UIElement | null;
  elements: Record<string, UIElement>;
}`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">Action</h3>
      <Code lang="typescript">{`interface Action {
  name: string;
  params?: Record<string, unknown>;
  confirm?: {
    title: string;
    message: string;
    variant?: 'default' | 'danger';
  };
  onSuccess?: { set: Record<string, unknown> };
  onError?: { set: Record<string, unknown> };
}`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">ValidationSchema</h3>
      <Code lang="typescript">{`interface ValidationSchema {
  checks: ValidationCheck[];
  validateOn?: 'change' | 'blur' | 'submit';
}

interface ValidationCheck {
  fn: string;
  args?: Record<string, unknown>;
  message: string;
}`}</Code>
    </article>
  );
}



================================================
FILE: apps/web/app/docs/api/react/page.tsx
================================================
import { Code } from "@/components/code";

export const metadata = {
  title: "@json-render/react API | json-render",
};

export default function ReactApiPage() {
  return (
    <article>
      <h1 className="text-3xl font-bold mb-4">@json-render/react</h1>
      <p className="text-muted-foreground mb-8">
        React components, providers, and hooks.
      </p>

      <h2 className="text-xl font-semibold mt-12 mb-4">Providers</h2>

      <h3 className="text-lg font-semibold mt-8 mb-4">DataProvider</h3>
      <Code lang="tsx">{`<DataProvider initialData={object}>
  {children}
</DataProvider>`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">ActionProvider</h3>
      <Code lang="tsx">{`<ActionProvider handlers={Record<string, ActionHandler>}>
  {children}
</ActionProvider>

type ActionHandler = (params: Record<string, unknown>) => void | Promise<void>;`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">VisibilityProvider</h3>
      <Code lang="tsx">{`<VisibilityProvider auth={AuthState}>
  {children}
</VisibilityProvider>

interface AuthState {
  isSignedIn: boolean;
  roles?: string[];
}`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">ValidationProvider</h3>
      <Code lang="tsx">{`<ValidationProvider functions={Record<string, ValidatorFn>}>
  {children}
</ValidationProvider>

type ValidatorFn = (value: unknown, args?: object) => boolean | Promise<boolean>;`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Components</h2>

      <h3 className="text-lg font-semibold mt-8 mb-4">Renderer</h3>
      <Code lang="tsx">{`<Renderer
  tree={UITree}
  registry={ComponentRegistry}
/>

type ComponentRegistry = Record<string, React.ComponentType<ComponentProps>>;

interface ComponentProps {
  element: UIElement;
  children?: React.ReactNode;
  onAction: (name: string, params: object) => void;
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Hooks</h2>

      <h3 className="text-lg font-semibold mt-8 mb-4">useUIStream</h3>
      <Code lang="typescript">{`const {
  tree,       // UITree - current UI state
  isLoading,  // boolean - true while streaming
  error,      // Error | null
  generate,   // (prompt: string) => void
  abort,      // () => void
} = useUIStream({
  endpoint: string,
});`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">useData</h3>
      <Code lang="typescript">{`const {
  data,      // Record<string, unknown>
  setData,   // (data: object) => void
  getValue,  // (path: string) => unknown
  setValue,  // (path: string, value: unknown) => void
} = useData();`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">useDataValue</h3>
      <Code lang="typescript">{`const value = useDataValue(path: string);`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">useDataBinding</h3>
      <Code lang="typescript">{`const [value, setValue] = useDataBinding(path: string);`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">useActions</h3>
      <Code lang="typescript">{`const { dispatch } = useActions();
// dispatch(actionName: string, params: object)`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">useAction</h3>
      <Code lang="typescript">{`const submitForm = useAction('submit_form');
// submitForm(params: object)`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">useIsVisible</h3>
      <Code lang="typescript">{`const isVisible = useIsVisible(condition?: VisibilityCondition);`}</Code>

      <h3 className="text-lg font-semibold mt-8 mb-4">useFieldValidation</h3>
      <Code lang="typescript">{`const {
  value,     // unknown
  setValue,  // (value: unknown) => void
  errors,    // string[]
  validate,  // () => Promise<boolean>
  isValid,   // boolean
} = useFieldValidation(path: string, checks: ValidationCheck[]);`}</Code>
    </article>
  );
}



================================================
FILE: apps/web/app/docs/catalog/page.tsx
================================================
import Link from "next/link";
import { Code } from "@/components/code";

export const metadata = {
  title: "Catalog | json-render",
};

export default function CatalogPage() {
  return (
    <article>
      <h1 className="text-3xl font-bold mb-4">Catalog</h1>
      <p className="text-muted-foreground mb-8">
        The catalog defines what AI can generate. It&apos;s your guardrail.
      </p>

      <h2 className="text-xl font-semibold mt-12 mb-4">What is a Catalog?</h2>
      <p className="text-sm text-muted-foreground mb-4">
        A catalog is a schema that defines:
      </p>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-4">
        <li>
          <strong className="text-foreground">Components</strong> — UI elements
          AI can create
        </li>
        <li>
          <strong className="text-foreground">Actions</strong> — Operations AI
          can trigger
        </li>
        <li>
          <strong className="text-foreground">Validation Functions</strong> —
          Custom validators for form inputs
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-12 mb-4">Creating a Catalog</h2>
      <Code lang="typescript">{`import { createCatalog } from '@json-render/core';
import { z } from 'zod';

const catalog = createCatalog({
  components: {
    // Define each component with its props schema
    Card: {
      props: z.object({
        title: z.string(),
        description: z.string().nullable(),
        padding: z.enum(['sm', 'md', 'lg']).default('md'),
      }),
      hasChildren: true, // Can contain other components
    },
    
    Metric: {
      props: z.object({
        label: z.string(),
        valuePath: z.string(), // JSON Pointer to data
        format: z.enum(['currency', 'percent', 'number']),
      }),
    },
  },
  
  actions: {
    submit_form: {
      params: z.object({
        formId: z.string(),
      }),
      description: 'Submit a form',
    },
    
    export_data: {
      params: z.object({
        format: z.enum(['csv', 'pdf', 'json']),
      }),
    },
  },
  
  validationFunctions: {
    isValidEmail: {
      description: 'Validates email format',
    },
    isPhoneNumber: {
      description: 'Validates phone number',
    },
  },
});`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Component Definition</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Each component in the catalog has:
      </p>
      <Code lang="typescript">{`{
  props: z.object({...}),  // Zod schema for props
  hasChildren?: boolean,    // Can it have children?
  description?: string,     // Help AI understand when to use it
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">
        Generating AI Prompts
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Use <code className="text-foreground">generateCatalogPrompt</code> to
        create a system prompt for AI:
      </p>
      <Code lang="typescript">{`import { generateCatalogPrompt } from '@json-render/core';

const systemPrompt = generateCatalogPrompt(catalog);
// Pass this to your AI model as the system prompt`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Next</h2>
      <p className="text-sm text-muted-foreground">
        Learn how to{" "}
        <Link
          href="/docs/components"
          className="text-foreground hover:underline"
        >
          register React components
        </Link>{" "}
        for your catalog.
      </p>
    </article>
  );
}



================================================
FILE: apps/web/app/docs/components/page.tsx
================================================
import Link from "next/link";
import { Code } from "@/components/code";

export const metadata = {
  title: "Components | json-render",
};

export default function ComponentsPage() {
  return (
    <article>
      <h1 className="text-3xl font-bold mb-4">Components</h1>
      <p className="text-muted-foreground mb-8">
        Register React components to render your catalog types.
      </p>

      <h2 className="text-xl font-semibold mt-12 mb-4">Component Registry</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Create a registry that maps catalog component types to React components:
      </p>
      <Code lang="tsx">{`const registry = {
  Card: ({ element, children }) => (
    <div className="card">
      <h2>{element.props.title}</h2>
      {element.props.description && (
        <p>{element.props.description}</p>
      )}
      {children}
    </div>
  ),
  
  Button: ({ element, onAction }) => (
    <button onClick={() => onAction(element.props.action, {})}>
      {element.props.label}
    </button>
  ),
};`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Component Props</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Each component receives these props:
      </p>
      <Code lang="typescript">{`interface ComponentProps {
  element: {
    key: string;
    type: string;
    props: Record<string, unknown>;
    children?: UIElement[];
    visible?: VisibilityCondition;
    validation?: ValidationSchema;
  };
  children?: React.ReactNode;  // Rendered children
  onAction: (name: string, params: object) => void;
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Using Data Binding</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Use hooks to read and write data:
      </p>
      <Code lang="tsx">{`import { useDataValue, useDataBinding } from '@json-render/react';

const Metric = ({ element }) => {
  // Read-only value
  const value = useDataValue(element.props.valuePath);
  
  return (
    <div className="metric">
      <span className="label">{element.props.label}</span>
      <span className="value">{formatValue(value)}</span>
    </div>
  );
};

const TextField = ({ element }) => {
  // Two-way binding
  const [value, setValue] = useDataBinding(element.props.valuePath);
  
  return (
    <input
      value={value || ''}
      onChange={(e) => setValue(e.target.value)}
      placeholder={element.props.placeholder}
    />
  );
};`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Using the Renderer</h2>
      <Code lang="tsx">{`import { Renderer } from '@json-render/react';

function App() {
  return (
    <Renderer
      tree={uiTree}
      registry={registry}
    />
  );
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Next</h2>
      <p className="text-sm text-muted-foreground">
        Learn about{" "}
        <Link
          href="/docs/data-binding"
          className="text-foreground hover:underline"
        >
          data binding
        </Link>{" "}
        for dynamic values.
      </p>
    </article>
  );
}



================================================
FILE: apps/web/app/docs/data-binding/page.tsx
================================================
import Link from "next/link";
import { Code } from "@/components/code";

export const metadata = {
  title: "Data Binding | json-render",
};

export default function DataBindingPage() {
  return (
    <article>
      <h1 className="text-3xl font-bold mb-4">Data Binding</h1>
      <p className="text-muted-foreground mb-8">
        Connect UI components to your application data using JSON Pointer paths.
      </p>

      <h2 className="text-xl font-semibold mt-12 mb-4">JSON Pointer Paths</h2>
      <p className="text-sm text-muted-foreground mb-4">
        json-render uses JSON Pointer (RFC 6901) for data paths:
      </p>
      <Code lang="json">{`// Given this data:
{
  "user": {
    "name": "Alice",
    "email": "alice@example.com"
  },
  "metrics": {
    "revenue": 125000,
    "growth": 0.15
  }
}

// These paths access:
"/user/name"        -> "Alice"
"/metrics/revenue"  -> 125000
"/metrics/growth"   -> 0.15`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">DataProvider</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Wrap your app with DataProvider to enable data binding:
      </p>
      <Code lang="tsx">{`import { DataProvider } from '@json-render/react';

function App() {
  const initialData = {
    user: { name: 'Alice' },
    form: { email: '', message: '' },
  };

  return (
    <DataProvider initialData={initialData}>
      {/* Your UI */}
    </DataProvider>
  );
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Reading Data</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Use <code className="text-foreground">useDataValue</code> for read-only
        access:
      </p>
      <Code lang="tsx">{`import { useDataValue } from '@json-render/react';

function UserGreeting() {
  const name = useDataValue('/user/name');
  return <h1>Hello, {name}!</h1>;
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Two-Way Binding</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Use <code className="text-foreground">useDataBinding</code> for
        read-write access:
      </p>
      <Code lang="tsx">{`import { useDataBinding } from '@json-render/react';

function EmailInput() {
  const [email, setEmail] = useDataBinding('/form/email');
  
  return (
    <input
      type="email"
      value={email || ''}
      onChange={(e) => setEmail(e.target.value)}
    />
  );
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">
        Using the Data Context
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Access the full data context for advanced use cases:
      </p>
      <Code lang="tsx">{`import { useData } from '@json-render/react';

function DataDebugger() {
  const { data, setData, getValue, setValue } = useData();
  
  // Read any path
  const revenue = getValue('/metrics/revenue');
  
  // Write any path
  const updateRevenue = () => setValue('/metrics/revenue', 150000);
  
  // Replace all data
  const resetData = () => setData({ user: {}, form: {} });
  
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">In JSON UI Trees</h2>
      <p className="text-sm text-muted-foreground mb-4">
        AI can reference data paths in component props:
      </p>
      <Code lang="json">{`{
  "type": "Metric",
  "props": {
    "label": "Total Revenue",
    "valuePath": "/metrics/revenue",
    "format": "currency"
  }
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Next</h2>
      <p className="text-sm text-muted-foreground">
        Learn about{" "}
        <Link href="/docs/actions" className="text-foreground hover:underline">
          actions
        </Link>{" "}
        for user interactions.
      </p>
    </article>
  );
}



================================================
FILE: apps/web/app/docs/installation/page.tsx
================================================
import { PackageInstall } from "@/components/package-install";

export const metadata = {
  title: "Installation | json-render",
};

export default function InstallationPage() {
  return (
    <article>
      <h1 className="text-3xl font-bold mb-4">Installation</h1>
      <p className="text-muted-foreground mb-8">
        Install the core and React packages to get started.
      </p>

      <h2 className="text-xl font-semibold mt-12 mb-4">Install packages</h2>
      <PackageInstall packages="@json-render/core @json-render/react" />

      <h2 className="text-xl font-semibold mt-12 mb-4">Peer Dependencies</h2>
      <p className="text-sm text-muted-foreground mb-4">
        json-render requires the following peer dependencies:
      </p>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-4">
        <li>
          <code className="text-foreground">react</code> ^19.0.0
        </li>
        <li>
          <code className="text-foreground">zod</code> ^4.0.0
        </li>
      </ul>
      <PackageInstall packages="react zod" />

      <h2 className="text-xl font-semibold mt-12 mb-4">For AI Integration</h2>
      <p className="text-sm text-muted-foreground mb-4">
        To use json-render with AI models, you&apos;ll also need the Vercel AI
        SDK:
      </p>
      <PackageInstall packages="ai" />
    </article>
  );
}



================================================
FILE: apps/web/app/docs/quick-start/page.tsx
================================================
import Link from "next/link";
import { Code } from "@/components/code";

export const metadata = {
  title: "Quick Start | json-render",
};

export default function QuickStartPage() {
  return (
    <article>
      <h1 className="text-3xl font-bold mb-4">Quick Start</h1>
      <p className="text-muted-foreground mb-8">
        Get up and running with json-render in 5 minutes.
      </p>

      <h2 className="text-xl font-semibold mt-12 mb-4">
        1. Define your catalog
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Create a catalog that defines what components AI can use:
      </p>
      <Code lang="typescript">{`// lib/catalog.ts
import { createCatalog } from '@json-render/core';
import { z } from 'zod';

export const catalog = createCatalog({
  components: {
    Card: {
      props: z.object({
        title: z.string(),
        description: z.string().nullable(),
      }),
      hasChildren: true,
    },
    Button: {
      props: z.object({
        label: z.string(),
        action: z.string(),
      }),
    },
    Text: {
      props: z.object({
        content: z.string(),
      }),
    },
  },
  actions: {
    submit: {
      params: z.object({ formId: z.string() }),
    },
    navigate: {
      params: z.object({ url: z.string() }),
    },
  },
});`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">
        2. Create your components
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Register React components that render each catalog type:
      </p>
      <Code lang="tsx">{`// components/registry.tsx
export const registry = {
  Card: ({ element, children }) => (
    <div className="p-4 border rounded-lg">
      <h2 className="font-bold">{element.props.title}</h2>
      {element.props.description && (
        <p className="text-gray-600">{element.props.description}</p>
      )}
      {children}
    </div>
  ),
  Button: ({ element, onAction }) => (
    <button
      className="px-4 py-2 bg-blue-500 text-white rounded"
      onClick={() => onAction(element.props.action, {})}
    >
      {element.props.label}
    </button>
  ),
  Text: ({ element }) => (
    <p>{element.props.content}</p>
  ),
};`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">
        3. Create an API route
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Set up a streaming API route for AI generation:
      </p>
      <Code lang="typescript">{`// app/api/generate/route.ts
import { streamText } from 'ai';
import { generateCatalogPrompt } from '@json-render/core';
import { catalog } from '@/lib/catalog';

export async function POST(req: Request) {
  const { prompt } = await req.json();
  const systemPrompt = generateCatalogPrompt(catalog);

  const result = streamText({
    model: 'anthropic/claude-opus-4.5',
    system: systemPrompt,
    prompt,
  });

  return new Response(result.textStream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">4. Render the UI</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Use the providers and renderer to display AI-generated UI:
      </p>
      <Code lang="tsx">{`// app/page.tsx
'use client';

import { DataProvider, ActionProvider, VisibilityProvider, Renderer, useUIStream } from '@json-render/react';
import { registry } from '@/components/registry';

export default function Page() {
  const { tree, isLoading, generate } = useUIStream({
    endpoint: '/api/generate',
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    generate(formData.get('prompt') as string);
  };

  return (
    <DataProvider initialData={{}}>
      <VisibilityProvider>
        <ActionProvider handlers={{
          submit: (params) => console.log('Submit:', params),
          navigate: (params) => console.log('Navigate:', params),
        }}>
          <form onSubmit={handleSubmit}>
            <input
              name="prompt"
              placeholder="Describe what you want..."
              className="border p-2 rounded"
            />
            <button type="submit" disabled={isLoading}>
              Generate
            </button>
          </form>

          <div className="mt-8">
            <Renderer tree={tree} registry={registry} />
          </div>
        </ActionProvider>
      </VisibilityProvider>
    </DataProvider>
  );
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Next steps</h2>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
        <li>
          Learn about{" "}
          <Link
            href="/docs/catalog"
            className="text-foreground hover:underline"
          >
            catalogs
          </Link>{" "}
          in depth
        </li>
        <li>
          Explore{" "}
          <Link
            href="/docs/data-binding"
            className="text-foreground hover:underline"
          >
            data binding
          </Link>{" "}
          for dynamic values
        </li>
        <li>
          Add{" "}
          <Link
            href="/docs/actions"
            className="text-foreground hover:underline"
          >
            actions
          </Link>{" "}
          for interactivity
        </li>
        <li>
          Implement{" "}
          <Link
            href="/docs/visibility"
            className="text-foreground hover:underline"
          >
            conditional visibility
          </Link>
        </li>
      </ul>
    </article>
  );
}



================================================
FILE: apps/web/app/docs/streaming/page.tsx
================================================
import { Code } from "@/components/code";

export const metadata = {
  title: "Streaming | json-render",
};

export default function StreamingPage() {
  return (
    <article>
      <h1 className="text-3xl font-bold mb-4">Streaming</h1>
      <p className="text-muted-foreground mb-8">
        Progressively render UI as AI generates it.
      </p>

      <h2 className="text-xl font-semibold mt-12 mb-4">How Streaming Works</h2>
      <p className="text-sm text-muted-foreground mb-4">
        json-render uses JSONL (JSON Lines) streaming. As AI generates, each
        line represents a patch operation:
      </p>
      <Code lang="json">{`{"op":"set","path":"/root","value":{"key":"root","type":"Card","props":{"title":"Dashboard"}}}
{"op":"add","path":"/root/children","value":{"key":"metric-1","type":"Metric","props":{"label":"Revenue"}}}
{"op":"add","path":"/root/children","value":{"key":"metric-2","type":"Metric","props":{"label":"Users"}}}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">useUIStream Hook</h2>
      <p className="text-sm text-muted-foreground mb-4">
        The hook handles parsing and state management:
      </p>
      <Code lang="tsx">{`import { useUIStream } from '@json-render/react';

function App() {
  const {
    tree,        // Current UI tree state
    isLoading,   // True while streaming
    error,       // Any error that occurred
    generate,    // Function to start generation
    abort,       // Function to cancel streaming
  } = useUIStream({
    endpoint: '/api/generate',
  });
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Patch Operations</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Supported operations:
      </p>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2 mb-4">
        <li>
          <code className="text-foreground">set</code> — Set the value at a path
          (creates if needed)
        </li>
        <li>
          <code className="text-foreground">add</code> — Add to an array at a
          path
        </li>
        <li>
          <code className="text-foreground">replace</code> — Replace value at a
          path
        </li>
        <li>
          <code className="text-foreground">remove</code> — Remove value at a
          path
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-12 mb-4">Path Format</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Paths use a key-based format for elements:
      </p>
      <Code lang="bash">{`/root              -> Root element
/root/children     -> Children of root
/elements/card-1   -> Element with key "card-1"
/elements/card-1/children -> Children of card-1`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Server-Side Setup</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Ensure your API route streams properly:
      </p>
      <Code lang="typescript">{`export async function POST(req: Request) {
  const { prompt } = await req.json();
  
  const result = streamText({
    model: 'anthropic/claude-opus-4.5',
    system: generateCatalogPrompt(catalog),
    prompt,
  });

  // Return as a streaming response
  return new Response(result.textStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  });
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">
        Progressive Rendering
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        The Renderer automatically updates as the tree changes:
      </p>
      <Code lang="tsx">{`function App() {
  const { tree, isLoading } = useUIStream({ endpoint: '/api/generate' });

  return (
    <div>
      {isLoading && <LoadingIndicator />}
      <Renderer tree={tree} registry={registry} />
    </div>
  );
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Aborting Streams</h2>
      <Code lang="tsx">{`function App() {
  const { isLoading, generate, abort } = useUIStream({
    endpoint: '/api/generate',
  });

  return (
    <div>
      <button onClick={() => generate('Create dashboard')}>
        Generate
      </button>
      {isLoading && (
        <button onClick={abort}>Cancel</button>
      )}
    </div>
  );
}`}</Code>
    </article>
  );
}



================================================
FILE: apps/web/app/docs/validation/page.tsx
================================================
import Link from "next/link";
import { Code } from "@/components/code";

export const metadata = {
  title: "Validation | json-render",
};

export default function ValidationPage() {
  return (
    <article>
      <h1 className="text-3xl font-bold mb-4">Validation</h1>
      <p className="text-muted-foreground mb-8">
        Validate form inputs with built-in and custom functions.
      </p>

      <h2 className="text-xl font-semibold mt-12 mb-4">Built-in Validators</h2>
      <p className="text-sm text-muted-foreground mb-4">
        json-render includes common validation functions:
      </p>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-4">
        <li>
          <code className="text-foreground">required</code> — Value must be
          non-empty
        </li>
        <li>
          <code className="text-foreground">email</code> — Valid email format
        </li>
        <li>
          <code className="text-foreground">minLength</code> — Minimum string
          length
        </li>
        <li>
          <code className="text-foreground">maxLength</code> — Maximum string
          length
        </li>
        <li>
          <code className="text-foreground">pattern</code> — Match a regex
          pattern
        </li>
        <li>
          <code className="text-foreground">min</code> — Minimum numeric value
        </li>
        <li>
          <code className="text-foreground">max</code> — Maximum numeric value
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-12 mb-4">
        Using Validation in JSON
      </h2>
      <Code lang="json">{`{
  "type": "TextField",
  "props": {
    "label": "Email",
    "valuePath": "/form/email",
    "checks": [
      { "fn": "required", "message": "Email is required" },
      { "fn": "email", "message": "Invalid email format" }
    ],
    "validateOn": "blur"
  }
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">
        Validation with Parameters
      </h2>
      <Code lang="json">{`{
  "type": "TextField",
  "props": {
    "label": "Password",
    "valuePath": "/form/password",
    "checks": [
      { "fn": "required", "message": "Password is required" },
      { 
        "fn": "minLength", 
        "args": { "length": 8 },
        "message": "Password must be at least 8 characters"
      },
      {
        "fn": "pattern",
        "args": { "pattern": "[A-Z]" },
        "message": "Must contain at least one uppercase letter"
      }
    ]
  }
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">
        Custom Validation Functions
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Define custom validators in your catalog:
      </p>
      <Code lang="typescript">{`const catalog = createCatalog({
  components: { /* ... */ },
  validationFunctions: {
    isValidPhone: {
      description: 'Validates phone number format',
    },
    isUniqueEmail: {
      description: 'Checks if email is not already registered',
    },
  },
});`}</Code>

      <p className="text-sm text-muted-foreground mb-4">
        Then implement them in your ValidationProvider:
      </p>
      <Code lang="tsx">{`import { ValidationProvider } from '@json-render/react';

function App() {
  const customValidators = {
    isValidPhone: (value) => {
      const phoneRegex = /^\\+?[1-9]\\d{1,14}$/;
      return phoneRegex.test(value);
    },
    isUniqueEmail: async (value) => {
      const response = await fetch(\`/api/check-email?email=\${value}\`);
      const { available } = await response.json();
      return available;
    },
  };

  return (
    <ValidationProvider functions={customValidators}>
      {/* Your UI */}
    </ValidationProvider>
  );
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Using in Components</h2>
      <Code lang="tsx">{`import { useFieldValidation } from '@json-render/react';

function TextField({ element }) {
  const { value, setValue, errors, validate } = useFieldValidation(
    element.props.valuePath,
    element.props.checks
  );

  return (
    <div>
      <label>{element.props.label}</label>
      <input
        value={value || ''}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => validate()}
      />
      {errors.map((error, i) => (
        <p key={i} className="text-red-500 text-sm">{error}</p>
      ))}
    </div>
  );
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Validation Timing</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Control when validation runs with{" "}
        <code className="text-foreground">validateOn</code>:
      </p>
      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
        <li>
          <code className="text-foreground">change</code> — Validate on every
          input change
        </li>
        <li>
          <code className="text-foreground">blur</code> — Validate when field
          loses focus
        </li>
        <li>
          <code className="text-foreground">submit</code> — Validate only on
          form submission
        </li>
      </ul>

      <h2 className="text-xl font-semibold mt-12 mb-4">Next</h2>
      <p className="text-sm text-muted-foreground">
        Learn about{" "}
        <Link href="/docs/ai-sdk" className="text-foreground hover:underline">
          AI SDK integration
        </Link>
        .
      </p>
    </article>
  );
}



================================================
FILE: apps/web/app/docs/visibility/page.tsx
================================================
import Link from "next/link";
import { Code } from "@/components/code";

export const metadata = {
  title: "Visibility | json-render",
};

export default function VisibilityPage() {
  return (
    <article>
      <h1 className="text-3xl font-bold mb-4">Visibility</h1>
      <p className="text-muted-foreground mb-8">
        Conditionally show or hide components based on data, auth, or logic.
      </p>

      <h2 className="text-xl font-semibold mt-12 mb-4">VisibilityProvider</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Wrap your app with VisibilityProvider to enable conditional rendering:
      </p>
      <Code lang="tsx">{`import { VisibilityProvider } from '@json-render/react';

function App() {
  return (
    <DataProvider initialData={data}>
      <VisibilityProvider>
        {/* Components can now use visibility conditions */}
      </VisibilityProvider>
    </DataProvider>
  );
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">
        Path-Based Visibility
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Show/hide based on data values:
      </p>
      <Code lang="json">{`{
  "type": "Alert",
  "props": { "message": "Form has errors" },
  "visible": { "path": "/form/hasErrors" }
}

// Visible when /form/hasErrors is truthy`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">
        Auth-Based Visibility
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Show/hide based on authentication state:
      </p>
      <Code lang="json">{`{
  "type": "AdminPanel",
  "visible": { "auth": "signedIn" }
}

// Options: "signedIn", "signedOut", "admin", etc.`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Logic Expressions</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Combine conditions with logic operators:
      </p>
      <Code lang="json">{`// AND - all conditions must be true
{
  "type": "SubmitButton",
  "visible": {
    "and": [
      { "path": "/form/isValid" },
      { "path": "/form/hasChanges" }
    ]
  }
}

// OR - any condition must be true
{
  "type": "HelpText",
  "visible": {
    "or": [
      { "path": "/user/isNew" },
      { "path": "/settings/showHelp" }
    ]
  }
}

// NOT - invert a condition
{
  "type": "WelcomeBanner",
  "visible": {
    "not": { "path": "/user/hasSeenWelcome" }
  }
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Comparison Operators</h2>
      <Code lang="json">{`// Equal
{
  "visible": {
    "eq": [{ "path": "/user/role" }, "admin"]
  }
}

// Greater than
{
  "visible": {
    "gt": [{ "path": "/cart/total" }, 100]
  }
}

// Available: eq, ne, gt, gte, lt, lte`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Complex Example</h2>
      <Code lang="json">{`{
  "type": "RefundButton",
  "props": { "label": "Process Refund" },
  "visible": {
    "and": [
      { "auth": "signedIn" },
      { "eq": [{ "path": "/user/role" }, "support"] },
      { "gt": [{ "path": "/order/amount" }, 0] },
      { "not": { "path": "/order/isRefunded" } }
    ]
  }
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Using in Components</h2>
      <Code lang="tsx">{`import { useIsVisible } from '@json-render/react';

function ConditionalContent({ element, children }) {
  const isVisible = useIsVisible(element.visible);
  
  if (!isVisible) return null;
  return <div>{children}</div>;
}`}</Code>

      <h2 className="text-xl font-semibold mt-12 mb-4">Next</h2>
      <p className="text-sm text-muted-foreground">
        Learn about{" "}
        <Link
          href="/docs/validation"
          className="text-foreground hover:underline"
        >
          form validation
        </Link>
        .
      </p>
    </article>
  );
}


Directory structure:
└── dashboard/
    ├── eslint.config.js
    ├── next-env.d.ts
    ├── next.config.js
    ├── package.json
    ├── tsconfig.json
    ├── .env.example
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── page.tsx
    │   └── api/
    │       └── generate/
    │           └── route.ts
    ├── components/
    │   └── ui/
    │       ├── alert.tsx
    │       ├── badge.tsx
    │       ├── button.tsx
    │       ├── card.tsx
    │       ├── chart.tsx
    │       ├── date-picker.tsx
    │       ├── divider.tsx
    │       ├── empty.tsx
    │       ├── grid.tsx
    │       ├── heading.tsx
    │       ├── index.ts
    │       ├── list.tsx
    │       ├── metric.tsx
    │       ├── select.tsx
    │       ├── stack.tsx
    │       ├── table.tsx
    │       ├── text-field.tsx
    │       └── text.tsx
    └── lib/
        └── catalog.ts


Files Content:

================================================
FILE: examples/dashboard/eslint.config.js
================================================
import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default nextJsConfig;



================================================
FILE: examples/dashboard/next-env.d.ts
================================================
/// <reference types="next" />
/// <reference types="next/image-types/global" />
import "./.next/dev/types/routes.d.ts";

// NOTE: This file should not be edited
// see https://nextjs.org/docs/app/api-reference/config/typescript for more information.



================================================
FILE: examples/dashboard/next.config.js
================================================
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@json-render/core', '@json-render/react'],
};

export default nextConfig;



================================================
FILE: examples/dashboard/package.json
================================================
{
  "name": "example-dashboard",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack --port 3001",
    "build": "next build",
    "start": "next start",
    "lint": "eslint --max-warnings 0"
  },
  "dependencies": {
    "@ai-sdk/gateway": "^3.0.13",
    "ai": "^6.0.33",
    "@json-render/core": "workspace:*",
    "@json-render/react": "workspace:*",
    "next": "16.1.1",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "@repo/eslint-config": "workspace:*",
    "@types/node": "^22.10.0",
    "@types/react": "19.2.3",
    "@types/react-dom": "19.2.3",
    "eslint": "^9.39.1",
    "typescript": "^5.7.2"
  }
}



================================================
FILE: examples/dashboard/tsconfig.json
================================================
{
  "extends": "../../packages/typescript-config/nextjs.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}



================================================
FILE: examples/dashboard/.env.example
================================================
# AI Gateway API Key (required for /api/generate endpoint)
# Get your key from https://gateway.ai.cloudflare.com or your AI provider
AI_GATEWAY_API_KEY=



================================================
FILE: examples/dashboard/app/globals.css
================================================
* {
  box-sizing: border-box;
}

:root {
  --background: #000;
  --foreground: #fafafa;
  --card: #0a0a0a;
  --border: #262626;
  --muted: #a3a3a3;
  --radius: 8px;
}

html,
body {
  margin: 0;
  padding: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: var(--background);
  color: var(--foreground);
  -webkit-font-smoothing: antialiased;
}

button {
  font-family: inherit;
  cursor: pointer;
}

input,
select,
textarea {
  font-family: inherit;
}

::selection {
  background: var(--foreground);
  color: var(--background);
}



================================================
FILE: examples/dashboard/app/layout.tsx
================================================
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dashboard | json-render",
  description: "AI-generated dashboard widgets with guardrails",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}



================================================
FILE: examples/dashboard/app/page.tsx
================================================
"use client";

import { useState, useCallback } from "react";
import {
  DataProvider,
  ActionProvider,
  VisibilityProvider,
  useUIStream,
  Renderer,
} from "@json-render/react";
import { componentRegistry } from "@/components/ui";

const INITIAL_DATA = {
  analytics: {
    revenue: 125000,
    growth: 0.15,
    customers: 1234,
    orders: 567,
    salesByRegion: [
      { label: "US", value: 45000 },
      { label: "EU", value: 35000 },
      { label: "Asia", value: 28000 },
      { label: "Other", value: 17000 },
    ],
    recentTransactions: [
      {
        id: "TXN001",
        customer: "Acme Corp",
        amount: 1500,
        status: "completed",
        date: "2024-01-15",
      },
      {
        id: "TXN002",
        customer: "Globex Inc",
        amount: 2300,
        status: "pending",
        date: "2024-01-14",
      },
      {
        id: "TXN003",
        customer: "Initech",
        amount: 890,
        status: "completed",
        date: "2024-01-13",
      },
      {
        id: "TXN004",
        customer: "Umbrella Co",
        amount: 4200,
        status: "completed",
        date: "2024-01-12",
      },
    ],
  },
  form: {
    dateRange: "",
    region: "",
  },
};

const ACTION_HANDLERS = {
  export_report: () => alert("Exporting report..."),
  refresh_data: () => alert("Refreshing data..."),
  view_details: (params: Record<string, unknown>) =>
    alert(`Details: ${JSON.stringify(params)}`),
  apply_filter: () => alert("Applying filters..."),
};

function DashboardContent() {
  const [prompt, setPrompt] = useState("");
  const { tree, isStreaming, error, send, clear } = useUIStream({
    api: "/api/generate",
    onError: (err) => console.error("Generation error:", err),
  });

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!prompt.trim()) return;
      await send(prompt, { data: INITIAL_DATA });
    },
    [prompt, send],
  );

  const examples = [
    "Revenue dashboard with metrics and chart",
    "Recent transactions table",
    "Customer count with trend",
  ];

  const hasElements = tree && Object.keys(tree.elements).length > 0;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
      <header style={{ marginBottom: 48 }}>
        <h1
          style={{
            margin: 0,
            fontSize: 32,
            fontWeight: 600,
            letterSpacing: "-0.02em",
          }}
        >
          Dashboard
        </h1>
        <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: 16 }}>
          Generate widgets from prompts. Constrained to your catalog.
        </p>
      </header>

      <form onSubmit={handleSubmit} style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you want..."
            disabled={isStreaming}
            style={{
              flex: 1,
              padding: "12px 16px",
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              color: "var(--foreground)",
              fontSize: 16,
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={isStreaming || !prompt.trim()}
            style={{
              padding: "12px 24px",
              background: isStreaming ? "var(--border)" : "var(--foreground)",
              color: "var(--background)",
              border: "none",
              borderRadius: "var(--radius)",
              fontSize: 16,
              fontWeight: 500,
              opacity: isStreaming || !prompt.trim() ? 0.5 : 1,
            }}
          >
            {isStreaming ? "Generating..." : "Generate"}
          </button>
          {hasElements && (
            <button
              type="button"
              onClick={clear}
              style={{
                padding: "12px 16px",
                background: "transparent",
                color: "var(--muted)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                fontSize: 16,
              }}
            >
              Clear
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => setPrompt(ex)}
              style={{
                padding: "6px 12px",
                background: "var(--card)",
                color: "var(--muted)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                fontSize: 13,
              }}
            >
              {ex}
            </button>
          ))}
        </div>
      </form>

      {error && (
        <div
          style={{
            padding: 16,
            marginBottom: 24,
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            color: "#ef4444",
            fontSize: 14,
          }}
        >
          {error.message}
        </div>
      )}

      <div
        style={{
          minHeight: 300,
          padding: 24,
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
        }}
      >
        {!hasElements && !isStreaming ? (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "var(--muted)",
            }}
          >
            <p style={{ margin: 0 }}>Enter a prompt to generate a widget</p>
          </div>
        ) : tree ? (
          <Renderer
            tree={tree}
            registry={componentRegistry}
            loading={isStreaming}
          />
        ) : null}
      </div>

      {hasElements && (
        <details style={{ marginTop: 24 }}>
          <summary
            style={{ cursor: "pointer", fontSize: 14, color: "var(--muted)" }}
          >
            View JSON
          </summary>
          <pre
            style={{
              marginTop: 8,
              padding: 16,
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              overflow: "auto",
              fontSize: 12,
              color: "var(--muted)",
            }}
          >
            {JSON.stringify(tree, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <DataProvider initialData={INITIAL_DATA}>
      <VisibilityProvider>
        <ActionProvider handlers={ACTION_HANDLERS}>
          <DashboardContent />
        </ActionProvider>
      </VisibilityProvider>
    </DataProvider>
  );
}



================================================
FILE: examples/dashboard/app/api/generate/route.ts
================================================
import { streamText } from "ai";
import { componentList } from "@/lib/catalog";

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are a dashboard widget generator that outputs JSONL (JSON Lines) patches.

AVAILABLE COMPONENTS:
${componentList.join(", ")}

COMPONENT DETAILS:
- Card: { title?: string, description?: string, padding?: "sm"|"md"|"lg" } - Container with optional title
- Grid: { columns?: 1-4, gap?: "sm"|"md"|"lg" } - Grid layout
- Stack: { direction?: "horizontal"|"vertical", gap?: "sm"|"md"|"lg", align?: "start"|"center"|"end"|"stretch" } - Flex layout
- Metric: { label: string, valuePath: string, format?: "number"|"currency"|"percent", trend?: "up"|"down"|"neutral", trendValue?: string }
- Chart: { type: "bar"|"line"|"pie"|"area", dataPath: string, title?: string, height?: number }
- Table: { dataPath: string, columns: [{ key: string, label: string, format?: "text"|"currency"|"date"|"badge" }] }
- Button: { label: string, action: string, variant?: "primary"|"secondary"|"danger"|"ghost" }
- Heading: { text: string, level?: "h1"|"h2"|"h3"|"h4" }
- Text: { content: string, variant?: "body"|"caption"|"label", color?: "default"|"muted"|"success"|"warning"|"danger" }
- Badge: { text: string, variant?: "default"|"success"|"warning"|"danger"|"info" }
- Alert: { type: "info"|"success"|"warning"|"error", title: string, message?: string }

DATA BINDING:
- valuePath: "/analytics/revenue" (for single values like Metric)
- dataPath: "/analytics/salesByRegion" (for arrays like Chart, Table)

OUTPUT FORMAT:
Output JSONL where each line is a patch operation. Use a FLAT key-based structure:

OPERATIONS:
- {"op":"set","path":"/root","value":"main-card"} - Set the root element key
- {"op":"add","path":"/elements/main-card","value":{...}} - Add an element by unique key

ELEMENT STRUCTURE:
{
  "key": "unique-key",
  "type": "ComponentType",
  "props": { ... },
  "children": ["child-key-1", "child-key-2"]  // Array of child element keys
}

RULES:
1. First set /root to the root element's key
2. Add each element with a unique key using /elements/{key}
3. Parent elements list child keys in their "children" array
4. Stream elements progressively - parent first, then children
5. Each element must have: key, type, props
6. Children array contains STRING KEYS, not nested objects

EXAMPLE - Revenue Dashboard:
{"op":"set","path":"/root","value":"main-card"}
{"op":"add","path":"/elements/main-card","value":{"key":"main-card","type":"Card","props":{"title":"Revenue Dashboard","padding":"md"},"children":["metrics-grid","chart"]}}
{"op":"add","path":"/elements/metrics-grid","value":{"key":"metrics-grid","type":"Grid","props":{"columns":2,"gap":"md"},"children":["revenue-metric","growth-metric"]}}
{"op":"add","path":"/elements/revenue-metric","value":{"key":"revenue-metric","type":"Metric","props":{"label":"Total Revenue","valuePath":"/analytics/revenue","format":"currency","trend":"up","trendValue":"+15%"}}}
{"op":"add","path":"/elements/growth-metric","value":{"key":"growth-metric","type":"Metric","props":{"label":"Growth Rate","valuePath":"/analytics/growth","format":"percent"}}}
{"op":"add","path":"/elements/chart","value":{"key":"chart","type":"Chart","props":{"type":"bar","dataPath":"/analytics/salesByRegion","title":"Sales by Region"}}}

Generate JSONL patches now:`;

export async function POST(req: Request) {
  const { prompt, context } = await req.json();

  let fullPrompt = prompt;

  // Add data context
  if (context?.data) {
    fullPrompt += `\n\nAVAILABLE DATA:\n${JSON.stringify(context.data, null, 2)}`;
  }

  const result = streamText({
    model: "anthropic/claude-opus-4.5",
    system: SYSTEM_PROMPT,
    prompt: fullPrompt,
    temperature: 0.7,
  });

  return result.toTextStreamResponse();
}



================================================
FILE: examples/dashboard/components/ui/alert.tsx
================================================
"use client";

import { type ComponentRenderProps } from "@json-render/react";
import { useData } from "@json-render/react";
import { getByPath } from "@json-render/core";

function useResolvedValue<T>(
  value: T | { path: string } | null | undefined,
): T | undefined {
  const { data } = useData();
  if (value === null || value === undefined) return undefined;
  if (typeof value === "object" && "path" in value) {
    return getByPath(data, value.path) as T | undefined;
  }
  return value as T;
}

export function Alert({ element }: ComponentRenderProps) {
  const { message, variant } = element.props as {
    message: string | { path: string };
    variant?: string | null;
  };
  const resolvedMessage = useResolvedValue(message);

  const colors: Record<string, string> = {
    info: "var(--muted)",
    success: "#22c55e",
    warning: "#eab308",
    error: "#ef4444",
  };

  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: "var(--radius)",
        background: "var(--card)",
        border: "1px solid var(--border)",
        fontSize: 14,
        color: colors[variant || "info"],
      }}
    >
      {resolvedMessage}
    </div>
  );
}



================================================
FILE: examples/dashboard/components/ui/badge.tsx
================================================
"use client";

import { type ComponentRenderProps } from "@json-render/react";
import { useData } from "@json-render/react";
import { getByPath } from "@json-render/core";

function useResolvedValue<T>(
  value: T | { path: string } | null | undefined,
): T | undefined {
  const { data } = useData();
  if (value === null || value === undefined) return undefined;
  if (typeof value === "object" && "path" in value) {
    return getByPath(data, value.path) as T | undefined;
  }
  return value as T;
}

export function Badge({ element }: ComponentRenderProps) {
  const { text, variant } = element.props as {
    text: string | { path: string };
    variant?: string | null;
  };
  const resolvedText = useResolvedValue(text);

  const colors: Record<string, string> = {
    default: "var(--foreground)",
    success: "#22c55e",
    warning: "#eab308",
    error: "#ef4444",
    info: "var(--muted)",
  };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 500,
        background: "var(--border)",
        color: colors[variant || "default"],
      }}
    >
      {resolvedText}
    </span>
  );
}



================================================
FILE: examples/dashboard/components/ui/button.tsx
================================================
"use client";

import React from "react";
import { type ComponentRenderProps } from "@json-render/react";

export function Button({ element, onAction, loading }: ComponentRenderProps) {
  const { label, variant, action, disabled } = element.props as {
    label: string;
    variant?: string | null;
    action: { name: string };
    disabled?: boolean | null;
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: "var(--foreground)",
      color: "var(--background)",
      border: "none",
    },
    secondary: {
      background: "transparent",
      color: "var(--foreground)",
      border: "1px solid var(--border)",
    },
    danger: { background: "#dc2626", color: "#fff", border: "none" },
    ghost: { background: "transparent", color: "var(--muted)", border: "none" },
  };

  return (
    <button
      onClick={() => !disabled && action && onAction?.(action)}
      disabled={!!disabled || loading}
      style={{
        padding: "8px 16px",
        borderRadius: "var(--radius)",
        fontSize: 14,
        fontWeight: 500,
        opacity: disabled ? 0.5 : 1,
        ...variants[variant || "primary"],
      }}
    >
      {loading ? "Loading..." : label}
    </button>
  );
}



================================================
FILE: examples/dashboard/components/ui/card.tsx
================================================
"use client";

import { type ComponentRenderProps } from "@json-render/react";

export function Card({ element, children }: ComponentRenderProps) {
  const { title, description, padding } = element.props as {
    title?: string | null;
    description?: string | null;
    padding?: string | null;
  };

  const paddings: Record<string, string> = {
    none: "0",
    sm: "12px",
    lg: "24px",
  };

  return (
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
      }}
    >
      {(title || description) && (
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {title && (
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
              {title}
            </h3>
          )}
          {description && (
            <p
              style={{ margin: "4px 0 0", fontSize: 14, color: "var(--muted)" }}
            >
              {description}
            </p>
          )}
        </div>
      )}
      <div style={{ padding: paddings[padding || ""] || "16px" }}>
        {children}
      </div>
    </div>
  );
}



================================================
FILE: examples/dashboard/components/ui/chart.tsx
================================================
"use client";

import { type ComponentRenderProps } from "@json-render/react";
import { useData } from "@json-render/react";
import { getByPath } from "@json-render/core";

export function Chart({ element }: ComponentRenderProps) {
  const { title, dataPath } = element.props as {
    title?: string | null;
    dataPath: string;
  };
  const { data } = useData();
  const chartData = getByPath(data, dataPath) as
    | Array<{ label: string; value: number }>
    | undefined;

  if (!chartData || !Array.isArray(chartData)) {
    return <div style={{ padding: 20, color: "var(--muted)" }}>No data</div>;
  }

  const maxValue = Math.max(...chartData.map((d) => d.value));

  return (
    <div>
      {title && (
        <h4 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600 }}>
          {title}
        </h4>
      )}
      <div
        style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 120 }}
      >
        {chartData.map((d, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <div
              style={{
                width: "100%",
                height: `${(d.value / maxValue) * 100}%`,
                background: "var(--foreground)",
                borderRadius: "4px 4px 0 0",
                minHeight: 4,
              }}
            />
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}



================================================
FILE: examples/dashboard/components/ui/date-picker.tsx
================================================
"use client";

import { type ComponentRenderProps } from "@json-render/react";
import { useData } from "@json-render/react";
import { getByPath } from "@json-render/core";

export function DatePicker({ element }: ComponentRenderProps) {
  const { label, valuePath } = element.props as {
    label: string;
    valuePath: string;
  };
  const { data, set } = useData();
  const value = getByPath(data, valuePath) as string | undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 14, fontWeight: 500 }}>{label}</label>
      <input
        type="date"
        value={value ?? ""}
        onChange={(e) => set(valuePath, e.target.value)}
        style={{
          padding: "8px 12px",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          background: "var(--card)",
          color: "var(--foreground)",
          fontSize: 16,
          outline: "none",
        }}
      />
    </div>
  );
}



================================================
FILE: examples/dashboard/components/ui/divider.tsx
================================================
"use client";

import { type ComponentRenderProps } from "@json-render/react";

export function Divider({ element }: ComponentRenderProps) {
  const { orientation } = element.props as { orientation?: string | null };
  if (orientation === "vertical") {
    return (
      <div
        style={{ width: 1, background: "var(--border)", alignSelf: "stretch" }}
      />
    );
  }
  return (
    <hr
      style={{
        border: "none",
        borderTop: "1px solid var(--border)",
        margin: "16px 0",
      }}
    />
  );
}



================================================
FILE: examples/dashboard/components/ui/empty.tsx
================================================
"use client";

import { type ComponentRenderProps } from "@json-render/react";

export function Empty({ element }: ComponentRenderProps) {
  const { title, description } = element.props as {
    title: string;
    description?: string | null;
  };

  return (
    <div style={{ textAlign: "center", padding: "40px 20px" }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>
        {title}
      </h3>
      {description && (
        <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>
          {description}
        </p>
      )}
    </div>
  );
}



================================================
FILE: examples/dashboard/components/ui/grid.tsx
================================================
"use client";

import { type ComponentRenderProps } from "@json-render/react";

export function Grid({ element, children }: ComponentRenderProps) {
  const { columns, gap } = element.props as {
    columns?: number | null;
    gap?: string | null;
  };
  const gaps: Record<string, string> = {
    none: "0",
    sm: "8px",
    md: "16px",
    lg: "24px",
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns || 2}, 1fr)`,
        gap: gaps[gap || "md"],
      }}
    >
      {children}
    </div>
  );
}



================================================
FILE: examples/dashboard/components/ui/heading.tsx
================================================
"use client";

import React from "react";
import { type ComponentRenderProps } from "@json-render/react";

export function Heading({ element }: ComponentRenderProps) {
  const { text, level } = element.props as {
    text: string;
    level?: string | null;
  };
  const Tag = (level || "h2") as keyof React.JSX.IntrinsicElements;
  const sizes: Record<string, string> = {
    h1: "28px",
    h2: "24px",
    h3: "20px",
    h4: "16px",
  };
  return (
    <Tag
      style={{
        margin: "0 0 16px",
        fontSize: sizes[level || "h2"],
        fontWeight: 600,
      }}
    >
      {text}
    </Tag>
  );
}



================================================
FILE: examples/dashboard/components/ui/index.ts
================================================
export { Alert } from "./alert";
export { Badge } from "./badge";
export { Button } from "./button";
export { Card } from "./card";
export { Chart } from "./chart";
export { DatePicker } from "./date-picker";
export { Divider } from "./divider";
export { Empty } from "./empty";
export { Grid } from "./grid";
export { Heading } from "./heading";
export { List } from "./list";
export { Metric } from "./metric";
export { Select } from "./select";
export { Stack } from "./stack";
export { Table } from "./table";
export { Text } from "./text";
export { TextField } from "./text-field";

import { Alert } from "./alert";
import { Badge } from "./badge";
import { Button } from "./button";
import { Card } from "./card";
import { Chart } from "./chart";
import { DatePicker } from "./date-picker";
import { Divider } from "./divider";
import { Empty } from "./empty";
import { Grid } from "./grid";
import { Heading } from "./heading";
import { List } from "./list";
import { Metric } from "./metric";
import { Select } from "./select";
import { Stack } from "./stack";
import { Table } from "./table";
import { Text } from "./text";
import { TextField } from "./text-field";

export const componentRegistry = {
  Alert,
  Badge,
  Button,
  Card,
  Chart,
  DatePicker,
  Divider,
  Empty,
  Grid,
  Heading,
  List,
  Metric,
  Select,
  Stack,
  Table,
  Text,
  TextField,
};



================================================
FILE: examples/dashboard/components/ui/list.tsx
================================================
"use client";

import { type ComponentRenderProps } from "@json-render/react";
import { useData } from "@json-render/react";
import { getByPath } from "@json-render/core";

export function List({ element, children }: ComponentRenderProps) {
  const { dataPath } = element.props as { dataPath: string };
  const { data } = useData();
  const listData = getByPath(data, dataPath) as Array<unknown> | undefined;

  if (!listData || !Array.isArray(listData)) {
    return <div style={{ color: "var(--muted)" }}>No items</div>;
  }

  return <div>{children}</div>;
}



================================================
FILE: examples/dashboard/components/ui/metric.tsx
================================================
"use client";

import { type ComponentRenderProps } from "@json-render/react";
import { useData } from "@json-render/react";
import { getByPath } from "@json-render/core";

export function Metric({ element }: ComponentRenderProps) {
  const { label, valuePath, format, trend, trendValue } = element.props as {
    label: string;
    valuePath: string;
    format?: string | null;
    trend?: string | null;
    trendValue?: string | null;
  };

  const { data } = useData();
  const rawValue = getByPath(data, valuePath);

  let displayValue = String(rawValue ?? "-");
  if (format === "currency" && typeof rawValue === "number") {
    displayValue = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(rawValue);
  } else if (format === "percent" && typeof rawValue === "number") {
    displayValue = new Intl.NumberFormat("en-US", {
      style: "percent",
      minimumFractionDigits: 1,
    }).format(rawValue);
  } else if (format === "number" && typeof rawValue === "number") {
    displayValue = new Intl.NumberFormat("en-US").format(rawValue);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 14, color: "var(--muted)" }}>{label}</span>
      <span style={{ fontSize: 32, fontWeight: 600 }}>{displayValue}</span>
      {(trend || trendValue) && (
        <span
          style={{
            fontSize: 14,
            color:
              trend === "up"
                ? "#22c55e"
                : trend === "down"
                  ? "#ef4444"
                  : "var(--muted)",
          }}
        >
          {trend === "up" ? "+" : trend === "down" ? "-" : ""}
          {trendValue}
        </span>
      )}
    </div>
  );
}



================================================
FILE: examples/dashboard/components/ui/select.tsx
================================================
"use client";

import { type ComponentRenderProps } from "@json-render/react";
import { useData } from "@json-render/react";
import { getByPath } from "@json-render/core";

export function Select({ element }: ComponentRenderProps) {
  const { label, valuePath, options, placeholder } = element.props as {
    label: string;
    valuePath: string;
    options: Array<{ value: string; label: string }>;
    placeholder?: string | null;
  };

  const { data, set } = useData();
  const value = getByPath(data, valuePath) as string | undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 14, fontWeight: 500 }}>{label}</label>
      <select
        value={value ?? ""}
        onChange={(e) => set(valuePath, e.target.value)}
        style={{
          padding: "8px 12px",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          background: "var(--card)",
          color: "var(--foreground)",
          fontSize: 16,
          outline: "none",
        }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}



================================================
FILE: examples/dashboard/components/ui/stack.tsx
================================================
"use client";

import { type ComponentRenderProps } from "@json-render/react";

export function Stack({ element, children }: ComponentRenderProps) {
  const { direction, gap, align } = element.props as {
    direction?: string | null;
    gap?: string | null;
    align?: string | null;
  };
  const gaps: Record<string, string> = {
    none: "0",
    sm: "8px",
    md: "16px",
    lg: "24px",
  };
  const alignments: Record<string, string> = {
    start: "flex-start",
    center: "center",
    end: "flex-end",
    stretch: "stretch",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: direction === "horizontal" ? "row" : "column",
        gap: gaps[gap || "md"],
        alignItems: alignments[align || "stretch"],
      }}
    >
      {children}
    </div>
  );
}



================================================
FILE: examples/dashboard/components/ui/table.tsx
================================================
"use client";

import { type ComponentRenderProps } from "@json-render/react";
import { useData } from "@json-render/react";
import { getByPath } from "@json-render/core";

export function Table({ element }: ComponentRenderProps) {
  const { title, dataPath, columns } = element.props as {
    title?: string | null;
    dataPath: string;
    columns: Array<{ key: string; label: string; format?: string | null }>;
  };

  const { data } = useData();
  const tableData = getByPath(data, dataPath) as
    | Array<Record<string, unknown>>
    | undefined;

  if (!tableData || !Array.isArray(tableData)) {
    return <div style={{ padding: 20, color: "var(--muted)" }}>No data</div>;
  }

  const formatCell = (value: unknown, format?: string | null) => {
    if (value === null || value === undefined) return "-";
    if (format === "currency" && typeof value === "number") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value);
    }
    if (format === "date" && typeof value === "string") {
      return new Date(value).toLocaleDateString();
    }
    if (format === "badge") {
      return (
        <span
          style={{
            padding: "2px 8px",
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 500,
            background: "var(--border)",
            color: "var(--foreground)",
          }}
        >
          {String(value)}
        </span>
      );
    }
    return String(value);
  };

  return (
    <div>
      {title && (
        <h4 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 600 }}>
          {title}
        </h4>
      )}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  textAlign: "left",
                  padding: "12px 8px",
                  borderBottom: "1px solid var(--border)",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableData.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  style={{
                    padding: "12px 8px",
                    borderBottom: "1px solid var(--border)",
                    fontSize: 14,
                  }}
                >
                  {formatCell(row[col.key], col.format)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}



================================================
FILE: examples/dashboard/components/ui/text-field.tsx
================================================
"use client";

import { type ComponentRenderProps } from "@json-render/react";
import { useData, useFieldValidation } from "@json-render/react";
import { getByPath } from "@json-render/core";

export function TextField({ element }: ComponentRenderProps) {
  const { label, valuePath, placeholder, type, checks, validateOn } =
    element.props as {
      label: string;
      valuePath: string;
      placeholder?: string | null;
      type?: string | null;
      checks?: Array<{ fn: string; message: string }> | null;
      validateOn?: string | null;
    };

  const { data, set } = useData();
  const value = getByPath(data, valuePath) as string | undefined;
  const { errors, validate, touch } = useFieldValidation(valuePath, {
    checks: checks ?? undefined,
    validateOn: (validateOn as "change" | "blur" | "submit") ?? "blur",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 14, fontWeight: 500 }}>{label}</label>
      <input
        type={type || "text"}
        value={value ?? ""}
        onChange={(e) => {
          set(valuePath, e.target.value);
          if (validateOn === "change") validate();
        }}
        onBlur={() => {
          touch();
          if (validateOn === "blur" || !validateOn) validate();
        }}
        placeholder={placeholder ?? ""}
        style={{
          padding: "8px 12px",
          borderRadius: "var(--radius)",
          border:
            errors.length > 0 ? "1px solid #ef4444" : "1px solid var(--border)",
          background: "var(--card)",
          color: "var(--foreground)",
          fontSize: 16,
          outline: "none",
        }}
      />
      {errors.map((error, i) => (
        <span key={i} style={{ fontSize: 12, color: "#ef4444" }}>
          {error}
        </span>
      ))}
    </div>
  );
}



================================================
FILE: examples/dashboard/components/ui/text.tsx
================================================
"use client";

import { type ComponentRenderProps } from "@json-render/react";

export function Text({ element }: ComponentRenderProps) {
  const { content, variant } = element.props as {
    content: string;
    variant?: string | null;
  };
  const colors: Record<string, string> = {
    default: "var(--foreground)",
    muted: "var(--muted)",
    success: "#22c55e",
    warning: "#eab308",
    error: "#ef4444",
  };
  return (
    <p style={{ margin: 0, color: colors[variant || "default"] }}>{content}</p>
  );
}



================================================
FILE: examples/dashboard/lib/catalog.ts
================================================
import { createCatalog } from "@json-render/core";
import { z } from "zod";

/**
 * Dashboard component catalog
 *
 * This defines the ONLY components that the AI can generate.
 * It acts as a guardrail - the AI cannot create arbitrary HTML/CSS.
 *
 * Note: OpenAI structured output requires all fields to be required.
 * Use .nullable() instead of .optional() for optional fields.
 */
export const dashboardCatalog = createCatalog({
  name: "dashboard",
  components: {
    // Layout Components
    Card: {
      props: z.object({
        title: z.string().nullable(),
        description: z.string().nullable(),
        padding: z.enum(["sm", "md", "lg"]).nullable(),
      }),
      hasChildren: true,
      description: "A card container with optional title",
    },

    Grid: {
      props: z.object({
        columns: z.number().min(1).max(4).nullable(),
        gap: z.enum(["sm", "md", "lg"]).nullable(),
      }),
      hasChildren: true,
      description: "Grid layout with configurable columns",
    },

    Stack: {
      props: z.object({
        direction: z.enum(["horizontal", "vertical"]).nullable(),
        gap: z.enum(["sm", "md", "lg"]).nullable(),
        align: z.enum(["start", "center", "end", "stretch"]).nullable(),
      }),
      hasChildren: true,
      description: "Flex stack for horizontal or vertical layouts",
    },

    // Data Display Components
    Metric: {
      props: z.object({
        label: z.string(),
        valuePath: z.string(),
        format: z.enum(["number", "currency", "percent"]).nullable(),
        trend: z.enum(["up", "down", "neutral"]).nullable(),
        trendValue: z.string().nullable(),
      }),
      description: "Display a single metric with optional trend indicator",
    },

    Chart: {
      props: z.object({
        type: z.enum(["bar", "line", "pie", "area"]),
        dataPath: z.string(),
        title: z.string().nullable(),
        height: z.number().nullable(),
      }),
      description: "Display a chart from array data",
    },

    Table: {
      props: z.object({
        dataPath: z.string(),
        columns: z.array(
          z.object({
            key: z.string(),
            label: z.string(),
            format: z.enum(["text", "currency", "date", "badge"]).nullable(),
          }),
        ),
      }),
      description: "Display tabular data",
    },

    List: {
      props: z.object({
        dataPath: z.string(),
        emptyMessage: z.string().nullable(),
      }),
      hasChildren: true,
      description: "Render a list from array data",
    },

    // Interactive Components
    Button: {
      props: z.object({
        label: z.string(),
        variant: z.enum(["primary", "secondary", "danger", "ghost"]).nullable(),
        size: z.enum(["sm", "md", "lg"]).nullable(),
        action: z.string(),
        disabled: z.boolean().nullable(),
      }),
      description: "Clickable button with action",
    },

    Select: {
      props: z.object({
        label: z.string().nullable(),
        bindPath: z.string(),
        options: z.array(
          z.object({
            value: z.string(),
            label: z.string(),
          }),
        ),
        placeholder: z.string().nullable(),
      }),
      description: "Dropdown select input",
    },

    DatePicker: {
      props: z.object({
        label: z.string().nullable(),
        bindPath: z.string(),
        placeholder: z.string().nullable(),
      }),
      description: "Date picker input",
    },

    // Typography
    Heading: {
      props: z.object({
        text: z.string(),
        level: z.enum(["h1", "h2", "h3", "h4"]).nullable(),
      }),
      description: "Section heading",
    },

    Text: {
      props: z.object({
        content: z.string(),
        variant: z.enum(["body", "caption", "label"]).nullable(),
        color: z
          .enum(["default", "muted", "success", "warning", "danger"])
          .nullable(),
      }),
      description: "Text paragraph",
    },

    // Status Components
    Badge: {
      props: z.object({
        text: z.string(),
        variant: z
          .enum(["default", "success", "warning", "danger", "info"])
          .nullable(),
      }),
      description: "Small status badge",
    },

    Alert: {
      props: z.object({
        type: z.enum(["info", "success", "warning", "error"]),
        title: z.string(),
        message: z.string().nullable(),
        dismissible: z.boolean().nullable(),
      }),
      description: "Alert/notification banner",
    },

    // Special Components
    Divider: {
      props: z.object({
        label: z.string().nullable(),
      }),
      description: "Visual divider",
    },

    Empty: {
      props: z.object({
        title: z.string(),
        description: z.string().nullable(),
        action: z.string().nullable(),
        actionLabel: z.string().nullable(),
      }),
      description: "Empty state placeholder",
    },
  },
  actions: {
    export_report: { description: "Export the current dashboard to PDF" },
    refresh_data: { description: "Refresh all metrics and charts" },
    view_details: { description: "View detailed information" },
    apply_filter: { description: "Apply the current filter settings" },
  },
  validation: "strict",
});

// Export the component list for the AI prompt
export const componentList = dashboardCatalog.componentNames as string[];


