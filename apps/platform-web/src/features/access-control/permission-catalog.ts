import {
  PLATFORM_PERMISSION_CODES,
  isPlatformPermission,
  type PlatformPermission,
} from '@/features/auth/platform-route-permissions'

import type { PermissionGroup } from './access-control-data'

const expectedPermissionGroups: ReadonlyMap<string, ReadonlySet<PlatformPermission>> = new Map([
  ['users', new Set<PlatformPermission>(['merchants.view', 'merchants.manage', 'customers.view', 'customers.manage', 'members.view', 'members.manage'])],
  ['operations', new Set<PlatformPermission>(['stations.view', 'stations.manage', 'campaigns.manage', 'feedback.manage'])],
  ['maintenance', new Set<PlatformPermission>(['monitoring.view', 'maintenance.manage'])],
  ['finance', new Set<PlatformPermission>(['finance.view', 'finance.manage'])],
  ['system', new Set<PlatformPermission>(['platform-users.manage', 'roles.manage'])],
  ['site-planning', new Set<PlatformPermission>([
    'site-planning.exploration.use',
    'site-planning.exploration.manage',
  ])],
  ['agents', new Set<PlatformPermission>([
    'agents.inspection.use',
    'agents.user-operations.use',
    'agents.site-selection.use',
    'agents.rate-strategy.use',
    'agents.business-analysis.use',
    'agents.campaign-operations.use',
    'agents.refund-analysis.use',
  ])],
])

function malformed(): never {
  throw new Error('malformed_permission_catalog')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

function nonEmptyTrimmedString(value: unknown): string {
  if (typeof value !== 'string' || !value || value !== value.trim()) return malformed()
  return value
}

export function parsePermissionCatalog(value: unknown): PermissionGroup[] {
  if (!isRecord(value) || !hasExactKeys(value, ['groups']) || !Array.isArray(value.groups)) return malformed()
  const codes = new Set<PlatformPermission>()
  const groupIds = new Set<string>()
  const groups = value.groups.map((group) => {
    if (!isRecord(group) || !hasExactKeys(group, ['id', 'label', 'permissions']) || !Array.isArray(group.permissions)) return malformed()
    const id = nonEmptyTrimmedString(group.id)
    const label = nonEmptyTrimmedString(group.label)
    const expectedCodes = expectedPermissionGroups.get(id)
    if (!expectedCodes || groupIds.has(id)) return malformed()
    groupIds.add(id)
    return {
      id,
      label,
      permissions: group.permissions.map((permission) => {
        if (!isRecord(permission) || !hasExactKeys(permission, ['code', 'label', 'description'])) return malformed()
        const code = nonEmptyTrimmedString(permission.code)
        const permissionLabel = nonEmptyTrimmedString(permission.label)
        const description = nonEmptyTrimmedString(permission.description)
        if (!isPlatformPermission(code) || codes.has(code) || !expectedCodes.has(code)) return malformed()
        codes.add(code)
        return { code, label: permissionLabel, description }
      }),
    }
  })
  if (groups.length !== expectedPermissionGroups.size
    || codes.size !== PLATFORM_PERMISSION_CODES.length
    || !PLATFORM_PERMISSION_CODES.every((code) => codes.has(code))
    || groups.some((group) => group.permissions.length !== expectedPermissionGroups.get(group.id)?.size)) return malformed()
  return groups
}
