import { authenticatedFetch, siteSelectionGatewayBase } from '@/auth/browser-auth-client'
import type {
  SiteInventoryStatus,
  SiteInventoryType,
} from './site-inventory-data'

export type SiteInventoryRecord = {
  id: string
  sequenceNumber: number
  stationName: string
  provincialCity: string
  countyDistrict: string
  routeName: string
  specificLocation: string
  facilityType: string
  siteType: SiteInventoryType
  status: SiteInventoryStatus
  statusDescription: string
  dailyTruckTraffic2025: number
  dailyMediumHeavyTruckTraffic2025: number
  remark: string
  createdAt: number
  updatedAt: number
}

const basePath = '/api/intelligent-site-selection/inventory-stations'
const mapPath = `${basePath}/map`
const nearbyPath = `${basePath}/nearby`

export type NearbySiteInventoryStation = {
  id: string
  sequenceNumber: number
  stationName: string
  provincialCity: string
  countyDistrict: string
  specificLocation: string
  status: SiteInventoryStatus
  longitude: number
  latitude: number
  distanceMeters: number
}

export type SiteInventoryLayerCategory =
  | 'planned-incomplete'
  | 'planned-completed'

export type SiteInventoryMapFeature = {
  type: 'Feature'
  id: string
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
  properties: {
    sequenceNumber: number
    stationName: string
    provincialCity: string
    countyDistrict: string
    routeName: string
    specificLocation: string
    siteType: SiteInventoryType
    status: SiteInventoryStatus
    statusDescription: string
    layerCategory: SiteInventoryLayerCategory
    dailyTruckTraffic2025: number
    trafficWeight: number
  }
}

export type SiteInventoryMapData = {
  data: {
    type: 'FeatureCollection'
    features: SiteInventoryMapFeature[]
  }
  summary: {
    total: number
    located: number
    unlocated: number
    byLayer: Record<SiteInventoryLayerCategory, number>
  }
}

const inventoryLayerCategories: readonly SiteInventoryLayerCategory[] = [
  'planned-incomplete',
  'planned-completed',
]

export async function listAllSiteInventoryStations(): Promise<SiteInventoryRecord[]> {
  const stations: SiteInventoryRecord[] = []
  const seenCursors = new Set<string>()
  let cursor: string | null = null

  do {
    const query = new URLSearchParams({ limit: '500' })
    if (cursor) query.set('cursor', cursor)
    const response = await authenticatedFetch(
      `${siteSelectionGatewayBase}${basePath}?${query.toString()}`,
    )
    if (!response.ok) throw await apiError(response)
    const page = parsePage(await response.json())
    stations.push(...page.items)
    cursor = page.nextCursor
    if (cursor && seenCursors.has(cursor)) throw malformedResponse()
    if (cursor) seenCursors.add(cursor)
  } while (cursor)

  return stations
}

export async function getSiteInventoryMapData(): Promise<SiteInventoryMapData> {
  const response = await authenticatedFetch(
    `${siteSelectionGatewayBase}${mapPath}`,
  )
  if (!response.ok) throw await apiError(response)
  return parseMapData(await response.json())
}

export async function getNearbySiteInventoryStations(input: {
  longitude: number
  latitude: number
}): Promise<NearbySiteInventoryStation[]> {
  const query = new URLSearchParams({
    longitude: String(input.longitude),
    latitude: String(input.latitude),
  })
  const response = await authenticatedFetch(
    `${siteSelectionGatewayBase}${nearbyPath}?${query.toString()}`,
  )
  if (!response.ok) throw await apiError(response, '周边任务站点加载失败，请稍后重试。')
  return parseNearbyStations(await response.json())
}

export async function getSiteInventoryStation(id: string): Promise<SiteInventoryRecord> {
  const response = await authenticatedFetch(
    `${siteSelectionGatewayBase}${basePath}/${encodeURIComponent(id)}`,
  )
  if (!response.ok) throw await apiError(response)
  return parseStation(await response.json())
}

export async function updateSiteInventoryStationsStatus(
  ids: readonly string[],
  status: SiteInventoryStatus,
): Promise<number> {
  const response = await authenticatedFetch(
    `${siteSelectionGatewayBase}${basePath}/bulk`,
    {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids, status }),
    },
  )
  if (!response.ok) throw await apiError(response, '任务状态修改失败，请稍后重试。')
  return parseMutationCount(await response.json(), 'updatedCount')
}

