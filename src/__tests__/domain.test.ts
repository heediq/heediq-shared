import { describe, it, expect } from 'vitest'
import { OrgSchema, UserSchema, RecordingSchema, JobSchema, SummarySchema } from '../domain.js'

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
})

describe('UserSchema', () => {
  const valid = { userId: 'u1', orgId: uuid, email: 'a@b.com', role: 'member' as const, createdAt: now }
  it('parses valid user', () => {
    expect(UserSchema.parse(valid)).toMatchObject({ email: 'a@b.com', role: 'member' })
  })
  it('rejects invalid email', () => {
    expect(() => UserSchema.parse({ ...valid, email: 'not-an-email' })).toThrow()
  })
})

describe('RecordingSchema', () => {
  const valid = {
    recordingId: uuid, orgId: uuid, userId: 'u1', title: 'Meeting',
    status: 'ready' as const, createdAt: now, updatedAt: now,
  }
  it('parses valid recording', () => {
    expect(RecordingSchema.parse(valid)).toMatchObject({ title: 'Meeting', status: 'ready' })
  })
  it('allows optional durationSecs', () => {
    expect(RecordingSchema.parse({ ...valid, durationSecs: 3600 })).toMatchObject({ durationSecs: 3600 })
  })
  it('rejects empty title', () => {
    expect(() => RecordingSchema.parse({ ...valid, title: '' })).toThrow()
  })
})

describe('JobSchema', () => {
  const valid = {
    jobId: uuid, recordingId: uuid, orgId: uuid,
    status: 'queued' as const, model: 'small' as const, tier: 'free' as const,
  }
  it('parses valid job', () => {
    expect(JobSchema.parse(valid)).toMatchObject({ status: 'queued', model: 'small' })
  })
  it('allows optional timestamps', () => {
    expect(JobSchema.parse({ ...valid, startedAt: now, completedAt: now })).toMatchObject({ startedAt: now })
  })
})

describe('SummarySchema', () => {
  const valid = {
    recordingId: uuid, orgId: uuid,
    requirements: ['R1'], decisions: ['D1'], openQuestions: ['Q1'], actionItems: ['A1'],
    createdAt: now,
  }
  it('parses valid summary', () => {
    expect(SummarySchema.parse(valid)).toMatchObject({ requirements: ['R1'] })
  })
  it('allows optional transcript', () => {
    expect(SummarySchema.parse({ ...valid, transcript: 'raw text' })).toMatchObject({ transcript: 'raw text' })
  })
})
