import { z } from 'zod'
import { WhisperModelSchema } from './enums.js'
import { PermissionSchema } from './permissions.js'

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

// Verifies the emailed code on its own, before any password is collected (D-089's two-step
// flow) — `code` is consumed here via Cognito's ConfirmSignUp, so it is never sent again.
export const LinkVerifyOtpRequestSchema = z.object({
  email: z.string().email(),
  code: z.string().min(1),
})
export type LinkVerifyOtpRequest = z.infer<typeof LinkVerifyOtpRequestSchema>

export const LinkConfirmRequestSchema = z.object({
  email: z.string().email(),
  newPassword: z.string().min(8),
})
export type LinkConfirmRequest = z.infer<typeof LinkConfirmRequestSchema>

export const LinkAddProviderRequestSchema = z.object({
  provider: z.enum(['Google', 'Microsoft']),
  providerUserId: z.string().min(1),
})
export type LinkAddProviderRequest = z.infer<typeof LinkAddProviderRequestSchema>

// ── Active sign-in methods (D-091) ──────────────────────────────────────────
// heediq-user-auth-methods is the source of truth for which methods are active on an
// account — Cognito itself is never queried ad hoc for this. Read-only for now; no
// unlink/remove action is exposed (out of scope).

export const AuthMethodSchema = z.object({
  provider: z.enum(['COGNITO', 'Google', 'Microsoft']),
  linkedAt: z.string().datetime(),
})
export type AuthMethod = z.infer<typeof AuthMethodSchema>

export const ListAuthMethodsResponseSchema = z.object({
  methods: z.array(AuthMethodSchema),
})
export type ListAuthMethodsResponse = z.infer<typeof ListAuthMethodsResponseSchema>

// ── RBAC & audit trail (D-102 Phase 2) ──────────────────────────────────────

export const CreateRoleRequestSchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(PermissionSchema),
})
export type CreateRoleRequest = z.infer<typeof CreateRoleRequestSchema>

export const UpdateRoleRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  permissions: z.array(PermissionSchema).optional(),
}).refine((v) => Object.keys(v).length > 0, {
  message: 'At least one field required',
})
export type UpdateRoleRequest = z.infer<typeof UpdateRoleRequestSchema>

export const CreateGroupRequestSchema = z.object({
  name: z.string().min(1).max(100),
  roleIds: z.array(z.string().uuid()),
})
export type CreateGroupRequest = z.infer<typeof CreateGroupRequestSchema>

export const UpdateGroupRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  roleIds: z.array(z.string().uuid()).optional(),
}).refine((v) => Object.keys(v).length > 0, {
  message: 'At least one field required',
})
export type UpdateGroupRequest = z.infer<typeof UpdateGroupRequestSchema>

// Target userId comes from the route path (`/org/users/:userId/role-assignments`); createdAt is
// server-generated at write time — neither is part of the request body.
export const CreateRoleAssignmentRequestSchema = z.discriminatedUnion('assignmentType', [
  z.object({ assignmentType: z.literal('role'), roleId: z.string().uuid() }),
  z.object({ assignmentType: z.literal('group'), groupId: z.string().uuid() }),
])
export type CreateRoleAssignmentRequest = z.infer<typeof CreateRoleAssignmentRequestSchema>
