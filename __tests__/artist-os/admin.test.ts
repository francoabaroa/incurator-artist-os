import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { requireAdmin } from "@/lib/artist-os/admin";

function buildRequest(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/admin", {
    method: "POST",
    headers,
  });
}

describe("requireAdmin", () => {
  const originalEnv = process.env.ARTIST_OS_ADMIN_TOKEN;

  beforeEach(() => {
    process.env.ARTIST_OS_ADMIN_TOKEN = "secret_admin_token";
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ARTIST_OS_ADMIN_TOKEN = originalEnv;
    } else {
      delete process.env.ARTIST_OS_ADMIN_TOKEN;
    }
  });

  it("returns null (allows access) when x-admin-token matches", () => {
    const req = buildRequest({ "x-admin-token": "secret_admin_token" });
    expect(requireAdmin(req)).toBeNull();
  });

  it("returns null when authorization bearer matches", () => {
    const req = buildRequest({ Authorization: "Bearer secret_admin_token" });
    expect(requireAdmin(req)).toBeNull();
  });

  it("returns 403 when token is missing", async () => {
    const req = buildRequest({});
    const res = requireAdmin(req);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(403);
  });

  it("returns 403 when token is wrong", async () => {
    const req = buildRequest({ "x-admin-token": "wrong_token" });
    const res = requireAdmin(req);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(403);
  });

  it("returns 500 when admin token is not configured", async () => {
    delete process.env.ARTIST_OS_ADMIN_TOKEN;
    const req = buildRequest({ "x-admin-token": "any_token" });
    const res = requireAdmin(req);
    expect(res).not.toBeNull();
    expect(res?.status).toBe(500);
  });
});
