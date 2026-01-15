import { describe, expect, it, beforeEach, vi } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";
import { tmpdir } from "os";

async function loadModules(workspace: string) {
  process.env.WORKSPACE_ROOT = workspace;
  process.env.SESSION_ID = "test-session";
  vi.resetModules();
  const audit = await import("../../workspace-template/.incurator/audit");
  const manifest = await import("../../workspace-template/.incurator/manifest");
  return { audit, manifest };
}

describe("audit + manifest integration", () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(path.join(tmpdir(), "artist-os-"));
    await fs.mkdir(path.join(workspaceRoot, "progress"), { recursive: true });
    await fs.mkdir(path.join(workspaceRoot, ".index"), { recursive: true });
    await fs.mkdir(path.join(workspaceRoot, ".trace", "runs"), { recursive: true });
    await fs.mkdir(path.join(workspaceRoot, "logs"), { recursive: true });

    // Ensure a manifest exists
    await fs.writeFile(
      path.join(workspaceRoot, ".index", "manifest.json"),
      JSON.stringify({ version: 0, lastUpdated: new Date().toISOString(), files: {}, hotFiles: [] }, null, 2)
    );
  });

  it("updates manifest entries for writeProgressHandover", async () => {
    const { audit, manifest } = await loadModules(workspaceRoot);

    // Seed progress file
    await fs.writeFile(path.join(workspaceRoot, "progress", "claude-progress.md"), "# Progress\n");

    await audit.writeProgressHandover({ messages: [], exitCode: 0 });

    const m = await manifest.readManifest();
    expect(m.files["progress/claude-progress.md"]).toBeDefined();
    expect(m.files["progress/last-run.json"]).toBeDefined();
  });

  it("updates manifest entries for logTrajectoryStep", async () => {
    const { audit, manifest } = await loadModules(workspaceRoot);

    await audit.logTrajectoryStep({ step: 1, tool: "Read" });

    const m = await manifest.readManifest();
    expect(m.files[".trace/runs/test-session.jsonl"]).toBeDefined();
  });

  it("updates manifest entries for appendAuditLog", async () => {
    const { audit, manifest } = await loadModules(workspaceRoot);

    await audit.appendAuditLog("TestTool", { input: "test" });

    const m = await manifest.readManifest();
    expect(m.files["logs/audit.log"]).toBeDefined();
  });
});
