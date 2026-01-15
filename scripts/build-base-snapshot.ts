import { Sandbox } from "@vercel/sandbox";
import { put } from "@vercel/blob";
import ms from "ms";
import { createHash } from "crypto";
import * as fs from "fs/promises";
import * as path from "path";

const WORKSPACE_ROOT = "/vercel/sandbox/workspace";
const TEMPLATE_ROOT = path.join(process.cwd(), "workspace-template");
const BASE_KEY = "snapshots/base/workspace-base.tar.gz";

async function buildBaseSnapshot() {
  console.log("Creating sandbox for base snapshot...");

  const sandbox = await Sandbox.create({
    runtime: "node24",
    timeout: ms("15m"),
    resources: { vcpus: 2 },
  });

  try {
    const templateFiles = await collectTemplateFiles();
    await sandbox.writeFiles(templateFiles);

    await sandbox.runCommand({
      cmd: "bash",
      args: ["-lc", `chmod +x ${WORKSPACE_ROOT}/init.sh`],
    });

    const install = await sandbox.runCommand({
      cmd: "bash",
      args: [
        "-lc",
        `cd ${WORKSPACE_ROOT}/.incurator && npm install --omit=dev`,
      ],
      stdout: process.stdout,
      stderr: process.stderr,
    });

    if (install.exitCode !== 0) {
      throw new Error("npm install failed");
    }

    await sandbox.runCommand({
      cmd: "bash",
      args: [
        "-lc",
        `tar -czf /vercel/sandbox/_base.tar.gz -C ${WORKSPACE_ROOT} .`,
      ],
      stdout: process.stdout,
      stderr: process.stderr,
    });

    const tarBytes = await readSandboxFile(sandbox, "/vercel/sandbox/_base.tar.gz");

    await put(BASE_KEY, tarBytes, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    console.log("Base snapshot uploaded successfully!");
  } finally {
    await sandbox.stop();
  }
}

async function collectTemplateFiles() {
  const now = new Date().toISOString();
  const hotFiles = [
    "CLAUDE.md",
    "profile/artist.json",
    "progress/claude-progress.md",
    "tasks/inbox.md",
  ];

  const fileEntries: Array<{ relativePosix: string; content: Buffer }> = [];
  const manifestEntries: Record<
    string,
    { hash: string; size: number; lastModified: string }
  > = {};

  await walkDirectory(TEMPLATE_ROOT, async (absolutePath) => {
    const relative = path.relative(TEMPLATE_ROOT, absolutePath);
    const relativePosix = relative.split(path.sep).join("/");
    const content = await fs.readFile(absolutePath);

    fileEntries.push({ relativePosix, content });
  });

  for (const entry of fileEntries) {
    // Exclude .index/manifest.json from the files list - it would create a
    // recursive self-hash problem. The manifest tracks OTHER files, not itself.
    if (entry.relativePosix === ".index/manifest.json") {
      continue;
    }
    const hash = createHash("sha256").update(entry.content).digest("hex");
    manifestEntries[entry.relativePosix] = {
      hash,
      size: entry.content.byteLength,
      lastModified: now,
    };
  }

  const manifestContent = Buffer.from(
    JSON.stringify(
      {
        version: 0,
        lastUpdated: now,
        files: manifestEntries,
        hotFiles,
      },
      null,
      2
    )
  );

  // Build final file list, replacing any template manifest with the generated one
  const result: Array<{ path: string; content: Buffer }> = [];

  for (const entry of fileEntries) {
    if (entry.relativePosix === ".index/manifest.json") {
      // Use generated manifest instead of template
      result.push({
        path: path.posix.join(WORKSPACE_ROOT, ".index/manifest.json"),
        content: manifestContent,
      });
    } else {
      result.push({
        path: path.posix.join(WORKSPACE_ROOT, entry.relativePosix),
        content: entry.content,
      });
    }
  }

  // If template didn't have a manifest file, add one
  if (!fileEntries.some((e) => e.relativePosix === ".index/manifest.json")) {
    result.push({
      path: path.posix.join(WORKSPACE_ROOT, ".index/manifest.json"),
      content: manifestContent,
    });
  }

  return result;
}

async function walkDirectory(
  dir: string,
  onFile: (filePath: string) => Promise<void>
) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkDirectory(absolutePath, onFile);
    } else if (entry.isFile()) {
      await onFile(absolutePath);
    }
  }
}

async function readSandboxFile(sandbox: Sandbox, filePath: string) {
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

buildBaseSnapshot().catch((error) => {
  console.error("Base snapshot build failed", error);
  process.exit(1);
});
