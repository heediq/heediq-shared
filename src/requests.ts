import { z } from 'zod'
import { WhisperModelSchema } from './enums.js'

export const CreateSourceRequestSchema = z.object({
  title: z.string().min(1).max(255),
  durationSecs: z.number().int().positive().optional(),
})
export type CreateSourceRequest = z.infer<typeof CreateSourceRequestSchema>

export const UpdateSourceRequestSchema = z.object({
  title: z.string().min(1).max(255).optional(),
}).refine((v) => Object.keys(v).length > 0, {
  message: 'At least one field required',
})
export type UpdateSourceRequest = z.infer<typeof UpdateSourceRequestSchema>

export const EnqueueJobRequestSchema = z.object({
  sourceId: z.string().uuid(),
  model: WhisperModelSchema,
})
export type EnqueueJobRequest = z.infer<typeof EnqueueJobRequestSchema>

export const PresignUploadRequestSchema = z.object({
  sourceId: z.string().uuid(),
  contentType: z.enum(['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg']),
  fileSizeBytes: z.number().int().positive().max(2 * 1024 * 1024 * 1024), // 2 GB max
})
export type PresignUploadRequest = z.infer<typeof PresignUploadRequestSchema>

export const PresignUploadResponseSchema = z.object({
  uploadUrl: z.string().url(),
  s3Key: z.string(),
  expiresIn: z.number().int(),
})
export type PresignUploadResponse = z.infer<typeof PresignUploadResponseSchema>
