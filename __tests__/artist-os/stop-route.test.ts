import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const stopSandboxByArtist = vi.fn();
const stopSandboxById = vi.fn();
const forceReleaseArtistLock = vi.fn();

vi.mock("@/lib/artist-os/sandbox", () => ({
  stopSandboxByArtist: (...args: unknown[]) => stopSandboxByArtist(...args),
  stopSandboxById: (...args: unknown[]) => stopSandboxById(...args),
}));

vi.mock("@/lib/artist-os/lock", () => ({
  forceReleaseArtistLock: (...args: unknown[]) => forceReleaseArtistLock(...args),
}));

import { POST } from "@/app/api/artist-os/stop/route";

function buildRequest(
  headers: Record<string, string> = {},
  body?: unknown
) {
  const init: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new Request("http://localhost/api/artist-os/stop", init);
}

describe("POST /api/artist-os/stop", () => {
  const originalToken = process.env.ARTIST_OS_ADMIN_TOKEN;

  beforeEach(() => {
    process.env.ARTIST_OS_ADMIN_TOKEN = "test_admin_token";
    stopSandboxByArtist.mockReset();
    stopSandboxById.mockReset();
    forceReleaseArtistLock.mockReset();
    forceReleaseArtistLock.mockResolvedValue(true);
  });

  afterEach(() => {
    if (originalToken !== undefined) {
      process.env.ARTIST_OS_ADMIN_TOKEN = originalToken;
    } else {
      delete process.env.ARTIST_OS_ADMIN_TOKEN;
    }
  });

  it("returns 403 without admin token", async () => {
    const req = buildRequest({}, { artist_id: "artist_123" });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 when neither artist_id nor sandbox_id provided", async () => {
    const req = buildRequest({ "x-admin-token": "test_admin_token" }, {});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("stops sandbox by artist_id", async () => {
    stopSandboxByArtist.mockResolvedValue(true);

    const req = buildRequest(
      { "x-admin-token": "test_admin_token" },
      { artist_id: "artist_123" }
    );
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.stopped).toBe(true);
    expect(data.lockReleased).toBe(true);
    expect(stopSandboxByArtist).toHaveBeenCalledWith("artist_123");
    expect(forceReleaseArtistLock).toHaveBeenCalledWith("artist_123");
  });

  it("stops sandbox by sandbox_id", async () => {
    stopSandboxById.mockResolvedValue({ stopped: true, artistId: "artist_456" });

    const req = buildRequest(
      { "x-admin-token": "test_admin_token" },
      { sandbox_id: "sb_abc123" }
    );
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.stopped).toBe(true);
    // Should also release lock when stopping by sandbox_id
    expect(data.lockReleased).toBe(true);
    expect(stopSandboxById).toHaveBeenCalledWith("sb_abc123");
    expect(forceReleaseArtistLock).toHaveBeenCalledWith("artist_456");
  });

  it("returns stopped: false when sandbox not found", async () => {
    stopSandboxByArtist.mockResolvedValue(false);

    const req = buildRequest(
      { "x-admin-token": "test_admin_token" },
      { artist_id: "nonexistent" }
    );
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.stopped).toBe(false);
    // Lock should NOT be released when sandbox wasn't stopped
    expect(data.lockReleased).toBe(false);
    expect(forceReleaseArtistLock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid artist_id", async () => {
    const req = buildRequest(
      { "x-admin-token": "test_admin_token" },
      { artist_id: "../escape" }
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid artist_id");
  });

  it("returns 400 for reserved artist_id", async () => {
    const req = buildRequest(
      { "x-admin-token": "test_admin_token" },
      { artist_id: "base" }
    );
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid artist_id");
  });
});
