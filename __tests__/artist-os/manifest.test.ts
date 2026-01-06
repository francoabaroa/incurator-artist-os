import { describe, expect, it, beforeEach, vi } from "vitest";
import * as fs from "fs/promises";
import * as path from "path";
import { tmpdir } from "os";

async function loadManifest(workspace: string) {
  process.env.WORKSPACE_ROOT = workspace;
  vi.resetModules();
  return await import("../../workspace-template/.incurator/manifest");
}

describe("manifest", () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(path.join(tmpdir(), "artist-os-"));
  });

  it("creates manifest if not exists via ensureManifest", async () => {
    const { ensureManifest, readManifest } = await loadManifest(workspaceRoot);

    const manifest = await ensureManifest();
    expect(manifest.version).toBe(0);
    expect(manifest.hotFiles).toContain("CLAUDE.md");

    // Should be readable now
    const readBack = await readManifest();
    expect(readBack.version).toBe(0);
  });

  it("updates manifest entry with hash and size", async () => {
    const { ensureManifest, updateManifestEntry, readManifest } =
      await loadManifest(workspaceRoot);

    await ensureManifest();

    await updateManifestEntry("tasks/backlog.json", '[{"id":"t1"}]');

    const manifest = await readManifest();
    expect(manifest.files["tasks/backlog.json"]).toBeDefined();
    expect(manifest.files["tasks/backlog.json"].size).toBe(13);
    expect(manifest.files["tasks/backlog.json"].hash).toBeDefined();
  });

  it("removes manifest entry", async () => {
    const { ensureManifest, updateManifestEntry, removeManifestEntry, readManifest } =
      await loadManifest(workspaceRoot);

    await ensureManifest();
    await updateManifestEntry("temp/file.txt", "content");
    await removeManifestEntry("temp/file.txt");

    const manifest = await readManifest();
    expect(manifest.files["temp/file.txt"]).toBeUndefined();
  });

  it("increments version on manifest update", async () => {
    const { ensureManifest, updateManifestEntry, readManifest } =
      await loadManifest(workspaceRoot);

    await ensureManifest();
    const initial = await readManifest();
    expect(initial.version).toBe(0);

    await updateManifestEntry("file1.txt", "content1");
    const afterFirst = await readManifest();
    expect(afterFirst.version).toBe(1);

    await updateManifestEntry("file2.txt", "content2");
    const afterSecond = await readManifest();
    expect(afterSecond.version).toBe(2);
  });

  it("increments version on manifest entry removal", async () => {
    const { ensureManifest, updateManifestEntry, removeManifestEntry, readManifest } =
      await loadManifest(workspaceRoot);

    await ensureManifest();
    await updateManifestEntry("temp.txt", "content");
    const beforeRemove = await readManifest();

    await removeManifestEntry("temp.txt");
    const afterRemove = await readManifest();

    expect(afterRemove.version).toBe(beforeRemove.version + 1);
  });
});
