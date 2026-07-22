import { describe, it, expect } from 'vitest'
import { AuditLogEntrySchema, buildAuditLogEntry } from '../audit.js'

const now = new Date().toISOString()
const uuid = '00000000-0000-0000-0000-000000000001'
const uuid2 = '00000000-0000-0000-0000-000000000002'

const envelope = {
  orgId: uuid, eventId: uuid2, timestamp: now, actorUserId: 'u1', actorEmail: 'admin@acme.com', actorRole: 'admin' as const, action: 'role:update',
}

describe('AuditLogEntrySchema', () => {
  it('parses a role entry with matching before/after payloads', () => {
    const entry = {
      ...envelope,
      resourceType: 'role' as const,
      before: { roleId: uuid, name: 'Reviewer', permissions: ['sources:read-own'] },
      after: { roleId: uuid, name: 'Reviewer', permissions: ['sources:read-own', 'sources:read'] },
    }
    expect(AuditLogEntrySchema.parse(entry)).toMatchObject({ resourceType: 'role' })
  })

  it('parses a source entry with only an after payload (create event, no before)', () => {
    const entry = {
      ...envelope,
      resourceType: 'source' as const,
      action: 'source:create',
      after: { sourceId: uuid, title: 'Kickoff call', ownerEmail: 'user@acme.com' },
    }
    expect(AuditLogEntrySchema.parse(entry)).toMatchObject({ resourceType: 'source' })
  })

  it('parses an auth entry', () => {
    const entry = {
      ...envelope, resourceType: 'auth' as const, action: 'auth:login',
      after: { method: 'GOOGLE', email: 'user@acme.com' },
    }
    expect(AuditLogEntrySchema.parse(entry)).toMatchObject({ resourceType: 'auth' })
  })

  it('parses a groupAssignment entry', () => {
    const entry = {
      ...envelope, resourceType: 'groupAssignment' as const, action: 'groupAssignment:create',
      after: { userId: 'u2', userEmail: 'u2@acme.com', groupId: uuid, groupName: 'Engineering' },
    }
    expect(AuditLogEntrySchema.parse(entry)).toMatchObject({ resourceType: 'groupAssignment' })
  })

  it('parses a permission-denial entry with effect=denied and an after-only payload (D-114)', () => {
    const entry = {
      ...envelope,
      resourceType: 'permission' as const,
      action: 'sources:delete',
      effect: 'denied' as const,
      after: { permission: 'sources:delete' },
    }
    expect(AuditLogEntrySchema.parse(entry)).toMatchObject({ resourceType: 'permission', effect: 'denied' })
  })

  it('defaults effect to permitted when omitted (pre-D-114 stored rows still parse)', () => {
    const entry = {
      ...envelope,
      resourceType: 'role' as const,
      after: { roleId: uuid, name: 'Reviewer', permissions: ['sources:read-own'] },
    }
    expect(AuditLogEntrySchema.parse(entry)).toMatchObject({ effect: 'permitted' })
  })

  it('rejects a role resourceType carrying a source-shaped payload', () => {
    const entry = {
      ...envelope,
      resourceType: 'role' as const,
      after: { sourceId: uuid, title: 'Kickoff call', ownerEmail: 'user@acme.com' },
    }
    expect(() => AuditLogEntrySchema.parse(entry)).toThrow()
  })

  it('rejects an unknown resourceType', () => {
    expect(() => AuditLogEntrySchema.parse({ ...envelope, resourceType: 'widget' })).toThrow()
  })

  it('rejects a missing action', () => {
    const { action, ...rest } = envelope
    expect(() => AuditLogEntrySchema.parse({ ...rest, resourceType: 'role' as const })).toThrow()
  })

  it('rejects a missing actorRole', () => {
    const { actorRole, ...rest } = envelope
    expect(() => AuditLogEntrySchema.parse({ ...rest, resourceType: 'role' as const })).toThrow()
  })

  it('rejects an invalid actorRole', () => {
    expect(() =>
      AuditLogEntrySchema.parse({ ...envelope, actorRole: 'owner', resourceType: 'role' as const }),
    ).toThrow()
  })

  it('rejects an invalid actorEmail', () => {
    expect(() =>
      AuditLogEntrySchema.parse({ ...envelope, actorEmail: 'not-an-email', resourceType: 'role' as const }),
    ).toThrow()
  })
})