export async function deleteSiteInventoryStations(ids: readonly string[]): Promise<number> {
  const response = await authenticatedFetch(
    `${siteSelectionGatewayBase}${basePath}/bulk`,
    {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids }),
    },
  )
  if (!response.ok) throw await apiError(response, '任务站点批量删除失败，请稍后重试。')
  return parseMutationCount(await response.json(), 'deletedCount')
}

export function siteInventoryErrorMessage(error: unknown): string | null {
  if (error instanceof SiteInventoryApiError) return error.message
  if (error instanceof TypeError) return '网络连接失败，请稍后重试。'
  return '117站点数据格式异常，请联系管理员。'
}

class SiteInventoryApiError extends Error {
  constructor(readonly status: number, readonly code: string | undefined, message: string) {
    super(message)
    this.name = 'SiteInventoryApiError'
  }
}

async function apiError(
  response: Response,
  fallbackMessage = '117站点数据加载失败，请稍后重试。',
): Promise<SiteInventoryApiError> {
  let code: string | undefined
  try {
    const body: unknown = await response.json()
    if (isRecord(body) && exactKeys(body, ['error']) && typeof body.error === 'string') {
      code = body.error
    }
  } catch {
    // Non-contract response details are intentionally not exposed.
  }
  return new SiteInventoryApiError(
    response.status,
    code,
    code === 'business_access_denied'
      ? '当前账号无法访问117站点数据。'
      : fallbackMessage,
  )
}

function parseMutationCount(value: unknown, key: 'updatedCount' | 'deletedCount'): number {
  if (
    !isRecord(value)
    || !exactKeys(value, [key])
    || !isUnsignedInteger(value[key], true)
  ) throw malformedResponse()
  return value[key]
}

function parsePage(value: unknown): {
  items: SiteInventoryRecord[]
  nextCursor: string | null
} {
  if (
    !isRecord(value)
    || !exactKeys(value, ['items', 'nextCursor'])
    || !Array.isArray(value.items)
    || (value.nextCursor !== null && !isId(value.nextCursor))
  ) throw malformedResponse()
  return {
    items: value.items.map(parseStation),
    nextCursor: value.nextCursor as string | null,
  }
}

function parseStation(value: unknown): SiteInventoryRecord {
  if (
    !isRecord(value)
    || !exactKeys(value, [
      'id',
      'sequenceNumber',
      'stationName',
      'provincialCity',
      'countyDistrict',
      'routeName',
      'specificLocation',
      'facilityType',
      'siteType',
      'status',
      'statusDescription',
      'dailyTruckTraffic2025',
      'dailyMediumHeavyTruckTraffic2025',
      'remark',
      'createdAt',
      'updatedAt',
    ])
    || !isId(value.id)
    || !isUnsignedInteger(value.sequenceNumber, false)
    || !isBoundedString(value.stationName, 128, false)
    || !isBoundedString(value.provincialCity, 64, false)
    || !isBoundedString(value.countyDistrict, 64, false)
    || !isBoundedString(value.routeName, 128, false)
    || !isBoundedString(value.specificLocation, 255, true)
    || !isBoundedString(value.facilityType, 64, true)
    || value.siteType !== 'planned'
    || !['incomplete', 'completed'].includes(String(value.status))
    || !isBoundedString(value.statusDescription, 1_000, true)
    || !isUnsignedInteger(value.dailyTruckTraffic2025, true)
    || !isUnsignedInteger(value.dailyMediumHeavyTruckTraffic2025, true)
    || !isBoundedString(value.remark, 1_000, true)
    || !isUnsignedInteger(value.createdAt, true)
    || !isUnsignedInteger(value.updatedAt, true)
  ) throw malformedResponse()
  return value as SiteInventoryRecord
}

function parseMapData(value: unknown): SiteInventoryMapData {
  if (
    !isRecord(value)
    || !exactKeys(value, ['data', 'summary'])
    || !isRecord(value.data)
    || !exactKeys(value.data, ['type', 'features'])
    || value.data.type !== 'FeatureCollection'
    || !Array.isArray(value.data.features)
    || !isMapSummary(value.summary)
  ) throw malformedResponse()

  return {
    data: {
      type: 'FeatureCollection',
      features: value.data.features.map(parseMapFeature),
    },
    summary: value.summary as SiteInventoryMapData['summary'],
  }
}

function parseNearbyStations(value: unknown): NearbySiteInventoryStation[] {
  if (
    !isRecord(value)
    || !exactKeys(value, ['items'])
    || !Array.isArray(value.items)
    || value.items.length > 101
  ) throw malformedResponse()
  return value.items.map(parseNearbyStation)
}

