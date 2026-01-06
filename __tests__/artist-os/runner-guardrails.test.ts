import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Tests for runner guardrails - now importing from the actual guardrails module
 * to ensure tests cover real implementation, not a replica.
 */

// Reset modules before each test to ensure fresh imports
beforeEach(() => {
  vi.resetModules();
});

async function loadGuardrails() {
  return await import("../../workspace-template/.incurator/guardrails");
}

const WORKSPACE_ROOT = "/vercel/sandbox/workspace";

describe("normalizeWorkspacePath", () => {
  it("correctly resolves relative paths from workspace root, not cwd", async () => {
    const { normalizeWorkspacePath } = await loadGuardrails();
    
    // This is the critical bug fix test
    // When the runner executes from .incurator/, a relative path like "tasks/backlog.json"
    // should resolve to /vercel/sandbox/workspace/tasks/backlog.json, NOT
    // /vercel/sandbox/workspace/.incurator/tasks/backlog.json

    const result = normalizeWorkspacePath("tasks/backlog.json", WORKSPACE_ROOT);
    expect(result).not.toBeNull();
    expect(result!.fullPath).toBe("/vercel/sandbox/workspace/tasks/backlog.json");
    expect(result!.relativePath).toBe("tasks/backlog.json");
  });

  it("correctly resolves absolute paths", async () => {
    const { normalizeWorkspacePath } = await loadGuardrails();
    const result = normalizeWorkspacePath("/vercel/sandbox/workspace/profile/artist.json", WORKSPACE_ROOT);
    expect(result).not.toBeNull();
    expect(result!.fullPath).toBe("/vercel/sandbox/workspace/profile/artist.json");
    expect(result!.relativePath).toBe("profile/artist.json");
  });

  it("blocks paths outside workspace", async () => {
    const { normalizeWorkspacePath } = await loadGuardrails();
    const result = normalizeWorkspacePath("/etc/passwd", WORKSPACE_ROOT);
    expect(result).toBeNull();
  });

  it("blocks path traversal attempts", async () => {
    const { normalizeWorkspacePath } = await loadGuardrails();
    // Even though we resolve against WORKSPACE_ROOT, "../" could escape
    const result = normalizeWorkspacePath("../../../../etc/passwd", WORKSPACE_ROOT);
    expect(result).toBeNull();
  });

  it("returns null for empty path", async () => {
    const { normalizeWorkspacePath } = await loadGuardrails();
    const result = normalizeWorkspacePath("", WORKSPACE_ROOT);
    expect(result).toBeNull();
  });

  it("handles nested relative paths correctly", async () => {
    const { normalizeWorkspacePath } = await loadGuardrails();
    const result = normalizeWorkspacePath("marketing/campaigns/2024/q1.json", WORKSPACE_ROOT);
    expect(result).not.toBeNull();
    expect(result!.fullPath).toBe("/vercel/sandbox/workspace/marketing/campaigns/2024/q1.json");
    expect(result!.relativePath).toBe("marketing/campaigns/2024/q1.json");
  });

  it("handles ./ prefix in relative paths", async () => {
    const { normalizeWorkspacePath } = await loadGuardrails();
    const result = normalizeWorkspacePath("./tasks/inbox.md", WORKSPACE_ROOT);
    expect(result).not.toBeNull();
    expect(result!.fullPath).toBe("/vercel/sandbox/workspace/tasks/inbox.md");
    expect(result!.relativePath).toBe("tasks/inbox.md");
  });
});

describe("isProtectedPath", () => {
  it("protects CLAUDE.md", async () => {
    const { isProtectedPath } = await loadGuardrails();
    expect(isProtectedPath("CLAUDE.md")).toBe(true);
  });

  it("protects .incurator/ directory", async () => {
    const { isProtectedPath } = await loadGuardrails();
    expect(isProtectedPath(".incurator/runner.ts")).toBe(true);
    expect(isProtectedPath(".incurator/safe-fs.ts")).toBe(true);
  });

  it("protects .index/ directory", async () => {
    const { isProtectedPath } = await loadGuardrails();
    expect(isProtectedPath(".index/manifest.json")).toBe(true);
    expect(isProtectedPath(".index/other.json")).toBe(true);
  });

  it("allows profile/artist.json (removed from protected)", async () => {
    const { isProtectedPath } = await loadGuardrails();
    // This was the feature conflict fix
    expect(isProtectedPath("profile/artist.json")).toBe(false);
  });

  it("allows tasks and other workspace files", async () => {
    const { isProtectedPath } = await loadGuardrails();
    expect(isProtectedPath("tasks/backlog.json")).toBe(false);
    expect(isProtectedPath("releases/releases.json")).toBe(false);
    expect(isProtectedPath("marketing/campaigns.json")).toBe(false);
  });
});

