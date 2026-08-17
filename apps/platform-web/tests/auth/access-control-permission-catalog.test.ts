import { describe, expect, test } from 'bun:test'

import { parsePermissionCatalog } from '../../src/features/access-control/permission-catalog'

const groups = [
  ['users', '用户管理', ['merchants.view', 'merchants.manage', 'customers.view', 'customers.manage', 'members.view', 'members.manage']],
  ['operations', '运营管理', ['stations.view', 'stations.manage', 'campaigns.manage', 'feedback.manage']],
  ['maintenance', '运维管理', ['monitoring.view', 'maintenance.manage']],
  ['finance', '财务管理', ['finance.view', 'finance.manage']],
  ['system', '系统设置', ['platform-users.manage', 'roles.manage']],
  ['site-planning', '建站选址', [
    'site-planning.exploration.use',
    'site-planning.exploration.manage',
  ]],
  ['agents', '智能体工作台', [
    'agents.inspection.use',
    'agents.user-operations.use',
    'agents.site-selection.use',
    'agents.rate-strategy.use',
    'agents.business-analysis.use',
    'agents.campaign-operations.use',
    'agents.refund-analysis.use',
  ]],
] as const

function catalog() {
  return {
    groups: groups.map(([id, label, codes]) => ({
      id,
      label,
      permissions: codes.map((code) => ({ code, label: `权限 ${code}`, description: `允许 ${code}` })),
    })),
  }
}

describe('access control permission catalog', () => {
  test('accepts the two-level exploration group independently from agent permissions', () => {
    const parsed = parsePermissionCatalog(catalog())

    expect(parsed.find((group) => group.id === 'site-planning')?.permissions.map((permission) => permission.code)).toEqual(groups[5][2])
  })

  test('rejects a missing or unknown agent permission', () => {
    const missing = catalog()
    missing.groups[6]!.permissions.pop()
    expect(() => parsePermissionCatalog(missing)).toThrow()

    const unknown = catalog()
    unknown.groups[6]!.permissions[0]!.code = 'agents.unknown.use'
    expect(() => parsePermissionCatalog(unknown)).toThrow()
  })
})
