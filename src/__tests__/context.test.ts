import { describe, it, expect } from 'vitest'
import {
  ContextSchema,
  ContextGrantSchema,
  ProposedClassificationSchema,
  ExtractedItemSchema,
  DecisionLedgerEntrySchema,
  LEDGER_REVIEW_CONFIDENCE_THRESHOLD,
} from '../context.js'

const uuid = '00000000-0000-0000-0000-000000000001'
const uuid2 = '00000000-0000-0000-0000-000000000002'
const now = new Date().toISOString()
const nowEpoch = Math.floor(Date.now() / 1000)

describe('ContextSchema (D-129/D-134)', () => {
  const valid = {
    contextId: uuid, orgId: uuid, userId: 'u1', domain: 'work' as const,
    name: 'Project Apollo', createdAt: now, updatedAt: now,
  }
  it('parses a valid top-level context', () => {
    expect(ContextSchema.parse(valid)).toMatchObject({ name: 'Project Apollo', domain: 'work' })
  })
  it('defaults status to active', () => {
    expect(ContextSchema.parse(valid).status).toBe('active')
  })
  it('accepts a nested context via parentContextId (D-134)', () => {
    expect(ContextSchema.parse({ ...valid, parentContextId: uuid2 }).parentContextId).toBe(uuid2)
  })
  it('rejects an empty name', () => {
    expect(() => ContextSchema.parse({ ...valid, name: '' })).toThrow()
  })
  it('rejects an unknown domain', () => {
    expect(() => ContextSchema.parse({ ...valid, domain: 'finance' })).toThrow()
  })
  it('rejects a non-uuid parentContextId', () => {
    expect(() => ContextSchema.parse({ ...valid, parentContextId: 'nope' })).toThrow()
  })
  // ── visibility / groupId (D-141) ──
  it('defaults visibility to personal', () => {
    expect(ContextSchema.parse(valid).visibility).toBe('personal')
  })
  it('accepts org visibility with no groupId', () => {
    expect(ContextSchema.parse({ ...valid, visibility: 'org' }).visibility).toBe('org')
  })
  it('accepts group visibility with a groupId', () => {
    expect(ContextSchema.parse({ ...valid, visibility: 'group', groupId: uuid2 }).groupId).toBe(uuid2)
  })
  it('rejects group visibility without a groupId', () => {
    expect(() => ContextSchema.parse({ ...valid, visibility: 'group' })).toThrow()
  })
  it('rejects a groupId when visibility is not group', () => {
    expect(() => ContextSchema.parse({ ...valid, visibility: 'org', groupId: uuid2 })).toThrow()
  })
})

describe('ContextGrantSchema (D-142)', () => {
  const valid = {
    contextId: uuid,
    granteeUserId: 'grantee-1',
    granteeOrgId: uuid,
    ownerOrgId: uuid2,
    grantedByUserId: 'owner-1',
    access: 'read' as const,
    expiresAt: nowEpoch,
    createdAt: now,
    updatedAt: now,
  }
  it('parses a valid read grant', () => {
    expect(ContextGrantSchema.parse(valid)).toMatchObject({ access: 'read', ownerOrgId: uuid2 })
  })
  it('accepts a contribute grant', () => {
    expect(ContextGrantSchema.parse({ ...valid, access: 'contribute' }).access).toBe('contribute')
  })
  it('rejects an unknown access level', () => {
    expect(() => ContextGrantSchema.parse({ ...valid, access: 'admin' })).toThrow()
  })
  it('requires expiresAt (grants are always time-limited)', () => {
    const { expiresAt: _omit, ...noExpiry } = valid
    expect(() => ContextGrantSchema.parse(noExpiry)).toThrow()
  })
  it('rejects an ISO string expiresAt — must be epoch seconds for DynamoDB TTL', () => {
    expect(() => ContextGrantSchema.parse({ ...valid, expiresAt: now })).toThrow()
  })
})

