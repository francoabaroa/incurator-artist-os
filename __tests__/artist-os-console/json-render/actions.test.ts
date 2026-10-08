import { describe, expect, it, vi } from "vitest";
import { buildApplyPromptDefaults } from "@/app/artist-os-console/ConsoleShell";
import { buildActionHandlers } from "@/app/artist-os-console/json-render/actions";

describe("apply_prompt action handlers", () => {
  it("passes sessionMode through to the console callback", () => {
    const onApplyPrompt = vi.fn();
    const notify = vi.fn();
    const handlers = buildActionHandlers({ onApplyPrompt, notify });

    handlers.apply_prompt({
      prompt: "Resume this run",
      userId: "user_1",
      artistId: "artist_1",
      resumeSessionId: "session_123",
      ownedArtistIds: "artist_1",
      sessionMode: "feature_flow",
    });

    expect(onApplyPrompt).toHaveBeenCalledWith("Resume this run", {
      userId: "user_1",
      artistId: "artist_1",
      resumeSessionId: "session_123",
      ownedArtistIds: "artist_1",
      sessionMode: "feature_flow",
    });
    expect(notify).toHaveBeenCalledWith("Prompt applied", "success");
  });
});

describe("buildApplyPromptDefaults", () => {
  it("prefers the action sessionMode for resume targets", () => {
    expect(
      buildApplyPromptDefaults(
        {
          userId: "user_1",
          artistId: "artist_1",
          sessionMode: "artist_ops",
        },
        {
          userId: "user_1",
          artistId: "artist_1",
          prompt: "Previous request",
          sessionMode: "artist_ops",
        },
        "Resume targeted run",
        {
          resumeSessionId: "session_123",
          sessionMode: "feature_flow",
        }
      )
    ).toMatchObject({
      userId: "user_1",
      artistId: "artist_1",
      prompt: "Resume targeted run",
      resumeSessionId: "session_123",
      sessionMode: "feature_flow",
    });
  });
});
