import ms from "ms";
import type { StringValue } from "ms";
import { Sandbox } from "@vercel/sandbox";

const warmParsed = ms((process.env.ARTIST_OS_WARM_TTL ?? "5m") as StringValue);
const timeoutParsed = ms(
  (process.env.ARTIST_OS_SANDBOX_TIMEOUT ?? "15m") as StringValue
);
const WARM_TTL_MS = typeof warmParsed === "number" ? warmParsed : ms("5m");
const SANDBOX_TIMEOUT_MS =
  typeof timeoutParsed === "number" ? timeoutParsed : ms("15m");

interface CachedSandbox {
  sandbox: Sandbox;
  artistId: string;
  lastUsed: number;
  stopTimer?: NodeJS.Timeout;
}

const sandboxCache = new Map<string, CachedSandbox>();
const sandboxById = new Map<string, CachedSandbox>();

export async function getOrCreateSandbox(artistId: string) {
  const existing = sandboxCache.get(artistId);
  if (existing && existing.sandbox.status === "running") {
    clearTimeout(existing.stopTimer);
    existing.lastUsed = Date.now();
    return {
      sandbox: existing.sandbox,
      release: async () => markSandboxIdle(existing),
    };
  }

  if (existing) {
    await safeStop(existing.sandbox);
    sandboxCache.delete(artistId);
    sandboxById.delete(existing.sandbox.sandboxId);
  }

  const sandbox = await Sandbox.create({
    runtime: "node24",
    timeout: SANDBOX_TIMEOUT_MS,
    resources: { vcpus: 2 },
  });

  const cached: CachedSandbox = {
    sandbox,
    artistId,
    lastUsed: Date.now(),
  };

  sandboxCache.set(artistId, cached);
  sandboxById.set(sandbox.sandboxId, cached);

  return {
    sandbox,
    release: async () => markSandboxIdle(cached),
  };
}

export async function stopSandboxById(sandboxId: string): Promise<boolean> {
  const cached = sandboxById.get(sandboxId);
  if (!cached) {
    return false;
  }

  clearTimeout(cached.stopTimer);
  await safeStop(cached.sandbox);
  sandboxCache.delete(cached.artistId);
  sandboxById.delete(sandboxId);
  return true;
}

export async function stopSandboxByArtist(artistId: string): Promise<boolean> {
  const cached = sandboxCache.get(artistId);
  if (!cached) {
    return false;
  }

  clearTimeout(cached.stopTimer);
  await safeStop(cached.sandbox);
  sandboxCache.delete(artistId);
  sandboxById.delete(cached.sandbox.sandboxId);
  return true;
}

export function listCachedSandboxes() {
  return Array.from(sandboxCache.values()).map((entry) => ({
    sandboxId: entry.sandbox.sandboxId,
    artistId: entry.artistId,
    lastUsed: entry.lastUsed,
    status: entry.sandbox.status,
  }));
}

export async function shutdownAllSandboxes() {
  const entries = Array.from(sandboxCache.values());
  sandboxCache.clear();
  sandboxById.clear();

  await Promise.all(entries.map((entry) => safeStop(entry.sandbox)));
}

function markSandboxIdle(entry: CachedSandbox) {
  entry.lastUsed = Date.now();
  clearTimeout(entry.stopTimer);
  entry.stopTimer = setTimeout(() => {
    void stopSandboxByArtist(entry.artistId);
  }, WARM_TTL_MS);
  entry.stopTimer.unref?.();
}

async function safeStop(sandbox: Sandbox) {
  try {
    await sandbox.stop();
  } catch (error) {
    console.warn("Failed to stop sandbox", error);
  }
}
