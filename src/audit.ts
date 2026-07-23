import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { PermissionSchema } from './permissions.js'
import { OrgRoleSchema } from './enums.js'

// `before`/`after` snapshots are resource-type-specific, human-readable, and resolved by the
// calling handler at write time — never a raw DB row (D-102). This keeps entries self-contained
// (readable without a live join, even after the referenced record is renamed/deleted) and
// structurally prevents transcript/PII from reaching the log, the same discipline `createLogger`
// already applies to CloudWatch logs (D-085/D-093).
const RoleAuditPayloadSchema = z.object({
  roleId: z.string().uuid(),
  name: z.string(),
  permissions: z.array(PermissionSchema),
})

const GroupAuditPayloadSchema = z.object({
  groupId: z.string().uuid(),
  name: z.string(),
  roleIds: z.array(z.string().uuid()),
})

const RoleAssignmentAuditPayloadSchema = z.object({
  userId: z.string(),
  userEmail: z.string().email(),
  roleId: z.string().uuid(),
  roleName: z.string(),
})

const GroupAssignmentAuditPayloadSchema = z.object({
  userId: z.string(),
  userEmail: z.string().email(),
  groupId: z.string().uuid(),
  groupName: z.string(),
})

const SourceAuditPayloadSchema = z.object({
  sourceId: z.string().uuid(),
  title: z.string(),
  ownerEmail: z.string().email(),
})

const ContextAuditPayloadSchema = z.object({
  contextId: z.string().uuid(),
  name: z.string(),
  domain: z.string(),
  visibility: z.string(),
  parentContextId: z.string().uuid().optional(),
})

// The review-approval act itself (D-137 wizard), not a full before/after item-by-item dump —
// counts are enough to reconstruct "what happened" without re-listing extracted content (D-093
// keeps audit payloads non-PII, same discipline as CloudWatch logs).
const ExtractedItemReviewAuditPayloadSchema = z.object({
  sourceId: z.string().uuid(),
  contextId: z.string().uuid(),
  keptCount: z.number().int().min(0),
  discardedCount: z.number().int().min(0),
})

// Cross-org grant issuance/revoke (D-142, §11 step 4c-i) — granteeEmail intentionally excluded
// (PII, D-093); granteeUserId is the durable, non-PII identifier the same discipline uses elsewhere.
const ContextGrantAuditPayloadSchema = z.object({
  contextId: z.string().uuid(),
  granteeUserId: z.string(),
  granteeOrgId: z.string().uuid(),
  access: z.string(),
  expiresAt: z.number().int(),
})

// Context chat (D-138/D-139, §11 step 4c-ii). `content` is deliberately excluded from both — chat
// turns are the most PII/content-dense resource type this trail covers yet (D-093 non-PII rule);
// the audit entry proves a message was sent, never what it said.
const ConversationAuditPayloadSchema = z.object({
  conversationId: z.string().uuid(),
  contextId: z.string().uuid(),
  title: z.string(),
})

const ChatMessageAuditPayloadSchema = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
  role: z.enum(['user', 'assistant']),
})

// A user-facing Decision Ledger mutation (D-148 fill/confirm/edit/create/delete) — `topic`/`answer`
// deliberately excluded (a decision topic/answer can carry the same sensitive content as extraction,
// D-093 non-PII rule); the entry proves *which* ledger entry changed and to what status/origin,
// never its wording. Auto (worker-written) reconciliation entries are not audited here — this trail
// records human actions, matching how the other payloads describe an actor's act.
const LedgerEntryAuditPayloadSchema = z.object({
  entryId: z.string().uuid(),
  contextId: z.string().uuid(),
  status: z.string(),
  origin: z.string(),
})

// D-114: a denied `requirePermission` check never reaches the route handler, so there is no
// resource instance to describe — just the permission the actor lacked. Kept as its own
// resourceType (not folded into the resource-specific schemas above) so those stay strictly typed
// to their actual resource shape rather than gaining optional fields to accommodate a no-resource
// case.
const PermissionDeniedAuditPayloadSchema = z.object({
  permission: PermissionSchema,
})

// Covers events migrated from the auth-only heediq-auth-audit-log (D-087), which this table
// supersedes — sign-in/linking events, not RBAC changes.
const AuthAuditPayloadSchema = z.object({
  method: z.string(),
  email: z.string().email(),
})

// One entry per resource type this audit trail covers. Adding a resource type is additive; the
// exact `action` taxonomy per type (e.g. auth's SET_PASSWORD-style event names) is intentionally
// left open — see architecture.md §"RBAC & Audit Trail", "Not yet resolved."
export interface AuditPayloadMap {
  role: z.infer<typeof RoleAuditPayloadSchema>
  group: z.infer<typeof GroupAuditPayloadSchema>
  roleAssignment: z.infer<typeof RoleAssignmentAuditPayloadSchema>
  groupAssignment: z.infer<typeof GroupAssignmentAuditPayloadSchema>
  source: z.infer<typeof SourceAuditPayloadSchema>
  auth: z.infer<typeof AuthAuditPayloadSchema>
  permission: z.infer<typeof PermissionDeniedAuditPayloadSchema>
  context: z.infer<typeof ContextAuditPayloadSchema>
  extractedItemReview: z.infer<typeof ExtractedItemReviewAuditPayloadSchema>
  contextGrant: z.infer<typeof ContextGrantAuditPayloadSchema>
  conversation: z.infer<typeof ConversationAuditPayloadSchema>
  chatMessage: z.infer<typeof ChatMessageAuditPayloadSchema>
  ledgerEntry: z.infer<typeof LedgerEntryAuditPayloadSchema>
}
export type AuditResourceType = keyof AuditPayloadMap

