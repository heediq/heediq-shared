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

// ── Account linking (D-078, D-079) ──────────────────────────────────────────
// Response never names a provider — the unified sign-in screen must show identical,
// non-disclosing copy whether the email exists via native signup or a federated IdP.

export const LookupEmailRequestSchema = z.object({
  email: z.string().email(),
})
export type LookupEmailRequest = z.infer<typeof LookupEmailRequestSchema>

export const LookupEmailResponseSchema = z.object({
  exists: z.boolean(),
  passwordSet: z.boolean().nullable(),
})
export type LookupEmailResponse = z.infer<typeof LookupEmailResponseSchema>

export const LinkStartRequestSchema = z.object({
  email: z.string().email(),
})
export type LinkStartRequest = z.infer<typeof LinkStartRequestSchema>

export const LinkConfirmRequestSchema = z.object({
  email: z.string().email(),
  code: z.string().min(1),
  newPassword: z.string().min(8),
})
export type LinkConfirmRequest = z.infer<typeof LinkConfirmRequestSchema>

export const LinkAddProviderRequestSchema = z.object({
  provider: z.enum(['Google', 'Microsoft']),
  providerUserId: z.string().min(1),
})
export type LinkAddProviderRequest = z.infer<typeof LinkAddProviderRequestSchema>
