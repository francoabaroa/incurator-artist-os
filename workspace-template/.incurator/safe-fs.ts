import * as fs from "fs/promises";
import * as path from "path";
import { appendCommitLog } from "./audit";
import { updateManifestEntry } from "./manifest";

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT ?? "/vercel/sandbox/workspace";

const PROTECTED_PATHS = [
  "CLAUDE.md",
  ".incurator/",
  ".index/",
];

const APPEND_ONLY_PATHS = [
  ".trace/commits.jsonl",
  "logs/",
  "progress/claude-progress.md",
];

interface WriteOptions {
  allowOverwrite?: boolean;
  forceWrite?: boolean;
}

export async function safeWriteFile(
  relativePath: string,
  content: string,
  options: WriteOptions = {}
): Promise<{ success: true; action: "create" | "update" }> {
  const { allowOverwrite = false, forceWrite = false } = options;

  if (relativePath.includes("..") || relativePath.startsWith("/")) {
    throw new Error(`Path traversal blocked: ${relativePath}`);
  }

  const allowedHidden = [".index/", ".trace/", ".incurator/", ".claude/"];
  if (
    relativePath.startsWith(".") &&
    !allowedHidden.some((prefix) => relativePath.startsWith(prefix))
  ) {
    throw new Error(`Hidden file access blocked: ${relativePath}`);
  }

  const fullPath = path.join(WORKSPACE_ROOT, relativePath);

  let fileExists = false;
  try {
    await fs.access(fullPath);
    fileExists = true;
  } catch {
    fileExists = false;
  }

  if (fileExists && !forceWrite) {
    const isProtected = PROTECTED_PATHS.some((prefix) =>
      relativePath.startsWith(prefix)
    );
    if (isProtected) {
      throw new Error(`Cannot overwrite protected path: ${relativePath}.`);
    }
  }

  const isAppendOnly = APPEND_ONLY_PATHS.some((prefix) =>
    relativePath.startsWith(prefix)
  );
  if (isAppendOnly && fileExists) {
    throw new Error(
      `${relativePath} is append-only. Use appendFile() instead of writeFile().`
    );
  }

  if (fileExists && !allowOverwrite && !forceWrite) {
    throw new Error(
      `File already exists: ${relativePath}. Use allowOverwrite: true to update.`
    );
  }

  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, "utf-8");

  const action = fileExists ? "update" : "create";
  await appendCommitLog(relativePath, action, content, "safeWriteFile");
  await updateManifestEntry(relativePath, content);

  return { success: true, action };
}

export async function safeAppendFile(
  relativePath: string,
  content: string
): Promise<{ success: true }> {
  if (relativePath.includes("..") || relativePath.startsWith("/")) {
    throw new Error(`Path traversal blocked: ${relativePath}`);
  }

  // Block hidden files except allowlisted directories
  const allowedHidden = [".index/", ".trace/", ".incurator/", ".claude/"];
  if (
    relativePath.startsWith(".") &&
    !allowedHidden.some((prefix) => relativePath.startsWith(prefix))
  ) {
    throw new Error(`Hidden file access blocked: ${relativePath}`);
  }

  // Block protected paths (append should not be used to bypass write protections)
  const isProtected = PROTECTED_PATHS.some((prefix) =>
    relativePath === prefix || relativePath.startsWith(prefix)
  );
  if (isProtected) {
    throw new Error(`Cannot append to protected path: ${relativePath}`);
  }

  const fullPath = path.join(WORKSPACE_ROOT, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.appendFile(fullPath, content, "utf-8");

  const fullContent = await fs.readFile(fullPath, "utf-8");
  await appendCommitLog(relativePath, "append", fullContent, "safeAppendFile");
  await updateManifestEntry(relativePath, fullContent);

  return { success: true };
}

export async function safeReadFile(relativePath: string): Promise<string | null> {
  if (relativePath.includes("..") || relativePath.startsWith("/")) {
    throw new Error(`Path traversal blocked: ${relativePath}`);
  }

  // Block hidden files except allowlisted directories (consistent with write operations)
  const allowedHidden = [".index/", ".trace/", ".incurator/", ".claude/"];
  if (
    relativePath.startsWith(".") &&
    !allowedHidden.some((prefix) => relativePath.startsWith(prefix))
  ) {
    throw new Error(`Hidden file access blocked: ${relativePath}`);
  }

  try {
    return await fs.readFile(path.join(WORKSPACE_ROOT, relativePath), "utf-8");
  } catch {
    return null;
  }
}

export async function safeListDirectory(
  relativePath: string
): Promise<string[]> {
  if (relativePath.includes("..") || relativePath.startsWith("/")) {
    throw new Error(`Path traversal blocked: ${relativePath}`);
  }

  const fullPath = path.join(WORKSPACE_ROOT, relativePath || ".");

  // Double-check the resolved path is still within workspace (defense in depth)
  const resolved = path.resolve(fullPath);
  if (!resolved.startsWith(WORKSPACE_ROOT)) {
    throw new Error(`Path traversal blocked: ${relativePath}`);
  }

  try {
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    return entries.map((entry) => (entry.isDirectory() ? `${entry.name}/` : entry.name));
  } catch {
    return [];
  }
}