describe('ProposedClassificationSchema (D-130/D-133)', () => {
  const base = { domain: 'work' as const, confidence: 0.9 }
  it('accepts a proposal for an existing context (id only)', () => {
    expect(ProposedClassificationSchema.parse({ ...base, proposedContextId: uuid })).toMatchObject({
      proposedContextId: uuid,
    })
  })
  it('accepts a proposal for a new context (name only)', () => {
    expect(ProposedClassificationSchema.parse({ ...base, newContextName: 'New' })).toMatchObject({
      newContextName: 'New',
    })
  })
  it('defaults labels to an empty array', () => {
    expect(ProposedClassificationSchema.parse({ ...base, proposedContextId: uuid }).labels).toEqual([])
  })
  it('rejects a proposal setting BOTH proposedContextId and newContextName', () => {
    expect(() =>
      ProposedClassificationSchema.parse({ ...base, proposedContextId: uuid, newContextName: 'New' }),
    ).toThrow()
  })
  it('rejects a proposal setting NEITHER', () => {
    expect(() => ProposedClassificationSchema.parse({ ...base })).toThrow()
  })
  it('rejects a confidence outside [0,1]', () => {
    expect(() =>
      ProposedClassificationSchema.parse({ ...base, proposedContextId: uuid, confidence: 1.5 }),
    ).toThrow()
  })
})

describe('ExtractedItemSchema (D-135)', () => {
  const valid = {
    itemId: uuid, sourceId: uuid2, orgId: uuid, category: 'requirements',
    text: 'The system must support SSO.', confidence: 0.8, createdAt: now,
  }
  it('parses a valid item', () => {
    expect(ExtractedItemSchema.parse(valid)).toMatchObject({ category: 'requirements' })
  })
  it('defaults status to proposed', () => {
    expect(ExtractedItemSchema.parse(valid).status).toBe('proposed')
  })
  it('accepts an optional contextId and sourceQuote', () => {
    expect(
      ExtractedItemSchema.parse({ ...valid, contextId: uuid, sourceQuote: '...must support SSO...' }),
    ).toMatchObject({ contextId: uuid })
  })
  it('rejects empty text', () => {
    expect(() => ExtractedItemSchema.parse({ ...valid, text: '' })).toThrow()
  })
  it('rejects a confidence outside [0,1]', () => {
    expect(() => ExtractedItemSchema.parse({ ...valid, confidence: -0.1 })).toThrow()
  })
})

describe('DecisionLedgerEntrySchema (D-136)', () => {
  const valid = {
    entryId: uuid, contextId: uuid2, topic: 'Auth provider',
    answer: 'Cognito', status: 'confirmed' as const, confidence: 0.9,
    origin: 'auto' as const, createdAt: now, updatedAt: now,
  }
  it('parses a valid entry', () => {
    expect(DecisionLedgerEntrySchema.parse(valid)).toMatchObject({ topic: 'Auth provider' })
  })
  it('allows a null answer (open decision)', () => {
    expect(
      DecisionLedgerEntrySchema.parse({ ...valid, answer: null, status: 'open' }),
    ).toMatchObject({ answer: null, status: 'open' })
  })
  it('defaults sourceRefs to an empty array', () => {
    expect(DecisionLedgerEntrySchema.parse(valid).sourceRefs).toEqual([])
  })
  it('rejects an unknown status', () => {
    expect(() => DecisionLedgerEntrySchema.parse({ ...valid, status: 'closed' })).toThrow()
  })
  it('rejects an unknown origin', () => {
    expect(() => DecisionLedgerEntrySchema.parse({ ...valid, origin: 'import' })).toThrow()
  })
})

describe('LEDGER_REVIEW_CONFIDENCE_THRESHOLD (D-136)', () => {
  it('is 0.5, within [0,1] and distinct from the 0.75 domain-fit threshold', () => {
    expect(LEDGER_REVIEW_CONFIDENCE_THRESHOLD).toBe(0.5)
    expect(LEDGER_REVIEW_CONFIDENCE_THRESHOLD).toBeGreaterThanOrEqual(0)
    expect(LEDGER_REVIEW_CONFIDENCE_THRESHOLD).toBeLessThanOrEqual(1)
  })
})
