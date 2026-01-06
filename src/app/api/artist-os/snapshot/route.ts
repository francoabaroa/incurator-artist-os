import { requireAdmin } from "@/lib/artist-os/admin";
import { getRedis } from "@/lib/artist-os/redis";
import { ArtistIdSchema } from "@/lib/artist-os/validation";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const guard = requireAdmin(req);
  if (guard) {
    return guard;
  }

  const { searchParams } = new URL(req.url);
  const artistIdRaw = searchParams.get("artist_id");
  if (!artistIdRaw) {
    return Response.json({ error: "artist_id is required" }, { status: 400 });
  }

  const parsed = ArtistIdSchema.safeParse(artistIdRaw);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid artist_id", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const artistId = parsed.data;

  const redis = getRedis();
  const latest = await redis.get(`snapshot:${artistId}:latest`);
  const manifest = await redis.get(`snapshot:${artistId}:latest-manifest`);

  return Response.json({ latest, manifest });
}

export async function DELETE(req: Request) {
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

  const payload = body as { artist_id?: string };
  if (!payload.artist_id) {
    return Response.json({ error: "artist_id is required" }, { status: 400 });
  }

  const parsedId = ArtistIdSchema.safeParse(payload.artist_id);
  if (!parsedId.success) {
    return Response.json(
      { error: "Invalid artist_id", details: parsedId.error.flatten() },
      { status: 400 }
    );
  }

  const redis = getRedis();
  await redis.del(`snapshot:${parsedId.data}:latest`);
  await redis.del(`snapshot:${parsedId.data}:latest-manifest`);

  return Response.json({ reset: true });
}
