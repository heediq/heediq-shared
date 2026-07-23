import { z } from 'zod'
import { WhisperModelSchema, DomainSchema, ContextVisibilitySchema, ContextGrantAccessSchema, LedgerEntryStatusSchema } from './enums.js'
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

// ── Context Library — Contexts CRUD + review-approval (D-124–D-142, §11 step 4b) ────────────────

// visibility/groupId mirror ContextSchema's own refine (context.ts) — both present together or
// neither, enforced here too since the route parses the request before touching ContextSchema.
export const CreateContextRequestSchema = z
  .object({
    name: z.string().min(1).max(255),
    domain: DomainSchema,
    description: z.string().max(2000).optional(),
    parentContextId: z.string().uuid().optional(),
    visibility: ContextVisibilitySchema.optional(),
    groupId: z.string().uuid().optional(),
  })
  .refine((v) => (v.visibility === 'group') === (v.groupId !== undefined), {
    message: 'groupId must be set iff visibility is "group"',
    path: ['groupId'],
  })
export type CreateContextRequest = z.infer<typeof CreateContextRequestSchema>

// Partial update — groupId/visibility consistency against the *existing* record (not just this
// request body) is validated by the route handler, since a partial patch may change only one of
// the pair while the other stays at its current stored value.
export const UpdateContextRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  parentContextId: z.string().uuid().optional(),
  visibility: ContextVisibilitySchema.optional(),
  groupId: z.string().uuid().optional(),
}).refine((v) => Object.keys(v).length > 0, {
  message: 'At least one field required',
})
export type UpdateContextRequest = z.infer<typeof UpdateContextRequestSchema>

// The review-approval step (D-137 wizard steps 1-2): files a Source's kept ExtractedItems into a
// Context. `kept` may be empty (a source can be approved with zero durable items). Items not in
// `kept` are marked `discarded`, not deleted — full item history stays queryable (D-136 ledger
// generation reads across a Context's item history, not just the kept subset).
export const ReviewApprovalRequestSchema = z.object({
  contextId: z.string().uuid(),
  kept: z.array(z.string().uuid()).default([]),
})
export type ReviewApprovalRequest = z.infer<typeof ReviewApprovalRequestSchema>

// Cross-org context sharing (D-142, §11 step 4c). The route resolves `granteeEmail` to a userId
// server-side (existing-accounts-only, no invite flow yet) — the request never carries a userId
// directly, since the caller doesn't know the grantee's internal id. `expiresAt` is epoch seconds
// (matches ContextGrantSchema — the DynamoDB TTL attribute).
export const CreateContextGrantRequestSchema = z.object({
  granteeEmail: z.string().email(),
  access: ContextGrantAccessSchema,
  expiresAt: z.number().int(),
})
export type CreateContextGrantRequest = z.infer<typeof CreateContextGrantRequestSchema>

// ── Context chat (D-138/D-139, §11 step 4c-ii) ──────────────────────────────────

export const CreateConversationRequestSchema = z.object({
  title: z.string().min(1).max(255),
})
export type CreateConversationRequest = z.infer<typeof CreateConversationRequestSchema>

// `bypassLedgerGating` (D-149): chat-time gating blocks a turn when the Context has any
// `open`/`needs_review` ledger entry; the user either fills them (ledger PATCH) and retries, or
// retries with this flag set to proceed anyway. Absent/false = gating enforced.
export const CreateMessageRequestSchema = z.object({
  content: z.string().min(1),
  bypassLedgerGating: z.boolean().optional(),
})
export type CreateMessageRequest = z.infer<typeof CreateMessageRequestSchema>

// ── Context Decision Ledger — read/fill routes (D-136/D-148, §11 step 6) ─────────
// The wizard step-3 fill action and standalone ledger editing. A user edit always sets the entry's
// origin to `user` server-side (not in the request). Confidence is server-managed (1.0 on a user
// answer), never client-supplied. Create is for a manually-added decision/question the user tracks.
export const CreateLedgerEntryRequestSchema = z.object({
  topic: z.string().min(1).max(500),
  answer: z.string().min(1).max(5000).nullable().optional(),
})
export type CreateLedgerEntryRequest = z.infer<typeof CreateLedgerEntryRequestSchema>

// Fill/confirm/edit an existing entry. `answer: null` explicitly clears an answer (reverts toward
// `open`); omitting it leaves the stored answer untouched. `status` lets the user confirm a
// `needs_review` auto-answer or reopen an entry. At least one field must be present.
export const UpdateLedgerEntryRequestSchema = z.object({
  topic: z.string().min(1).max(500).optional(),
  answer: z.string().min(1).max(5000).nullable().optional(),
  status: LedgerEntryStatusSchema.optional(),
}).refine((v) => Object.keys(v).length > 0, {
  message: 'At least one field required',
})
export type UpdateLedgerEntryRequest = z.infer<typeof UpdateLedgerEntryRequestSchema>