function parseNearbyStation(value: unknown): NearbySiteInventoryStation {
  if (
    !isRecord(value)
    || !exactKeys(value, [
      'id',
      'sequenceNumber',
      'stationName',
      'provincialCity',
      'countyDistrict',
      'specificLocation',
      'status',
      'longitude',
      'latitude',
      'distanceMeters',
    ])
    || !isId(value.id)
    || !isUnsignedInteger(value.sequenceNumber, false)
    || !isBoundedString(value.stationName, 128, false)
    || !isBoundedString(value.provincialCity, 64, false)
    || !isBoundedString(value.countyDistrict, 64, false)
    || !isBoundedString(value.specificLocation, 255, true)
    || !['incomplete', 'completed'].includes(String(value.status))
    || !isLongitude(value.longitude)
    || !isLatitude(value.latitude)
    || typeof value.distanceMeters !== 'number'
    || !Number.isFinite(value.distanceMeters)
    || value.distanceMeters < 0
    || value.distanceMeters > 5_000
  ) throw malformedResponse()
  return value as NearbySiteInventoryStation
}

function parseMapFeature(value: unknown): SiteInventoryMapFeature {
  if (
    !isRecord(value)
    || !exactKeys(value, ['type', 'id', 'geometry', 'properties'])
    || value.type !== 'Feature'
    || !isId(value.id)
    || !isRecord(value.geometry)
    || !exactKeys(value.geometry, ['type', 'coordinates'])
    || value.geometry.type !== 'Point'
    || !Array.isArray(value.geometry.coordinates)
    || value.geometry.coordinates.length !== 2
    || !isLongitude(value.geometry.coordinates[0])
    || !isLatitude(value.geometry.coordinates[1])
    || !isRecord(value.properties)
    || !exactKeys(value.properties, [
      'sequenceNumber',
      'stationName',
      'provincialCity',
      'countyDistrict',
      'routeName',
      'specificLocation',
      'siteType',
      'status',
      'statusDescription',
      'layerCategory',
      'dailyTruckTraffic2025',
      'trafficWeight',
    ])
    || !isUnsignedInteger(value.properties.sequenceNumber, false)
    || !isBoundedString(value.properties.stationName, 128, false)
    || !isBoundedString(value.properties.provincialCity, 64, false)
    || !isBoundedString(value.properties.countyDistrict, 64, false)
    || !isBoundedString(value.properties.routeName, 128, false)
    || !isBoundedString(value.properties.specificLocation, 255, true)
    || value.properties.siteType !== 'planned'
    || !['incomplete', 'completed'].includes(
      String(value.properties.status),
    )
    || !isBoundedString(value.properties.statusDescription, 1_000, true)
    || !inventoryLayerCategories.includes(
      value.properties.layerCategory as SiteInventoryLayerCategory,
    )
    || !isUnsignedInteger(value.properties.dailyTruckTraffic2025, true)
    || !isUnitInterval(value.properties.trafficWeight)
  ) throw malformedResponse()
  return value as SiteInventoryMapFeature
}

function isMapSummary(value: unknown): value is SiteInventoryMapData['summary'] {
  if (
    !isRecord(value)
    || !exactKeys(value, ['total', 'located', 'unlocated', 'byLayer'])
    || !isUnsignedInteger(value.total, true)
    || !isUnsignedInteger(value.located, true)
    || !isUnsignedInteger(value.unlocated, true)
    || value.located + value.unlocated !== value.total
    || !isRecord(value.byLayer)
    || !exactKeys(value.byLayer, inventoryLayerCategories)
  ) return false
  const byLayer = value.byLayer
  return inventoryLayerCategories.every(
    (category) => isUnsignedInteger(byLayer[category], true),
  )
}

function isUnsignedInteger(value: unknown, allowZero: boolean): value is number {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= (allowZero ? 0 : 1)
}

function isBoundedString(
  value: unknown,
  maxLength: number,
  allowEmpty: boolean,
): value is string {
  return typeof value === 'string'
    && value.length <= maxLength
    && (allowEmpty || value.trim().length > 0)
}

function isId(value: unknown): value is string {
  return typeof value === 'string' && /^[1-9]\d{0,19}$/u.test(value)
}

function isLongitude(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -180 && value <= 180
}

function isLatitude(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -90 && value <= 90
}

function isUnitInterval(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index])
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function malformedResponse(): Error {
  return new Error('Malformed inventory station API response')
}
