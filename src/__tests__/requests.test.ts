import { describe, it, expect } from 'vitest'
import {
  CreateRecordingRequestSchema,
  UpdateRecordingRequestSchema,
  EnqueueJobRequestSchema,
  PresignUploadRequestSchema,
} from '../requests.js'

const uuid = '00000000-0000-0000-0000-000000000001'

describe('CreateRecordingRequestSchema', () => {
  it('accepts valid request', () => {
    expect(CreateRecordingRequestSchema.parse({ title: 'Sprint planning' })).toMatchObject({ title: 'Sprint planning' })
  })
  it('rejects empty title', () => {
    expect(() => CreateRecordingRequestSchema.parse({ title: '' })).toThrow()
  })
  it('rejects title over 255 chars', () => {
    expect(() => CreateRecordingRequestSchema.parse({ title: 'a'.repeat(256) })).toThrow()
  })
})

describe('UpdateRecordingRequestSchema', () => {
  it('accepts partial update', () => {
    expect(UpdateRecordingRequestSchema.parse({ title: 'New title' })).toMatchObject({ title: 'New title' })
  })
  it('rejects empty object', () => {
    expect(() => UpdateRecordingRequestSchema.parse({})).toThrow()
  })
})

describe('EnqueueJobRequestSchema', () => {
  it('accepts small model for free tier', () => {
    expect(EnqueueJobRequestSchema.parse({ recordingId: uuid, model: 'small' })).toMatchObject({ model: 'small' })
  })
  it('accepts large-v3', () => {
    expect(EnqueueJobRequestSchema.parse({ recordingId: uuid, model: 'large-v3' })).toMatchObject({ model: 'large-v3' })
  })
  it('rejects invalid model', () => {
    expect(() => EnqueueJobRequestSchema.parse({ recordingId: uuid, model: 'medium' })).toThrow()
  })
  it('rejects non-uuid recordingId', () => {
    expect(() => EnqueueJobRequestSchema.parse({ recordingId: 'not-a-uuid', model: 'small' })).toThrow()
  })
})

describe('PresignUploadRequestSchema', () => {
  it('accepts valid audio content types', () => {
    for (const ct of ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg']) {
      expect(PresignUploadRequestSchema.parse({ recordingId: uuid, contentType: ct, fileSizeBytes: 1000 }))
        .toMatchObject({ contentType: ct })
    }
  })
  it('rejects video content type', () => {
    expect(() => PresignUploadRequestSchema.parse({ recordingId: uuid, contentType: 'video/mp4', fileSizeBytes: 1000 })).toThrow()
  })
  it('rejects files over 2 GB', () => {
    expect(() => PresignUploadRequestSchema.parse({ recordingId: uuid, contentType: 'audio/webm', fileSizeBytes: 2 * 1024 * 1024 * 1024 + 1 })).toThrow()
  })
})
