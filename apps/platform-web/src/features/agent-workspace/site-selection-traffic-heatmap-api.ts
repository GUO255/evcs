import { authenticatedFetch, siteSelectionGatewayBase } from '@/auth/browser-auth-client'

export const trafficHeatmapStartDate = '2026-01-15'
export const trafficHeatmapEndDate = '2026-01-21'

export type SiteSelectionTrafficHeatmap = {
  startDate: string
  endDate: string
  productVersion: number
  status: 'empty' | 'ready'
  tileUrl?: string
}

const path = '/api/intelligent-site-selection/traffic/heatmap/daily-average'

export async function getSiteSelectionTrafficHeatmap(): Promise<SiteSelectionTrafficHeatmap> {
  const query = new URLSearchParams({
    startDate: trafficHeatmapStartDate,
    endDate: trafficHeatmapEndDate,
  })
  const response = await authenticatedFetch(
    `${siteSelectionGatewayBase}${path}?${query.toString()}`,
  )
  if (!response.ok) throw new TrafficHeatmapApiError(response.status)
  return parseTrafficHeatmap(await response.json())
}

export function trafficHeatmapErrorMessage(error: unknown): string | null {
  if (error instanceof TypeError) return '网络连接失败，车流热力图加载失败。'
  return '车流热力图加载失败，请稍后重试。'
}

class TrafficHeatmapApiError extends Error {
  constructor(readonly status: number) {
    super('traffic_heatmap_request_failed')
    this.name = 'TrafficHeatmapApiError'
  }
}

function parseTrafficHeatmap(value: unknown): SiteSelectionTrafficHeatmap {
  if (!isRecord(value)) throw new Error('traffic_heatmap_malformed_response')
  const status = value.status
  const expectedKeys = status === 'ready'
    ? ['endDate', 'productVersion', 'startDate', 'status', 'tilePath']
    : ['endDate', 'productVersion', 'startDate', 'status']
  if (
    !exactKeys(value, expectedKeys)
    || value.startDate !== trafficHeatmapStartDate
    || value.endDate !== trafficHeatmapEndDate
    || !Number.isSafeInteger(value.productVersion)
    || Number(value.productVersion) < 1
    || (status !== 'ready' && status !== 'empty')
    || (status === 'ready' && !isTilePath(value.tilePath))
  ) throw new Error('traffic_heatmap_malformed_response')
  return {
    endDate: value.endDate as string,
    productVersion: value.productVersion as number,
    startDate: value.startDate as string,
    status,
    ...(status === 'ready' ? {
      tileUrl: `${siteSelectionGatewayBase}${value.tilePath as string}`,
    } : {}),
  }
}

function isTilePath(value: unknown): value is string {
  return typeof value === 'string'
    && /^\/api\/intelligent-site-selection\/traffic\/tiles\/daily-average\/\d{8}-\d{8}\/v[1-9]\d*\/\{z\}\/\{x\}\/\{y\}\.webp$/.test(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function exactKeys(value: Record<string, unknown>, keys: string[]): boolean {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}
