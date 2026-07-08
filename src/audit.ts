import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { PermissionSchema } from './permissions.js'

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
}
export type AuditResourceType = keyof AuditPayloadMap

// Common envelope shared by every audit entry, regardless of resource type.
const auditEnvelope = {
  orgId: z.string().uuid(),
  eventId: z.string().uuid(),
  timestamp: z.string().datetime(),
  actorUserId: z.string(),
  actorEmail: z.string().email(),
  action: z.string().min(1),
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
    action: input.action,
    resourceType: input.resourceType,
    before: input.before,
    after: input.after,
  })
}
