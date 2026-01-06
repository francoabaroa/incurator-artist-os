import { describe, expect, it, vi, beforeEach } from "vitest";

const getAuthUserId = vi.fn();
const userOwnsArtist = vi.fn();
const checkRateLimit = vi.fn();
const acquireArtistLock = vi.fn();
const getOrCreateSandbox = vi.fn();
const stopSandboxByArtist = vi.fn();
const restoreBaseSnapshot = vi.fn();
const restoreArtistSnapshot = vi.fn();
const exportArtistSnapshot = vi.fn();
const runAgent = vi.fn();

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

vi.mock("@/lib/artist-os/agent", () => ({
  runAgent: (...args: unknown[]) => runAgent(...args),
}));

import { POST } from "@/app/api/artist-os/query/route";

function buildRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/artist-os/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/artist-os/query", () => {
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
    runAgent.mockReset();
  });

  it("returns 400 for invalid request body", async () => {
    const res = await POST(buildRequest({ artist_id: "", prompt: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing artist_id", async () => {
    const res = await POST(buildRequest({ prompt: "hi" }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    getAuthUserId.mockReturnValue(null);

    const res = await POST(buildRequest({ artist_id: "artist_1", prompt: "hi" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when artist is not owned", async () => {
    getAuthUserId.mockReturnValue("user_1");
    userOwnsArtist.mockReturnValue(false);

    const res = await POST(buildRequest({ artist_id: "artist_1", prompt: "hi" }));
    expect(res.status).toBe(403);
  });

  it("returns 429 when rate limited", async () => {
    getAuthUserId.mockReturnValue("user_1");
    userOwnsArtist.mockReturnValue(true);
    checkRateLimit.mockResolvedValue({ ok: false, retryAfterMs: 1000 });

    const res = await POST(buildRequest({ artist_id: "artist_1", prompt: "hi" }));
    expect(res.status).toBe(429);
  });

  it("returns 409 when lock cannot be acquired", async () => {
    getAuthUserId.mockReturnValue("user_1");
    userOwnsArtist.mockReturnValue(true);
    checkRateLimit.mockResolvedValue({ ok: true });
    acquireArtistLock.mockResolvedValue(null);

    const res = await POST(buildRequest({ artist_id: "artist_1", prompt: "hi" }));
    expect(res.status).toBe(409);
  });

  it("streams SSE events on success", async () => {
    getAuthUserId.mockReturnValue("user_1");
    userOwnsArtist.mockReturnValue(true);
    checkRateLimit.mockResolvedValue({ ok: true });
    acquireArtistLock.mockResolvedValue({ release: vi.fn().mockResolvedValue(undefined) });

    const sandbox = { sandboxId: "sb_1", status: "running" };
    getOrCreateSandbox.mockResolvedValue({ sandbox, release: vi.fn() });
    restoreBaseSnapshot.mockResolvedValue(undefined);
    restoreArtistSnapshot.mockResolvedValue(undefined);
    runAgent.mockResolvedValue(0);
    exportArtistSnapshot.mockResolvedValue({
      artist_id: "artist_1",
      snapshot_key: "snapshots/artist_1/workspace-1.tar.gz",
      snapshot_version: "1.0.0",
      created_at: new Date().toISOString(),
      checksum_sha256: "abc",
      workspace_size_bytes: 10,
    });

    const res = await POST(buildRequest({ artist_id: "artist_1", prompt: "hi" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");

    const text = await res.text();
    expect(text).toContain("event: status");
    expect(text).toContain("event: done");
  });

  it("streams error event when agent throws", async () => {
    getAuthUserId.mockReturnValue("user_1");
    userOwnsArtist.mockReturnValue(true);
    checkRateLimit.mockResolvedValue({ ok: true });
    acquireArtistLock.mockResolvedValue({ release: vi.fn().mockResolvedValue(undefined) });

    const sandbox = { sandboxId: "sb_1", status: "running" };
    getOrCreateSandbox.mockResolvedValue({ sandbox, release: vi.fn() });
    restoreBaseSnapshot.mockResolvedValue(undefined);
    restoreArtistSnapshot.mockRejectedValue(new Error("Snapshot restore failed"));
    stopSandboxByArtist.mockResolvedValue(true);

    const res = await POST(buildRequest({ artist_id: "artist_1", prompt: "hi" }));
    expect(res.status).toBe(200);

    const text = await res.text();
    expect(text).toContain("event: error");
    expect(text).toContain("Snapshot restore failed");
  });
});
