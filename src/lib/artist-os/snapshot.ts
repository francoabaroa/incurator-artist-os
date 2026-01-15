import { Sandbox } from "@vercel/sandbox";
import { head, put } from "@vercel/blob";
import { createHash } from "crypto";
import { getRedis } from "./redis";
import type { SnapshotManifest } from "./types";

const WORKSPACE_ROOT = "/vercel/sandbox/workspace";
const BASE_SNAPSHOT_KEY = "snapshots/base/workspace-base.tar.gz";

export async function restoreBaseSnapshot(sandbox: Sandbox) {
  const tarBytes = await downloadBlob(BASE_SNAPSHOT_KEY);
  await sandbox.writeFiles([
    { path: "/vercel/sandbox/_base.tar.gz", content: Buffer.from(tarBytes) },
  ]);
  await sandbox.runCommand({
    cmd: "bash",
    args: [
      "-lc",
      // Critical: wipe workspace before extract to ensure restores are "exact".
      // Tar extraction only overwrites/creates files - it does not delete files
      // that no longer exist in the archive. Without this, deleted files would
      // "resurrect" across warm sandbox reuse.
      [
        `rm -rf ${WORKSPACE_ROOT}`,
        `mkdir -p ${WORKSPACE_ROOT}`,
        `tar -xzf /vercel/sandbox/_base.tar.gz -C ${WORKSPACE_ROOT}`,
        `rm /vercel/sandbox/_base.tar.gz`,
      ].join(" && "),
    ],
  });
}

export async function restoreArtistSnapshot(
  sandbox: Sandbox,
  artistId: string
) {
  const redis = getRedis();
  const latestKey = await redis.get(`snapshot:${artistId}:latest`);

  if (!latestKey) {
    await scaffoldNewArtist(sandbox, artistId);
    return;
  }

  const tarBytes = await downloadBlob(latestKey);
  await sandbox.writeFiles([
    { path: "/vercel/sandbox/_artist.tar.gz", content: Buffer.from(tarBytes) },
  ]);
  await sandbox.runCommand({
    cmd: "bash",
    args: [
      "-lc",
      `tar -xzf /vercel/sandbox/_artist.tar.gz -C ${WORKSPACE_ROOT} && rm /vercel/sandbox/_artist.tar.gz`,
    ],
  });
}

export async function exportArtistSnapshot(
  sandbox: Sandbox,
  artistId: string
): Promise<SnapshotManifest> {
  await sandbox.runCommand({
    cmd: "bash",
    args: [
      "-lc",
      // Exclude harness code (.incurator, .claude) from artist snapshots for defense-in-depth:
      // If the agent ever modifies harness code, those changes should NOT persist.
      // The harness is always restored fresh from the base snapshot.
      // Keep .claude-state to preserve session resume data across runs.
      // Also exclude node_modules and .git to prevent bloated snapshots.
      `tar -czf /vercel/sandbox/_export.tar.gz --exclude='.incurator' --exclude='.claude' --exclude='node_modules' --exclude='.git' -C ${WORKSPACE_ROOT} .`,
    ],
  });

  const tarBytes = await readSandboxFile(sandbox, "/vercel/sandbox/_export.tar.gz");
  // Cleanup to reduce disk usage in long-lived warm sandboxes
  await sandbox.runCommand({ cmd: "bash", args: ["-lc", "rm -f /vercel/sandbox/_export.tar.gz"] });
  const checksum = createHash("sha256").update(tarBytes).digest("hex");
  const timestamp = Date.now();

  const snapshotKey = `snapshots/${artistId}/workspace-${timestamp}.tar.gz`;
  await put(snapshotKey, tarBytes, {
    access: "public",
    addRandomSuffix: false,
  });

  const manifest: SnapshotManifest = {
    artist_id: artistId,
    snapshot_key: snapshotKey,
    snapshot_version: "1.0.0",
    created_at: new Date().toISOString(),
    checksum_sha256: checksum,
    workspace_size_bytes: tarBytes.byteLength,
  };

  const manifestKey = `snapshots/${artistId}/manifest-${timestamp}.json`;
  await put(manifestKey, JSON.stringify(manifest, null, 2), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });

  const redis = getRedis();
  await redis.set(`snapshot:${artistId}:latest`, snapshotKey);
  await redis.set(`snapshot:${artistId}:latest-manifest`, manifestKey);

  return manifest;
}

export async function readSandboxFile(
  sandbox: Sandbox,
  filePath: string
): Promise<Buffer> {
  const stream = await sandbox.readFile({ path: filePath });
  if (!stream) {
    throw new Error(`Missing file: ${filePath}`);
  }
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function downloadBlob(key: string): Promise<Uint8Array> {
  const meta = await head(key);
  const res = await fetch(meta.url);
  if (!res.ok) {
    throw new Error(`Failed to fetch blob ${key}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

async function scaffoldNewArtist(sandbox: Sandbox, artistId: string) {
  // Ensure directories exist (base snapshot should have these, but be defensive)
  await sandbox.runCommand({
    cmd: "bash",
    args: [
      "-lc",
      `mkdir -p ${WORKSPACE_ROOT}/{profile,tasks,releases,brand,marketing,finances,contracts,logs,progress,.index,.trace/runs}`,
    ],
  });

  // Only personalize files that need the artistId - preserve template content from base snapshot
  // Files like progress/claude-progress.md, tasks/inbox.md, etc. come from workspace-template
  const artistJson = JSON.stringify(
    {
      id: artistId,
      name: "",
      genres: [],
      created_at: new Date().toISOString(),
    },
    null,
    2
  );

  const manifestJson = JSON.stringify(
    {
      version: 0,
      lastUpdated: new Date().toISOString(),
      files: {},
      hotFiles: [
        "CLAUDE.md",
        "profile/artist.json",
        "progress/claude-progress.md",
        "tasks/inbox.md",
      ],
    },
    null,
    2
  );

  // Only write files that need personalization or initialization
  // Don't overwrite template files from base snapshot (progress/claude-progress.md, etc.)
  await sandbox.writeFiles([
    { path: `${WORKSPACE_ROOT}/profile/artist.json`, content: Buffer.from(artistJson) },
    { path: `${WORKSPACE_ROOT}/.index/manifest.json`, content: Buffer.from(manifestJson) },
    { path: `${WORKSPACE_ROOT}/.trace/commits.jsonl`, content: Buffer.from("") },
  ]);
}
