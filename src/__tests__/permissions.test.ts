import { describe, it, expect } from 'vitest'
import {
  PERMISSIONS,
  PermissionSchema,
  SYSTEM_ROLES,
  DEFAULT_ORG_RBAC_SEED,
  RoleSchema,
  GroupSchema,
  RoleAssignmentSchema,
} from '../permissions.js'

const now = new Date().toISOString()
const uuid = '00000000-0000-0000-0000-000000000001'
const uuid2 = '00000000-0000-0000-0000-000000000002'

describe('PermissionSchema', () => {
  it('accepts every catalog value', () => {
    for (const p of PERMISSIONS) {
      expect(PermissionSchema.parse(p)).toBe(p)
    }
  })
  it('rejects an unknown permission string', () => {
    expect(() => PermissionSchema.parse('sources:archive')).toThrow()
  })
})

describe('SYSTEM_ROLES / DEFAULT_ORG_RBAC_SEED', () => {
  it('defines exactly admin and member', () => {
    expect(SYSTEM_ROLES).toEqual(['admin', 'member'])
  })
  it('admin gets every catalog permission', () => {
    expect(new Set(DEFAULT_ORG_RBAC_SEED.admin.permissions)).toEqual(new Set(PERMISSIONS))
  })
  it("member's permissions are a strict subset of admin's", () => {
    const adminSet = new Set(DEFAULT_ORG_RBAC_SEED.admin.permissions)
    for (const p of DEFAULT_ORG_RBAC_SEED.member.permissions) {
      expect(adminSet.has(p)).toBe(true)
    }
    expect(DEFAULT_ORG_RBAC_SEED.member.permissions.length).toBeLessThan(PERMISSIONS.length)
  })
  it('member has no org-management or audit permissions (D-102 migration scope)', () => {
    expect(DEFAULT_ORG_RBAC_SEED.member.permissions).not.toContain('org:manage-roles')
    expect(DEFAULT_ORG_RBAC_SEED.member.permissions).not.toContain('audit:read')
    expect(DEFAULT_ORG_RBAC_SEED.member.permissions).not.toContain('sources:read')
  })
  it('member manages own Contexts but cannot share them (D-141 gating)', () => {
    for (const p of ['context:read', 'context:create', 'context:update', 'context:delete'] as const) {
      expect(DEFAULT_ORG_RBAC_SEED.member.permissions).toContain(p)
    }
    expect(DEFAULT_ORG_RBAC_SEED.member.permissions).not.toContain('context:share')
  })
  it('both system roles are flagged isSystemRole', () => {
    expect(DEFAULT_ORG_RBAC_SEED.admin.isSystemRole).toBe(true)
    expect(DEFAULT_ORG_RBAC_SEED.member.isSystemRole).toBe(true)
  })
})

describe('RoleSchema', () => {
  const valid = {
    orgId: uuid, roleId: uuid2, name: 'Reviewer',
    permissions: ['sources:read-own'] as const, isSystemRole: false,
    createdAt: now, updatedAt: now,
  }
  it('parses a valid custom role', () => {
    expect(RoleSchema.parse(valid)).toMatchObject({ name: 'Reviewer', isSystemRole: false })
  })
  it('rejects an unknown permission in the array', () => {
    expect(() => RoleSchema.parse({ ...valid, permissions: ['sources:archive'] })).toThrow()
  })
  it('rejects an empty name', () => {
    expect(() => RoleSchema.parse({ ...valid, name: '' })).toThrow()
  })
})

describe('GroupSchema', () => {
  const valid = { orgId: uuid, groupId: uuid2, name: 'Engineering', roleIds: [uuid2], createdAt: now, updatedAt: now }
  it('parses a valid group', () => {
    expect(GroupSchema.parse(valid)).toMatchObject({ name: 'Engineering', roleIds: [uuid2] })
  })
  it('allows an empty roleIds array (freshly created group)', () => {
    expect(GroupSchema.parse({ ...valid, roleIds: [] }).roleIds).toEqual([])
  })
})

describe('RoleAssignmentSchema', () => {
  it('parses a direct role assignment', () => {
    const parsed = RoleAssignmentSchema.parse({
      assignmentType: 'role', userId: 'u1', roleId: uuid, createdAt: now,
    })
    expect(parsed).toMatchObject({ assignmentType: 'role', roleId: uuid })
  })
  it('parses a group-membership assignment', () => {
    const parsed = RoleAssignmentSchema.parse({
      assignmentType: 'group', userId: 'u1', groupId: uuid, createdAt: now,
    })
    expect(parsed).toMatchObject({ assignmentType: 'group', groupId: uuid })
  })
  it('rejects a role assignment carrying a groupId instead of roleId', () => {
    expect(() =>
      RoleAssignmentSchema.parse({ assignmentType: 'role', userId: 'u1', groupId: uuid, createdAt: now }),
    ).toThrow()
  })
  it('rejects an unknown assignmentType', () => {
    expect(() =>
      RoleAssignmentSchema.parse({ assignmentType: 'other', userId: 'u1', roleId: uuid, createdAt: now }),
    ).toThrow()
  })
})
