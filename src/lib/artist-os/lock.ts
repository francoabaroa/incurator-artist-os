import crypto from "crypto";
import { getRedis } from "./redis";
import type { ArtistLock } from "./types";

export async function acquireArtistLock(
  artistId: string,
  ttlMs: number
): Promise<ArtistLock | null> {
  const redis = getRedis();
  const key = `lock:artist:${artistId}`;
  const token = crypto.randomUUID();

  const result = await redis.set(key, token, "PX", ttlMs, "NX");
  if (result !== "OK") {
    return null;
  }

  return {
    async release() {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      await redis.eval(script, 1, key, token);
    },
  };
}

/**
 * Force-release an artist lock regardless of the token.
 * Only use this for admin cleanup of stale locks.
 */
export async function forceReleaseArtistLock(artistId: string): Promise<boolean> {
  const redis = getRedis();
  const key = `lock:artist:${artistId}`;
  const deleted = await redis.del(key);
  return deleted > 0;
}
