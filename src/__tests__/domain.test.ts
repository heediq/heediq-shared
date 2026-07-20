import { describe, it, expect } from 'vitest'
import { OrgSchema, UserSchema, SourceSchema, JobSchema, SummarySchema } from '../domain.js'

const now = new Date().toISOString()
const uuid = '00000000-0000-0000-0000-000000000001'

describe('OrgSchema', () => {
  const valid = { orgId: uuid, name: 'Acme', plan: 'free' as const, seatCount: 1, usageLifetimeCount: 0, createdAt: now }
  it('parses valid org', () => {
    expect(OrgSchema.parse(valid)).toMatchObject({ orgId: uuid, plan: 'free' })
  })
  it('rejects empty name', () => {
    expect(() => OrgSchema.parse({ ...valid, name: '' })).toThrow()
  })
  it('rejects negative seatCount', () => {
    expect(() => OrgSchema.parse({ ...valid, seatCount: 0 })).toThrow()
  })
  it('parses without defaultRoleId (pre-RBAC org rows)', () => {
    expect(OrgSchema.parse(valid).defaultRoleId).toBeUndefined()
  })
  it('accepts an explicit defaultRoleId', () => {
    expect(OrgSchema.parse({ ...valid, defaultRoleId: uuid }).defaultRoleId).toBe(uuid)
  })
})

describe('UserSchema', () => {
  const valid = { userId: 'u1', orgId: uuid, email: 'a@b.com', role: 'member' as const, createdAt: now }
  it('parses valid user', () => {
    expect(UserSchema.parse(valid)).toMatchObject({ email: 'a@b.com', role: 'member' })
  })
  it('rejects invalid email', () => {
    expect(() => UserSchema.parse({ ...valid, email: 'not-an-email' })).toThrow()
  })
  it('defaults passwordSet to true when absent (pre-D-078 rows)', () => {
    expect(UserSchema.parse(valid).passwordSet).toBe(true)
  })
  it('accepts an explicit passwordSet:false (federated-only account)', () => {
    expect(UserSchema.parse({ ...valid, passwordSet: false }).passwordSet).toBe(false)
  })
})

describe('SourceSchema', () => {
  const valid = {
    sourceId: uuid, orgId: uuid, userId: 'u1', title: 'Meeting',
    status: 'ready' as const, createdAt: now, updatedAt: now,
  }
  it('parses valid source', () => {
    expect(SourceSchema.parse(valid)).toMatchObject({ title: 'Meeting', status: 'ready' })
  })
  it('allows optional durationSecs', () => {
    expect(SourceSchema.parse({ ...valid, durationSecs: 3600 })).toMatchObject({ durationSecs: 3600 })
  })
  it('rejects empty title', () => {
    expect(() => SourceSchema.parse({ ...valid, title: '' })).toThrow()
  })
  it('parses a legacy source without Context Library fields (D-128/D-133)', () => {
    const s = SourceSchema.parse(valid)
    expect(s.contextId).toBeUndefined()
    expect(s.classification).toBeUndefined()
    expect(s.proposedClassification).toBeUndefined()
  })
  it('accepts a filed source with contextId + approved classification (D-128)', () => {
    expect(
      SourceSchema.parse({ ...valid, contextId: uuid, classification: 'approved' }),
    ).toMatchObject({ contextId: uuid, classification: 'approved' })
  })
  it('accepts a pending_review source carrying a proposedClassification (D-133)', () => {
    const parsed = SourceSchema.parse({
      ...valid,
      classification: 'pending_review',
      proposedClassification: { newContextName: 'Project Apollo', domain: 'work', confidence: 0.9 },
    })
    expect(parsed.classification).toBe('pending_review')
    expect(parsed.proposedClassification).toMatchObject({ newContextName: 'Project Apollo' })
  })
  it('rejects an invalid proposedClassification (both context id and new name set)', () => {
    expect(() =>
      SourceSchema.parse({
        ...valid,
        proposedClassification: {
          proposedContextId: uuid, newContextName: 'X', domain: 'work', confidence: 0.9,
        },
      }),
    ).toThrow()
  })
})

describe('JobSchema', () => {
  const valid = {
    jobId: uuid, sourceId: uuid, orgId: uuid,
    status: 'queued' as const, model: 'small' as const, tier: 'free' as const,
  }
  it('parses valid job', () => {
    expect(JobSchema.parse(valid)).toMatchObject({ status: 'queued', model: 'small' })
  })
  it('allows optional timestamps', () => {
    expect(JobSchema.parse({ ...valid, startedAt: now, completedAt: now })).toMatchObject({ startedAt: now })
  })
})

describe('SummarySchema (shrunk to transcript + gist, D-135)', () => {
  const valid = { sourceId: uuid, orgId: uuid, createdAt: now }
  it('parses a minimal summary (no transcript/gist yet)', () => {
    expect(SummarySchema.parse(valid)).toMatchObject({ sourceId: uuid })
  })
  it('allows optional transcript and gist', () => {
    expect(
      SummarySchema.parse({ ...valid, transcript: 'raw text', gist: 'A short prose summary.' }),
    ).toMatchObject({ transcript: 'raw text', gist: 'A short prose summary.' })
  })
  it('no longer carries the flat extraction arrays (moved to ExtractedItem, D-135)', () => {
    const parsed = SummarySchema.parse({
      ...valid,
      // Extra legacy keys are stripped by the schema, not persisted.
      requirements: ['R1'], decisions: ['D1'], openQuestions: ['Q1'], actionItems: ['A1'],
    }) as Record<string, unknown>
    expect(parsed.requirements).toBeUndefined()
    expect(parsed.decisions).toBeUndefined()
    expect(parsed.openQuestions).toBeUndefined()
    expect(parsed.actionItems).toBeUndefined()
  })
})
