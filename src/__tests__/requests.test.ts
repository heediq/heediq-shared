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
  CreateRoleRequestSchema,
  UpdateRoleRequestSchema,
  CreateGroupRequestSchema,
  UpdateGroupRequestSchema,
  CreateRoleAssignmentRequestSchema,
  CreateContextRequestSchema,
  UpdateContextRequestSchema,
  ReviewApprovalRequestSchema,
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

describe('CreateRoleRequestSchema (D-102 Phase 2)', () => {
  it('accepts a valid request', () => {
    expect(CreateRoleRequestSchema.parse({ name: 'Reviewer', permissions: ['sources:read'] }))
      .toMatchObject({ name: 'Reviewer', permissions: ['sources:read'] })
  })
  it('accepts an empty permissions array', () => {
    expect(CreateRoleRequestSchema.parse({ name: 'No-op role', permissions: [] }))
      .toMatchObject({ permissions: [] })
  })
  it('rejects an empty name', () => {
    expect(() => CreateRoleRequestSchema.parse({ name: '', permissions: [] })).toThrow()
  })
  it('rejects an unknown permission', () => {
    expect(() => CreateRoleRequestSchema.parse({ name: 'Reviewer', permissions: ['sources:fly'] })).toThrow()
  })
})

describe('UpdateRoleRequestSchema (D-102 Phase 2)', () => {
  it('accepts a partial update (name only)', () => {
    expect(UpdateRoleRequestSchema.parse({ name: 'Renamed' })).toMatchObject({ name: 'Renamed' })
  })
  it('accepts a partial update (permissions only)', () => {
    expect(UpdateRoleRequestSchema.parse({ permissions: ['audit:read'] }))
      .toMatchObject({ permissions: ['audit:read'] })
  })
  it('rejects an empty object', () => {
    expect(() => UpdateRoleRequestSchema.parse({})).toThrow()
  })
})

describe('CreateGroupRequestSchema (D-102 Phase 2)', () => {
  it('accepts a valid request', () => {
    expect(CreateGroupRequestSchema.parse({ name: 'Engineering', roleIds: [uuid] }))
      .toMatchObject({ name: 'Engineering', roleIds: [uuid] })
  })
  it('accepts an empty roleIds array', () => {
    expect(CreateGroupRequestSchema.parse({ name: 'Empty group', roleIds: [] }))
      .toMatchObject({ roleIds: [] })
  })
  it('rejects a non-uuid roleId', () => {
    expect(() => CreateGroupRequestSchema.parse({ name: 'Engineering', roleIds: ['not-a-uuid'] })).toThrow()
  })
})

describe('UpdateGroupRequestSchema (D-102 Phase 2)', () => {
  it('accepts a partial update (name only)', () => {
    expect(UpdateGroupRequestSchema.parse({ name: 'Renamed' })).toMatchObject({ name: 'Renamed' })
  })
  it('accepts a partial update (roleIds only)', () => {
    expect(UpdateGroupRequestSchema.parse({ roleIds: [uuid] })).toMatchObject({ roleIds: [uuid] })
  })
  it('rejects an empty object', () => {
    expect(() => UpdateGroupRequestSchema.parse({})).toThrow()
  })
})

describe('CreateRoleAssignmentRequestSchema (D-102 Phase 2)', () => {
  it('accepts a role assignment', () => {
    expect(CreateRoleAssignmentRequestSchema.parse({ assignmentType: 'role', roleId: uuid }))
      .toMatchObject({ assignmentType: 'role', roleId: uuid })
  })
  it('accepts a group assignment', () => {
    expect(CreateRoleAssignmentRequestSchema.parse({ assignmentType: 'group', groupId: uuid }))
      .toMatchObject({ assignmentType: 'group', groupId: uuid })
  })
  it('rejects a role assignment missing roleId', () => {
    expect(() => CreateRoleAssignmentRequestSchema.parse({ assignmentType: 'role' })).toThrow()
  })
  it('rejects an unknown assignmentType', () => {
    expect(() => CreateRoleAssignmentRequestSchema.parse({ assignmentType: 'user', userId: uuid })).toThrow()
  })
  it('rejects mismatched discriminant fields (role type carrying groupId)', () => {
    expect(() => CreateRoleAssignmentRequestSchema.parse({ assignmentType: 'role', groupId: uuid })).toThrow()
  })
})

describe('CreateContextRequestSchema (D-124-D-142, step 4b)', () => {
  it('accepts a minimal personal Context (visibility/groupId omitted)', () => {
    expect(CreateContextRequestSchema.parse({ name: 'Sprint 12', domain: 'work' }))
      .toMatchObject({ name: 'Sprint 12', domain: 'work' })
  })
  it('accepts a group Context with groupId', () => {
    expect(CreateContextRequestSchema.parse({ name: 'Team roadmap', domain: 'work', visibility: 'group', groupId: uuid }))
      .toMatchObject({ visibility: 'group', groupId: uuid })
  })
  it('rejects visibility=group without groupId', () => {
    expect(() => CreateContextRequestSchema.parse({ name: 'x', domain: 'work', visibility: 'group' })).toThrow()
  })
  it('rejects groupId without visibility=group', () => {
    expect(() => CreateContextRequestSchema.parse({ name: 'x', domain: 'work', groupId: uuid })).toThrow()
  })
  it('rejects an invalid domain', () => {
    expect(() => CreateContextRequestSchema.parse({ name: 'x', domain: 'invalid' })).toThrow()
  })
})

describe('UpdateContextRequestSchema (D-124-D-142, step 4b)', () => {
  it('accepts a partial update (name only)', () => {
    expect(UpdateContextRequestSchema.parse({ name: 'Renamed' })).toMatchObject({ name: 'Renamed' })
  })
  it('rejects an empty object', () => {
    expect(() => UpdateContextRequestSchema.parse({})).toThrow()
  })
})

describe('ReviewApprovalRequestSchema (D-137 wizard steps 1-2)', () => {
  it('accepts a contextId with kept item ids', () => {
    expect(ReviewApprovalRequestSchema.parse({ contextId: uuid, kept: [uuid] }))
      .toMatchObject({ contextId: uuid, kept: [uuid] })
  })
  it('defaults kept to an empty array', () => {
    expect(ReviewApprovalRequestSchema.parse({ contextId: uuid })).toMatchObject({ kept: [] })
  })
  it('rejects a non-uuid contextId', () => {
    expect(() => ReviewApprovalRequestSchema.parse({ contextId: 'not-a-uuid' })).toThrow()
  })
  it('rejects a non-uuid item id in kept', () => {
    expect(() => ReviewApprovalRequestSchema.parse({ contextId: uuid, kept: ['not-a-uuid'] })).toThrow()
  })
})
