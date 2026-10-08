export const SESSION_MODE_VALUES = ["artist_ops", "feature_flow"] as const;

export type SessionMode = (typeof SESSION_MODE_VALUES)[number];

export const DEFAULT_SESSION_MODE: SessionMode = "artist_ops";

export function isSessionMode(value: unknown): value is SessionMode {
  return value === "artist_ops" || value === "feature_flow";
}
