import { z } from 'zod'
import {
  TierSchema,
  WhisperModelSchema,
  JobStatusSchema,
  SourceStatusSchema,
  OrgRoleSchema,
} from './enums.js'

export const OrgSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(1).max(100),
  plan: TierSchema,
  seatCount: z.number().int().positive(),
  usageLifetimeCount: z.number().int().min(0),
  createdAt: z.string().datetime(),
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

export const SummarySchema = z.object({
  sourceId: z.string().uuid(),
  orgId: z.string().uuid(),
  transcript: z.string().optional(),
  requirements: z.array(z.string()),
  decisions: z.array(z.string()),
  openQuestions: z.array(z.string()),
  actionItems: z.array(z.string()),
  createdAt: z.string().datetime(),
})
export type Summary = z.infer<typeof SummarySchema>
