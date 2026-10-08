import ms from "ms";
import { getRedis } from "./redis";
import {
  DEFAULT_SESSION_MODE,
  isSessionMode,
  type SessionMode,
} from "./session-mode";

const SESSION_METADATA_PREFIX = "artist-os:session";
const SESSION_METADATA_TTL_MS = ms("180d");

export interface SessionMetadata {
  artistId: string;
  sessionMode: SessionMode;
  incuratorUserId?: string;
  storedAt: string;
}

export class ResumeSessionMetadataError extends Error {
  readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = "ResumeSessionMetadataError";
  }
}

function getSessionMetadataKey(sessionId: string) {
  return `${SESSION_METADATA_PREFIX}:${sessionId}`;
}

function parseSessionMetadata(raw: string | null): SessionMetadata | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SessionMetadata>;
    if (
      typeof parsed.artistId !== "string" ||
      !isSessionMode(parsed.sessionMode) ||
      typeof parsed.storedAt !== "string" ||
      (parsed.incuratorUserId !== undefined &&
        (typeof parsed.incuratorUserId !== "string" ||
          !/^\d+$/.test(parsed.incuratorUserId)))
    ) {
      return null;
    }

    return {
      artistId: parsed.artistId,
      sessionMode: parsed.sessionMode,
      incuratorUserId: parsed.incuratorUserId,
      storedAt: parsed.storedAt,
    };
  } catch {
    return null;
  }
}

export async function getSessionMetadata(
  sessionId: string
): Promise<SessionMetadata | null> {
  const raw = await getRedis().get(getSessionMetadataKey(sessionId));
  return parseSessionMetadata(raw);
}

export async function storeSessionMetadata(
  sessionId: string,
  metadata: Pick<SessionMetadata, "artistId" | "sessionMode" | "incuratorUserId">
): Promise<void> {
  const payload: SessionMetadata = {
    ...metadata,
    storedAt: new Date().toISOString(),
  };

  await getRedis().set(
    getSessionMetadataKey(sessionId),
    JSON.stringify(payload),
    "PX",
    SESSION_METADATA_TTL_MS
  );
}

interface ResolveSessionContextForRequestOptions {
  artistId: string;
  requestedSessionMode?: SessionMode;
  requestedIncuratorUserId?: string;
  resumeSessionId?: string;
}

export interface ResolvedSessionContext {
  sessionMode: SessionMode;
  incuratorUserId?: string;
}

export async function resolveSessionContextForRequest({
  artistId,
  requestedSessionMode,
  requestedIncuratorUserId,
  resumeSessionId,
}: ResolveSessionContextForRequestOptions): Promise<ResolvedSessionContext> {
  if (!resumeSessionId) {
    return {
      sessionMode: requestedSessionMode ?? DEFAULT_SESSION_MODE,
      incuratorUserId: requestedIncuratorUserId,
    };
  }

  const metadata = await getSessionMetadata(resumeSessionId);
  if (!metadata) {
    throw new ResumeSessionMetadataError(
      "resume_session_id is missing metadata and cannot be resumed safely"
    );
  }

  if (metadata.artistId !== artistId) {
    throw new ResumeSessionMetadataError(
      "resume_session_id belongs to a different artist"
    );
  }

  if (
    requestedSessionMode &&
    requestedSessionMode !== metadata.sessionMode
  ) {
    throw new ResumeSessionMetadataError(
      `resume_session_id was started in ${metadata.sessionMode} mode and cannot be resumed as ${requestedSessionMode}`
    );
  }

  if (
    requestedIncuratorUserId &&
    metadata.incuratorUserId &&
    requestedIncuratorUserId !== metadata.incuratorUserId
  ) {
    throw new ResumeSessionMetadataError(
      "resume_session_id was started with a different x-incurator-user-id and cannot switch backend actors"
    );
  }

  return {
    sessionMode: metadata.sessionMode,
    incuratorUserId: requestedIncuratorUserId ?? metadata.incuratorUserId,
  };
}
