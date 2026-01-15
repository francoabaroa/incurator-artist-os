import { describe, expect, it, vi, beforeEach } from "vitest";

const mockRedis = {
  set: vi.fn(),
  eval: vi.fn(),
};

vi.mock("@/lib/artist-os/redis", () => ({
  getRedis: () => mockRedis,
}));

import { acquireArtistLock } from "@/lib/artist-os/lock";

describe("acquireArtistLock", () => {
  beforeEach(() => {
    mockRedis.set.mockReset();
    mockRedis.eval.mockReset();
  });

  it("acquires lock when redis returns OK", async () => {
    mockRedis.set.mockResolvedValue("OK");

    const lock = await acquireArtistLock("artist_1", 1000);
    expect(lock).not.toBeNull();

    await lock?.release();
    expect(mockRedis.eval).toHaveBeenCalled();
  });

  it("returns null when redis does not grant lock", async () => {
    mockRedis.set.mockResolvedValue(null);

    const lock = await acquireArtistLock("artist_1", 1000);
    expect(lock).toBeNull();
  });
});
