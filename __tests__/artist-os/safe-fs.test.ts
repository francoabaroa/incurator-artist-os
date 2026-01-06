import { describe, expect, it, beforeEach, vi } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";
import { tmpdir } from "os";

async function loadSafeFs(workspace: string) {
  process.env.WORKSPACE_ROOT = workspace;
  vi.resetModules();
  return await import("../../workspace-template/.incurator/safe-fs");
}

describe("safe-fs", () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(path.join(tmpdir(), "artist-os-"));
  });

  it("creates new files and blocks overwrite by default", async () => {
    const { safeWriteFile } = await loadSafeFs(workspaceRoot);

    await safeWriteFile("notes/plan.md", "hello");
    const content = await fs.readFile(
      path.join(workspaceRoot, "notes", "plan.md"),
      "utf-8"
    );
    expect(content).toBe("hello");

    await expect(safeWriteFile("notes/plan.md", "updated")).rejects.toThrow(
      "File already exists"
    );
  });

  it("blocks path traversal and protected overwrites", async () => {
    const { safeWriteFile } = await loadSafeFs(workspaceRoot);

    await expect(
      safeWriteFile("../secrets.txt", "nope")
    ).rejects.toThrow("Path traversal blocked");

    // CLAUDE.md is a protected path that cannot be overwritten
    await fs.writeFile(path.join(workspaceRoot, "CLAUDE.md"), "# Original");

    await expect(
      safeWriteFile("CLAUDE.md", "# Overwritten", { allowOverwrite: true })
    ).rejects.toThrow("Cannot overwrite protected path");
  });

  it("allows editing profile/artist.json with allowOverwrite", async () => {
    const { safeWriteFile } = await loadSafeFs(workspaceRoot);

    // profile/artist.json should be editable (not protected)
    await fs.mkdir(path.join(workspaceRoot, "profile"), { recursive: true });
    await fs.writeFile(path.join(workspaceRoot, "profile", "artist.json"), "{}");

    // Should succeed with allowOverwrite
    const result = await safeWriteFile(
      "profile/artist.json",
      '{"id":"test","name":"Artist","genres":[],"created_at":"2026-01-01T00:00:00Z"}',
      { allowOverwrite: true }
    );
    expect(result.success).toBe(true);
    expect(result.action).toBe("update");
  });

  it("enforces append-only paths", async () => {
    const { safeWriteFile, safeAppendFile } = await loadSafeFs(workspaceRoot);

    await safeAppendFile("logs/audit.log", "entry\n");
    await expect(
      safeWriteFile("logs/audit.log", "overwrite")
    ).rejects.toThrow("append-only");

    await safeAppendFile("logs/audit.log", "second\n");
    const content = await fs.readFile(
      path.join(workspaceRoot, "logs", "audit.log"),
      "utf-8"
    );
    expect(content).toContain("entry");
    expect(content).toContain("second");
  });

  it("safeAppendFile blocks hidden files and protected paths", async () => {
    const { safeAppendFile } = await loadSafeFs(workspaceRoot);

    // Block hidden files
    await expect(safeAppendFile(".env", "SECRET=x")).rejects.toThrow(
      "Hidden file access blocked"
    );
    await expect(safeAppendFile(".gitconfig", "x")).rejects.toThrow(
      "Hidden file access blocked"
    );

    // Block protected paths
    await fs.writeFile(path.join(workspaceRoot, "CLAUDE.md"), "# Original");
    await expect(safeAppendFile("CLAUDE.md", "injected")).rejects.toThrow(
      "Cannot append to protected path"
    );
  });

  it("safeListDirectory blocks absolute paths", async () => {
    const { safeListDirectory } = await loadSafeFs(workspaceRoot);

    // Absolute path should be blocked
    await expect(safeListDirectory("/etc")).rejects.toThrow(
      "Path traversal blocked"
    );
    await expect(safeListDirectory("/tmp")).rejects.toThrow(
      "Path traversal blocked"
    );
  });

  it("safeListDirectory blocks path traversal", async () => {
    const { safeListDirectory } = await loadSafeFs(workspaceRoot);

    await expect(safeListDirectory("../")).rejects.toThrow(
      "Path traversal blocked"
    );
    await expect(safeListDirectory("subdir/../../")).rejects.toThrow(
      "Path traversal blocked"
    );
  });
});
