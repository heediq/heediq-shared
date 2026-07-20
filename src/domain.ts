import { z } from 'zod'
import {
  TierSchema,
  WhisperModelSchema,
  JobStatusSchema,
  SourceStatusSchema,
  SourceClassificationSchema,
  OrgRoleSchema,
} from './enums.js'
import { ProposedClassificationSchema } from './context.js'

export const OrgSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(1).max(100),
  plan: TierSchema,
  seatCount: z.number().int().positive(),
  usageLifetimeCount: z.number().int().min(0),
  createdAt: z.string().datetime(),
  // Role assigned to new members at provisioning (D-102) — points at this org's seeded `member`
  // system role. Optional: existing org rows predate RBAC and won't have it until Phase 3
  // provisioning backfills it.
  defaultRoleId: z.string().uuid().optional(),
})
export type Org = z.infer<typeof OrgSchema>

export const UserSchema = z.object({
  userId: z.string(),
  orgId: z.string().uuid(),
  email: z.string().email(),
  role: OrgRoleSchema,
  // Whether this identity has a Cognito password credential — false for federated-only
  // accounts that haven't linked a native sign-in yet (D-078). Defaults true for rows written
  // before this field existed (native-only era, pre account-linking).
  passwordSet: z.boolean().default(true),
  createdAt: z.string().datetime(),
})
export type User = z.infer<typeof UserSchema>

export const SourceSchema = z.object({
  sourceId: z.string().uuid(),
  orgId: z.string().uuid(),
  userId: z.string(),
  title: z.string().min(1).max(255),
  status: SourceStatusSchema,
  durationSecs: z.number().int().positive().optional(),
  audioS3Key: z.string().optional(),
  labels: z.array(z.string().min(1).max(50)).max(20).default([]),
  // ── Context Library (D-128/D-133) ──
  // The single Context this Source is filed into, set on review approval (D-128).
  contextId: z.string().uuid().optional(),
  // Review-gate axis, separate from `status` (D-133). Optional/no default on purpose: absent means
  // the Source predates or hasn't reached the review flow — the ingest worker sets 'pending_review'
  // once it has a proposal, approval sets 'approved'. Defaulting would mislabel legacy `done` rows.
  classification: SourceClassificationSchema.optional(),
  // The classifier's placement proposal (D-130/D-133), cleared on approval.
  proposedClassification: ProposedClassificationSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type Source = z.infer<typeof SourceSchema>

export const JobSchema = z.object({
  jobId: z.string().uuid(),
  sourceId: z.string().uuid(),
  orgId: z.string().uuid(),
  status: JobStatusSchema,
  model: WhisperModelSchema,
  tier: TierSchema,
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  errorMessage: z.string().optional(),
})
export type Job = z.infer<typeof JobSchema>

// Summary shrinks to transcript + a short prose gist (D-135, supersedes D-132): the flat
// `requirements`/`decisions`/`openQuestions`/`actionItems` arrays are replaced by item-level
// `ExtractedItem` records (see `context.ts`). A Context's structured memory is its kept
// `ExtractedItem`s; Summary is now just the raw transcript plus a human-readable gist.
export const SummarySchema = z.object({
  sourceId: z.string().uuid(),
  orgId: z.string().uuid(),
  transcript: z.string().optional(),
  gist: z.string().optional(),
  createdAt: z.string().datetime(),
})
export type Summary = z.infer<typeof SummarySchema>
