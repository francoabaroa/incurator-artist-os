import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Readable } from "stream";

const { putMock, headMock } = vi.hoisted(() => ({
  putMock: vi.fn(),
  headMock: vi.fn(),
}));

vi.mock("@vercel/blob", () => ({
  put: putMock,
  head: headMock,
}));

const { redisSet, redisGet } = vi.hoisted(() => ({
  redisSet: vi.fn(),
  redisGet: vi.fn(),
}));

vi.mock("@/lib/artist-os/redis", () => ({
  getRedis: () => ({
    set: redisSet,
    get: redisGet,
  }),
}));

import { exportArtistSnapshot, restoreArtistSnapshot, restoreBaseSnapshot } from "@/lib/artist-os/snapshot";

describe("restoreArtistSnapshot", () => {
  beforeEach(() => {
    redisGet.mockReset();
    headMock.mockReset();
  });

  it("scaffolds new artist when no snapshot exists", async () => {
    redisGet.mockResolvedValue(null); // No existing snapshot

    const writeFilesCalls: unknown[] = [];
    const runCommandCalls: unknown[] = [];
    const sandbox = {
      runCommand: vi.fn().mockImplementation((cmd) => {
        runCommandCalls.push(cmd);
        return Promise.resolve({ exitCode: 0 });
      }),
      writeFiles: vi.fn().mockImplementation((files) => {
        writeFilesCalls.push(files);
        return Promise.resolve();
      }),
    };

    await restoreArtistSnapshot(
      sandbox as unknown as import("@vercel/sandbox").Sandbox,
      "new_artist_123"
    );

    // Should have called mkdir for scaffold directories
    expect(runCommandCalls.length).toBe(1);
    expect((runCommandCalls[0] as { args: string[] }).args[1]).toContain("mkdir -p");

    // Should have written personalized files only (not template files from base snapshot)
    expect(writeFilesCalls.length).toBe(1);
    const files = writeFilesCalls[0] as Array<{ path: string }>;
    const paths = files.map((f) => f.path);

    // Only artist.json, manifest.json, and commits.jsonl need personalization/initialization
    expect(paths).toContain("/vercel/sandbox/workspace/profile/artist.json");
    expect(paths).toContain("/vercel/sandbox/workspace/.index/manifest.json");
    expect(paths).toContain("/vercel/sandbox/workspace/.trace/commits.jsonl");

    // Template files should NOT be overwritten (they come from base snapshot)
    expect(paths).not.toContain("/vercel/sandbox/workspace/progress/claude-progress.md");
    expect(paths).not.toContain("/vercel/sandbox/workspace/tasks/inbox.md");
  });

  it("restores existing snapshot when redis pointer exists", async () => {
    redisGet.mockResolvedValue("snapshots/existing_artist/workspace-123.tar.gz");
    headMock.mockResolvedValue({ url: "https://blob.example.com/snapshot.tar.gz" });

    // Mock global fetch
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });
    vi.stubGlobal("fetch", mockFetch);

    const sandbox = {
      runCommand: vi.fn().mockResolvedValue({ exitCode: 0 }),
      writeFiles: vi.fn().mockResolvedValue(undefined),
    };

    await restoreArtistSnapshot(
      sandbox as unknown as import("@vercel/sandbox").Sandbox,
      "existing_artist"
    );

    // Should have fetched the snapshot
    expect(mockFetch).toHaveBeenCalled();

    // Should have written the tarball
    expect(sandbox.writeFiles).toHaveBeenCalledWith([
      expect.objectContaining({
        path: "/vercel/sandbox/_artist.tar.gz",
      }),
    ]);

    // Should have extracted the tarball
    expect(sandbox.runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        args: expect.arrayContaining([
          expect.stringContaining("tar -xzf"),
        ]),
      })
    );

    vi.unstubAllGlobals();
  });
});

describe("restoreBaseSnapshot", () => {
  beforeEach(() => {
    headMock.mockReset();
  });

  it("wipes workspace before extracting base snapshot (exact restore)", async () => {
    headMock.mockResolvedValue({ url: "https://blob.example.com/base.tar.gz" });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });
    vi.stubGlobal("fetch", mockFetch);

    const sandbox = {
      writeFiles: vi.fn().mockResolvedValue(undefined),
      runCommand: vi.fn().mockResolvedValue({ exitCode: 0 }),
    };

    await restoreBaseSnapshot(sandbox as unknown as import("@vercel/sandbox").Sandbox);

    // Should have called runCommand with rm -rf to wipe workspace
    expect(sandbox.runCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        args: expect.arrayContaining([
          expect.stringContaining("rm -rf /vercel/sandbox/workspace"),
        ]),
      })
    );

    vi.unstubAllGlobals();
  });
});

describe("exportArtistSnapshot", () => {
  beforeEach(() => {
    putMock.mockReset();
    redisSet.mockReset();
    vi.spyOn(Date, "now").mockReturnValue(1234567890);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uploads immutable snapshot and updates pointers", async () => {
    const sandbox = {
      runCommand: vi.fn().mockResolvedValue({ exitCode: 0 }),
      readFile: vi
        .fn()
        .mockResolvedValue(Readable.from([Buffer.from("snapshot")]))
        .mockName("readFile"),
    };

    const manifest = await exportArtistSnapshot(
      sandbox as unknown as import("@vercel/sandbox").Sandbox,
      "artist_123"
    );

    expect(putMock).toHaveBeenCalledWith(
      "snapshots/artist_123/workspace-1234567890.tar.gz",
      expect.any(Buffer),
      expect.objectContaining({ addRandomSuffix: false })
    );
    expect(putMock).toHaveBeenCalledWith(
      "snapshots/artist_123/manifest-1234567890.json",
      expect.any(String),
      expect.objectContaining({ contentType: "application/json" })
    );

    expect(redisSet).toHaveBeenCalledWith(
      "snapshot:artist_123:latest",
      "snapshots/artist_123/workspace-1234567890.tar.gz"
    );
    expect(redisSet).toHaveBeenCalledWith(
      "snapshot:artist_123:latest-manifest",
      "snapshots/artist_123/manifest-1234567890.json"
    );

    expect(manifest.artist_id).toBe("artist_123");
  });
});
