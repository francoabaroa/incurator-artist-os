import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// Mock the Sandbox SDK
vi.mock("@vercel/sandbox", () => ({
  Sandbox: {
    create: vi.fn(),
  },
}));

import { Sandbox } from "@vercel/sandbox";
import {
  getOrCreateSandbox,
  stopSandboxByArtist,
  stopSandboxById,
  listCachedSandboxes,
  shutdownAllSandboxes,
} from "@/lib/artist-os/sandbox";

describe("sandbox", () => {
  const mockSandbox = {
    sandboxId: "sb_123",
    status: "running",
    stop: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (Sandbox.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockSandbox);
  });

  afterEach(async () => {
    // Clean up any cached sandboxes
    await shutdownAllSandboxes();
  });

  it("creates a new sandbox for a new artist", async () => {
    const result = await getOrCreateSandbox("artist_new");

    expect(Sandbox.create).toHaveBeenCalledWith({
      runtime: "node24",
      timeout: expect.any(Number),
      resources: { vcpus: 2 },
    });
    expect(result.sandbox.sandboxId).toBe("sb_123");
  });

  it("returns cached sandbox for same artist", async () => {
    const first = await getOrCreateSandbox("artist_cached");
    await first.release();

    // Reset the mock call count
    vi.clearAllMocks();

    const second = await getOrCreateSandbox("artist_cached");
    await second.release();

    // Should not have called create again
    expect(Sandbox.create).not.toHaveBeenCalled();
  });

  it("lists cached sandboxes", async () => {
    await getOrCreateSandbox("artist_list");
    const cached = listCachedSandboxes();

    expect(cached.length).toBeGreaterThanOrEqual(1);
    expect(cached.find((s) => s.artistId === "artist_list")).toBeDefined();
  });

  it("stops sandbox by artist id", async () => {
    const { sandbox } = await getOrCreateSandbox("artist_stop");

    const stopped = await stopSandboxByArtist("artist_stop");
    expect(stopped).toBe(true);
    expect(sandbox.stop).toHaveBeenCalled();
  });

  it("stops sandbox by sandbox id", async () => {
    const { sandbox } = await getOrCreateSandbox("artist_stopbyid");

    const result = await stopSandboxById("sb_123");
    expect(result.stopped).toBe(true);
    expect(result.artistId).toBe("artist_stopbyid");
    expect(sandbox.stop).toHaveBeenCalled();
  });

  it("returns false when stopping non-existent sandbox", async () => {
    const stopped = await stopSandboxByArtist("nonexistent");
    expect(stopped).toBe(false);

    const result = await stopSandboxById("nonexistent_sb");
    expect(result.stopped).toBe(false);
    expect(result.artistId).toBeUndefined();
  });

  it("shuts down all sandboxes", async () => {
    await getOrCreateSandbox("artist_shutdown");
    await shutdownAllSandboxes();

    const cached = listCachedSandboxes();
    expect(cached.length).toBe(0);
  });
});
