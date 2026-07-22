import { z } from 'zod'
import { WhisperModelSchema, TierSchema, SourceTypeSchema } from './enums.js'

// SQS message sent to heediq-transcription queue (D-023, D-059)
export const TranscriptionJobMessageSchema = z.object({
  jobId: z.string().uuid(),
  sourceId: z.string().uuid(),
  orgId: z.string().uuid(),
  audioS3Key: z.string().min(1),
  model: WhisperModelSchema,
  tier: TierSchema,
})
export type TranscriptionJobMessage = z.infer<typeof TranscriptionJobMessageSchema>

// SQS message sent to heediq-summarization queue (D-065)
// sourceType='text': contentRef is the sourceId — summarization worker reads
//   heediq-sources[sourceId].transcript from DynamoDB (transcription worker writes there).
// sourceType='audio': contentRef is an S3 key — future path for direct audio/text/PDF uploads.
export const SummarizationJobMessageSchema = z.object({
  jobId: z.string().uuid(),
  sourceId: z.string().uuid(),
  orgId: z.string().uuid(),
  sourceType: SourceTypeSchema,
  contentRef: z.string().min(1),
  tier: TierSchema,
})
export type SummarizationJobMessage = z.infer<typeof SummarizationJobMessageSchema>

// SQS message sent to heediq-chat queue (D-139, §11 step 4c-ii). userMessageId is the already-
// persisted user turn the worker is replying to (heediq-api writes it before enqueueing) — the
// worker generates its own messageId for the assistant reply, threaded via conversationId.
export const ChatJobMessageSchema = z.object({
  jobId: z.string().uuid(),
  conversationId: z.string().uuid(),
  contextId: z.string().uuid(),
  orgId: z.string().uuid(),
  userId: z.string(),
  userMessageId: z.string().uuid(),
  tier: TierSchema,
})
export type ChatJobMessage = z.infer<typeof ChatJobMessageSchema>

// WebSocket push events (job_status and beyond) moved to ws.ts's generic envelope + registry
// (D-109, generalizes D-061's one-off WsStatusMessageSchema).
