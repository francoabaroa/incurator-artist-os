import { describe, expect, it, beforeEach, afterEach } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";
import { tmpdir } from "os";
import { execSync } from "child_process";

/**
 * Tests for init.sh corruption detection.
 * These tests verify ExecPlan scenario #12: init.sh fails when workspace is corrupted.
 */

describe("init.sh", () => {
  let tempDir: string;
  let initScript: string;

  beforeEach(async () => {
    // Create temp directory to simulate workspace
    tempDir = await fs.mkdtemp(path.join(tmpdir(), "artist-os-init-"));

    // Copy init.sh to temp dir (we'll modify it to cd to tempDir instead)
    const originalInit = await fs.readFile(
      path.join(process.cwd(), "workspace-template", "init.sh"),
      "utf-8"
    );

    // Modify init.sh to use our temp directory
    initScript = originalInit.replace(
      "cd /vercel/sandbox/workspace",
      `cd "${tempDir}"`
    );
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function runInit(): Promise<{ exitCode: number; output: string }> {
    const scriptPath = path.join(tempDir, "_test_init.sh");
    await fs.writeFile(scriptPath, initScript, { mode: 0o755 });

    try {
      const output = execSync(`bash "${scriptPath}"`, {
        encoding: "utf-8",
        cwd: tempDir,
      });
      return { exitCode: 0, output };
    } catch (error: unknown) {
      const execError = error as { status: number; stdout?: string; stderr?: string };
      return {
        exitCode: execError.status || 1,
        output: (execError.stdout || "") + (execError.stderr || ""),
      };
    }
  }

  async function createValidWorkspace() {
    // Create all required directories
    const dirs = ["profile", "tasks", "releases", "marketing", "progress", ".trace", ".index"];
    for (const dir of dirs) {
      await fs.mkdir(path.join(tempDir, dir), { recursive: true });
    }

    // Create required files
    await fs.writeFile(path.join(tempDir, "CLAUDE.md"), "# Instructions");
    await fs.writeFile(path.join(tempDir, "profile", "artist.json"), "{}");
    await fs.writeFile(path.join(tempDir, "progress", "claude-progress.md"), "# Progress");
  }

  it("succeeds with valid workspace structure", async () => {
    await createValidWorkspace();

    const result = await runInit();
    expect(result.exitCode).toBe(0);
    expect(result.output).toContain("Session Ready");
  });

  it("fails when required directory is missing", async () => {
    await createValidWorkspace();

    // Remove a required directory
    await fs.rm(path.join(tempDir, "tasks"), { recursive: true });

    const result = await runInit();
    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain("Missing directory: tasks");
  });

  it("fails when profile directory is missing", async () => {
    await createValidWorkspace();

    // Remove profile directory (and its files)
    await fs.rm(path.join(tempDir, "profile"), { recursive: true });

    const result = await runInit();
    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain("Missing directory: profile");
  });

  it("fails when CLAUDE.md is missing", async () => {
    await createValidWorkspace();

    // Remove CLAUDE.md
    await fs.rm(path.join(tempDir, "CLAUDE.md"));

    const result = await runInit();
    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain("Missing file: CLAUDE.md");
  });

  it("fails when profile/artist.json is missing", async () => {
    await createValidWorkspace();

    // Remove artist.json
    await fs.rm(path.join(tempDir, "profile", "artist.json"));

    const result = await runInit();
    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain("Missing file: profile/artist.json");
  });

  it("fails when progress/claude-progress.md is missing", async () => {
    await createValidWorkspace();

    // Remove claude-progress.md
    await fs.rm(path.join(tempDir, "progress", "claude-progress.md"));

    const result = await runInit();
    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain("Missing file: progress/claude-progress.md");
  });

  it("fails with completely empty workspace", async () => {
    // Don't create anything - workspace is empty
    const result = await runInit();
    expect(result.exitCode).not.toBe(0);
    expect(result.output).toContain("Missing directory");
  });
});
