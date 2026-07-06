import { describe, it, expect } from 'vitest'
import {
  CreateSourceRequestSchema,
  UpdateSourceRequestSchema,
  EnqueueJobRequestSchema,
  PresignUploadRequestSchema,
  LookupEmailRequestSchema,
  LookupEmailResponseSchema,
  LinkVerifyOtpRequestSchema,
  LinkConfirmRequestSchema,
  LinkAddProviderRequestSchema,
  AuthMethodSchema,
  ListAuthMethodsResponseSchema,
} from '../requests.js'

const uuid = '00000000-0000-0000-0000-000000000001'

describe('CreateSourceRequestSchema', () => {
  it('accepts valid request', () => {
    expect(CreateSourceRequestSchema.parse({ title: 'Sprint planning' })).toMatchObject({ title: 'Sprint planning' })
  })
  it('rejects empty title', () => {
    expect(() => CreateSourceRequestSchema.parse({ title: '' })).toThrow()
  })
  it('rejects title over 255 chars', () => {
    expect(() => CreateSourceRequestSchema.parse({ title: 'a'.repeat(256) })).toThrow()
  })
})

describe('UpdateSourceRequestSchema', () => {
  it('accepts partial update', () => {
    expect(UpdateSourceRequestSchema.parse({ title: 'New title' })).toMatchObject({ title: 'New title' })
  })
  it('rejects empty object', () => {
    expect(() => UpdateSourceRequestSchema.parse({})).toThrow()
  })
})

describe('EnqueueJobRequestSchema', () => {
  it('accepts small model for free tier', () => {
    expect(EnqueueJobRequestSchema.parse({ sourceId: uuid, model: 'small' })).toMatchObject({ model: 'small' })
  })
  it('accepts large-v3', () => {
    expect(EnqueueJobRequestSchema.parse({ sourceId: uuid, model: 'large-v3' })).toMatchObject({ model: 'large-v3' })
  })
  it('rejects invalid model', () => {
    expect(() => EnqueueJobRequestSchema.parse({ sourceId: uuid, model: 'medium' })).toThrow()
  })
  it('rejects non-uuid sourceId', () => {
    expect(() => EnqueueJobRequestSchema.parse({ sourceId: 'not-a-uuid', model: 'small' })).toThrow()
  })
})

describe('PresignUploadRequestSchema', () => {
  it('accepts valid audio content types', () => {
    for (const ct of ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg']) {
      expect(PresignUploadRequestSchema.parse({ sourceId: uuid, contentType: ct, fileSizeBytes: 1000 }))
        .toMatchObject({ contentType: ct })
    }
  })
  it('rejects video content type', () => {
    expect(() => PresignUploadRequestSchema.parse({ sourceId: uuid, contentType: 'video/mp4', fileSizeBytes: 1000 })).toThrow()
  })
  it('rejects files over 2 GB', () => {
    expect(() => PresignUploadRequestSchema.parse({ sourceId: uuid, contentType: 'audio/webm', fileSizeBytes: 2 * 1024 * 1024 * 1024 + 1 })).toThrow()
  })
})

describe('LookupEmailRequestSchema / LookupEmailResponseSchema (D-078)', () => {
  it('rejects non-email input', () => {
    expect(() => LookupEmailRequestSchema.parse({ email: 'not-an-email' })).toThrow()
  })
  it('response allows passwordSet: null for a non-existent email', () => {
    expect(LookupEmailResponseSchema.parse({ exists: false, passwordSet: null })).toMatchObject({ exists: false })
  })
})

describe('LinkVerifyOtpRequestSchema (D-089)', () => {
  it('rejects an empty code', () => {
    expect(() => LinkVerifyOtpRequestSchema.parse({ email: 'a@b.com', code: '' })).toThrow()
  })
  it('accepts a valid verify-otp request', () => {
    expect(LinkVerifyOtpRequestSchema.parse({ email: 'a@b.com', code: '123456' }))
      .toMatchObject({ email: 'a@b.com', code: '123456' })
  })
})

describe('LinkConfirmRequestSchema (D-078, D-089)', () => {
  it('rejects a password under 8 chars', () => {
    expect(() => LinkConfirmRequestSchema.parse({ email: 'a@b.com', newPassword: 'short' })).toThrow()
  })
  it('accepts a valid confirm request', () => {
    expect(LinkConfirmRequestSchema.parse({ email: 'a@b.com', newPassword: 'longenough1' }))
      .toMatchObject({ email: 'a@b.com' })
  })
})

describe('LinkAddProviderRequestSchema (D-079)', () => {
  it('rejects an unsupported provider', () => {
    expect(() => LinkAddProviderRequestSchema.parse({ provider: 'Facebook', providerUserId: 'x' })).toThrow()
  })
  it('accepts Google/Microsoft', () => {
    expect(LinkAddProviderRequestSchema.parse({ provider: 'Google', providerUserId: 'g-1' }))
      .toMatchObject({ provider: 'Google' })
  })
})

describe('AuthMethodSchema / ListAuthMethodsResponseSchema (D-091)', () => {
  it('rejects an unsupported provider', () => {
    expect(() => AuthMethodSchema.parse({ provider: 'Facebook', linkedAt: '2026-07-04T00:00:00.000Z' })).toThrow()
  })
  it('rejects a non-ISO linkedAt', () => {
    expect(() => AuthMethodSchema.parse({ provider: 'COGNITO', linkedAt: 'not-a-date' })).toThrow()
  })
  it('accepts a valid method', () => {
    expect(AuthMethodSchema.parse({ provider: 'COGNITO', linkedAt: '2026-07-04T00:00:00.000Z' }))
      .toMatchObject({ provider: 'COGNITO' })
  })
  it('accepts an empty methods list', () => {
    expect(ListAuthMethodsResponseSchema.parse({ methods: [] })).toMatchObject({ methods: [] })
  })
  it('accepts a populated methods list', () => {
    expect(
      ListAuthMethodsResponseSchema.parse({
        methods: [{ provider: 'Google', linkedAt: '2026-07-04T00:00:00.000Z' }],
      }),
    ).toMatchObject({ methods: [{ provider: 'Google' }] })
  })
})
