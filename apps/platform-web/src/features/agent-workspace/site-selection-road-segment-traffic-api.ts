import { authenticatedFetch, siteSelectionGatewayBase } from '@/auth/browser-auth-client'

type LineStringFeature = {
  type: 'Feature'
  geometry: {
    type: 'LineString'
    coordinates: [number, number][]
  }
  properties: {
    roadLevel: string
    routeKey: string
    segmentId: string
  }
}

export type SiteSelectionRoadSegmentTraffic = {
  dataStatus: 'ready' | 'no_road'
  geometryCoordinateSystem: 'WGS84'
  matching: {
    distanceMeters: number | null
    nearestPoint: [number, number] | null
    mode: 'specified_route' | 'nearest_route'
    requestedRouteRef: string | null
  }
  matchedRoute: {
    routeKey: string
    roadLevel: string
    ref: string
    name: string
    segmentId: string
    chainIndex: number
    segmentIndex: number
    startKm: number
    endKm: number
  } | null
  period: {
    startDate: string
    endDate: string
    publishedDayCount: number
  } | null
  segmentGeoJson: LineStringFeature | null
  traffic: {
    energyStatisticsAvailable: boolean
    forwardVisitCount: number
    newEnergyUniqueVehicleCount: number | null
    newEnergyVisitCount: number | null
    reverseVisitCount: number
    unknownDirectionVisitCount: number
    visitCount: number
    uniqueVehicleCount: number
  }
  query: {
    coordinateSystem: 'gcj02' | 'wgs84'
    latitude: number
    longitude: number
    searchRadiusMeters: number
  }
  versions: {
    matchingAlgorithmVersion: string
    roadNetworkVersion: string
  }
}

export async function getSiteSelectionRoadSegmentTraffic(
  longitude: number,
  latitude: number,
  routeRef?: string,
  signal?: AbortSignal,
  options?: {
    aggregationMode?: 'daily_average' | 'period_total'
    coordinateSystem?: 'gcj02' | 'wgs84'
    endDate?: string
    roadLevels?: Array<'expressway' | 'national' | 'provincial'>
    searchRadiusMeters?: number
    startDate?: string
  },
): Promise<SiteSelectionRoadSegmentTraffic> {
  const query = new URLSearchParams({
    coordinateSystem: options?.coordinateSystem ?? 'wgs84',
    longitude: String(longitude),
    latitude: String(latitude),
    searchRadiusMeters: String(options?.searchRadiusMeters ?? 1_000),
  })
  if (routeRef) query.set('routeRef', routeRef)
  if (options?.aggregationMode) query.set('aggregationMode', options.aggregationMode)
  if (options?.startDate) query.set('startDate', options.startDate)
  if (options?.endDate) query.set('endDate', options.endDate)
  if (options?.roadLevels?.length) query.set('roadLevels', options.roadLevels.join(','))
  const response = await authenticatedFetch(
    `${siteSelectionGatewayBase}/api/intelligent-site-selection/traffic/nearest-route-segment?${query.toString()}`,
    { signal },
  )
  if (!response.ok) throw new RoadSegmentTrafficApiError(response.status)
  return parseResponse(await response.json())
}

export function extractRoadRouteRef(routeName: string): string | undefined {
  const normalized = routeName.normalize('NFKC').toUpperCase()
  const prefixed = /(?:^|[^A-Z0-9])([GS])\s*(\d{1,3})(?:[^0-9]|$)/u.exec(normalized)
  if (prefixed) return `${prefixed[1]}${prefixed[2]}`
  const named = /(?:^|[^0-9])(\d{1,3})\s*(国道|省道)/u.exec(normalized)
  if (!named) return undefined
  return `${named[2] === '国道' ? 'G' : 'S'}${named[1]}`
}

export function roadSegmentTrafficErrorMessage(error: unknown): string | null {
  if (error instanceof TypeError) return '网络连接失败'
  return '路段车流加载失败'
}

class RoadSegmentTrafficApiError extends Error {
  constructor(readonly status: number) {
    super('road_segment_traffic_request_failed')
  }
}

function parseResponse(value: unknown): SiteSelectionRoadSegmentTraffic {
  if (!isRecord(value) || !['ready', 'no_road'].includes(String(value.dataStatus))) {
    throw malformed()
  }
  if (!isRecord(value.matching) || !isRecord(value.traffic)) throw malformed()
  const traffic = value.traffic
  if (
    !['visitCount', 'uniqueVehicleCount', 'forwardVisitCount', 'reverseVisitCount', 'unknownDirectionVisitCount']
      .every((field) => isCount(traffic[field]))
    || typeof traffic.energyStatisticsAvailable !== 'boolean'
    || !isOptionalCount(traffic.newEnergyVisitCount)
    || !isOptionalCount(traffic.newEnergyUniqueVehicleCount)
  ) {
    throw malformed()
  }
  if (value.dataStatus === 'no_road') {
    if (value.matchedRoute !== null || value.segmentGeoJson !== null || value.period !== null) throw malformed()
  } else if (!isMatchedRoute(value.matchedRoute) || !isLineStringFeature(value.segmentGeoJson) || !isPeriod(value.period)) {
    throw malformed()
  }
  if (value.geometryCoordinateSystem !== 'WGS84') throw malformed()
  const matching = value.matching as SiteSelectionRoadSegmentTraffic['matching']
  if (
    !['specified_route', 'nearest_route'].includes(String(matching.mode))
    || !(matching.distanceMeters === null || isNonNegativeNumber(matching.distanceMeters))
    || !(matching.nearestPoint === null || isCoordinate(matching.nearestPoint))
    || !(matching.requestedRouteRef === null || typeof matching.requestedRouteRef === 'string')
  ) throw malformed()
  return value as SiteSelectionRoadSegmentTraffic
}

function isMatchedRoute(value: unknown): value is NonNullable<SiteSelectionRoadSegmentTraffic['matchedRoute']> {
  if (!isRecord(value)) return false
  return ['routeKey', 'roadLevel', 'ref', 'name', 'segmentId'].every((key) => typeof value[key] === 'string')
    && ['chainIndex', 'segmentIndex', 'startKm', 'endKm'].every((key) => typeof value[key] === 'number' && Number.isFinite(value[key]))
}

function isLineStringFeature(value: unknown): value is LineStringFeature {
  if (!isRecord(value) || value.type !== 'Feature' || !isRecord(value.geometry) || value.geometry.type !== 'LineString') return false
  return Array.isArray(value.geometry.coordinates)
    && value.geometry.coordinates.length >= 2
    && value.geometry.coordinates.every((coordinate) => (
      Array.isArray(coordinate)
      && coordinate.length === 2
      && coordinate.every((part) => typeof part === 'number' && Number.isFinite(part))
    ))
    && isRecord(value.properties)
}

function isPeriod(value: unknown): value is NonNullable<SiteSelectionRoadSegmentTraffic['period']> {
  return isRecord(value)
    && typeof value.startDate === 'string'
    && typeof value.endDate === 'string'
    && isCount(value.publishedDayCount)
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isOptionalCount(value: unknown): value is number | null {
  return value === null || isCount(value)
}

function isCoordinate(value: unknown): value is [number, number] {
  return Array.isArray(value)
    && value.length === 2
    && value.every((part) => typeof part === 'number' && Number.isFinite(part))
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function malformed() {
  return new Error('road_segment_traffic_malformed_response')
}
