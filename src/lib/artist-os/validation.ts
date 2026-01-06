import { z } from "zod";

// Strict artist_id validation to prevent:
// - Path traversal (../, /)
// - Redis/Blob key collisions (spaces, special chars)
// - Namespace confusion (e.g., "base" would collide with base snapshot)
// Pattern: alphanumeric, underscore, hyphen; 1-64 chars; must start with alphanumeric
const ARTIST_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
const RESERVED_IDS = ["base", "admin", "system", "root", "null", "undefined"];

export const ArtistIdSchema = z
  .string()
  .min(1, "artist_id is required")
  .max(64, "artist_id must be at most 64 characters")
  .regex(ARTIST_ID_PATTERN, "artist_id must be alphanumeric with underscores/hyphens, starting with a letter or number")
  .refine((id) => !RESERVED_IDS.includes(id.toLowerCase()), {
    message: "artist_id uses a reserved name",
  });

export const QueryRequestSchema = z.object({
  artist_id: ArtistIdSchema,
  prompt: z.string().min(1).max(10000),
  resume_session_id: z.string().optional(),
});

export type QueryRequest = z.infer<typeof QueryRequestSchema>;
