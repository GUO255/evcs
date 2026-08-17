import { describe, expect, test } from 'bun:test'

import type { PlatformPermission } from '../../src/features/auth/platform-route-permissions'
import { resolveAccessControlTab } from '../../src/features/access-control/access-control-route'

function permissions(...values: PlatformPermission[]): ReadonlySet<PlatformPermission> {
  return new Set(values)
}

describe('access control tab routing', () => {
  test('keeps the parent route controlled while its index redirects', () => {
    expect(resolveAccessControlTab(
      '/access-control',
      permissions('platform-users.manage', 'roles.manage'),
    )).toBe('platform-users')
    expect(resolveAccessControlTab(
      '/access-control/',
      permissions('roles.manage'),
    )).toBe('roles')
  })

  test('resolves an accessible child route to its tab', () => {
    expect(resolveAccessControlTab(
      '/access-control/roles',
      permissions('roles.manage'),
    )).toBe('roles')
  })

  test('keeps a controlled value while the parent route unmounts', () => {
    expect(resolveAccessControlTab(
      '/stations',
      permissions('platform-users.manage', 'roles.manage'),
    )).toBe('platform-users')
    expect(resolveAccessControlTab(
      '/stations',
      permissions('roles.manage'),
    )).toBe('roles')
  })

  test('rejects routes that do not match an accessible tab', () => {
    expect(() => resolveAccessControlTab(
      '/access-control/roles',
      permissions('platform-users.manage'),
    )).toThrow('access_control_tab_route_invariant')
    expect(() => resolveAccessControlTab(
      '/access-control',
      permissions('finance.view'),
    )).toThrow('access_control_tab_route_invariant')
  })
})
