export type SiteExplorationStatus =
  | 'draft'
  | 'completed'
  | 'signed'
  | 'under-construction'
  | 'operating'

export type SiteExplorationStatusConfig = {
  value: SiteExplorationStatus
  label: string
  color: string
  foregroundColor: string
  iconForegroundColor: string
  iconPath: string
  mapLayerOrder: number
}

export const siteExplorationStatusConfig = [
  {
    value: 'draft',
    label: '草稿',
    color: '#B5B5B5',
    foregroundColor: '#FFFFFF',
    iconForegroundColor: '#111827',
    iconPath: '/map/zhandian-daikantan.png',
    mapLayerOrder: 1,
  },
  {
    value: 'completed',
    label: '已勘探',
    color: '#1956E8',
    foregroundColor: '#FFFFFF',
    iconForegroundColor: '#111827',
    iconPath: '/map/xingxing-yikantan.png',
    mapLayerOrder: 2,
  },
  {
    value: 'signed',
    label: '签约完成',
    color: '#F97316',
    foregroundColor: '#FFFFFF',
    iconForegroundColor: '#111827',
    iconPath: '/map/xingxing-qianyue.png',
    mapLayerOrder: 3,
  },
  {
    value: 'under-construction',
    label: '建设中',
    color: '#0EA5E9',
    foregroundColor: '#FFFFFF',
    iconForegroundColor: '#111827',
    iconPath: '/map/xingxing-jianshe.png',
    mapLayerOrder: 4,
  },
  {
    value: 'operating',
    label: '运营中',
    color: '#059669',
    foregroundColor: '#FFFFFF',
    iconForegroundColor: '#111827',
    iconPath: '/map/xingxing-yunying.png',
    mapLayerOrder: 5,
  },
] as const satisfies readonly SiteExplorationStatusConfig[]

export const siteExplorationStatusOptions = siteExplorationStatusConfig.map(({ value, label }) => ({
  value,
  label,
}))

export const siteExplorationStatuses: readonly SiteExplorationStatus[] = (
  siteExplorationStatusConfig.map(({ value }) => value)
)

const configByStatus = new Map(
  siteExplorationStatusConfig.map((config) => [config.value, config]),
)

export function getSiteExplorationStatusConfig(
  status: SiteExplorationStatus,
): SiteExplorationStatusConfig {
  const config = configByStatus.get(status)
  if (!config) throw new Error(`Unknown site exploration status: ${status}`)
  return config
}

export function getSiteExplorationStatusLabel(status: SiteExplorationStatus): string {
  return getSiteExplorationStatusConfig(status).label
}

export function getSiteExplorationStatusIconName(status: SiteExplorationStatus): string {
  return `site-selection-exploration-status-${status}`
}
