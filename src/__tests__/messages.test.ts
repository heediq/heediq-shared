import { describe, it, expect } from 'vitest'
import {
  TranscriptionJobMessageSchema,
  SummarizationJobMessageSchema,
  WsStatusMessageSchema,
} from '../messages.js'

const uuid = '00000000-0000-0000-0000-000000000001'
const now = new Date().toISOString()

describe('TranscriptionJobMessageSchema', () => {
  const valid = {
    jobId: uuid, recordingId: uuid, orgId: uuid,
    audioS3Key: 'recordings/org1/rec1/audio.webm',
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
    jobId: uuid, recordingId: uuid, orgId: uuid,
    sourceType: 'audio' as const, contentRef: 'transcripts/rec1.txt',
  }
  it('parses audio source type', () => {
    expect(SummarizationJobMessageSchema.parse(valid)).toMatchObject({ sourceType: 'audio' })
  })
  it('parses text source type', () => {
    expect(SummarizationJobMessageSchema.parse({ ...valid, sourceType: 'text' })).toMatchObject({ sourceType: 'text' })
  })
  it('rejects empty contentRef', () => {
    expect(() => SummarizationJobMessageSchema.parse({ ...valid, contentRef: '' })).toThrow()
  })
})

describe('WsStatusMessageSchema', () => {
  const valid = {
    type: 'job_status' as const,
    jobId: uuid, recordingId: uuid,
    status: 'transcribing' as const, updatedAt: now,
  }
  it('parses valid status message', () => {
    expect(WsStatusMessageSchema.parse(valid)).toMatchObject({ type: 'job_status', status: 'transcribing' })
  })
  it('rejects wrong type literal', () => {
    expect(() => WsStatusMessageSchema.parse({ ...valid, type: 'status_update' })).toThrow()
  })
  it('rejects invalid status', () => {
    expect(() => WsStatusMessageSchema.parse({ ...valid, status: 'unknown' })).toThrow()
  })
})
