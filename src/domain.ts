import { z } from 'zod'
import {
  TierSchema,
  WhisperModelSchema,
  JobStatusSchema,
  RecordingStatusSchema,
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
  createdAt: z.string().datetime(),
})
export type User = z.infer<typeof UserSchema>

export const RecordingSchema = z.object({
  recordingId: z.string().uuid(),
  orgId: z.string().uuid(),
  userId: z.string(),
  title: z.string().min(1).max(255),
  status: RecordingStatusSchema,
  durationSecs: z.number().int().positive().optional(),
  audioS3Key: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type Recording = z.infer<typeof RecordingSchema>

export const JobSchema = z.object({
  jobId: z.string().uuid(),
  recordingId: z.string().uuid(),
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
  recordingId: z.string().uuid(),
  orgId: z.string().uuid(),
  transcript: z.string().optional(),
  requirements: z.array(z.string()),
  decisions: z.array(z.string()),
  openQuestions: z.array(z.string()),
  actionItems: z.array(z.string()),
  createdAt: z.string().datetime(),
})
export type Summary = z.infer<typeof SummarySchema>
