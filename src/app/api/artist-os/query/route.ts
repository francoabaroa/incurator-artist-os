import ms from "ms";
import { QueryRequestSchema } from "@/lib/artist-os/validation";
import {
  getAuthUserId,
  getIncuratorUserId,
  InvalidIncuratorUserIdError,
  userOwnsArtist,
} from "@/lib/artist-os/auth";
import { checkRateLimit } from "@/lib/artist-os/rate-limit";
import { acquireArtistLock } from "@/lib/artist-os/lock";
import { getOrCreateSandbox, stopSandboxByArtist } from "@/lib/artist-os/sandbox";
import {
  exportArtistSnapshot,
  restoreArtistSnapshot,
  restoreBaseSnapshot,
} from "@/lib/artist-os/snapshot";
import {
  ResumeSessionMetadataError,
  resolveSessionContextForRequest,
  storeSessionMetadata,
} from "@/lib/artist-os/session-metadata";
import type { SessionMode } from "@/lib/artist-os/session-mode";
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

  let requestedIncuratorUserId: string | null;
  try {
    requestedIncuratorUserId = getIncuratorUserId(req);
  } catch (error) {
    if (error instanceof InvalidIncuratorUserIdError) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }

  const {
    artist_id: artistId,
    prompt,
    resume_session_id,
    session_mode,
  } = parsed.data;
  if (!userOwnsArtist(req, userId, artistId)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let resolvedSessionMode: SessionMode;
  let resolvedIncuratorUserId: string | undefined;
  try {
    const sessionContext = await resolveSessionContextForRequest({
      artistId,
      requestedSessionMode: session_mode,
      requestedIncuratorUserId: requestedIncuratorUserId ?? undefined,
      resumeSessionId: resume_session_id,
    });
    resolvedSessionMode = sessionContext.sessionMode;
    resolvedIncuratorUserId = sessionContext.incuratorUserId;
  } catch (error) {
    if (error instanceof ResumeSessionMetadataError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }

    throw error;
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
      let closed = false;

      const send = (event: string, data: unknown) => {
        if (closed) return; // Guard against writes after controller is closed
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
        const { exitCode, sessionId } = await runAgent(
          sandbox,
          prompt,
          resume_session_id,
          (log: LogData) => send("log", log),
          artistId,
          resolvedSessionMode,
          resolvedIncuratorUserId
        );

        send("status", { phase: "snapshot_export" } satisfies StatusData);
        const manifest = await exportArtistSnapshot(sandbox, artistId);
        let resumableSessionId = sessionId;

        if (sessionId) {
          try {
            await storeSessionMetadata(sessionId, {
              artistId,
              sessionMode: resolvedSessionMode,
              incuratorUserId: resolvedIncuratorUserId,
            });
          } catch (error) {
            console.error("[artist-os] Failed to store session metadata:", error);
            resumableSessionId = undefined;
          }
        }

        send("done", {
          ok: true,
          exitCode,
          sessionId: resumableSessionId,
          sessionMode: resolvedSessionMode,
          manifest,
        });
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

        closed = true;
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
