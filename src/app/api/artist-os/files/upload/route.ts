import type { Sandbox } from "@vercel/sandbox";
import ms from "ms";
import path from "path";
import { getAuthUserId, userOwnsArtist } from "@/lib/artist-os/auth";
import { acquireArtistLock } from "@/lib/artist-os/lock";
import { checkRateLimit } from "@/lib/artist-os/rate-limit";
import { getOrCreateSandbox, stopSandboxByArtist } from "@/lib/artist-os/sandbox";
import {
  exportArtistSnapshot,
  restoreArtistSnapshot,
  restoreBaseSnapshot,
} from "@/lib/artist-os/snapshot";
import { ArtistIdSchema } from "@/lib/artist-os/validation";

export const runtime = "nodejs";

const WORKSPACE_ROOT = "/vercel/sandbox/workspace";
const DEFAULT_UPLOAD_DIR = "releases";
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // 100MB
const MASTERING_AUDIO_EXTENSIONS = new Set([".wav"]);

function sanitizeFileName(fileName: string) {
  const baseName = path.posix.basename(fileName || "audio.wav");
  const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return sanitized.length > 0 ? sanitized : "audio.wav";
}

function resolveUploadPath(fileName: string, requestedPath?: string | null) {
  const fallback = `${DEFAULT_UPLOAD_DIR}/${sanitizeFileName(fileName)}`;
  if (!requestedPath || requestedPath.trim().length === 0) {
    return fallback;
  }

  const normalized = path.posix.normalize(requestedPath.trim()).replace(/^\/+/, "");
  if (
    normalized.length === 0 ||
    normalized.startsWith("..") ||
    normalized.includes("/../") ||
    !normalized.startsWith(`${DEFAULT_UPLOAD_DIR}/`)
  ) {
    return null;
  }

  return normalized;
}

function isSupportedMasteringPath(filePath: string) {
  return MASTERING_AUDIO_EXTENSIONS.has(path.posix.extname(filePath).toLowerCase());
}

async function sandboxPathExists(sandbox: Sandbox, filePath: string) {
  const result = await sandbox.runCommand({
    cmd: "test",
    args: ["-e", filePath],
  });
  return result.exitCode === 0;
}

function createRateLimitExceededResponse(retryAfterMs?: number) {
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  if (retryAfterMs) {
    headers.set("Retry-After", Math.ceil(retryAfterMs / 1000).toString());
  }

  return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
    status: 429,
    headers,
  });
}

export async function POST(req: Request) {
  const userId = getAuthUserId(req);
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return Response.json({ error: "Invalid multipart body" }, { status: 400 });
  }

  const artistIdRaw = String(formData.get("artist_id") ?? "").trim();
  const artistIdParsed = ArtistIdSchema.safeParse(artistIdRaw);
  if (!artistIdParsed.success) {
    return Response.json({ error: artistIdParsed.error.flatten() }, { status: 400 });
  }
  const artistId = artistIdParsed.data;

  if (!userOwnsArtist(req, userId, artistId)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const fileValue = formData.get("file");
  if (!(fileValue instanceof File)) {
    return Response.json({ error: "Missing file" }, { status: 400 });
  }

  if (fileValue.size <= 0) {
    return Response.json({ error: "File is empty" }, { status: 400 });
  }

  if (fileValue.size > MAX_UPLOAD_BYTES) {
    return Response.json(
      { error: `File exceeds maximum size of ${MAX_UPLOAD_BYTES} bytes` },
      { status: 413 }
    );
  }

  const requestedPath = formData.get("path");
  const relativePath = resolveUploadPath(
    fileValue.name,
    typeof requestedPath === "string" ? requestedPath : null
  );
  if (!relativePath) {
    return Response.json(
      { error: "Invalid path. Upload path must be inside releases/." },
      { status: 400 }
    );
  }

  if (!isSupportedMasteringPath(relativePath)) {
    return Response.json(
      { error: "Unsupported audio format. Only WAV uploads can be mastered." },
      { status: 400 }
    );
  }

  const rate = await checkRateLimit({ userId, artistId });
  if (!rate.ok) {
    return createRateLimitExceededResponse(rate.retryAfterMs);
  }

  const lock = await acquireArtistLock(artistId, ms("20m"));
  if (!lock) {
    return Response.json({ error: "Artist is busy" }, { status: 409 });
  }

  let releaseSandbox: (() => Promise<void>) | null = null;
  let hadError = false;

  try {
    const sandboxHandle = await getOrCreateSandbox(artistId);
    releaseSandbox = sandboxHandle.release;
    const sandbox = sandboxHandle.sandbox;

    await restoreBaseSnapshot(sandbox);
    await restoreArtistSnapshot(sandbox, artistId);
    const workspacePath = `${WORKSPACE_ROOT}/${relativePath}`;

    if (await sandboxPathExists(sandbox, workspacePath)) {
      return Response.json(
        { error: `File already exists at ${relativePath}` },
        { status: 409 }
      );
    }

    const directory = path.posix.dirname(relativePath);
    if (directory && directory !== ".") {
      await sandbox.runCommand({
        cmd: "mkdir",
        args: ["-p", `${WORKSPACE_ROOT}/${directory}`],
      });
    }

    const fileBuffer = Buffer.from(await fileValue.arrayBuffer());
    await sandbox.writeFiles([
      {
        path: workspacePath,
        content: fileBuffer,
      },
    ]);

    const manifest = await exportArtistSnapshot(sandbox, artistId);

    return Response.json({
      ok: true,
      data: {
        artist_id: artistId,
        path: relativePath,
        size: fileValue.size,
        type: fileValue.type || "application/octet-stream",
      },
      manifest,
    });
  } catch (error) {
    hadError = true;
    return Response.json({ error: String(error) }, { status: 500 });
  } finally {
    try {
      if (hadError) {
        await stopSandboxByArtist(artistId);
      } else if (releaseSandbox) {
        await releaseSandbox();
      }
    } catch {
      // Best effort cleanup.
    }

    try {
      await lock.release();
    } catch {
      // TTL-based lock expiry is fallback.
    }
  }
}