describe('buildAuditLogEntry', () => {
  it('fills eventId and timestamp and produces a schema-valid entry', () => {
    const entry = buildAuditLogEntry({
      orgId: uuid,
      resourceType: 'role',
      action: 'role:create',
      actorUserId: 'u1',
      actorEmail: 'admin@acme.com',
      actorRole: 'admin',
      after: { roleId: uuid, name: 'Reviewer', permissions: ['sources:read-own'] },
    })
    expect(entry.eventId).toMatch(/^[0-9a-f-]{36}$/)
    expect(entry.timestamp).toBe(new Date(entry.timestamp).toISOString())
    expect(AuditLogEntrySchema.parse(entry)).toMatchObject({ resourceType: 'role', action: 'role:create' })
  })

  it('generates a distinct eventId on every call (no accidental reuse across events)', () => {
    const input = {
      orgId: uuid,
      resourceType: 'group' as const,
      action: 'group:create',
      actorUserId: 'u1',
      actorEmail: 'admin@acme.com',
      actorRole: 'admin' as const,
      after: { groupId: uuid, name: 'Engineering', roleIds: [uuid] },
    }
    const first = buildAuditLogEntry(input)
    const second = buildAuditLogEntry(input)
    expect(first.eventId).not.toBe(second.eventId)
  })

  it('rejects a payload shape that does not match the given resourceType', () => {
    expect(() =>
      buildAuditLogEntry({
        orgId: uuid,
        resourceType: 'role',
        action: 'role:create',
        actorUserId: 'u1',
        actorEmail: 'admin@acme.com',
        actorRole: 'admin',
        // @ts-expect-error deliberately wrong payload shape for 'role'
        after: { sourceId: uuid, title: 'Kickoff call', ownerEmail: 'user@acme.com' },
      }),
    ).toThrow()
  })
})

describe('AuditLogEntrySchema — Context Library (step 4b)', () => {
  it('parses a context entry with only an after payload (create event)', () => {
    const entry = {
      ...envelope,
      resourceType: 'context' as const,
      action: 'context:create',
      after: { contextId: uuid, name: 'Sprint 12', domain: 'work', visibility: 'personal' },
    }
    expect(AuditLogEntrySchema.parse(entry)).toMatchObject({ resourceType: 'context' })
  })

  it('parses an extractedItemReview entry', () => {
    const entry = {
      ...envelope,
      resourceType: 'extractedItemReview' as const,
      action: 'source:review',
      after: { sourceId: uuid, contextId: uuid2, keptCount: 3, discardedCount: 1 },
    }
    expect(AuditLogEntrySchema.parse(entry)).toMatchObject({ resourceType: 'extractedItemReview' })
  })

  it('parses a contextGrant create entry (after-only, no before)', () => {
    const entry = {
      ...envelope,
      resourceType: 'contextGrant' as const,
      action: 'context:share',
      after: { contextId: uuid, granteeUserId: 'u2', granteeOrgId: uuid2, access: 'read', expiresAt: 1893456000 },
    }
    expect(AuditLogEntrySchema.parse(entry)).toMatchObject({ resourceType: 'contextGrant' })
  })

  it('parses a contextGrant revoke entry (before-only, no after)', () => {
    const entry = {
      ...envelope,
      resourceType: 'contextGrant' as const,
      action: 'context:unshare',
      before: { contextId: uuid, granteeUserId: 'u2', granteeOrgId: uuid2, access: 'contribute', expiresAt: 1893456000 },
    }
    expect(AuditLogEntrySchema.parse(entry)).toMatchObject({ resourceType: 'contextGrant' })
  })
})

describe('AuditLogEntrySchema — Context chat (step 4c-ii)', () => {
  it('parses a conversation create entry (after-only, no before)', () => {
    const entry = {
      ...envelope,
      resourceType: 'conversation' as const,
      action: 'conversation:create',
      after: { conversationId: uuid, contextId: uuid2, title: 'Tech spec draft' },
    }
    expect(AuditLogEntrySchema.parse(entry)).toMatchObject({ resourceType: 'conversation' })
  })

  it('parses a chatMessage entry with no content field (D-093 non-PII)', () => {
    const entry = {
      ...envelope,
      resourceType: 'chatMessage' as const,
      action: 'chatMessage:create',
      after: { conversationId: uuid, messageId: uuid2, role: 'user' as const },
    }
    expect(AuditLogEntrySchema.parse(entry)).toMatchObject({ resourceType: 'chatMessage' })
  })

  it('rejects a chatMessage entry carrying a content field', () => {
    const entry = {
      ...envelope,
      resourceType: 'chatMessage' as const,
      action: 'chatMessage:create',
      after: { conversationId: uuid, messageId: uuid2, role: 'user' as const, content: 'leaked text' },
    }
    expect(AuditLogEntrySchema.parse(entry)).not.toMatchObject({ after: { content: 'leaked text' } })
  })

  it('rejects an unknown chatMessage role', () => {
    const entry = {
      ...envelope,
      resourceType: 'chatMessage' as const,
      action: 'chatMessage:create',
      after: { conversationId: uuid, messageId: uuid2, role: 'system' },
    }
    expect(() => AuditLogEntrySchema.parse(entry)).toThrow()
  })
})
