import { BotIcon, LayoutGridIcon, type LucideIcon } from '@/components/ui/icons'

import { canAccessPlatformRoute, type PlatformPermission } from '@/features/auth/platform-route-permissions'

import {
  type PlatformPath,
  type PlatformModule,
  getPlatformModule,
  requirePlatformModule,
} from './platform-modules'

export type PlatformManagementPath = Extract<
  PlatformPath,
  | '/contracted-merchants'
  | '/fleet-customers'
  | '/users'
  | '/site-exploration'
  | '/exploration-teams'
  | '/site-inventory'
  | '/site-selection-map'
  | '/stations'
  | '/feedback'
  | '/campaigns'
  | '/membership-config'
  | '/stored-value-config'
  | '/points-center'
  | '/mall'
  | '/video-monitoring'
  | '/device-operations'
  | '/rates'
  | '/orders'
  | '/mall-orders'
  | '/points-orders'
  | '/membership-orders'
  | '/refunds'
  | '/stored-value'
  | '/invoices'
  | '/merchant-settlements'
  | '/access-control'
>

export interface PlatformManagementNavigationItem {
  readonly label: string
  readonly path: PlatformManagementPath
  readonly icon: LucideIcon
}

export interface PlatformManagementNavigationGroup {
  readonly label: string
  readonly items: readonly PlatformManagementNavigationItem[]
}

export interface PlatformGlobalNavigationItem {
  readonly label: string
  readonly path: PlatformPath
  readonly icon: LucideIcon
  readonly activeWhen: 'exact' | 'platform-management'
}

function navigationItem(
  path: PlatformManagementPath,
  label: string,
): PlatformManagementNavigationItem {
  const platformModule = requirePlatformModule(path)
  return { label, path, icon: platformModule.icon }
}

export const platformManagementNavigation = [
  {
    label: '用户管理',
    items: [
      navigationItem('/contracted-merchants', '签约商户管理'),
      navigationItem('/fleet-customers', '签约客户管理'),
      navigationItem('/users', '用户管理'),
    ],
  },
  {
    label: '建站选址',
    items: [
      navigationItem('/site-exploration', '勘探站点'),
      navigationItem('/site-inventory', '任务站点'),
      navigationItem('/site-selection-map', '选址地图'),
      navigationItem('/exploration-teams', '勘探小组'),
    ],
  },
  {
    label: '运营管理',
    items: [
      navigationItem('/stations', '充电站管理'),
      navigationItem('/campaigns', '活动运营'),
      navigationItem('/membership-config', '会员配置'),
      navigationItem('/stored-value-config', '储值配置'),
      navigationItem('/points-center', '积分中心配置'),
      navigationItem('/mall', '商城配置'),
      navigationItem('/rates', '费率管理'),
      navigationItem('/feedback', '问题反馈'),
    ],
  },
  {
    label: '运维管理',
    items: [
      navigationItem('/video-monitoring', '视频监控'),
      navigationItem('/device-operations', '设备运维'),
    ],
  },
  {
    label: '财务管理',
    items: [
      navigationItem('/orders', '充电订单'),
      navigationItem('/mall-orders', '商城购买订单'),
      navigationItem('/points-orders', '积分兑换订单'),
      navigationItem('/membership-orders', '会员开通订单'),
      navigationItem('/stored-value', '储值订单'),
      navigationItem('/refunds', '退款申请'),
      navigationItem('/invoices', '发票申请'),
      navigationItem('/merchant-settlements', '商户结算'),
    ],
  },
  {
    label: '系统设置',
    items: [
      navigationItem('/access-control', '平台权限'),
    ],
  },
] as const satisfies readonly PlatformManagementNavigationGroup[]

export function getPermittedPlatformManagementNavigation(
  permissions: ReadonlySet<PlatformPermission>,
): PlatformManagementNavigationGroup[] {
  return platformManagementNavigation.flatMap((group) => {
    const items = group.items.filter((item) => canAccessPlatformRoute(item.path, permissions))
    return items.length > 0 ? [{ label: group.label, items }] : []
  })
}

export function getFirstPermittedPlatformManagementPath(
  permissions: ReadonlySet<PlatformPermission>,
): PlatformManagementPath | undefined {
  return getPermittedPlatformManagementNavigation(permissions)[0]?.items[0]?.path
}

export function getPermittedPlatformGlobalNavigation(
  permissions: ReadonlySet<PlatformPermission>,
): PlatformGlobalNavigationItem[] {
  const managementPath = getFirstPermittedPlatformManagementPath(permissions)
  return [
    ...(canAccessPlatformRoute('/agents', permissions) ? [{ label: '智能体工作台', path: '/agents' as const, icon: BotIcon, activeWhen: 'exact' as const }] : []),
    ...(managementPath ? [{ label: '平台管理', path: managementPath, icon: LayoutGridIcon, activeWhen: 'platform-management' as const }] : []),
  ]
}

export function getFirstPermittedPlatformPath(
  permissions: ReadonlySet<PlatformPermission>,
): PlatformPath | undefined {
  return getFirstPermittedPlatformManagementPath(permissions)
    ?? (canAccessPlatformRoute('/agents', permissions) ? '/agents' : undefined)
}

const platformManagementPaths = new Set(
  platformManagementNavigation.flatMap((group) =>
    group.items.map((item) => item.path),
  ),
)

export function isPlatformManagementPath(pathname: string): boolean {
  return Array.from(platformManagementPaths).some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )
}

export function getPlatformManagementModule(pathname: string): PlatformModule | undefined {
  if (!platformManagementPaths.has(pathname as PlatformManagementPath)) return undefined
  return getPlatformModule(pathname)
}

export function getPlatformManagementNavigationIssue(
  navigation: readonly PlatformManagementNavigationGroup[],
): string | undefined {
  if (navigation.length === 0) {
    return 'Platform management navigation must contain at least one group.'
  }

  const groupLabels = navigation.map((group) => group.label)
  if (new Set(groupLabels).size !== groupLabels.length) {
    return 'Platform management navigation group labels must be unique.'
  }

  if (navigation.some((group) => group.items.length === 0)) {
    return 'Platform management navigation groups must not be empty.'
  }

  const paths = navigation.flatMap((group) => group.items.map((item) => item.path))
  if (new Set(paths).size !== paths.length) {
    return 'Platform management navigation paths must be unique.'
  }

  return undefined
}

if (import.meta.env.DEV) {
  const navigationIssue = getPlatformManagementNavigationIssue(platformManagementNavigation)
  if (navigationIssue) throw new Error(navigationIssue)
}
