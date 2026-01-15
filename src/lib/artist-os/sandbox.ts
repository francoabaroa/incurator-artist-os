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

export interface StopResult {
  stopped: boolean;
  artistId?: string;
}

export async function stopSandboxById(sandboxId: string): Promise<StopResult> {
  const cached = sandboxById.get(sandboxId);
  if (!cached) {
    return { stopped: false };
  }

  const artistId = cached.artistId;
  
  // Always evict from cache when stop is attempted to prevent reuse of
  // potentially corrupted sandboxes, even if the stop API call fails
  clearTimeout(cached.stopTimer);
  sandboxCache.delete(cached.artistId);
  sandboxById.delete(sandboxId);
  
  const stopped = await safeStop(cached.sandbox);
  return { stopped, artistId };
}

export async function stopSandboxByArtist(artistId: string): Promise<boolean> {
  const cached = sandboxCache.get(artistId);
  if (!cached) {
    return false;
  }

  // Always evict from cache when stop is attempted to prevent reuse of
  // potentially corrupted sandboxes, even if the stop API call fails
  clearTimeout(cached.stopTimer);
  sandboxCache.delete(artistId);
  sandboxById.delete(cached.sandbox.sandboxId);
  
  const stopped = await safeStop(cached.sandbox);
  return stopped;
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

async function safeStop(sandbox: Sandbox): Promise<boolean> {
  try {
    await sandbox.stop();
    return true;
  } catch (error) {
    console.warn("Failed to stop sandbox", error);
    return false;
  }
}
