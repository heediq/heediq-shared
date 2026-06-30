import { z } from 'zod'
import { WhisperModelSchema, TierSchema, SourceTypeSchema, JobStatusSchema } from './enums.js'

// SQS message sent to heediq-transcription queue (D-023, D-059)
export const TranscriptionJobMessageSchema = z.object({
  jobId: z.string().uuid(),
  recordingId: z.string().uuid(),
  orgId: z.string().uuid(),
  audioS3Key: z.string().min(1),
  model: WhisperModelSchema,
  tier: TierSchema,
})
export type TranscriptionJobMessage = z.infer<typeof TranscriptionJobMessageSchema>

// SQS message sent to heediq-summarization queue (D-065)
// sourceType='audio': contentRef is the S3 key of the transcript file written by the transcription worker
// sourceType='text': contentRef is the S3 key of the uploaded text/PDF/email/Excel file
export const SummarizationJobMessageSchema = z.object({
  jobId: z.string().uuid(),
  recordingId: z.string().uuid(),
  orgId: z.string().uuid(),
  sourceType: SourceTypeSchema,
  contentRef: z.string().min(1),
})
export type SummarizationJobMessage = z.infer<typeof SummarizationJobMessageSchema>

// WebSocket push message (D-061) sent by status-pusher Lambda to connected clients
export const WsStatusMessageSchema = z.object({
  type: z.literal('job_status'),
  jobId: z.string().uuid(),
  recordingId: z.string().uuid(),
  status: JobStatusSchema,
  updatedAt: z.string().datetime(),
})
export type WsStatusMessage = z.infer<typeof WsStatusMessageSchema>
