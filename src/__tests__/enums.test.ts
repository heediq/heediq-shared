import { describe, it, expect } from 'vitest'
import {
  TierSchema,
  WhisperModelSchema,
  JobStatusSchema,
  SourceStatusSchema,
  OrgRoleSchema,
  SourceTypeSchema,
} from '../enums.js'

describe('TierSchema', () => {
  it('accepts valid values', () => {
    expect(TierSchema.parse('free')).toBe('free')
    expect(TierSchema.parse('paid')).toBe('paid')
  })
  it('rejects invalid values', () => {
    expect(() => TierSchema.parse('enterprise')).toThrow()
  })
})

describe('WhisperModelSchema', () => {
  it('accepts valid models', () => {
    expect(WhisperModelSchema.parse('small')).toBe('small')
    expect(WhisperModelSchema.parse('large-v3')).toBe('large-v3')
  })
  it('rejects unknown models', () => {
    expect(() => WhisperModelSchema.parse('medium')).toThrow()
  })
})

describe('JobStatusSchema', () => {
  const validStatuses = ['queued', 'starting', 'transcribing', 'diarizing', 'summarizing', 'done', 'failed', 'retrying']
  it.each(validStatuses)('accepts %s', (status) => {
    expect(JobStatusSchema.parse(status)).toBe(status)
  })
  it('rejects unknown status', () => {
    expect(() => JobStatusSchema.parse('pending')).toThrow()
  })
})

describe('SourceStatusSchema', () => {
  it('accepts all valid statuses', () => {
    for (const s of ['uploading', 'processing', 'ready', 'failed']) {
      expect(SourceStatusSchema.parse(s)).toBe(s)
    }
  })
})

describe('OrgRoleSchema', () => {
  it('accepts admin and member', () => {
    expect(OrgRoleSchema.parse('admin')).toBe('admin')
    expect(OrgRoleSchema.parse('member')).toBe('member')
  })
  it('rejects owner', () => {
    expect(() => OrgRoleSchema.parse('owner')).toThrow()
  })
})

describe('SourceTypeSchema', () => {
  it('accepts audio and text', () => {
    expect(SourceTypeSchema.parse('audio')).toBe('audio')
    expect(SourceTypeSchema.parse('text')).toBe('text')
  })
})
