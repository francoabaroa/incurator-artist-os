import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.fn();
const setMock = vi.fn();

vi.mock("@/lib/artist-os/redis", () => ({
  getRedis: () => ({
    get: getMock,
    set: setMock,
  }),
}));

import { DEFAULT_SESSION_MODE } from "@/lib/artist-os/session-mode";
import {
  ResumeSessionMetadataError,
  getSessionMetadata,
  resolveSessionContextForRequest,
  storeSessionMetadata,
} from "@/lib/artist-os/session-metadata";

describe("session metadata", () => {
  beforeEach(() => {
    getMock.mockReset();
    setMock.mockReset();
  });

  it("defaults new requests to artist_ops", async () => {
    await expect(
      resolveSessionContextForRequest({ artistId: "artist_1" })
    ).resolves.toEqual({
      sessionMode: DEFAULT_SESSION_MODE,
      incuratorUserId: undefined,
    });
    expect(getMock).not.toHaveBeenCalled();
  });

  it("uses stored mode and actor when resuming without an explicit override", async () => {
    getMock.mockResolvedValue(
      JSON.stringify({
        artistId: "artist_1",
        sessionMode: "feature_flow",
        incuratorUserId: "123",
        storedAt: new Date().toISOString(),
      })
    );

    await expect(
      resolveSessionContextForRequest({
        artistId: "artist_1",
        resumeSessionId: "session_1",
      })
    ).resolves.toEqual({
      sessionMode: "feature_flow",
      incuratorUserId: "123",
    });
  });

  it("rejects resume requests when session metadata is missing", async () => {
    getMock.mockResolvedValue(null);

    await expect(
      resolveSessionContextForRequest({
        artistId: "artist_1",
        resumeSessionId: "session_1",
      })
    ).rejects.toMatchObject({
      name: "ResumeSessionMetadataError",
      message:
        "resume_session_id is missing metadata and cannot be resumed safely",
    });
  });

  it("rejects conflicting explicit modes on resume", async () => {
    getMock.mockResolvedValue(
      JSON.stringify({
        artistId: "artist_1",
        sessionMode: "feature_flow",
        storedAt: new Date().toISOString(),
      })
    );

    await expect(
      resolveSessionContextForRequest({
        artistId: "artist_1",
        requestedSessionMode: "artist_ops",
        resumeSessionId: "session_1",
      })
    ).rejects.toBeInstanceOf(ResumeSessionMetadataError);
  });

  it("rejects conflicting incurator user ids on resume", async () => {
    getMock.mockResolvedValue(
      JSON.stringify({
        artistId: "artist_1",
        sessionMode: "artist_ops",
        incuratorUserId: "123",
        storedAt: new Date().toISOString(),
      })
    );

    await expect(
      resolveSessionContextForRequest({
        artistId: "artist_1",
        requestedIncuratorUserId: "456",
        resumeSessionId: "session_1",
      })
    ).rejects.toMatchObject({
      name: "ResumeSessionMetadataError",
      message:
        "resume_session_id was started with a different x-incurator-user-id and cannot switch backend actors",
    });
  });

  it("returns null for malformed stored metadata", async () => {
    getMock.mockResolvedValue(
      JSON.stringify({
        artistId: "artist_1",
        sessionMode: "unknown_mode",
      })
    );

    await expect(getSessionMetadata("session_1")).resolves.toBeNull();
  });

  it("stores session metadata with a ttl", async () => {
    setMock.mockResolvedValue("OK");

    await storeSessionMetadata("session_1", {
      artistId: "artist_1",
      sessionMode: "feature_flow",
      incuratorUserId: "123",
    });

    expect(setMock).toHaveBeenCalledWith(
      "artist-os:session:session_1",
      expect.stringContaining('"incuratorUserId":"123"'),
      "PX",
      expect.any(Number)
    );
  });
});
