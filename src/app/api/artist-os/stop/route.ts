import { requireAdmin } from "@/lib/artist-os/admin";
import { forceReleaseArtistLock } from "@/lib/artist-os/lock";
import { stopSandboxByArtist, stopSandboxById } from "@/lib/artist-os/sandbox";
import { ArtistIdSchema } from "@/lib/artist-os/validation";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const guard = requireAdmin(req);
  if (guard) {
    return guard;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const payload = body as { artist_id?: string; sandbox_id?: string };

  if (!payload.artist_id && !payload.sandbox_id) {
    return Response.json(
      { error: "artist_id or sandbox_id is required" },
      { status: 400 }
    );
  }

  // Validate artist_id if provided
  if (payload.artist_id) {
    const parsedId = ArtistIdSchema.safeParse(payload.artist_id);
    if (!parsedId.success) {
      return Response.json(
        { error: "Invalid artist_id", details: parsedId.error.flatten() },
        { status: 400 }
      );
    }
  }

  let stopped = false;
  let lockReleased = false;

  if (payload.sandbox_id) {
    const result = await stopSandboxById(payload.sandbox_id);
    stopped = result.stopped;
    // Release lock for the associated artist when stopping by sandbox_id
    // Release even if stop failed since this is admin cleanup and sandbox is evicted from cache
    if (result.artistId) {
      lockReleased = await forceReleaseArtistLock(result.artistId);
    }
  } else if (payload.artist_id) {
    stopped = await stopSandboxByArtist(payload.artist_id);
    // Always release the lock for admin cleanup, even if no sandbox was stopped
    // The lock is in Redis (shared) but sandbox cache is per-instance, so a
    // sandbox may exist on another instance that we can't stop from here
    lockReleased = await forceReleaseArtistLock(payload.artist_id);
  }

  return Response.json({ stopped, lockReleased });
}
