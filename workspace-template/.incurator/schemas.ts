import { z } from "zod";

export const ArtistProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  genres: z.array(z.string()),
  created_at: z.string().datetime(),
  bio: z.string().optional(),
  links: z
    .object({
      spotify: z.string().url().optional(),
      instagram: z.string().url().optional(),
      tiktok: z.string().url().optional(),
      website: z.string().url().optional(),
    })
    .optional(),
});

export const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  status: z.enum(["pending", "in_progress", "blocked", "done"]),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  due_date: z.string().datetime().nullable().optional(),
  created_at: z.string().datetime(),
  completed_at: z.string().datetime().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

export const TaskBacklogSchema = z.array(TaskSchema);

export const ReleaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(["single", "ep", "album"]),
  status: z.enum([
    "planning",
    "production",
    "mastering",
    "distribution",
    "released",
  ]),
  release_date: z.string().optional(),
  isrc: z.string().nullable(),
  upc: z.string().nullable(),
  tracks: z
    .array(
      z.object({
        title: z.string(),
        duration_seconds: z.number().optional(),
        isrc: z.string().nullable(),
      })
    )
    .optional(),
  artwork_ref: z.string().optional(),
  created_at: z.string().datetime(),
});

export const ReleasesSchema = z.array(ReleaseSchema);

export const CampaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum([
    "draft",
    "pending_approval",
    "approved",
    "active",
    "completed",
  ]),
  budget_usd: z.number().nonnegative().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  platforms: z.array(
    z.enum(["instagram", "tiktok", "youtube", "facebook", "twitter", "spotify"])
  ),
  created_at: z.string().datetime(),
});

export const CampaignsSchema = z.array(CampaignSchema);

export const BudgetSchema = z.object({
  year: z.number(),
  total_usd: z.number().nonnegative(),
  categories: z.array(
    z.object({
      name: z.string(),
      allocated_usd: z.number().nonnegative(),
      spent_usd: z.number().nonnegative(),
    })
  ),
});

export const ApprovalSchema = z.object({
  pending: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["social_post", "campaign_launch", "contract_sign", "payment"]),
      description: z.string(),
      created_at: z.string().datetime(),
      requires_human: z.boolean(),
    })
  ),
  approved: z.array(
    z.object({
      id: z.string(),
      approved_at: z.string().datetime(),
      approved_by: z.string(),
    })
  ),
});

export const FeaturesSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    passes: z.boolean(),
    notes: z.string().optional(),
  })
);

export const SCHEMA_REGISTRY: Record<string, z.ZodSchema> = {
  "profile/artist.json": ArtistProfileSchema,
  "tasks/backlog.json": TaskBacklogSchema,
  "releases/releases.json": ReleasesSchema,
  "marketing/campaigns.json": CampaignsSchema,
  "marketing/approval.json": ApprovalSchema,
  "features.json": FeaturesSchema,
};