// Common envelope shared by every audit entry, regardless of resource type. actorRole is the
// actor's system role (admin/member, D-102) at the moment of the action, taken straight from the
// JWT — cheap because it's already in AuthContext, unlike group membership which isn't baked into
// the token today (D-105) and was deliberately left off this envelope to avoid an extra DynamoDB
// read on every audit write; revisit if the audit viewer later needs it.
// `effect` defaults to 'permitted' so every pre-D-114 stored entry (written before this field
// existed) still parses unchanged when read back by the audit-log viewer (D-102's write-once
// table has no backfill path). Only `requirePermission`'s new denial write ever sets 'denied'.
const auditEnvelope = {
  orgId: z.string().uuid(),
  eventId: z.string().uuid(),
  timestamp: z.string().datetime(),
  actorUserId: z.string(),
  actorEmail: z.string().email(),
  actorRole: OrgRoleSchema,
  action: z.string().min(1),
  effect: z.enum(['permitted', 'denied']).default('permitted'),
}

// pk=ORG#<orgId>, sk=<timestamp>#<eventId> (D-102) — write-once by construction, no update/delete
// path in application code. Discriminated on resourceType so before/after are typed per variant.
export const AuditLogEntrySchema = z.discriminatedUnion('resourceType', [
  z.object({ ...auditEnvelope, resourceType: z.literal('role'), before: RoleAuditPayloadSchema.optional(), after: RoleAuditPayloadSchema.optional() }),
  z.object({ ...auditEnvelope, resourceType: z.literal('group'), before: GroupAuditPayloadSchema.optional(), after: GroupAuditPayloadSchema.optional() }),
  z.object({ ...auditEnvelope, resourceType: z.literal('roleAssignment'), before: RoleAssignmentAuditPayloadSchema.optional(), after: RoleAssignmentAuditPayloadSchema.optional() }),
  z.object({ ...auditEnvelope, resourceType: z.literal('groupAssignment'), before: GroupAssignmentAuditPayloadSchema.optional(), after: GroupAssignmentAuditPayloadSchema.optional() }),
  z.object({ ...auditEnvelope, resourceType: z.literal('source'), before: SourceAuditPayloadSchema.optional(), after: SourceAuditPayloadSchema.optional() }),
  z.object({ ...auditEnvelope, resourceType: z.literal('auth'), before: AuthAuditPayloadSchema.optional(), after: AuthAuditPayloadSchema.optional() }),
  z.object({ ...auditEnvelope, resourceType: z.literal('permission'), before: PermissionDeniedAuditPayloadSchema.optional(), after: PermissionDeniedAuditPayloadSchema.optional() }),
  z.object({ ...auditEnvelope, resourceType: z.literal('context'), before: ContextAuditPayloadSchema.optional(), after: ContextAuditPayloadSchema.optional() }),
  z.object({ ...auditEnvelope, resourceType: z.literal('extractedItemReview'), before: ExtractedItemReviewAuditPayloadSchema.optional(), after: ExtractedItemReviewAuditPayloadSchema.optional() }),
  z.object({ ...auditEnvelope, resourceType: z.literal('contextGrant'), before: ContextGrantAuditPayloadSchema.optional(), after: ContextGrantAuditPayloadSchema.optional() }),
  z.object({ ...auditEnvelope, resourceType: z.literal('conversation'), before: ConversationAuditPayloadSchema.optional(), after: ConversationAuditPayloadSchema.optional() }),
  z.object({ ...auditEnvelope, resourceType: z.literal('chatMessage'), before: ChatMessageAuditPayloadSchema.optional(), after: ChatMessageAuditPayloadSchema.optional() }),
  z.object({ ...auditEnvelope, resourceType: z.literal('ledgerEntry'), before: LedgerEntryAuditPayloadSchema.optional(), after: LedgerEntryAuditPayloadSchema.optional() }),
])
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>

// Pure builder — constructs and validates an entry (fills eventId/timestamp), but never writes
// it. heediq-shared carries zero AWS SDK dependencies (schema/logic only); the actual DynamoDB
// PutCommand lives in each consuming service (e.g. heediq-api's `writeAuditEvent`), matching
// where every other DynamoDB access already lives.
export interface BuildAuditLogEntryInput<T extends AuditResourceType> {
  orgId: string
  resourceType: T
  action: string
  actorUserId: string
  actorEmail: string
  actorRole: z.infer<typeof OrgRoleSchema>
  effect?: 'permitted' | 'denied'
  before?: AuditPayloadMap[T]
  after?: AuditPayloadMap[T]
}

export function buildAuditLogEntry<T extends AuditResourceType>(
  input: BuildAuditLogEntryInput<T>,
): AuditLogEntry {
  return AuditLogEntrySchema.parse({
    orgId: input.orgId,
    eventId: randomUUID(),
    timestamp: new Date().toISOString(),
    actorUserId: input.actorUserId,
    actorEmail: input.actorEmail,
    actorRole: input.actorRole,
    action: input.action,
    effect: input.effect,
    resourceType: input.resourceType,
    before: input.before,
    after: input.after,
  })
}
