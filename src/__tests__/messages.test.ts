import { describe, it, expect } from 'vitest'
import {
  TranscriptionJobMessageSchema,
  SummarizationJobMessageSchema,
  ChatJobMessageSchema,
} from '../messages.js'

const uuid = '00000000-0000-0000-0000-000000000001'

describe('TranscriptionJobMessageSchema', () => {
  const valid = {
    jobId: uuid, sourceId: uuid, orgId: uuid,
    audioS3Key: 'sources/org1/rec1/audio.webm',
    model: 'small' as const, tier: 'free' as const,
  }
  it('parses valid transcription message', () => {
    expect(TranscriptionJobMessageSchema.parse(valid)).toMatchObject({ model: 'small', tier: 'free' })
  })
  it('rejects empty audioS3Key', () => {
    expect(() => TranscriptionJobMessageSchema.parse({ ...valid, audioS3Key: '' })).toThrow()
  })
})

describe('SummarizationJobMessageSchema', () => {
  const valid = {
    jobId: uuid, sourceId: uuid, orgId: uuid,
    sourceType: 'audio' as const, contentRef: 'transcripts/rec1.txt', tier: 'free' as const,
  }
  it('parses audio source type for free tier', () => {
    expect(SummarizationJobMessageSchema.parse(valid)).toMatchObject({ sourceType: 'audio', tier: 'free' })
  })
  it('parses text source type for paid tier', () => {
    expect(SummarizationJobMessageSchema.parse({ ...valid, sourceType: 'text', tier: 'paid' })).toMatchObject({ sourceType: 'text', tier: 'paid' })
  })
  it('rejects empty contentRef', () => {
    expect(() => SummarizationJobMessageSchema.parse({ ...valid, contentRef: '' })).toThrow()
  })
  it('rejects missing tier', () => {
    const { tier: _, ...noTier } = valid
    expect(() => SummarizationJobMessageSchema.parse(noTier)).toThrow()
  })
})

describe('ChatJobMessageSchema (D-139)', () => {
  const valid = {
    jobId: uuid, conversationId: uuid, contextId: uuid, orgId: uuid,
    userId: 'u1', userMessageId: uuid, tier: 'paid' as const,
  }
  it('parses a valid chat job message', () => {
    expect(ChatJobMessageSchema.parse(valid)).toMatchObject({ tier: 'paid' })
  })
  it('rejects a non-uuid userMessageId', () => {
    expect(() => ChatJobMessageSchema.parse({ ...valid, userMessageId: 'nope' })).toThrow()
  })
  it('rejects missing userId', () => {
    const { userId: _, ...noUserId } = valid
    expect(() => ChatJobMessageSchema.parse(noUserId)).toThrow()
  })
})
