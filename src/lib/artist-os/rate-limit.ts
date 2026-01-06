import ms from "ms";
import type { StringValue } from "ms";
import { getRedis } from "./redis";
import type { RateLimitResult } from "./types";

const DEFAULT_WINDOW = "1m";
const DEFAULT_USER_LIMIT = 10;
const DEFAULT_ARTIST_LIMIT = 5;

export interface RateLimitInput {
  userId: string;
  artistId: string;
}

export function getRateLimitConfig() {
  const windowValue =
    (process.env.ARTIST_OS_RATE_LIMIT_WINDOW ?? DEFAULT_WINDOW) as StringValue;
  const parsedWindow = ms(windowValue);
  const windowMs = typeof parsedWindow === "number" ? parsedWindow : ms("1m");
  const userLimit = Number(
    process.env.ARTIST_OS_RATE_LIMIT_USER ?? DEFAULT_USER_LIMIT
  );
  const artistLimit = Number(
    process.env.ARTIST_OS_RATE_LIMIT_ARTIST ?? DEFAULT_ARTIST_LIMIT
  );

  return {
    windowMs,
    userLimit: Number.isFinite(userLimit) ? userLimit : DEFAULT_USER_LIMIT,
    artistLimit: Number.isFinite(artistLimit)
      ? artistLimit
      : DEFAULT_ARTIST_LIMIT,
  };
}

export async function checkRateLimit(
  input: RateLimitInput
): Promise<RateLimitResult> {
  const redis = getRedis();
  const { windowMs, userLimit, artistLimit } = getRateLimitConfig();
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const windowEnd = windowStart + windowMs;
  const userKey = `ratelimit:user:${input.userId}:${windowStart}`;
  const artistKey = `ratelimit:artist:${input.artistId}:${windowStart}`;

  const pipeline = redis.multi();
  pipeline.incr(userKey);
  // Use PEXPIREAT to set expiry to the END of the window, not windowMs from now.
  // This prevents TTL from being reset on every request, which would cause
  // Retry-After to be wildly incorrect near window boundaries.
  pipeline.pexpireat(userKey, windowEnd);
  pipeline.incr(artistKey);
  pipeline.pexpireat(artistKey, windowEnd);

  const results = await pipeline.exec();
  if (!results) {
    return { ok: false };
  }

  const userCount = Number(results[0]?.[1] ?? 0);
  const artistCount = Number(results[2]?.[1] ?? 0);

  const ok = userCount <= userLimit && artistCount <= artistLimit;

  if (!ok) {
    // Compute retryAfter deterministically based on window boundaries
    // This is more accurate than reading TTL which can drift
    const retryAfterMs = windowEnd - now;
    return {
      ok: false,
      retryAfterMs,
      remainingUser: Math.max(0, userLimit - userCount),
      remainingArtist: Math.max(0, artistLimit - artistCount),
    };
  }

  return {
    ok: true,
    remainingUser: Math.max(0, userLimit - userCount),
    remainingArtist: Math.max(0, artistLimit - artistCount),
  };
}
