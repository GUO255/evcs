import type { PlatformPermission } from '@/features/auth/platform-route-permissions'

export type AccessControlTab = 'platform-users' | 'roles'

export function resolveAccessControlTab(
  pathname: string,
  permissions: ReadonlySet<PlatformPermission>,
): AccessControlTab {
  if (
    pathname === '/access-control/platform-users'
    && permissions.has('platform-users.manage')
  ) {
    return 'platform-users'
  }
  if (pathname === '/access-control/roles' && permissions.has('roles.manage')) {
    return 'roles'
  }
  if (pathname === '/access-control' || pathname === '/access-control/') {
    if (permissions.has('platform-users.manage')) return 'platform-users'
    if (permissions.has('roles.manage')) return 'roles'
  }
  if (!pathname.startsWith('/access-control/')) {
    if (permissions.has('platform-users.manage')) return 'platform-users'
    if (permissions.has('roles.manage')) return 'roles'
  }
  throw new Error('access_control_tab_route_invariant')
}
