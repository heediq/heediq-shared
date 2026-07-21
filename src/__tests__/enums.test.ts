import { describe, it, expect } from 'vitest'
import {
  TierSchema,
  WhisperModelSchema,
  JobStatusSchema,
  SourceStatusSchema,
  OrgRoleSchema,
  SourceTypeSchema,
  DomainSchema,
  ContextStatusSchema,
  SourceClassificationSchema,
  ExtractedItemStatusSchema,
  LedgerEntryStatusSchema,
  LedgerEntryOriginSchema,
  ContextVisibilitySchema,
  ContextGrantAccessSchema,
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

describe('DomainSchema (D-127/D-131)', () => {
  it.each(['work', 'study', 'personal', 'other'])('accepts %s', (d) => {
    expect(DomainSchema.parse(d)).toBe(d)
  })
  it('rejects an unknown domain', () => {
    expect(() => DomainSchema.parse('finance')).toThrow()
  })
})

describe('ContextStatusSchema', () => {
  it('accepts active and archived', () => {
    expect(ContextStatusSchema.parse('active')).toBe('active')
    expect(ContextStatusSchema.parse('archived')).toBe('archived')
  })
  it('rejects an unknown status', () => {
    expect(() => ContextStatusSchema.parse('deleted')).toThrow()
  })
})

describe('SourceClassificationSchema (D-133)', () => {
  it('accepts pending_review and approved', () => {
    expect(SourceClassificationSchema.parse('pending_review')).toBe('pending_review')
    expect(SourceClassificationSchema.parse('approved')).toBe('approved')
  })
  it('rejects an unknown classification', () => {
    expect(() => SourceClassificationSchema.parse('rejected')).toThrow()
  })
})

describe('ExtractedItemStatusSchema (D-135)', () => {
  it.each(['proposed', 'kept', 'discarded'])('accepts %s', (s) => {
    expect(ExtractedItemStatusSchema.parse(s)).toBe(s)
  })
  it('rejects an unknown status', () => {
    expect(() => ExtractedItemStatusSchema.parse('archived')).toThrow()
  })
})

describe('LedgerEntryStatusSchema (D-136)', () => {
  it.each(['confirmed', 'needs_review', 'open'])('accepts %s', (s) => {
    expect(LedgerEntryStatusSchema.parse(s)).toBe(s)
  })
  it('rejects an unknown status', () => {
    expect(() => LedgerEntryStatusSchema.parse('closed')).toThrow()
  })
})

describe('LedgerEntryOriginSchema (D-136)', () => {
  it.each(['auto', 'user', 'chat_prompted'])('accepts %s', (o) => {
    expect(LedgerEntryOriginSchema.parse(o)).toBe(o)
  })
  it('rejects an unknown origin', () => {
    expect(() => LedgerEntryOriginSchema.parse('import')).toThrow()
  })
})

describe('ContextVisibilitySchema (D-141)', () => {
  it.each(['personal', 'group', 'org'])('accepts %s', (v) => {
    expect(ContextVisibilitySchema.parse(v)).toBe(v)
  })
  it('rejects an unknown visibility', () => {
    expect(() => ContextVisibilitySchema.parse('public')).toThrow()
  })
})

describe('ContextGrantAccessSchema (D-142)', () => {
  it.each(['read', 'contribute'])('accepts %s', (a) => {
    expect(ContextGrantAccessSchema.parse(a)).toBe(a)
  })
  it('rejects an unknown access level', () => {
    expect(() => ContextGrantAccessSchema.parse('write')).toThrow()
  })
})
