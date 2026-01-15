import { describe, expect, it } from "vitest";
import { getAuthUserId, userOwnsArtist } from "@/lib/artist-os/auth";

function buildRequest(headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/test", {
    method: "GET",
    headers,
  });
}

describe("getAuthUserId", () => {
  it("returns user id from x-user-id header", () => {
    const req = buildRequest({ "x-user-id": "user_123" });
    expect(getAuthUserId(req)).toBe("user_123");
  });

  it("returns user id from x-incurator-user header", () => {
    const req = buildRequest({ "x-incurator-user": "user_456" });
    expect(getAuthUserId(req)).toBe("user_456");
  });

  it("returns bearer token from authorization header", () => {
    const req = buildRequest({ Authorization: "Bearer token_789" });
    expect(getAuthUserId(req)).toBe("token_789");
  });

  it("returns null when no auth headers present", () => {
    const req = buildRequest({});
    expect(getAuthUserId(req)).toBeNull();
  });

  it("returns null for empty or whitespace-only headers", () => {
    expect(getAuthUserId(buildRequest({ "x-user-id": "" }))).toBeNull();
    expect(getAuthUserId(buildRequest({ "x-user-id": "   " }))).toBeNull();
    expect(getAuthUserId(buildRequest({ Authorization: "Bearer " }))).toBeNull();
  });

  it("prefers x-user-id over authorization header", () => {
    const req = buildRequest({
      "x-user-id": "from_header",
      Authorization: "Bearer from_bearer",
    });
    expect(getAuthUserId(req)).toBe("from_header");
  });
});

describe("userOwnsArtist", () => {
  it("returns true when artist_id matches user_id", () => {
    const req = buildRequest({});
    expect(userOwnsArtist(req, "user_123", "user_123")).toBe(true);
  });

  it("returns true when artist_id starts with user_id prefix", () => {
    const req = buildRequest({});
    expect(userOwnsArtist(req, "user_123", "user_123_demo")).toBe(true);
    expect(userOwnsArtist(req, "user_123", "user_123_project_a")).toBe(true);
  });

  it("returns false when artist_id does not match ownership patterns", () => {
    const req = buildRequest({});
    expect(userOwnsArtist(req, "user_123", "other_artist")).toBe(false);
    expect(userOwnsArtist(req, "user_123", "user_456_demo")).toBe(false);
  });

  it("returns true when artist is in x-artist-ids header", () => {
    const req = buildRequest({ "x-artist-ids": "artist_a, artist_b, artist_c" });
    expect(userOwnsArtist(req, "user_123", "artist_b")).toBe(true);
  });

  it("returns false when artist is not in x-artist-ids header", () => {
    const req = buildRequest({ "x-artist-ids": "artist_a, artist_b" });
    expect(userOwnsArtist(req, "user_123", "artist_c")).toBe(false);
  });
});
