import { describe, expect, it, beforeEach, vi } from "vitest";

const execMock = vi.fn();

const mockMulti = {
  incr: vi.fn().mockReturnThis(),
  pexpireat: vi.fn().mockReturnThis(),
  exec: execMock,
};

const mockRedis = {
  multi: vi.fn(() => mockMulti),
};

vi.mock("@/lib/artist-os/redis", () => ({
  getRedis: () => mockRedis,
}));

import { checkRateLimit } from "@/lib/artist-os/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    execMock.mockReset();
  });

  it.each([0, 1, 2, 3])("blocks a Redis command error at reply %s", async (index) => {
    const replies: [Error | null, number | null][] = Array.from({ length: 4 }, () => [null, 1]);
    replies[index] = [new Error("Redis command failed"), null];
    execMock.mockResolvedValue(replies);
    expect((await checkRateLimit({ userId: "user_1", artistId: "artist_1" })).ok).toBe(false);
  });

  it.each([
    { replies: null },
    { replies: [] },
    { replies: [[null, 1]] },
    { replies: [[null, null], [null, 1], [null, 1], [null, 1]] },
  ])(
    "blocks incomplete replies %#", async ({ replies }) => {
      execMock.mockResolvedValue(replies);
      expect((await checkRateLimit({ userId: "user_1", artistId: "artist_1" })).ok).toBe(false);
    }
  );

  it("allows when under limits", async () => {
    process.env.ARTIST_OS_RATE_LIMIT_USER = "5";
    process.env.ARTIST_OS_RATE_LIMIT_ARTIST = "5";
    process.env.ARTIST_OS_RATE_LIMIT_WINDOW = "1m";

    // Pipeline results: [incr userKey, pexpireat userKey, incr artistKey, pexpireat artistKey]
    execMock.mockResolvedValue([
      [null, 1],  // userCount = 1
      [null, 1],  // pexpireat result
      [null, 1],  // artistCount = 1
      [null, 1],  // pexpireat result
    ]);

    const result = await checkRateLimit({ userId: "user_1", artistId: "artist_1" });
    expect(result.ok).toBe(true);
  });

  it("blocks when over limits", async () => {
    process.env.ARTIST_OS_RATE_LIMIT_USER = "1";
    process.env.ARTIST_OS_RATE_LIMIT_ARTIST = "1";
    process.env.ARTIST_OS_RATE_LIMIT_WINDOW = "1m";

    // Pipeline results: [incr userKey, pexpireat userKey, incr artistKey, pexpireat artistKey]
    execMock.mockResolvedValue([
      [null, 2],  // userCount = 2 (over limit of 1)
      [null, 1],  // pexpireat result
      [null, 2],  // artistCount = 2
      [null, 1],  // pexpireat result
    ]);

    const result = await checkRateLimit({ userId: "user_1", artistId: "artist_1" });
    expect(result.ok).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });
});
