import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthUserId = vi.fn();
const userOwnsArtist = vi.fn();
const checkRateLimit = vi.fn();
const acquireArtistLock = vi.fn();
const getOrCreateSandbox = vi.fn();
const stopSandboxByArtist = vi.fn();
const restoreBaseSnapshot = vi.fn();
const restoreArtistSnapshot = vi.fn();
const exportArtistSnapshot = vi.fn();

vi.mock("@/lib/artist-os/auth", () => ({
  getAuthUserId: (...args: unknown[]) => getAuthUserId(...args),
  userOwnsArtist: (...args: unknown[]) => userOwnsArtist(...args),
}));

vi.mock("@/lib/artist-os/rate-limit", () => ({
  checkRateLimit: (...args: unknown[]) => checkRateLimit(...args),
}));

vi.mock("@/lib/artist-os/lock", () => ({
  acquireArtistLock: (...args: unknown[]) => acquireArtistLock(...args),
}));

vi.mock("@/lib/artist-os/sandbox", () => ({
  getOrCreateSandbox: (...args: unknown[]) => getOrCreateSandbox(...args),
  stopSandboxByArtist: (...args: unknown[]) => stopSandboxByArtist(...args),
}));

vi.mock("@/lib/artist-os/snapshot", () => ({
  restoreBaseSnapshot: (...args: unknown[]) => restoreBaseSnapshot(...args),
  restoreArtistSnapshot: (...args: unknown[]) => restoreArtistSnapshot(...args),
  exportArtistSnapshot: (...args: unknown[]) => exportArtistSnapshot(...args),
}));

import { POST } from "@/app/api/artist-os/files/upload/route";

function buildRequest(
  fields: {
    artistId?: string;
    path?: string;
    includeFile?: boolean;
    headers?: Record<string, string>;
    fileName?: string;
    fileType?: string;
  } = {}
) {
  const formData = new FormData();
  if (fields.artistId !== undefined) {
    formData.append("artist_id", fields.artistId);
  }
  if (fields.path !== undefined) {
    formData.append("path", fields.path);
  }
  if (fields.includeFile !== false) {
    formData.append(
      "file",
      new File(["audio-bytes"], fields.fileName ?? "demo.wav", {
        type: fields.fileType ?? "audio/wav",
      })
    );
  }

  return new Request("http://localhost/api/artist-os/files/upload", {
    method: "POST",
    headers: fields.headers,
    body: formData,
  });
}

describe("POST /api/artist-os/files/upload", () => {
  beforeEach(() => {
    getAuthUserId.mockReset();
    userOwnsArtist.mockReset();
    checkRateLimit.mockReset();
    acquireArtistLock.mockReset();
    getOrCreateSandbox.mockReset();
    stopSandboxByArtist.mockReset();
    restoreBaseSnapshot.mockReset();
    restoreArtistSnapshot.mockReset();
    exportArtistSnapshot.mockReset();
    checkRateLimit.mockResolvedValue({ ok: true });
  });

  it("returns 401 when unauthenticated", async () => {
    getAuthUserId.mockReturnValue(null);

    const res = await POST(buildRequest({ artistId: "artist_1" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when artist is not owned", async () => {
    getAuthUserId.mockReturnValue("user_1");
    userOwnsArtist.mockReturnValue(false);

    const res = await POST(buildRequest({ artistId: "artist_1" }));
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid upload path outside releases/", async () => {
    getAuthUserId.mockReturnValue("user_1");
    userOwnsArtist.mockReturnValue(true);

    const res = await POST(
      buildRequest({
        artistId: "artist_1",
        path: "../outside.wav",
      })
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for unsupported mastering formats", async () => {
    getAuthUserId.mockReturnValue("user_1");
    userOwnsArtist.mockReturnValue(true);

    const res = await POST(
      buildRequest({
        artistId: "artist_1",
        fileName: "demo.m4a",
        fileType: "audio/mp4",
      })
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "Unsupported audio format. Only WAV uploads can be mastered.",
    });
    expect(checkRateLimit).not.toHaveBeenCalled();
  });

  it("returns 409 when lock cannot be acquired", async () => {
    getAuthUserId.mockReturnValue("user_1");
    userOwnsArtist.mockReturnValue(true);
    acquireArtistLock.mockResolvedValue(null);

    const res = await POST(buildRequest({ artistId: "artist_1" }));
    expect(res.status).toBe(409);
  });

  it("returns 429 when the upload route is rate limited", async () => {
    getAuthUserId.mockReturnValue("user_1");
    userOwnsArtist.mockReturnValue(true);
    checkRateLimit.mockResolvedValue({ ok: false, retryAfterMs: 1000 });

    const res = await POST(buildRequest({ artistId: "artist_1" }));

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("1");
    expect(acquireArtistLock).not.toHaveBeenCalled();
    expect(getOrCreateSandbox).not.toHaveBeenCalled();
  });

  it("returns 409 when the target file already exists", async () => {
    getAuthUserId.mockReturnValue("user_1");
    userOwnsArtist.mockReturnValue(true);
    acquireArtistLock.mockResolvedValue({
      release: vi.fn().mockResolvedValue(undefined),
    });

    const sandbox = {
      runCommand: vi.fn().mockResolvedValue({ exitCode: 0 }),
      writeFiles: vi.fn().mockResolvedValue(undefined),
    };
    getOrCreateSandbox.mockResolvedValue({
      sandbox,
      release: vi.fn().mockResolvedValue(undefined),
    });
    restoreBaseSnapshot.mockResolvedValue(undefined);
    restoreArtistSnapshot.mockResolvedValue(undefined);

    const res = await POST(
      buildRequest({
        artistId: "artist_1",
        path: "releases/demo.wav",
      })
    );

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      error: "File already exists at releases/demo.wav",
    });
    expect(sandbox.writeFiles).not.toHaveBeenCalled();
    expect(exportArtistSnapshot).not.toHaveBeenCalled();
  });

  it("uploads file into releases/ and snapshots successfully", async () => {
    getAuthUserId.mockReturnValue("user_1");
    userOwnsArtist.mockReturnValue(true);
    acquireArtistLock.mockResolvedValue({
      release: vi.fn().mockResolvedValue(undefined),
    });

    const sandbox = {
      runCommand: vi
        .fn()
        .mockResolvedValueOnce({ exitCode: 1 })
        .mockResolvedValueOnce({ exitCode: 0 }),
      writeFiles: vi.fn().mockResolvedValue(undefined),
    };
    getOrCreateSandbox.mockResolvedValue({
      sandbox,
      release: vi.fn().mockResolvedValue(undefined),
    });
    restoreBaseSnapshot.mockResolvedValue(undefined);
    restoreArtistSnapshot.mockResolvedValue(undefined);
    exportArtistSnapshot.mockResolvedValue({
      artist_id: "artist_1",
      snapshot_key: "snapshots/artist_1/workspace-1.tar.gz",
      snapshot_version: "1.0.0",
      created_at: new Date().toISOString(),
      checksum_sha256: "abc",
      workspace_size_bytes: 10,
    });

    const res = await POST(
      buildRequest({
        artistId: "artist_1",
        path: "releases/demo.wav",
      })
    );
    expect(res.status).toBe(200);
    const payload = await res.json();
    expect(payload.ok).toBe(true);
    expect(payload.data.path).toBe("releases/demo.wav");
    expect(checkRateLimit).toHaveBeenCalledWith({
      userId: "user_1",
      artistId: "artist_1",
    });
    expect(sandbox.writeFiles).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          path: "/vercel/sandbox/workspace/releases/demo.wav",
        }),
      ])
    );
  });
});
