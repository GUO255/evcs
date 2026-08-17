import type { PlatformPath } from '@/features/product-shell/platform-modules'

export const PLATFORM_PERMISSION_CODES = [
  'merchants.view', 'merchants.manage',
  'customers.view', 'customers.manage',
  'members.view', 'members.manage',
  'stations.view', 'stations.manage',
  'campaigns.manage', 'feedback.manage',
  'monitoring.view', 'maintenance.manage',
  'finance.view', 'finance.manage',
  'platform-users.manage', 'roles.manage',
  'site-planning.exploration.use', 'site-planning.exploration.manage',
  'agents.inspection.use', 'agents.user-operations.use',
  'agents.site-selection.use', 'agents.rate-strategy.use',
  'agents.business-analysis.use', 'agents.campaign-operations.use',
  'agents.refund-analysis.use',
] as const

export type PlatformPermission = (typeof PLATFORM_PERMISSION_CODES)[number]

const platformPermissionCodes: ReadonlySet<string> = new Set(PLATFORM_PERMISSION_CODES)

export function isPlatformPermission(value: string): value is PlatformPermission {
  return platformPermissionCodes.has(value)
}

interface PlatformRoutePermission {
  readonly path: PlatformPermissionPath
  readonly anyOf: readonly PlatformPermission[]
}

type AccessControlRoutePath =
  | '/access-control/platform-users'
  | '/access-control/roles'

type PlatformPermissionPath = PlatformPath | AccessControlRoutePath

const platformRoutePermissions = [
  { path: '/contracted-merchants', anyOf: ['merchants.view', 'merchants.manage'] },
  { path: '/fleet-customers', anyOf: ['customers.view', 'customers.manage'] },
  { path: '/users', anyOf: ['members.view', 'members.manage'] },
  { path: '/site-exploration', anyOf: ['site-planning.exploration.use', 'site-planning.exploration.manage'] },
  { path: '/exploration-teams', anyOf: ['site-planning.exploration.manage'] },
  { path: '/site-inventory', anyOf: ['site-planning.exploration.use', 'site-planning.exploration.manage'] },
  { path: '/site-selection-map', anyOf: ['site-planning.exploration.use', 'site-planning.exploration.manage'] },
  { path: '/stations', anyOf: ['stations.view', 'stations.manage'] },
  { path: '/campaigns', anyOf: ['campaigns.manage'] },
  { path: '/membership-config', anyOf: ['members.manage'] },
  { path: '/stored-value-config', anyOf: ['campaigns.manage'] },
  { path: '/points-center', anyOf: ['members.manage'] },
  { path: '/mall', anyOf: ['campaigns.manage'] },
  { path: '/feedback', anyOf: ['feedback.manage'] },
  { path: '/video-monitoring', anyOf: ['monitoring.view'] },
  { path: '/device-operations', anyOf: ['maintenance.manage'] },
  { path: '/rates', anyOf: ['finance.manage'] },
  { path: '/orders', anyOf: ['finance.view'] },
  { path: '/mall-orders', anyOf: ['finance.view'] },
  { path: '/points-orders', anyOf: ['finance.view'] },
  { path: '/membership-orders', anyOf: ['finance.view'] },
  { path: '/refunds', anyOf: ['finance.manage'] },
  { path: '/stored-value', anyOf: ['finance.view'] },
  { path: '/invoices', anyOf: ['finance.view'] },
  { path: '/merchant-settlements', anyOf: ['finance.view', 'finance.manage'] },
  { path: '/interconnection', anyOf: ['stations.manage'] },
  { path: '/access-control/platform-users', anyOf: ['platform-users.manage'] },
  { path: '/access-control/roles', anyOf: ['roles.manage'] },
  { path: '/access-control', anyOf: ['platform-users.manage', 'roles.manage'] },
  // UI presentation only until the agent APIs enforce these permissions server-side.
  { path: '/agents', anyOf: [
    'agents.inspection.use',
    'agents.user-operations.use',
    'agents.site-selection.use',
    'agents.rate-strategy.use',
    'agents.business-analysis.use',
    'agents.campaign-operations.use',
  ] },
] as const satisfies readonly PlatformRoutePermission[]

function matchesRoute(pathname: string, routePath: PlatformPermissionPath): boolean {
  return pathname === routePath || pathname.startsWith(`${routePath}/`)
}

export function canAccessPlatformRoute(
  pathname: string,
  permissions: ReadonlySet<PlatformPermission>,
): boolean {
  if (pathname === '/' || pathname === '/personal-settings') return true
  const route = platformRoutePermissions.find((candidate) => matchesRoute(pathname, candidate.path))
  return route ? route.anyOf.some((permission) => permissions.has(permission)) : false
}
