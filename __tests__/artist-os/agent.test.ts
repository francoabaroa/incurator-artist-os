import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { runAgent } from "@/lib/artist-os/agent";

describe("runAgent", () => {
  const originalApiKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "test_api_key";
  });

  afterEach(() => {
    if (originalApiKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }
  });

  it("encodes prompt as base64 and passes environment variables", async () => {
    const mockRunCommand = vi.fn().mockResolvedValue({ exitCode: 0 });
    const mockSandbox = {
      runCommand: mockRunCommand,
    };

    const logs: Array<{ stream: string; chunk: string }> = [];
    const exitCode = await runAgent(
      mockSandbox as unknown as import("@vercel/sandbox").Sandbox,
      "Hello, Artist OS!",
      undefined,
      (log) => logs.push(log)
    );

    expect(exitCode).toBe(0);
    expect(mockRunCommand).toHaveBeenCalledTimes(1);

    const callArgs = mockRunCommand.mock.calls[0][0];
    expect(callArgs.cmd).toBe("bash");
    expect(callArgs.env.PROMPT_B64).toBe(
      Buffer.from("Hello, Artist OS!", "utf-8").toString("base64")
    );
    expect(callArgs.env.SESSION_ID).toBeDefined();
    expect(callArgs.env.WORKSPACE_ROOT).toBe("/vercel/sandbox/workspace");
  });

  it("passes resume_session_id when provided", async () => {
    const mockRunCommand = vi.fn().mockResolvedValue({ exitCode: 0 });
    const mockSandbox = { runCommand: mockRunCommand };

    await runAgent(
      mockSandbox as unknown as import("@vercel/sandbox").Sandbox,
      "Continue",
      "session_abc123",
      () => {}
    );

    const callArgs = mockRunCommand.mock.calls[0][0];
    expect(callArgs.env.RESUME_SESSION_ID).toBe("session_abc123");
  });

  it("returns non-zero exit code on failure", async () => {
    const mockRunCommand = vi.fn().mockResolvedValue({ exitCode: 1 });
    const mockSandbox = { runCommand: mockRunCommand };

    const exitCode = await runAgent(
      mockSandbox as unknown as import("@vercel/sandbox").Sandbox,
      "Fail please",
      undefined,
      () => {}
    );

    expect(exitCode).toBe(1);
  });

  it("streams stdout and stderr to onLog callback", async () => {
    const logs: Array<{ stream: string; chunk: string }> = [];
    let capturedStdout: import("stream").Writable | undefined;
    let capturedStderr: import("stream").Writable | undefined;

    const mockRunCommand = vi.fn().mockImplementation(async (opts) => {
      capturedStdout = opts.stdout;
      capturedStderr = opts.stderr;
      return { exitCode: 0 };
    });

    const mockSandbox = { runCommand: mockRunCommand };

    const promise = runAgent(
      mockSandbox as unknown as import("@vercel/sandbox").Sandbox,
      "Test",
      undefined,
      (log) => logs.push(log)
    );

    await promise;

    // Simulate writing to the streams
    if (capturedStdout) {
      capturedStdout.write("stdout message");
    }
    if (capturedStderr) {
      capturedStderr.write("stderr message");
    }

    expect(logs).toContainEqual({ stream: "stdout", chunk: "stdout message" });
    expect(logs).toContainEqual({ stream: "stderr", chunk: "stderr message" });
  });

  it("throws error when ANTHROPIC_API_KEY is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const mockSandbox = { runCommand: vi.fn() };

    await expect(
      runAgent(
        mockSandbox as unknown as import("@vercel/sandbox").Sandbox,
        "Test",
        undefined,
        () => {}
      )
    ).rejects.toThrow("ANTHROPIC_API_KEY is required");
  });
});
