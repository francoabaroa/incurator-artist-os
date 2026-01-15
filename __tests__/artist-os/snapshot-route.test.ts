import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const mockRedisGet = vi.fn();
const mockRedisDel = vi.fn();

vi.mock("@/lib/artist-os/redis", () => ({
  getRedis: () => ({
    get: mockRedisGet,
    del: mockRedisDel,
  }),
}));

import { GET, DELETE } from "@/app/api/artist-os/snapshot/route";

function buildRequest(
  method: string,
  url: string,
  headers: Record<string, string> = {},
  body?: unknown
) {
  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return new Request(url, init);
}

describe("GET /api/artist-os/snapshot", () => {
  const originalToken = process.env.ARTIST_OS_ADMIN_TOKEN;

  beforeEach(() => {
    process.env.ARTIST_OS_ADMIN_TOKEN = "test_admin_token";
    mockRedisGet.mockReset();
    mockRedisDel.mockReset();
  });

  afterEach(() => {
    if (originalToken !== undefined) {
      process.env.ARTIST_OS_ADMIN_TOKEN = originalToken;
    } else {
      delete process.env.ARTIST_OS_ADMIN_TOKEN;
    }
  });

  it("returns 403 without admin token", async () => {
    const req = buildRequest(
      "GET",
      "http://localhost/api/artist-os/snapshot?artist_id=artist_123"
    );
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 when artist_id is missing", async () => {
    const req = buildRequest(
      "GET",
      "http://localhost/api/artist-os/snapshot",
      { "x-admin-token": "test_admin_token" }
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns snapshot pointers when authenticated", async () => {
    mockRedisGet
      .mockResolvedValueOnce("snapshots/artist_123/workspace-123.tar.gz")
      .mockResolvedValueOnce("snapshots/artist_123/manifest-123.json");

    const req = buildRequest(
      "GET",
      "http://localhost/api/artist-os/snapshot?artist_id=artist_123",
      { "x-admin-token": "test_admin_token" }
    );
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.latest).toBe("snapshots/artist_123/workspace-123.tar.gz");
    expect(data.manifest).toBe("snapshots/artist_123/manifest-123.json");
  });

  it("returns 400 for invalid artist_id (path traversal)", async () => {
    const req = buildRequest(
      "GET",
      "http://localhost/api/artist-os/snapshot?artist_id=../x",
      { "x-admin-token": "test_admin_token" }
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid artist_id");
  });

  it("returns 400 for reserved artist_id", async () => {
    const req = buildRequest(
      "GET",
      "http://localhost/api/artist-os/snapshot?artist_id=base",
      { "x-admin-token": "test_admin_token" }
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid artist_id");
  });
});

describe("DELETE /api/artist-os/snapshot", () => {
  const originalToken = process.env.ARTIST_OS_ADMIN_TOKEN;

  beforeEach(() => {
    process.env.ARTIST_OS_ADMIN_TOKEN = "test_admin_token";
    mockRedisGet.mockReset();
    mockRedisDel.mockReset();
  });

  afterEach(() => {
    if (originalToken !== undefined) {
      process.env.ARTIST_OS_ADMIN_TOKEN = originalToken;
    } else {
      delete process.env.ARTIST_OS_ADMIN_TOKEN;
    }
  });

  it("returns 403 without admin token", async () => {
    const req = buildRequest(
      "DELETE",
      "http://localhost/api/artist-os/snapshot",
      {},
      { artist_id: "artist_123" }
    );
    const res = await DELETE(req);
    expect(res.status).toBe(403);
  });

  it("returns 400 when artist_id is missing", async () => {
    const req = buildRequest(
      "DELETE",
      "http://localhost/api/artist-os/snapshot",
      { "x-admin-token": "test_admin_token" },
      {}
    );
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it("deletes snapshot pointers when authenticated", async () => {
    mockRedisDel.mockResolvedValue(1);

    const req = buildRequest(
      "DELETE",
      "http://localhost/api/artist-os/snapshot",
      { "x-admin-token": "test_admin_token" },
      { artist_id: "artist_123" }
    );
    const res = await DELETE(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.reset).toBe(true);

    expect(mockRedisDel).toHaveBeenCalledWith("snapshot:artist_123:latest");
    expect(mockRedisDel).toHaveBeenCalledWith("snapshot:artist_123:latest-manifest");
  });

  it("returns 400 for invalid artist_id in DELETE", async () => {
    const req = buildRequest(
      "DELETE",
      "http://localhost/api/artist-os/snapshot",
      { "x-admin-token": "test_admin_token" },
      { artist_id: "../escape" }
    );
    const res = await DELETE(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid artist_id");
  });
});
