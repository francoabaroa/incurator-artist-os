import type {
  DoneData,
  ErrorData,
  LogData,
  StatusData,
} from "@/lib/artist-os/types";

export interface ConsoleQueryParams {
  userId: string;
  artistId: string;
  ownedArtistIds?: string;
  prompt: string;
  resumeSessionId?: string;
}

export interface ConsoleLogEntry {
  id: string;
  timestamp: string;
  stream: "stdout" | "stderr";
  content: string;
}

export interface ConsoleRunState {
  phase: string | null;
  logs: ConsoleLogEntry[];
  result: DoneData | null;
  error: string | null;
  statusCode: number | null;
  isStreaming: boolean;
  startedAt: number | null;
  finishedAt: number | null;
}

export interface HistoryEntry {
  id: string;
  timestamp: string;
  userId: string;
  artistId: string;
  prompt: string;
  resumeSessionId?: string;
  sessionId?: string;
}

export type { StatusData, LogData, DoneData, ErrorData };
