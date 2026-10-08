import crypto from "crypto";
import { Writable } from "stream";
import type { Sandbox } from "@vercel/sandbox";
import type { LogData } from "./types";
import type { SessionMode } from "./session-mode";
import { readSandboxFile } from "./snapshot";

const WORKSPACE_ROOT = "/vercel/sandbox/workspace";
const CLAUDE_CONFIG_DIR = `${WORKSPACE_ROOT}/.claude-state`;
const LEGACY_REMOTE_BIO_FLAG = "ARTIST_OS_ENABLE_REMOTE_BIO_TOOL";

function buildIncuratorBridgeConfigB64() {
  const apiUrl = process.env.INCURATOR_API_URL?.trim();
  const serviceToken = process.env.ARTIST_OS_SERVICE_TOKEN?.trim();

  if (!apiUrl || !serviceToken) {
    return undefined;
  }

  const enableRemoteTextTools =
    process.env.ARTIST_OS_ENABLE_REMOTE_TEXT_TOOLS === "true" ||
    process.env[LEGACY_REMOTE_BIO_FLAG] === "true";

  return Buffer.from(
    JSON.stringify({
      apiUrl,
      serviceToken,
      enableRemoteTextTools,
    }),
    "utf-8"
  ).toString("base64");
}

export async function runAgent(
  sandbox: Sandbox,
  prompt: string,
  resumeSessionId: string | undefined,
  onLog: (log: LogData) => void,
  artistId: string,
  sessionMode: SessionMode,
  incuratorUserId?: string
): Promise<{ exitCode: number; sessionId?: string }> {
  const runId = crypto.randomUUID();
  const promptB64 = Buffer.from(prompt, "utf-8").toString("base64");

  const stdout = createLogStream("stdout", onLog);
  const stderr = createLogStream("stderr", onLog);

  // Use run-specific session file path to prevent stale reads if cleanup fails
  const sessionFilePath = `/vercel/sandbox/_agent_session_${runId}.json`;

  const env: Record<string, string> = {
    PROMPT_B64: promptB64,
    SESSION_ID: runId,
    SESSION_FILE_PATH: sessionFilePath,
    WORKSPACE_ROOT,
    CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: "80",
    CLAUDE_CONFIG_DIR,
    AGENT_ARTIST_ID: artistId,
    SESSION_MODE: sessionMode,
  };

  if (incuratorUserId) {
    env.AGENT_INCURATOR_USER_ID = incuratorUserId;
  }

  if (resumeSessionId) {
    env.RESUME_SESSION_ID = resumeSessionId;
  }

  if (process.env.ANTHROPIC_API_KEY) {
    env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  } else {
    throw new Error("ANTHROPIC_API_KEY is required to run Artist OS agent");
  }

  const incuratorBridgeConfigB64 = buildIncuratorBridgeConfigB64();
  if (incuratorBridgeConfigB64) {
    env.INCURATOR_BRIDGE_CONFIG_B64 = incuratorBridgeConfigB64;
  }

  const result = await sandbox.runCommand({
    cmd: "bash",
    args: [
      "-lc",
      "cd /vercel/sandbox/workspace/.incurator && node --import tsx ./runner.ts",
    ],
    env,
    stdout,
    stderr,
  });

  const exitCode = result.exitCode ?? 0;
  let sessionId: string | undefined;

  try {
    const sessionFileBytes = await readSandboxFile(sandbox, sessionFilePath);
    const sessionData = JSON.parse(sessionFileBytes.toString("utf-8")) as {
      sessionId?: string;
    };
    sessionId = sessionData.sessionId;
  } catch (err) {
    // File may not exist if agent crashed before writing or SDK didn't emit session_id
    console.error("[agent] Failed to read session file:", err);
    sessionId = undefined;
  }

  // Cleanup session file separately to avoid losing sessionId on cleanup failure
  try {
    await sandbox.runCommand({
      cmd: "rm",
      args: ["-f", sessionFilePath],
    });
  } catch (err) {
    // Cleanup failure shouldn't prevent returning the session ID
    console.warn("[agent] Failed to cleanup session file:", err);
  }

  return { exitCode, sessionId };
}

function createLogStream(
  stream: "stdout" | "stderr",
  onLog: (log: LogData) => void
) {
  let buffer = "";

  return new Writable({
    write(chunk, _encoding, callback) {
      const text = Buffer.isBuffer(chunk) ? chunk.toString("utf-8") : String(chunk);
      buffer += text;

      // Split by newlines and emit complete lines
      const lines = buffer.split("\n");
      // Keep the last incomplete line in the buffer
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        // Emit all lines including blank ones to preserve output formatting
        onLog({ stream, chunk: line });
      }
      callback();
    },
    final(callback) {
      // Emit any remaining buffered content on stream end
      if (buffer.length > 0) {
        onLog({ stream, chunk: buffer });
        buffer = "";
      }
      callback();
    },
  });
}
