This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Artist OS MVP

Artist OS runs an autonomous agent inside a Vercel Sandbox and persists its workspace in Vercel Blob snapshots. The main entry point is:

- `POST /api/artist-os/query` (SSE stream of status/log events)

### Required Environment

Populate `.env.local` (or use `vercel env pull`) with:

- `BLOB_READ_WRITE_TOKEN`
- `REDIS_URL`
- `ANTHROPIC_API_KEY`
- `ARTIST_OS_ADMIN_TOKEN` (for admin snapshot/stop routes)

Optional tuning:

- `ARTIST_OS_RATE_LIMIT_WINDOW` (default `1m`)
- `ARTIST_OS_RATE_LIMIT_USER` (default `10`)
- `ARTIST_OS_RATE_LIMIT_ARTIST` (default `5`)
- `ARTIST_OS_WARM_TTL` (default `5m`)
- `ARTIST_OS_SANDBOX_TIMEOUT` (default `15m`)

### Base Snapshot

Create the base snapshot once before running the agent:

```bash
npx tsx scripts/build-base-snapshot.ts
```

### Example Query

```bash
curl -X POST http://localhost:3000/api/artist-os/query \
  -H "Content-Type: application/json" \
  -H "x-user-id: user_123" \
  -d '{"artist_id":"user_123_demo","prompt":"What is in my workspace?"}' \
  --no-buffer
```

### Docs

- `docs/artist-os-api.md` for request/response examples
- `docs/artist-os-runbook.md` for operational procedures

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
