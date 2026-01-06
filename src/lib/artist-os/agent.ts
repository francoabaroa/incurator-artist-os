import crypto from "crypto";
import { Writable } from "stream";
import type { Sandbox } from "@vercel/sandbox";
import type { LogData } from "./types";

const WORKSPACE_ROOT = "/vercel/sandbox/workspace";

export async function runAgent(
  sandbox: Sandbox,
  prompt: string,
  resumeSessionId: string | undefined,
  onLog: (log: LogData) => void
): Promise<number> {
  const sessionId = crypto.randomUUID();
  const promptB64 = Buffer.from(prompt, "utf-8").toString("base64");

  const stdout = createLogStream("stdout", onLog);
  const stderr = createLogStream("stderr", onLog);

  const env: Record<string, string> = {
    PROMPT_B64: promptB64,
    SESSION_ID: sessionId,
    WORKSPACE_ROOT,
    CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: "80",
  };

  if (resumeSessionId) {
    env.RESUME_SESSION_ID = resumeSessionId;
  }

  if (process.env.ANTHROPIC_API_KEY) {
    env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  } else {
    throw new Error("ANTHROPIC_API_KEY is required to run Artist OS agent");
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

  return result.exitCode ?? 0;
}

function createLogStream(
  stream: "stdout" | "stderr",
  onLog: (log: LogData) => void
) {
  return new Writable({
    write(chunk, _encoding, callback) {
      const text = Buffer.isBuffer(chunk) ? chunk.toString("utf-8") : String(chunk);
      if (text.length > 0) {
        onLog({ stream, chunk: text });
      }
      callback();
    },
  });
}
