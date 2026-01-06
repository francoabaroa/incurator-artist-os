import ms from "ms";
import { QueryRequestSchema } from "@/lib/artist-os/validation";
import { getAuthUserId, userOwnsArtist } from "@/lib/artist-os/auth";
import { checkRateLimit } from "@/lib/artist-os/rate-limit";
import { acquireArtistLock } from "@/lib/artist-os/lock";
import { getOrCreateSandbox, stopSandboxByArtist } from "@/lib/artist-os/sandbox";
import {
  exportArtistSnapshot,
  restoreArtistSnapshot,
  restoreBaseSnapshot,
} from "@/lib/artist-os/snapshot";
import { runAgent } from "@/lib/artist-os/agent";
import type { LogData, StatusData } from "@/lib/artist-os/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = QueryRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const userId = getAuthUserId(req);
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { artist_id: artistId, prompt, resume_session_id } = parsed.data;
  if (!userOwnsArtist(req, userId, artistId)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const rate = await checkRateLimit({ userId, artistId });
  if (!rate.ok) {
    const headers = new Headers({
      "Content-Type": "application/json",
    });
    if (rate.retryAfterMs) {
      headers.set("Retry-After", Math.ceil(rate.retryAfterMs / 1000).toString());
    }
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers,
    });
  }

  const lock = await acquireArtistLock(artistId, ms("20m"));
  if (!lock) {
    return Response.json({ error: "Artist is busy" }, { status: 409 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      let hadError = false;
      let releaseSandbox: (() => Promise<void>) | null = null;

      try {
        send("status", { phase: "sandbox_create" } satisfies StatusData);
        const sandboxHandle = await getOrCreateSandbox(artistId);
        releaseSandbox = sandboxHandle.release;
        const sandbox = sandboxHandle.sandbox;

        send("status", { phase: "restore_base" } satisfies StatusData);
        await restoreBaseSnapshot(sandbox);

        send("status", { phase: "restore_artist" } satisfies StatusData);
        await restoreArtistSnapshot(sandbox, artistId);

        send("status", { phase: "agent_run_start" } satisfies StatusData);
        const exitCode = await runAgent(
          sandbox,
          prompt,
          resume_session_id,
          (log: LogData) => send("log", log)
        );

        send("status", { phase: "snapshot_export" } satisfies StatusData);
        const manifest = await exportArtistSnapshot(sandbox, artistId);

        send("done", { ok: true, exitCode, manifest });
      } catch (error) {
        hadError = true;
        send("error", { message: String(error) });
      } finally {
        try {
          if (hadError) {
            await stopSandboxByArtist(artistId);
          } else if (releaseSandbox) {
            await releaseSandbox();
          }
        } catch (error) {
          send("error", { message: `Sandbox cleanup error: ${String(error)}` });
        }

        try {
          await lock.release();
        } catch (error) {
          // Lock release failure shouldn't prevent stream close
          // The lock will auto-expire via TTL if release fails
          send("error", { message: `Lock release error: ${String(error)}` });
        }

        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
