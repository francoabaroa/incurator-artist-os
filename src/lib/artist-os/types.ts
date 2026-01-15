// QueryRequest type is defined in validation.ts via Zod inference
// Re-export it here for convenience
export type { QueryRequest } from "./validation";

export type SSEEventName = "status" | "log" | "done" | "error";

export interface SSEEvent<T = unknown> {
  event: SSEEventName;
  data: T;
}

export interface StatusData {
  phase: string;
}

export interface LogData {
  stream: "stdout" | "stderr";
  chunk: string;
}

export interface DoneData {
  ok: boolean;
  exitCode: number;
  sessionId?: string;
  manifest: SnapshotManifest;
}

export interface ErrorData {
  message: string;
}

export interface SnapshotManifest {
  artist_id: string;
  snapshot_key: string;
  snapshot_version: string;
  created_at: string;
  checksum_sha256: string;
  workspace_size_bytes: number;
}

export interface ArtistLock {
  release: () => Promise<void>;
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterMs?: number;
  remainingUser?: number;
  remainingArtist?: number;
}
