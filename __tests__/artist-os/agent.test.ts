import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { runAgent } from "@/lib/artist-os/agent";

describe("runAgent", () => {
  const originalApiKey = process.env.ANTHROPIC_API_KEY;
  const originalIncuratorApiUrl = process.env.INCURATOR_API_URL;
  const originalServiceToken = process.env.ARTIST_OS_SERVICE_TOKEN;
  const originalRemoteTextTools = process.env.ARTIST_OS_ENABLE_REMOTE_TEXT_TOOLS;
  const originalLegacyRemoteBio = process.env.ARTIST_OS_ENABLE_REMOTE_BIO_TOOL;

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = "test_api_key";
    process.env.INCURATOR_API_URL = "http://localhost:3001";
    process.env.ARTIST_OS_SERVICE_TOKEN = "test-service-token";
    delete process.env.ARTIST_OS_ENABLE_REMOTE_TEXT_TOOLS;
    delete process.env.ARTIST_OS_ENABLE_REMOTE_BIO_TOOL;
  });

  afterEach(() => {
    if (originalApiKey !== undefined) {
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    } else {
      delete process.env.ANTHROPIC_API_KEY;
    }

    if (originalIncuratorApiUrl !== undefined) {
      process.env.INCURATOR_API_URL = originalIncuratorApiUrl;
    } else {
      delete process.env.INCURATOR_API_URL;
    }

    if (originalServiceToken !== undefined) {
      process.env.ARTIST_OS_SERVICE_TOKEN = originalServiceToken;
    } else {
      delete process.env.ARTIST_OS_SERVICE_TOKEN;
    }

    if (originalRemoteTextTools !== undefined) {
      process.env.ARTIST_OS_ENABLE_REMOTE_TEXT_TOOLS = originalRemoteTextTools;
    } else {
      delete process.env.ARTIST_OS_ENABLE_REMOTE_TEXT_TOOLS;
    }

    if (originalLegacyRemoteBio !== undefined) {
      process.env.ARTIST_OS_ENABLE_REMOTE_BIO_TOOL = originalLegacyRemoteBio;
    } else {
      delete process.env.ARTIST_OS_ENABLE_REMOTE_BIO_TOOL;
    }
  });

  it("encodes prompt as base64 and passes bridge config without exposing raw bridge env vars", async () => {
    const mockRunCommand = vi.fn().mockResolvedValue({ exitCode: 0 });
    // Mock readFile to return a session file (simulating runner writing session id)
    const mockReadFile = vi.fn().mockResolvedValue(
      (async function* () {
        yield Buffer.from(JSON.stringify({ sessionId: "test-session-id", createdAt: new Date().toISOString() }));
      })()
    );
    const mockSandbox = {
      runCommand: mockRunCommand,
      readFile: mockReadFile,
    };

    const logs: Array<{ stream: string; chunk: string }> = [];
    const { exitCode, sessionId } = await runAgent(
      mockSandbox as unknown as import("@vercel/sandbox").Sandbox,
      "Hello, Artist OS!",
      undefined,
      (log) => logs.push(log),
      "artist_test001",
      "artist_ops",
      "123"
    );

    expect(exitCode).toBe(0);
    expect(sessionId).toBe("test-session-id");
    expect(mockRunCommand).toHaveBeenCalledTimes(2); // Once for agent, once for rm cleanup

    const callArgs = mockRunCommand.mock.calls[0][0];
    expect(callArgs.cmd).toBe("bash");
    expect(callArgs.env.PROMPT_B64).toBe(
      Buffer.from("Hello, Artist OS!", "utf-8").toString("base64")
    );
    expect(callArgs.env.SESSION_ID).toBeDefined();
    expect(callArgs.env.WORKSPACE_ROOT).toBe("/vercel/sandbox/workspace");
    expect(callArgs.env.CLAUDE_CONFIG_DIR).toBe(
      "/vercel/sandbox/workspace/.claude-state"
    );
    expect(callArgs.env.AGENT_ARTIST_ID).toBe("artist_test001");
    expect(callArgs.env.AGENT_INCURATOR_USER_ID).toBe("123");
    expect(callArgs.env.SESSION_MODE).toBe("artist_ops");

    const bridgeConfig = JSON.parse(
      Buffer.from(callArgs.env.INCURATOR_BRIDGE_CONFIG_B64, "base64").toString(
        "utf-8"
      )
    ) as {
      apiUrl: string;
      serviceToken: string;
      enableRemoteTextTools: boolean;
    };
    expect(bridgeConfig).toEqual({
      apiUrl: "http://localhost:3001",
      serviceToken: "test-service-token",
      enableRemoteTextTools: false,
    });
    expect(callArgs.env.INCURATOR_API_URL).toBeUndefined();
    expect(callArgs.env.ARTIST_OS_SERVICE_TOKEN).toBeUndefined();
    expect(callArgs.env.ARTIST_OS_ENABLE_REMOTE_TEXT_TOOLS).toBeUndefined();
    expect(callArgs.env.ARTIST_OS_ENABLE_REMOTE_BIO_TOOL).toBeUndefined();
  });

  it("passes resume_session_id when provided", async () => {
    const mockRunCommand = vi.fn().mockResolvedValue({ exitCode: 0 });
    const mockReadFile = vi.fn().mockResolvedValue(
      (async function* () {
        yield Buffer.from(JSON.stringify({ sessionId: "new-session-id", createdAt: new Date().toISOString() }));
      })()
    );
    const mockSandbox = { runCommand: mockRunCommand, readFile: mockReadFile };

    await runAgent(
      mockSandbox as unknown as import("@vercel/sandbox").Sandbox,
      "Continue",
      "session_abc123",
      () => {},
      "artist_test001",
      "feature_flow",
      "123"
    );

    const callArgs = mockRunCommand.mock.calls[0][0];
    expect(callArgs.env.RESUME_SESSION_ID).toBe("session_abc123");
    expect(callArgs.env.SESSION_MODE).toBe("feature_flow");
  });

  it("encodes remote text tool opt-in inside the runner bridge config", async () => {
    process.env.ARTIST_OS_ENABLE_REMOTE_TEXT_TOOLS = "true";
    process.env.ARTIST_OS_ENABLE_REMOTE_BIO_TOOL = "true";

    const mockRunCommand = vi.fn().mockResolvedValue({ exitCode: 0 });
    const mockReadFile = vi.fn().mockResolvedValue(
      (async function* () {
        yield Buffer.from(
          JSON.stringify({
            sessionId: "flag-session-id",
            createdAt: new Date().toISOString(),
          })
        );
      })()
    );
    const mockSandbox = { runCommand: mockRunCommand, readFile: mockReadFile };

    await runAgent(
      mockSandbox as unknown as import("@vercel/sandbox").Sandbox,
      "Check flags",
      undefined,
      () => {},
      "artist_test001",
      "artist_ops",
      "123"
    );

    const callArgs = mockRunCommand.mock.calls[0][0];
    const bridgeConfig = JSON.parse(
      Buffer.from(callArgs.env.INCURATOR_BRIDGE_CONFIG_B64, "base64").toString(
        "utf-8"
      )
    ) as {
      enableRemoteTextTools: boolean;
    };
    expect(bridgeConfig.enableRemoteTextTools).toBe(true);
    expect(callArgs.env.ARTIST_OS_ENABLE_REMOTE_TEXT_TOOLS).toBeUndefined();
    expect(callArgs.env.ARTIST_OS_ENABLE_REMOTE_BIO_TOOL).toBeUndefined();
  });

  it("returns non-zero exit code on failure", async () => {
    const mockRunCommand = vi.fn().mockResolvedValue({ exitCode: 1 });
    // Simulate session file not existing (agent crashed before writing)
    const mockReadFile = vi.fn().mockRejectedValue(new Error("File not found"));
    const mockSandbox = { runCommand: mockRunCommand, readFile: mockReadFile };

    const { exitCode, sessionId } = await runAgent(
      mockSandbox as unknown as import("@vercel/sandbox").Sandbox,
      "Fail please",
      undefined,
      () => {},
      "artist_test001",
      "artist_ops"
    );

    expect(exitCode).toBe(1);
    expect(sessionId).toBeUndefined();
  });

  it("streams stdout and stderr to onLog callback", async () => {
    const logs: Array<{ stream: string; chunk: string }> = [];
    let capturedStdout: import("stream").Writable | undefined;
    let capturedStderr: import("stream").Writable | undefined;

    const mockRunCommand = vi.fn().mockImplementation(async (opts) => {
      // Only capture streams from the first call (agent run, not rm cleanup)
      if (opts.stdout && !capturedStdout) {
        capturedStdout = opts.stdout;
        // Simulate writing to stdout during the command (with newlines for line-buffered output)
        opts.stdout.write("stdout message\n");
      }
      if (opts.stderr && !capturedStderr) {
        capturedStderr = opts.stderr;
        // Simulate writing to stderr during the command
        opts.stderr.write("stderr message\n");
      }
      return { exitCode: 0 };
    });

    const mockReadFile = vi.fn().mockResolvedValue(
      (async function* () {
        yield Buffer.from(JSON.stringify({ sessionId: "stream-test-session", createdAt: new Date().toISOString() }));
      })()
    );

    const mockSandbox = { runCommand: mockRunCommand, readFile: mockReadFile };

    await runAgent(
      mockSandbox as unknown as import("@vercel/sandbox").Sandbox,
      "Test",
      undefined,
      (log) => logs.push(log),
      "artist_test001",
      "artist_ops"
    );

    // Logs should contain complete lines (newlines stripped during buffering)
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
        () => {},
        "artist_test001",
        "artist_ops"
      )
    ).rejects.toThrow("ANTHROPIC_API_KEY is required");
  });
});
