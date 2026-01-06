import * as fs from "fs/promises";
import * as path from "path";
import { createHash } from "crypto";

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? "/vercel/sandbox/workspace";
const MANIFEST_PATH = path.join(WORKSPACE_ROOT, ".index", "manifest.json");

const DEFAULT_HOT_FILES = [
  "CLAUDE.md",
  "profile/artist.json",
  "progress/claude-progress.md",
  "tasks/inbox.md",
];

interface ManifestEntry {
  hash: string;
  size: number;
  lastModified: string;
}

export interface WorkspaceManifest {
  version: number;
  lastUpdated: string;
  files: Record<string, ManifestEntry>;
  hotFiles: string[];
}

export async function readManifest(): Promise<WorkspaceManifest> {
  const content = await fs.readFile(MANIFEST_PATH, "utf-8");
  return JSON.parse(content) as WorkspaceManifest;
}

export async function writeManifest(manifest: WorkspaceManifest) {
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
}

export async function ensureManifest(): Promise<WorkspaceManifest> {
  try {
    return await readManifest();
  } catch {
    const manifest: WorkspaceManifest = {
      version: 0,
      lastUpdated: new Date().toISOString(),
      files: {},
      hotFiles: DEFAULT_HOT_FILES,
    };
    await fs.mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
    await writeManifest(manifest);
    return manifest;
  }
}

export async function updateManifestEntry(
  relativePath: string,
  content: string | Buffer
) {
  const manifest = await ensureManifest();
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
  const hash = createHash("sha256").update(buffer).digest("hex");

  manifest.files[relativePath] = {
    hash,
    size: buffer.byteLength,
    lastModified: new Date().toISOString(),
  };
  manifest.version++;
  manifest.lastUpdated = new Date().toISOString();

  await writeManifest(manifest);
}

export async function removeManifestEntry(relativePath: string) {
  const manifest = await ensureManifest();
  delete manifest.files[relativePath];
  manifest.version++;
  manifest.lastUpdated = new Date().toISOString();
  await writeManifest(manifest);
}
