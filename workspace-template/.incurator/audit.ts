import * as fs from "fs/promises";
import * as path from "path";
import { createHash } from "crypto";
import { updateManifestEntry } from "./manifest";

function getWorkspaceRoot() {
  return process.env.WORKSPACE_ROOT ?? "/vercel/sandbox/workspace";
}

function getCommitsLogPath() {
  return path.join(getWorkspaceRoot(), ".trace", "commits.jsonl");
}

interface CommitEntry {
  path: string;
  action: "create" | "update" | "delete" | "append";
  hash: string;
  timestamp: string;
  sessionId?: string;
  tool?: string;
  error?: string;
}

export async function appendCommitLog(
  filePath: string,
  action: CommitEntry["action"],
  content: string | Buffer,
  tool?: string,
  error?: string
) {
  const hash = createHash("sha256").update(content).digest("hex").slice(0, 12);
  const workspaceRoot = getWorkspaceRoot();

  const entry: CommitEntry = {
    path: filePath.replace(`${workspaceRoot}/`, ""),
    action,
    hash,
    timestamp: new Date().toISOString(),
    sessionId: process.env.SESSION_ID,
    tool,
    error,
  };

  const commitsLogPath = getCommitsLogPath();
  await fs.mkdir(path.dirname(commitsLogPath), { recursive: true });
  await fs.appendFile(commitsLogPath, JSON.stringify(entry) + "\n");
}

export async function appendAuditLog(tool: string, input: unknown) {
  const entry = {
    timestamp: new Date().toISOString(),
    tool,
    input: typeof input === "object" ? JSON.stringify(input) : String(input),
  };

  const auditPath = path.join(getWorkspaceRoot(), "logs", "audit.log");
  await fs.mkdir(path.dirname(auditPath), { recursive: true });
  await fs.appendFile(auditPath, JSON.stringify(entry) + "\n");

  // Update manifest for audit log
  const content = await fs.readFile(auditPath, "utf-8");
  await updateManifestEntry("logs/audit.log", content);
}

export async function writeProgressHandover(result: {
  messages?: unknown[];
  exitCode?: number;
}) {
  const workspaceRoot = getWorkspaceRoot();
  const progressPath = path.join(workspaceRoot, "progress", "claude-progress.md");
  const lastRunPath = path.join(workspaceRoot, "progress", "last-run.json");

  const summary = `
## Run completed at ${new Date().toISOString()}

- Messages exchanged: ${result.messages?.length || 0}
- Exit status: ${result.exitCode || 0}
- Session ID: ${process.env.SESSION_ID || "unknown"}

### What was accomplished
(Agent should update this section during the run)

### Next steps for future sessions
(Agent should fill this in before ending the run)
  `.trim();

  await fs.mkdir(path.dirname(progressPath), { recursive: true });
  await fs.appendFile(progressPath, "\n\n" + summary);

  const progressContent = await fs.readFile(progressPath, "utf-8");
  await appendCommitLog(progressPath, "append", progressContent, "writeProgressHandover");
  await updateManifestEntry("progress/claude-progress.md", progressContent);

  const lastRunContent = JSON.stringify(
    {
      completed_at: new Date().toISOString(),
      session_id: process.env.SESSION_ID,
      message_count: result.messages?.length || 0,
      exit_code: result.exitCode || 0,
    },
    null,
    2
  );

  await fs.writeFile(lastRunPath, lastRunContent);
  await appendCommitLog(lastRunPath, "update", lastRunContent, "writeProgressHandover");
  await updateManifestEntry("progress/last-run.json", lastRunContent);
}

export async function logTrajectoryStep(step: Record<string, unknown>) {
  const sessionId = process.env.SESSION_ID ?? "unknown";
  const runPath = path.join(getWorkspaceRoot(), ".trace", "runs", `${sessionId}.jsonl`);
  await fs.mkdir(path.dirname(runPath), { recursive: true });
  await fs.appendFile(runPath, JSON.stringify(step) + "\n");

  // Update manifest for trajectory log
  const content = await fs.readFile(runPath, "utf-8");
  await updateManifestEntry(`.trace/runs/${sessionId}.jsonl`, content);
}
