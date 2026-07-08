import { z } from 'zod'

// Static, code-defined permission catalog (D-102). What's dynamic per org is which permissions a
// role grants, not the catalog itself — a new permission requires a package version bump, not an
// org-level config change. Enforcement is resource-type granularity only, never per-record ACLs;
// "own content only" (sources:read-own) stays a narrow ownership filter inside the handler, same
// shape as today's pre-RBAC Member restriction.
export const PERMISSIONS = [
  'sources:read',
  'sources:read-own',
  'sources:create',
  'sources:update',
  'sources:delete',
  'sources:enqueue-job',
  'org:manage-roles',
  'audit:read',
] as const
export const PermissionSchema = z.enum(PERMISSIONS)
export type Permission = z.infer<typeof PermissionSchema>

// The two non-deletable system roles seeded into every org at first-login provisioning
// (`DEFAULT_ORG_RBAC_SEED` below) — the direct migration path from D-017's fixed Admin/Member
// model. Fully editable after creation; orgs may also define unlimited custom roles.
export const SYSTEM_ROLES = ['admin', 'member'] as const
export type SystemRoleName = (typeof SYSTEM_ROLES)[number]

// Seed *definitions* only — no roleId, since roles are per-org rows (`pk=ORG#<orgId>`) and the
// provisioning code (auth-provision.ts, Phase 3) generates a fresh UUID per org at write time.
// `member`'s permission set is today's Member scope carried forward unchanged (D-102): full CRUD
// + enqueue on their own sources, no org-wide visibility, no role/audit management.
export const DEFAULT_ORG_RBAC_SEED: Record<
  SystemRoleName,
  { permissions: readonly Permission[]; isSystemRole: true }
> = {
  admin: { permissions: PERMISSIONS, isSystemRole: true },
  member: {
    permissions: [
      'sources:read-own',
      'sources:create',
      'sources:update',
      'sources:delete',
      'sources:enqueue-job',
    ],
    isSystemRole: true,
  },
}

export const RoleSchema = z.object({
  orgId: z.string().uuid(),
  roleId: z.string().uuid(),
  name: z.string().min(1).max(100),
  permissions: z.array(PermissionSchema),
  isSystemRole: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type Role = z.infer<typeof RoleSchema>

// No default groups seeded (pure org-admin convenience, starts empty).
export const GroupSchema = z.object({
  orgId: z.string().uuid(),
  groupId: z.string().uuid(),
  name: z.string().min(1).max(100),
  roleIds: z.array(z.string().uuid()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type Group = z.infer<typeof GroupSchema>

// A user's effective permissions = union of every role reached via a direct assignment or via
// group membership (no deny rules). One row per assignment; `heediq-role-assignments`
// (`pk=ORG#<orgId>#USER#<userId>`) stores both variants distinguished by `sk` prefix (`ROLE#`/`GROUP#`).
export const RoleAssignmentSchema = z.discriminatedUnion('assignmentType', [
  z.object({
    assignmentType: z.literal('role'),
    userId: z.string(),
    roleId: z.string().uuid(),
    createdAt: z.string().datetime(),
  }),
  z.object({
    assignmentType: z.literal('group'),
    userId: z.string(),
    groupId: z.string().uuid(),
    createdAt: z.string().datetime(),
  }),
])
export type RoleAssignment = z.infer<typeof RoleAssignmentSchema>
