import { authenticatedFetch, siteSelectionGatewayBase } from '@/auth/browser-auth-client'

import {
  getSiteSelectionTrafficHeatmap,
  trafficHeatmapEndDate,
  trafficHeatmapStartDate,
} from './site-selection-traffic-heatmap-api'

export type SiteSelectionDailyAverageTraffic = {
  averageDailyVehicleCount: number
  averageDailyNewEnergyVehicleCount: number
}

export async function getSiteSelectionDailyAverageTraffic(
  longitude: number,
  latitude: number,
  signal?: AbortSignal,
): Promise<SiteSelectionDailyAverageTraffic> {
  const product = await getSiteSelectionTrafficHeatmap()
  const query = new URLSearchParams({
    coordinateSystem: 'gcj02',
    longitude: String(longitude),
    latitude: String(latitude),
    startDate: trafficHeatmapStartDate,
    endDate: trafficHeatmapEndDate,
    productVersion: String(product.productVersion),
    queryMode: 'nearby_peak',
  })
  const response = await authenticatedFetch(
    `${siteSelectionGatewayBase}/api/intelligent-site-selection/traffic/daily-average-point?${query.toString()}`,
    { signal },
  )
  if (!response.ok) throw new DailyAverageTrafficApiError(response.status)
  return parseResponse(await response.json())
}

export function dailyAverageTrafficErrorMessage(error: unknown): string | null {
  if (error instanceof TypeError) return '网络连接失败'
  return '车流量加载失败'
}

class DailyAverageTrafficApiError extends Error {
  constructor(readonly status: number) {
    super('daily_average_traffic_request_failed')
  }
}

function parseResponse(value: unknown): SiteSelectionDailyAverageTraffic {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('daily_average_traffic_malformed_response')
  const record = value as Record<string, unknown>
  if (!isCount(record.averageDailyVehicleCount) || !isCount(record.averageDailyNewEnergyVehicleCount)) {
    throw new Error('daily_average_traffic_malformed_response')
  }
  return {
    averageDailyVehicleCount: record.averageDailyVehicleCount,
    averageDailyNewEnergyVehicleCount: record.averageDailyNewEnergyVehicleCount,
  }
}

function isCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0
}
