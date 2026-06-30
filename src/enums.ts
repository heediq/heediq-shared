import { z } from 'zod'

export const TierSchema = z.enum(['free', 'paid'])
export type Tier = z.infer<typeof TierSchema>

export const WhisperModelSchema = z.enum(['small', 'large-v3'])
export type WhisperModel = z.infer<typeof WhisperModelSchema>

export const JobStatusSchema = z.enum([
  'queued',
  'starting',
  'transcribing',
  'diarizing',
  'summarizing',
  'done',
  'failed',
  'retrying',
])
export type JobStatus = z.infer<typeof JobStatusSchema>

export const RecordingStatusSchema = z.enum([
  'uploading',
  'processing',
  'ready',
  'failed',
])
export type RecordingStatus = z.infer<typeof RecordingStatusSchema>

export const OrgRoleSchema = z.enum(['admin', 'member'])
export type OrgRole = z.infer<typeof OrgRoleSchema>

export const SourceTypeSchema = z.enum(['audio', 'text'])
export type SourceType = z.infer<typeof SourceTypeSchema>
