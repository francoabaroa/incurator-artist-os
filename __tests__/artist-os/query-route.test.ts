import { describe, expect, it, vi, beforeEach } from "vitest";

const getAuthUserId = vi.fn();
const getIncuratorUserId = vi.fn();
const userOwnsArtist = vi.fn();
const checkRateLimit = vi.fn();
const acquireArtistLock = vi.fn();
const getOrCreateSandbox = vi.fn();
const stopSandboxByArtist = vi.fn();
const restoreBaseSnapshot = vi.fn();
const restoreArtistSnapshot = vi.fn();
const exportArtistSnapshot = vi.fn();
const runAgent = vi.fn();
const resolveSessionContextForRequest = vi.fn();
const storeSessionMetadata = vi.fn();

vi.mock("@/lib/artist-os/auth", () => ({
  getAuthUserId: (...args: unknown[]) => getAuthUserId(...args),
  getIncuratorUserId: (...args: unknown[]) => getIncuratorUserId(...args),
  InvalidIncuratorUserIdError: class InvalidIncuratorUserIdError extends Error {
    constructor(message = "x-incurator-user-id must be a numeric internal user id") {
      super(message);
      this.name = "InvalidIncuratorUserIdError";
    }
  },
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

vi.mock("@/lib/artist-os/session-metadata", () => ({
  ResumeSessionMetadataError: class ResumeSessionMetadataError extends Error {
    readonly statusCode: number;

    constructor(message: string, statusCode = 400) {
      super(message);
      this.name = "ResumeSessionMetadataError";
      this.statusCode = statusCode;
    }
  },
  resolveSessionContextForRequest: (...args: unknown[]) =>
    resolveSessionContextForRequest(...args),
  storeSessionMetadata: (...args: unknown[]) => storeSessionMetadata(...args),
}));

import { POST } from "@/app/api/artist-os/query/route";
import { ResumeSessionMetadataError } from "@/lib/artist-os/session-metadata";
import { InvalidIncuratorUserIdError } from "@/lib/artist-os/auth";

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
    getIncuratorUserId.mockReset();
    userOwnsArtist.mockReset();
    checkRateLimit.mockReset();
    acquireArtistLock.mockReset();
    getOrCreateSandbox.mockReset();
    stopSandboxByArtist.mockReset();
    restoreBaseSnapshot.mockReset();
    restoreArtistSnapshot.mockReset();
    exportArtistSnapshot.mockReset();
    runAgent.mockReset();
    resolveSessionContextForRequest.mockReset();
    storeSessionMetadata.mockReset();
    resolveSessionContextForRequest.mockResolvedValue({
      sessionMode: "artist_ops",
      incuratorUserId: undefined,
    });
    storeSessionMetadata.mockResolvedValue(undefined);
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

  it("returns 400 when x-incurator-user-id is invalid", async () => {
    getAuthUserId.mockReturnValue("user_1");
    getIncuratorUserId.mockImplementation(() => {
      throw new InvalidIncuratorUserIdError();
    });

    const res = await POST(buildRequest({ artist_id: "artist_1", prompt: "hi" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "x-incurator-user-id must be a numeric internal user id",
    });
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
    runAgent.mockResolvedValue({ exitCode: 0, sessionId: "test-session-123" });
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
    expect(text).toContain('"sessionId":"test-session-123"');
    expect(text).toContain('"sessionMode":"artist_ops"');
    expect(resolveSessionContextForRequest).toHaveBeenCalledWith({
      artistId: "artist_1",
      requestedSessionMode: undefined,
      requestedIncuratorUserId: undefined,
      resumeSessionId: undefined,
    });
    expect(runAgent).toHaveBeenCalledWith(
      sandbox,
      "hi",
      undefined,
      expect.any(Function),
      "artist_1",
      "artist_ops",
      undefined
    );
    expect(storeSessionMetadata).toHaveBeenCalledWith("test-session-123", {
      artistId: "artist_1",
      sessionMode: "artist_ops",
      incuratorUserId: undefined,
    });
    expect(exportArtistSnapshot.mock.invocationCallOrder[0]).toBeLessThan(
      storeSessionMetadata.mock.invocationCallOrder[0]
    );
  });

  it("forwards feature_flow session mode when provided", async () => {
    resolveSessionContextForRequest.mockResolvedValue({
      sessionMode: "feature_flow",
      incuratorUserId: "123",
    });
    getAuthUserId.mockReturnValue("user_1");
    getIncuratorUserId.mockReturnValue("123");
    userOwnsArtist.mockReturnValue(true);
    checkRateLimit.mockResolvedValue({ ok: true });
    acquireArtistLock.mockResolvedValue({ release: vi.fn().mockResolvedValue(undefined) });

    const sandbox = { sandboxId: "sb_2", status: "running" };
    getOrCreateSandbox.mockResolvedValue({ sandbox, release: vi.fn() });
    restoreBaseSnapshot.mockResolvedValue(undefined);
    restoreArtistSnapshot.mockResolvedValue(undefined);
    runAgent.mockResolvedValue({ exitCode: 0, sessionId: "test-session-456" });
    exportArtistSnapshot.mockResolvedValue({
      artist_id: "artist_1",
      snapshot_key: "snapshots/artist_1/workspace-2.tar.gz",
      snapshot_version: "1.0.0",
      created_at: new Date().toISOString(),
      checksum_sha256: "def",
      workspace_size_bytes: 20,
    });

    const res = await POST(
      buildRequest({
        artist_id: "artist_1",
        prompt: "continue feature flow",
        session_mode: "feature_flow",
      })
    );
    expect(res.status).toBe(200);

    await res.text();
    expect(runAgent).toHaveBeenCalledWith(
      sandbox,
      "continue feature flow",
      undefined,
      expect.any(Function),
      "artist_1",
      "feature_flow",
      "123"
    );
  });

  it("returns 400 when resumed session metadata conflicts with the request", async () => {
    getAuthUserId.mockReturnValue("user_1");
    userOwnsArtist.mockReturnValue(true);
    resolveSessionContextForRequest.mockRejectedValue(
      new ResumeSessionMetadataError(
        "resume_session_id belongs to a different artist"
      )
    );

    const res = await POST(
      buildRequest({
        artist_id: "artist_1",
        prompt: "resume",
        resume_session_id: "session_123",
      })
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "resume_session_id belongs to a different artist",
    });
    expect(runAgent).not.toHaveBeenCalled();
  });

  it("omits sessionId when session metadata cannot be stored", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    getAuthUserId.mockReturnValue("user_1");
    userOwnsArtist.mockReturnValue(true);
    checkRateLimit.mockResolvedValue({ ok: true });
    acquireArtistLock.mockResolvedValue({ release: vi.fn().mockResolvedValue(undefined) });
    storeSessionMetadata.mockRejectedValue(new Error("Redis unavailable"));

    const sandbox = { sandboxId: "sb_4", status: "running" };
    getOrCreateSandbox.mockResolvedValue({ sandbox, release: vi.fn() });
    restoreBaseSnapshot.mockResolvedValue(undefined);
    restoreArtistSnapshot.mockResolvedValue(undefined);
    runAgent.mockResolvedValue({ exitCode: 0, sessionId: "test-session-999" });
    exportArtistSnapshot.mockResolvedValue({
      artist_id: "artist_1",
      snapshot_key: "snapshots/artist_1/workspace-4.tar.gz",
      snapshot_version: "1.0.0",
      created_at: new Date().toISOString(),
      checksum_sha256: "ghi",
      workspace_size_bytes: 40,
    });

    try {
      const res = await POST(buildRequest({ artist_id: "artist_1", prompt: "hi" }));
      expect(res.status).toBe(200);

      const text = await res.text();
      expect(text).toContain("event: done");
      expect(text).not.toContain('"sessionId":"test-session-999"');
      expect(text).toContain('"sessionMode":"artist_ops"');
    } finally {
      consoleErrorSpy.mockRestore();
    }
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

  it("does not store session metadata when snapshot export fails", async () => {
    getAuthUserId.mockReturnValue("user_1");
    userOwnsArtist.mockReturnValue(true);
    checkRateLimit.mockResolvedValue({ ok: true });
    acquireArtistLock.mockResolvedValue({ release: vi.fn().mockResolvedValue(undefined) });

    const sandbox = { sandboxId: "sb_3", status: "running" };
    getOrCreateSandbox.mockResolvedValue({ sandbox, release: vi.fn() });
    restoreBaseSnapshot.mockResolvedValue(undefined);
    restoreArtistSnapshot.mockResolvedValue(undefined);
    runAgent.mockResolvedValue({ exitCode: 0, sessionId: "test-session-789" });
    exportArtistSnapshot.mockRejectedValue(new Error("Snapshot export failed"));
    stopSandboxByArtist.mockResolvedValue(true);

    const res = await POST(buildRequest({ artist_id: "artist_1", prompt: "hi" }));
    expect(res.status).toBe(200);

    const text = await res.text();
    expect(text).toContain("event: error");
    expect(text).toContain("Snapshot export failed");
    expect(storeSessionMetadata).not.toHaveBeenCalled();
  });
});
