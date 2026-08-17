import { describe, expect, test } from 'bun:test'

import {
  canAccessPlatformRoute,
  type PlatformPermission,
} from '../../src/features/auth/platform-route-permissions'
import {
  getFirstPermittedPlatformPath,
  getPermittedPlatformManagementNavigation,
  getPlatformManagementNavigationIssue,
  platformManagementNavigation,
} from '../../src/features/product-shell/platform-management-navigation'

function permissions(...values: PlatformPermission[]): ReadonlySet<PlatformPermission> {
  return new Set(values)
}

describe('platform route permissions', () => {
  test('platform management navigation remains valid when modules are added', () => {
    expect(getPlatformManagementNavigationIssue(platformManagementNavigation)).toBeUndefined()
  })

  test('defaults to platform management when both platform management and agent workspace are accessible', () => {
    expect(getFirstPermittedPlatformPath(
      permissions('agents.inspection.use', 'merchants.view'),
    )).toBe('/contracted-merchants')
  })

  test('defaults to the agent workspace when no platform management page is accessible', () => {
    expect(getFirstPermittedPlatformPath(
      permissions('agents.inspection.use'),
    )).toBe('/agents')
  })

  test('platform-users.manage permits the access-control parent and platform users tab but not roles', () => {
    const granted = permissions('platform-users.manage')

    expect(canAccessPlatformRoute('/access-control', granted)).toBe(true)
    expect(canAccessPlatformRoute('/access-control/platform-users', granted)).toBe(true)
    expect(canAccessPlatformRoute('/access-control/roles', granted)).toBe(false)
  })

  test('roles.manage permits the access-control parent and roles tab but not platform users', () => {
    const granted = permissions('roles.manage')

    expect(canAccessPlatformRoute('/access-control', granted)).toBe(true)
    expect(canAccessPlatformRoute('/access-control/roles', granted)).toBe(true)
    expect(canAccessPlatformRoute('/access-control/platform-users', granted)).toBe(false)
  })

  test('removed top-level access-control tab paths are not permitted', () => {
    const granted = permissions('platform-users.manage', 'roles.manage')

    expect(canAccessPlatformRoute('/platform-users', granted)).toBe(false)
    expect(canAccessPlatformRoute('/roles', granted)).toBe(false)
  })

  test('only an agent permission permits the agent workspace route', () => {
    expect(canAccessPlatformRoute('/agents', permissions('agents.inspection.use'))).toBe(true)
    expect(canAccessPlatformRoute('/agents', permissions('maintenance.manage'))).toBe(false)
  })

  test('exploration management includes all exploration routes while exploration excludes team management', () => {
    const exploration = permissions('site-planning.exploration.use')
    const management = permissions('site-planning.exploration.manage')

    expect(getPermittedPlatformManagementNavigation(exploration).find((group) => group.label === '建站选址')?.items.map((item) => item.path)).toEqual([
      '/site-exploration', '/site-inventory', '/site-selection-map',
    ])
    expect(getPermittedPlatformManagementNavigation(management).find((group) => group.label === '建站选址')?.items.map((item) => item.path)).toEqual([
      '/site-exploration', '/site-inventory', '/site-selection-map', '/exploration-teams',
    ])
    expect(canAccessPlatformRoute('/exploration-teams', exploration)).toBe(false)
    expect(canAccessPlatformRoute('/exploration-teams/8', management)).toBe(true)
    expect(canAccessPlatformRoute('/agents', management)).toBe(false)
  })

  test('members.manage permits membership operations including points center', () => {
    const managePermissions = permissions('members.manage')
    const operations = getPermittedPlatformManagementNavigation(managePermissions)
      .find((group) => group.label === '运营管理')

    expect(canAccessPlatformRoute('/membership-config', managePermissions)).toBe(true)
    expect(canAccessPlatformRoute('/points-center', managePermissions)).toBe(true)
    expect(canAccessPlatformRoute('/points-center/example-product', managePermissions)).toBe(true)
    expect(operations?.items.map((item) => item.path)).toEqual([
      '/membership-config',
      '/points-center',
    ])
    expect(canAccessPlatformRoute('/membership-config', permissions('members.view'))).toBe(false)
    expect(canAccessPlatformRoute('/points-center', permissions('members.view'))).toBe(false)
    expect(canAccessPlatformRoute('/points-center', permissions('campaigns.manage'))).toBe(false)
  })

  test('campaigns.manage permits stored value configuration and mall', () => {
    const campaignsManagePermissions = permissions('campaigns.manage')
    const operations = getPermittedPlatformManagementNavigation(
      permissions('members.manage', 'campaigns.manage'),
    ).find((group) => group.label === '运营管理')

    expect(canAccessPlatformRoute('/mall', campaignsManagePermissions)).toBe(true)
    expect(canAccessPlatformRoute('/mall/example-product', campaignsManagePermissions)).toBe(true)
    expect(canAccessPlatformRoute('/stored-value-config', campaignsManagePermissions)).toBe(true)
    expect(canAccessPlatformRoute('/mall', permissions('members.manage'))).toBe(false)
    expect(canAccessPlatformRoute('/stored-value-config', permissions('members.manage'))).toBe(false)
    expect(operations?.items.map((item) => item.path)).toEqual([
      '/campaigns',
      '/membership-config',
      '/stored-value-config',
      '/points-center',
      '/mall',
    ])
  })

  test('finance.view permits every read-only finance order route', () => {
    const financeViewPermissions = permissions('finance.view')
    const finance = getPermittedPlatformManagementNavigation(financeViewPermissions)
      .find((group) => group.label === '财务管理')

    expect(canAccessPlatformRoute('/orders', financeViewPermissions)).toBe(true)
    expect(canAccessPlatformRoute('/mall-orders', financeViewPermissions)).toBe(true)
    expect(canAccessPlatformRoute('/mall-orders/example-order', financeViewPermissions)).toBe(true)
    expect(canAccessPlatformRoute('/points-orders', financeViewPermissions)).toBe(true)
    expect(canAccessPlatformRoute('/points-orders/example-order', financeViewPermissions)).toBe(true)
    expect(canAccessPlatformRoute('/membership-orders', financeViewPermissions)).toBe(true)
    expect(canAccessPlatformRoute('/membership-orders/example-order', financeViewPermissions)).toBe(true)
    expect(finance?.items.map((item) => item.path)).toEqual([
      '/orders',
      '/mall-orders',
      '/points-orders',
      '/membership-orders',
      '/stored-value',
      '/invoices',
      '/merchant-settlements',
    ])
  })

  test('system settings navigation contains one access-control entry', () => {
    const navigation = getPermittedPlatformManagementNavigation(
      permissions('platform-users.manage', 'roles.manage'),
    )
    const systemSettings = navigation.find((group) => group.label === '系统设置')

    expect(systemSettings?.items.map((item) => item.path)).toEqual([
      '/access-control',
    ])
  })

  test('system settings navigation keeps access control when either tab is permitted', () => {
    const platformUsersNavigation = getPermittedPlatformManagementNavigation(
      permissions('platform-users.manage'),
    )
    const rolesNavigation = getPermittedPlatformManagementNavigation(
      permissions('roles.manage'),
    )

    expect(platformUsersNavigation.find((group) => group.label === '系统设置')?.items[0]?.path).toBe('/access-control')
    expect(rolesNavigation.find((group) => group.label === '系统设置')?.items[0]?.path).toBe('/access-control')
  })
})
