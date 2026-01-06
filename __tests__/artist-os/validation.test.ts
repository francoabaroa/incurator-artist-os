import { describe, expect, it, beforeEach, vi } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";
import { tmpdir } from "os";
import { QueryRequestSchema, ArtistIdSchema } from "@/lib/artist-os/validation";

async function loadValidation(workspace: string) {
  process.env.WORKSPACE_ROOT = workspace;
  vi.resetModules();
  return await import("../../workspace-template/.incurator/validation");
}

describe("validation", () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(path.join(tmpdir(), "artist-os-"));
    await fs.mkdir(path.join(workspaceRoot, "tasks"), { recursive: true });
  });

  it("passes valid JSON against schema", async () => {
    const { validateWorkspaceFiles } = await loadValidation(workspaceRoot);

    const backlog = [
      {
        id: "task_1",
        title: "Review contract",
        status: "pending",
        created_at: new Date().toISOString(),
      },
    ];
    await fs.writeFile(
      path.join(workspaceRoot, "tasks", "backlog.json"),
      JSON.stringify(backlog)
    );

    const result = await validateWorkspaceFiles("tasks/backlog.json");
    expect(result.success).toBe(true);
  });

  it("fails invalid JSON against schema", async () => {
    const { validateWorkspaceFiles } = await loadValidation(workspaceRoot);

    const invalid = [
      {
        id: "task_1",
        title: "Review contract",
        status: "invalid",
        created_at: new Date().toISOString(),
      },
    ];
    await fs.writeFile(
      path.join(workspaceRoot, "tasks", "backlog.json"),
      JSON.stringify(invalid)
    );

    const result = await validateWorkspaceFiles("tasks/backlog.json");
    expect(result.success).toBe(false);
  });

  it("allows null due_date and completed_at values", async () => {
    const { validateWorkspaceFiles } = await loadValidation(workspaceRoot);

    const backlog = [
      {
        id: "task_1",
        title: "Review contract",
        status: "pending",
        created_at: new Date().toISOString(),
        due_date: null,
        completed_at: null,
      },
    ];
    await fs.writeFile(
      path.join(workspaceRoot, "tasks", "backlog.json"),
      JSON.stringify(backlog)
    );

    const result = await validateWorkspaceFiles("tasks/backlog.json");
    expect(result.success).toBe(true);
  });

  it("rolls back invalid JSON to backup content", async () => {
    const { validateAndRollbackIfInvalid } = await loadValidation(workspaceRoot);

    // Create valid backup content
    const validBacklog = [
      {
        id: "task_1",
        title: "Original task",
        status: "pending",
        created_at: new Date().toISOString(),
      },
    ];
    const backupContent = JSON.stringify(validBacklog);

    // Write invalid JSON to the file
    const invalidContent = JSON.stringify([
      {
        id: "task_1",
        title: "Modified task",
        status: "invalid_status", // Invalid status
        created_at: new Date().toISOString(),
      },
    ]);
    await fs.writeFile(
      path.join(workspaceRoot, "tasks", "backlog.json"),
      invalidContent
    );

    // Perform rollback
    const writeFileFn = async (fullPath: string, content: string) => {
      await fs.writeFile(fullPath, content);
    };

    const result = await validateAndRollbackIfInvalid(
      "tasks/backlog.json",
      backupContent,
      writeFileFn
    );

    expect(result.rolledBack).toBe(true);
    expect(result.error).toBeDefined();

    // Verify file was restored
    const restoredContent = await fs.readFile(
      path.join(workspaceRoot, "tasks", "backlog.json"),
      "utf-8"
    );
    expect(restoredContent).toBe(backupContent);
  });

  it("does not roll back valid JSON", async () => {
    const { validateAndRollbackIfInvalid } = await loadValidation(workspaceRoot);

    // Create valid backup
    const validBacklog = [
      {
        id: "task_1",
        title: "Original task",
        status: "pending",
        created_at: new Date().toISOString(),
      },
    ];
    const backupContent = JSON.stringify(validBacklog);

    // Write different but valid JSON
    const newValidContent = JSON.stringify([
      {
        id: "task_2",
        title: "New task",
        status: "done",
        created_at: new Date().toISOString(),
      },
    ]);
    await fs.writeFile(
      path.join(workspaceRoot, "tasks", "backlog.json"),
      newValidContent
    );

    const writeFileFn = async (fullPath: string, content: string) => {
      await fs.writeFile(fullPath, content);
    };

    const result = await validateAndRollbackIfInvalid(
      "tasks/backlog.json",
      backupContent,
      writeFileFn
    );

    expect(result.rolledBack).toBe(false);
    expect(result.error).toBeUndefined();

    // Verify file was NOT restored (still has new content)
    const content = await fs.readFile(
      path.join(workspaceRoot, "tasks", "backlog.json"),
      "utf-8"
    );
    expect(content).toBe(newValidContent);
  });
});

describe("ArtistIdSchema", () => {
  it("accepts valid artist IDs", () => {
    expect(ArtistIdSchema.safeParse("artist_123").success).toBe(true);
    expect(ArtistIdSchema.safeParse("a").success).toBe(true);
    expect(ArtistIdSchema.safeParse("Artist-Name-01").success).toBe(true);
    expect(ArtistIdSchema.safeParse("abc123_def-456").success).toBe(true);
  });

  it("rejects empty artist ID", () => {
    expect(ArtistIdSchema.safeParse("").success).toBe(false);
  });

  it("rejects path traversal attempts", () => {
    expect(ArtistIdSchema.safeParse("../x").success).toBe(false);
    expect(ArtistIdSchema.safeParse("a/b").success).toBe(false);
    expect(ArtistIdSchema.safeParse("a\\b").success).toBe(false);
  });

  it("rejects spaces and special characters", () => {
    expect(ArtistIdSchema.safeParse("a b").success).toBe(false);
    expect(ArtistIdSchema.safeParse("a@b").success).toBe(false);
    expect(ArtistIdSchema.safeParse("a.b").success).toBe(false);
  });

  it("rejects IDs starting with non-alphanumeric", () => {
    expect(ArtistIdSchema.safeParse("_artist").success).toBe(false);
    expect(ArtistIdSchema.safeParse("-artist").success).toBe(false);
  });

  it("rejects reserved names", () => {
    expect(ArtistIdSchema.safeParse("base").success).toBe(false);
    expect(ArtistIdSchema.safeParse("BASE").success).toBe(false);
    expect(ArtistIdSchema.safeParse("admin").success).toBe(false);
    expect(ArtistIdSchema.safeParse("system").success).toBe(false);
  });

  it("rejects IDs exceeding 64 characters", () => {
    const longId = "a".repeat(65);
    expect(ArtistIdSchema.safeParse(longId).success).toBe(false);

    const maxId = "a".repeat(64);
    expect(ArtistIdSchema.safeParse(maxId).success).toBe(true);
  });
});

describe("QueryRequestSchema", () => {
  it("accepts valid request", () => {
    const result = QueryRequestSchema.safeParse({
      artist_id: "artist_123",
      prompt: "Hello",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid artist_id in request", () => {
    const result = QueryRequestSchema.safeParse({
      artist_id: "../escape",
      prompt: "Hello",
    });
    expect(result.success).toBe(false);
  });
});