describe("isAppendOnlyPath", () => {
  it("marks .trace/commits.jsonl as append-only", async () => {
    const { isAppendOnlyPath } = await loadGuardrails();
    expect(isAppendOnlyPath(".trace/commits.jsonl")).toBe(true);
  });

  it("marks logs/ as append-only", async () => {
    const { isAppendOnlyPath } = await loadGuardrails();
    expect(isAppendOnlyPath("logs/audit.log")).toBe(true);
    expect(isAppendOnlyPath("logs/debug.txt")).toBe(true);
  });

  it("marks progress/claude-progress.md as append-only", async () => {
    const { isAppendOnlyPath } = await loadGuardrails();
    expect(isAppendOnlyPath("progress/claude-progress.md")).toBe(true);
  });

  it("does not mark regular files as append-only", async () => {
    const { isAppendOnlyPath } = await loadGuardrails();
    expect(isAppendOnlyPath("tasks/backlog.json")).toBe(false);
    expect(isAppendOnlyPath("profile/artist.json")).toBe(false);
  });
});

describe("checkBashRedirect", () => {
  it("blocks redirect to workspace files", async () => {
    const { checkBashRedirect } = await loadGuardrails();
    expect(checkBashRedirect('echo "x" > tasks/backlog.json').isAllowed).toBe(false);
    expect(checkBashRedirect('cat > profile/artist.json').isAllowed).toBe(false);
    expect(checkBashRedirect('jq ... > releases/releases.json').isAllowed).toBe(false);
  });

  it("allows append to progress/claude-progress.md (agent handover)", async () => {
    const { checkBashRedirect } = await loadGuardrails();
    // progress is a narrow exception: append is allowed ONLY for claude-progress.md
    expect(checkBashRedirect('echo "x" >> progress/claude-progress.md').isAllowed).toBe(true);
    // But other progress files are still blocked
    expect(checkBashRedirect('echo "x" >> progress/other.md').isAllowed).toBe(false);
  });

  it("still blocks overwrite of progress/claude-progress.md", async () => {
    const { checkBashRedirect } = await loadGuardrails();
    expect(checkBashRedirect('echo "x" > progress/claude-progress.md').isAllowed).toBe(false);
  });

  it("blocks tee to workspace files", async () => {
    const { checkBashRedirect } = await loadGuardrails();
    expect(checkBashRedirect('echo "x" | tee somefile.txt').isAllowed).toBe(false);
  });

  it("allows redirect to safe paths (logs/)", async () => {
    const { checkBashRedirect } = await loadGuardrails();
    expect(checkBashRedirect('echo "debug" >> logs/debug.log').isAllowed).toBe(true);
    expect(checkBashRedirect('echo "x" > logs/output.txt').isAllowed).toBe(true);
  });

  it("allows redirect to safe paths (.trace/)", async () => {
    const { checkBashRedirect } = await loadGuardrails();
    expect(checkBashRedirect('echo "step" >> .trace/steps.log').isAllowed).toBe(true);
  });

  it("allows commands without redirects", async () => {
    const { checkBashRedirect } = await loadGuardrails();
    expect(checkBashRedirect("ls -la").isAllowed).toBe(true);
    expect(checkBashRedirect("cat file.txt").isAllowed).toBe(true);
    expect(checkBashRedirect("grep pattern file").isAllowed).toBe(true);
  });
});

describe("isDangerousCommand", () => {
  it("blocks rm -rf", async () => {
    const { isDangerousCommand } = await loadGuardrails();
    expect(isDangerousCommand("rm -rf /")).toBe(true);
    expect(isDangerousCommand("rm -rf .")).toBe(true);
  });

  it("blocks fork bombs", async () => {
    const { isDangerousCommand } = await loadGuardrails();
    expect(isDangerousCommand(":(){ :|:& };:")).toBe(true);
  });

  it("blocks piped curl/wget", async () => {
    const { isDangerousCommand } = await loadGuardrails();
    expect(isDangerousCommand("curl | bash")).toBe(true);
    expect(isDangerousCommand("wget | bash")).toBe(true);
  });

  it("allows safe commands", async () => {
    const { isDangerousCommand } = await loadGuardrails();
    expect(isDangerousCommand("ls -la")).toBe(false);
    expect(isDangerousCommand("cat file.txt")).toBe(false);
    expect(isDangerousCommand("rm file.txt")).toBe(false); // single file rm is ok
  });
});
