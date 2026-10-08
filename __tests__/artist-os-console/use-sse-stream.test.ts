import { describe, expect, it } from "vitest";
import { buildConsoleQueryRequestBody } from "@/app/artist-os-console/hooks/use-sse-stream";

describe("buildConsoleQueryRequestBody", () => {
  it("includes session_mode for new sessions", () => {
    expect(
      buildConsoleQueryRequestBody({
        userId: "user_1",
        artistId: "artist_1",
        prompt: "Start a new run",
        sessionMode: "feature_flow",
      })
    ).toEqual({
      artist_id: "artist_1",
      prompt: "Start a new run",
      session_mode: "feature_flow",
      resume_session_id: undefined,
    });
  });

  it("includes session_mode for resumed sessions", () => {
    expect(
      buildConsoleQueryRequestBody({
        userId: "user_1",
        artistId: "artist_1",
        prompt: "Continue the run",
        sessionMode: "artist_ops",
        resumeSessionId: "session_123",
      })
    ).toEqual({
      artist_id: "artist_1",
      prompt: "Continue the run",
      session_mode: "artist_ops",
      resume_session_id: "session_123",
    });
  });
});
