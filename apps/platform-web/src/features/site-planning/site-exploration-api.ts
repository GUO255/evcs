import { authenticatedFetch, siteSelectionGatewayBase } from '@/auth/browser-auth-client'

import {
  parseSiteExplorationFilterOptions,
  type SiteExplorationFilterOptions,
  type SiteExplorationStatus,
  type SiteSelectionRecommendation,
} from './site-exploration-data'
import { siteExplorationStatuses } from './site-exploration-status-config'
import {
  parseSiteExplorationDailyPage,
  type SiteExplorationDailyListItem,
} from './site-exploration-daily'
import {
  MAX_SITE_EXPLORATION_FILE_BYTES,
  SITE_EXPLORATION_FILE_LIMIT_LABEL,
} from './site-exploration-file-limits'
import { HIGHWAY_DISTANCE_SEARCH_RADIUS_METERS } from './site-exploration-highway-distance'

export type SiteExplorationListItem = {
  id: string
  status: SiteExplorationStatus
  explorerName: string
  explorationTeamId: string
  explorationTeam: string
  explorationDate: string
  overallScore: number
  selectionRecommendation: SiteSelectionRecommendation
  hasAnalysis: boolean
  projectName: string
  provinceCity: string
  countyDistrict: string
  locationSnapshot: SiteExplorationImage | null
  siteBoundarySnapshot: SiteExplorationImage | null
  satelliteImagePreview: SiteExplorationImage | null
  highwayDistanceMeters: number
  siteAreaSquareMeters: number
  trafficVisitCount: number | null
  arterialRoadDistanceMeters: number
  nearestRoadName: string | null
  uniqueTrafficVehicleCount: number | null
  nearbyChargingStationCount: number
  nearbyHotspotAreaCount: number
  completionCompleted: number
  completionTotal: number
  contractCompletionCompleted: number
  contractCompletionTotal: number
  createdAt: number
  updatedAt: number
}

export type SiteExplorationListQuery = {
  cursor?: string
  limit: number
  status?: SiteExplorationStatus
  team?: string
  explorer?: string
  city?: string
  route?: string
  projectPrefix?: string
}

export type SiteExplorationFilterQuery = Omit<SiteExplorationListQuery, 'cursor' | 'limit'>

export type SiteExplorationPage = {
  items: SiteExplorationListItem[]
  nextCursor: string | null
}

type SiteExplorationMapProperties = {
  status: SiteExplorationStatus
  explorerName: string
  explorationDate: string
  overallScore: number
  selectionRecommendation: SiteSelectionRecommendation
  hasAnalysis: boolean
  projectName: string
  provinceCity: string
  countyDistrict: string
  locationAddress: string
  highwayDistanceMeters: number
  siteAreaSquareMeters: number
  trafficVisitCount: number | null
  arterialRoadDistanceMeters: number
  nearestRoadName: string | null
  uniqueTrafficVehicleCount: number | null
  nearbyChargingStationCount: number
  nearbyHotspotAreaCount: number
}

export type SiteExplorationMapPointFeature = {
  type: 'Feature'
  id: string
  geometry: {
    type: 'Point'
    coordinates: [number, number]
  }
  properties: SiteExplorationMapProperties
}

export type SiteExplorationMapBoundaryFeature = {
  type: 'Feature'
  id: string
  geometry: {
    type: 'Polygon'
    coordinates: [number, number, ...number[]][][]
  }
  properties: SiteExplorationMapProperties
}

export type SiteExplorationMapFeature =
  | SiteExplorationMapPointFeature
  | SiteExplorationMapBoundaryFeature

export type SiteExplorationMapData = {
  scopeTeamName: string | null
  data: {
    type: 'FeatureCollection'
    features: SiteExplorationMapFeature[]
  }
  summary: {
    total: number
    located: number
    unlocated: number
    byStatus: Record<SiteExplorationStatus, number>
  }
}

export type SiteBoundaryGeoJson = {
  type: 'Feature'
  properties: Record<string, never>
  geometry: {
    type: 'Polygon'
    coordinates: [number, number, ...number[]][][]
  }
}

export type SiteExplorationDistanceKind = 'highway-distance' | 'arterial-road-distance'

export type SiteDistanceGeoJson = {
  type: 'Feature'
  properties: Record<string, never>
  geometry: {
    type: 'LineString'
    coordinates: [number, number, ...number[]][]
  }
}

export type ArterialRoadTrafficGeoJson = {
  type: 'Feature'
  properties: Record<string, unknown>
  geometry: {
    type: 'LineString'
    coordinates: [number, number, ...number[]][]
  }
}

export type SiteExplorationImageField =
  | 'satelliteImages'
  | 'accessConvenienceImages'
  | 'landSceneImages'
  | 'otherStructureImages'

export type SiteExplorationContractAttachmentField =
  | 'landOwnershipDocuments'
  | 'leaseAgreementDocuments'
  | 'surveyDeterminationReports'

export type SiteExplorationSourceAttachmentField =
  | 'sourceSatelliteAttachments'
  | 'sourceAccessConvenienceAttachments'
  | 'sourceLandSceneAttachments'
  | 'sourceOtherStructureAttachments'

export type SiteExplorationImage = {
  objectKey: string
  url: string
  originalName: string
  contentType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic' | 'image/heif'
  size: number
}

export type SiteExplorationAttachment = {
  objectKey: string
  url: string
  originalName: string
  contentType:
    | 'application/pdf'
    | 'application/msword'
    | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    | 'application/vnd.ms-excel'
    | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    | 'image/jpeg'
    | 'image/png'
    | 'image/webp'
    | 'image/heic'
    | 'image/heif'
    | 'video/mp4'
    | 'video/quicktime'
  size: number
}

type NearbyPlace = {
  sequence: number
  id: string
  name: string
  address: string
  longitude: number
  latitude: number
  distanceMeters: number | null
  type: string
  category: string
}

export type NearbyTruckChargingStation = NearbyPlace & {
  surveyScale: string
  surveyModelQuantity: string
  surveyUtilizationRate: '' | '低' | '中' | '高' | '较高' | '非常高'
  surveyElectricityPrice: string
}

export type NearbyHotspotArea = {
  sequence: number
  id: string
  name: string
  address: string
  longitude: number
  latitude: number
  distanceMeters: number | null
  type: string
  category: string
}

export type NearbyTaskStation = NearbyPlace

export type HighwayEntrance = {
  poiId: string
  name: string
  address: string
  longitude: number
  latitude: number
}

export type HighwayRoute = HighwayEntrance & {
  straightLineDistanceMeters: number
  drivingDistanceMeters: number
  geoJson: SiteDistanceGeoJson
}

export const nearbyHotspotAreaCategories = [
  '物流园区', '货运集散中心', '矿区', '大型矿山', '港口', '码头', '集疏运区域',
  '火电厂', '化工园区', '大型制造业基地', '省级产业集聚区', '市级产业集聚区', '工业园区',
] as const

export type SiteExplorationInput = Omit<
  SiteExplorationListItem,
  | 'id'
  | 'status'
  | 'explorerName'
  | 'explorationTeamId'
  | 'explorationTeam'
  | 'explorationDate'
  | 'overallScore'
  | 'selectionRecommendation'
  | 'hasAnalysis'
  | 'satelliteImagePreview'
  | 'trafficVisitCount'
  | 'nearestRoadName'
  | 'uniqueTrafficVehicleCount'
  | 'nearbyChargingStationCount'
  | 'nearbyHotspotAreaCount'
  | 'completionCompleted'
  | 'completionTotal'
  | 'contractCompletionCompleted'
  | 'contractCompletionTotal'
  | 'createdAt'
  | 'updatedAt'
> & {
  contactName: string
  contactPhone: string
  locationAddress: string
  longitude: number
  latitude: number
  locationSnapshot: SiteExplorationImage | null
  highwayDistanceMeters: number
  highwayDistanceGeoJson: SiteDistanceGeoJson | null
  highwayDistanceSnapshot: SiteExplorationImage | null
  highwayEntrance: HighwayEntrance | null
  highwayRoutes: HighwayRoute[]
  siteAreaSquareMeters: number
  siteBoundaryGeoJson: SiteBoundaryGeoJson | null
  siteBoundarySnapshot: SiteExplorationImage | null
  arterialRoadDistanceMeters: number
  arterialRoadDistanceGeoJson: SiteDistanceGeoJson | null
  arterialRoadDistanceSnapshot: SiteExplorationImage | null
  arterialRoadTrafficGeoJson: ArterialRoadTrafficGeoJson | null
  accessConvenience: '' | 'excellent' | 'good' | 'average'
  landQualified: boolean
  landType: '' | 'construction' | 'collective-commercial' | 'allocated' | 'other'
  landTypeDescription: string
  hasLandProof: boolean
  hasLeaseAgreement: boolean
  hasOtherStructures: boolean
  groundHardening: '' | 'good' | 'needs-hardening' | 'unhardened'
  terrainCondition: '' | 'well-drained' | 'flat' | 'low-lying'
  capacityDescription: string
  transportCapacityDescription: string
  nearbyTruckChargingStations: NearbyTruckChargingStation[]
  nearbyTruckChargingStationSnapshot: SiteExplorationImage | null
  nearbyTaskStations: NearbyTaskStation[]
  nearbyTaskStationSnapshot: SiteExplorationImage | null
  nearbyHotspotAreas: NearbyHotspotArea[]
  nearbyHotspotAreaSnapshot: SiteExplorationImage | null
  cooperationMode: '' | 'service-fee-share' | 'net-profit-share' | 'fixed-rent'
  cooperationTerms: string
  siteMaturity: '' | 'a' | 'b' | 'c'
  importantNotes: string
  powerAccessMethod: '' | '10kv' | '0.4kv'
  electricityNature: '' | 'industrial' | 'commercial'
  highVoltageAccessMethod: '' | 'new-box-transformer' | 'distribution-room'
  tenKvLineAccessDistanceMeters: number | null
  competitors: SiteExplorationCompetitor[]
  surveyRecommendation: '' | 'priority-construction' | 'buildable' | 'reserve' | 'abandon'
  chargingPileModel: string
  chargingPileQuantity: number | null
  transformerCapacity: string
  transformerQuantity: number | null
  preliminaryDesignNotes: string
}

export type SiteExplorationCompetitor = {
  stationName: string
  scale: string
  modelQuantity: string
  utilizationRate: '' | '低' | '中' | '高' | '较高' | '非常高'
  electricityPrice: string
}

export type SiteExplorationRecord = SiteExplorationInput & {
  id: string
  contractDate: string
  construction: SiteExplorationConstruction
  status: SiteExplorationStatus
  explorerName: string
  explorationTeamId: string
  explorationTeam: string
  explorationDate: string
  overallScore: number
  selectionRecommendation: SiteSelectionRecommendation
  hasAnalysis: boolean
  latestAnalysisTaskId: string | null
  satelliteImages: SiteExplorationImage[]
  accessConvenienceImages: SiteExplorationImage[]
  landSceneImages: SiteExplorationImage[]
  otherStructureImages: SiteExplorationImage[]
  landOwnershipDocuments: SiteExplorationAttachment[]
  leaseAgreementDocuments: SiteExplorationAttachment[]
  surveyDeterminationReports: SiteExplorationAttachment[]
  sourceSatelliteAttachments: SiteExplorationAttachment[]
  sourceAccessConvenienceAttachments: SiteExplorationAttachment[]
  sourceLandSceneAttachments: SiteExplorationAttachment[]
  sourceOtherStructureAttachments: SiteExplorationAttachment[]
  createdByMemberId: string
  createdByMemberName: string
  updatedByMemberId: string
  updatedByMemberName: string
  createdAt: number
  updatedAt: number
}

export type SiteExplorationConstruction = {
  constructionStatus: '' | 'not-started' | 'under-construction' | 'completed'
  constructionEntity: string
  stationType: string
  driverHomeProvision: '' | 'no' | 'yes'
  chargingEquipmentCapacityKva: number
  batterySwapEquipmentCapacityKva: number
  photovoltaicCapacityKw: number
  energyStorageCapacityKwh: number
}

export function siteExplorationRecordToInput(record: SiteExplorationRecord): SiteExplorationInput {
  const {
    id: _id,
    contractDate: _contractDate,
    construction: _construction,
    status: _status,
    explorerName: _explorerName,
    explorationTeamId: _explorationTeamId,
    explorationTeam: _explorationTeam,
    explorationDate: _explorationDate,
    overallScore: _overallScore,
    selectionRecommendation: _selectionRecommendation,
    hasAnalysis: _hasAnalysis,
    latestAnalysisTaskId: _latestAnalysisTaskId,
    satelliteImages: _satelliteImages,
    accessConvenienceImages: _accessConvenienceImages,
    landSceneImages: _landSceneImages,
    otherStructureImages: _otherStructureImages,
    landOwnershipDocuments: _landOwnershipDocuments,
    leaseAgreementDocuments: _leaseAgreementDocuments,
    surveyDeterminationReports: _surveyDeterminationReports,
    sourceSatelliteAttachments: _sourceSatelliteAttachments,
    sourceAccessConvenienceAttachments: _sourceAccessConvenienceAttachments,
    sourceLandSceneAttachments: _sourceLandSceneAttachments,
    sourceOtherStructureAttachments: _sourceOtherStructureAttachments,
    createdByMemberId: _createdByMemberId,
    createdByMemberName: _createdByMemberName,
    updatedByMemberId: _updatedByMemberId,
    updatedByMemberName: _updatedByMemberName,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...input
  } = record
  return input
}

const basePath = '/api/intelligent-site-selection/exploration-sites'
const recommendations: readonly SiteSelectionRecommendation[] = [
  '',
  'needs-review',
  'priority',
  'recommended',
  'cautious',
  'paused',
]

export async function listSiteExplorationSites(
  query: SiteExplorationListQuery,
): Promise<SiteExplorationPage> {
  const search = new URLSearchParams({ limit: String(query.limit) })
  if (query.cursor) search.set('cursor', query.cursor)
  if (query.status) search.set('status', query.status)
  if (query.team) search.set('team', query.team)
  if (query.explorer) search.set('explorer', query.explorer)
  if (query.city) search.set('city', query.city)
  if (query.route) search.set('route', query.route)
  if (query.projectPrefix) search.set('projectPrefix', query.projectPrefix)

  const response = await authenticatedFetch(
    `${siteSelectionGatewayBase}${basePath}?${search.toString()}`,
  )
  if (!response.ok) throw await apiError(response)
  return parsePage(await response.json())
}

export async function exportSiteExplorationSites(
  query: SiteExplorationFilterQuery,
): Promise<{ blob: Blob; fileName: string }> {
  const search = new URLSearchParams()
  if (query.status) search.set('status', query.status)
  if (query.team) search.set('team', query.team)
  if (query.explorer) search.set('explorer', query.explorer)
  if (query.city) search.set('city', query.city)
  if (query.route) search.set('route', query.route)
  if (query.projectPrefix) search.set('projectPrefix', query.projectPrefix)
  const response = await authenticatedFetch(
    `${siteSelectionGatewayBase}${basePath}/export${search.size > 0 ? `?${search.toString()}` : ''}`,
    { cache: 'no-store' },
  )
  if (!response.ok) throw await apiError(response)
  return {
    blob: await response.blob(),
    fileName: parseExportFileName(response.headers.get('content-disposition')),
  }
}

export async function downloadSiteExplorationWordReport(
  siteId: string,
): Promise<{ blob: Blob; fileName: string }> {
  const response = await authenticatedFetch(
    `${siteSelectionGatewayBase}${basePath}/${encodeURIComponent(siteId)}/report.docx`,
  )
  if (!response.ok) throw await apiError(response)
  if (
    response.headers.get('content-type')?.split(';', 1)[0]?.trim()
    !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    throw malformedResponse()
  }
  return {
    blob: await response.blob(),
    fileName: parseWordFileName(response.headers.get('content-disposition')),
  }
}

function parseExportFileName(contentDisposition: string | null): string {
  const encoded = /(?:^|;)\s*filename\*=UTF-8''([^;]+)/iu.exec(contentDisposition ?? '')?.[1]
  if (!encoded) return '勘探站点.xlsx'
  try {
    const decoded = decodeURIComponent(encoded)
    return /^[^/\\\u0000-\u001f]{1,255}\.xlsx$/u.test(decoded) ? decoded : '勘探站点.xlsx'
  } catch {
    return '勘探站点.xlsx'
  }
}

function parseWordFileName(contentDisposition: string | null): string {
  const encoded = /(?:^|;)\s*filename\*=UTF-8''([^;]+)/iu.exec(contentDisposition ?? '')?.[1]
  if (!encoded) return '勘探报告.docx'
  try {
    const decoded = decodeURIComponent(encoded)
    return /^[^/\\\u0000-\u001f]{1,255}\.docx$/iu.test(decoded) ? decoded : '勘探报告.docx'
  } catch {
    return '勘探报告.docx'
  }
}

export async function listAllDailySiteExplorationSites(
  date: string,
  basis: 'exploration' | 'analysis' | 'site' = 'exploration',
): Promise<SiteExplorationDailyListItem[]> {
  const items: SiteExplorationDailyListItem[] = []
  const visitedCursors = new Set<string>()
  let cursor: string | null = null

  do {
    const search = new URLSearchParams({ basis, date, limit: '100' })
    if (cursor) search.set('cursor', cursor)
    const response = await authenticatedFetch(
      `${siteSelectionGatewayBase}${basePath}/daily?${search.toString()}`,
      { cache: 'no-store' },
    )
    if (!response.ok) throw await apiError(response)

    const page = parseSiteExplorationDailyPage(await response.json())
    items.push(...page.items)
    cursor = page.nextCursor
    if (cursor && visitedCursors.has(cursor)) throw new Error('malformed_site_exploration_response')
    if (cursor) visitedCursors.add(cursor)
  } while (cursor)

  return items
}

export async function listSiteExplorationFilterOptions(
  query: SiteExplorationFilterQuery,
): Promise<SiteExplorationFilterOptions> {
  const search = new URLSearchParams()
  if (query.status) search.set('status', query.status)
  if (query.team) search.set('team', query.team)
  if (query.explorer) search.set('explorer', query.explorer)
  if (query.city) search.set('city', query.city)
  if (query.route) search.set('route', query.route)
  if (query.projectPrefix) search.set('projectPrefix', query.projectPrefix)
  const response = await request(`/filter-options${search.size > 0 ? `?${search.toString()}` : ''}`)
  return parseSiteExplorationFilterOptions(await response.json())
}

export async function getSiteExplorationMapData(
  query: SiteExplorationFilterQuery = {},
): Promise<SiteExplorationMapData> {
  const search = new URLSearchParams()
  if (query.status) search.set('status', query.status)
  if (query.team) search.set('team', query.team)
  if (query.explorer) search.set('explorer', query.explorer)
  if (query.city) search.set('city', query.city)
  if (query.route) search.set('route', query.route)
  if (query.projectPrefix) search.set('projectPrefix', query.projectPrefix)
  const response = await authenticatedFetch(
    `${siteSelectionGatewayBase}${basePath}/map${search.size > 0 ? `?${search.toString()}` : ''}`,
    { cache: 'no-store' },
  )
  if (!response.ok) throw await apiError(response)
  return parseSiteExplorationMapData(await response.json())
}

export async function getSiteExplorationSite(id: string): Promise<SiteExplorationRecord> {
  const response = await request(`/${encodeURIComponent(id)}`, { cache: 'no-store' })
  return parseRecord(await response.json())
}

export async function reanalyzeSiteExplorationSite(
  id: string,
): Promise<{ siteId: string; taskId: string }> {
  const response = await request(`/${encodeURIComponent(id)}/reanalyze`, { method: 'POST' })
  const value: unknown = await response.json()
  if (
    !isRecord(value)
    || !exactKeys(value, ['siteId', 'taskId'])
    || !/^[1-9]\d{0,19}$/.test(String(value.siteId))
    || !/^[1-9]\d{0,19}$/.test(String(value.taskId))
  ) throw malformedResponse()
  return { siteId: String(value.siteId), taskId: String(value.taskId) }
}

export async function createSiteExplorationSite(input: SiteExplorationInput): Promise<SiteExplorationRecord> {
  const response = await request('', { method: 'POST', json: input })
  return parseRecord(await response.json())
}

export async function createSiteExplorationDraft(
  input?: SiteExplorationInput,
): Promise<SiteExplorationRecord> {
  const response = await request('/drafts', { method: 'POST', json: input })
  return parseRecord(await response.json())
}

export async function updateSiteExplorationSite(
  id: string,
  input: SiteExplorationInput,
  updatedAt: number,
): Promise<SiteExplorationRecord> {
  const response = await request(`/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    json: { site: input, updatedAt },
  })
  return parseRecord(await response.json())
}

export async function updateSiteExplorationStatus(
  id: string,
  status: Extract<SiteExplorationStatus, 'draft' | 'completed'>,
  updatedAt: number,
): Promise<SiteExplorationRecord> {
  const response = await request(`/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    json: { status, updatedAt },
  })
  return parseRecord(await response.json())
}

export async function updateSiteExplorationContractDate(
  id: string,
  contractDate: string,
  updatedAt: number,
): Promise<SiteExplorationRecord> {
  const response = await request(`/${encodeURIComponent(id)}/contract-date`, {
    method: 'PATCH',
    json: { contractDate, updatedAt },
  })
  return parseRecord(await response.json())
}

export async function updateSiteExplorationConstruction(
  id: string,
  construction: SiteExplorationConstruction,
  updatedAt: number,
): Promise<SiteExplorationRecord> {
  const response = await request(`/${encodeURIComponent(id)}/construction`, {
    method: 'PATCH',
    json: { construction, updatedAt },
  })
  return parseRecord(await response.json())
}

export async function deleteSiteExplorationSite(id: string): Promise<void> {
  await request(`/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function deleteSiteExplorationSites(ids: readonly string[]): Promise<number> {
  const response = await request('/bulk', { method: 'DELETE', json: { ids } })
  const value: unknown = await response.json()
  if (
    !isRecord(value)
    || !exactKeys(value, ['deletedCount'])
    || !Number.isSafeInteger(value.deletedCount)
    || Number(value.deletedCount) < 1
    || Number(value.deletedCount) > ids.length
  ) throw malformedResponse()
  return Number(value.deletedCount)
}

export type SiteExplorationUploadSession = {
  ticket: string
  objectKey: string
  region: string
  endpoint: string
  bucket: string
  credentials: {
    accessKeyId: string
    accessKeySecret: string
    securityToken: string
    expiresAt: string
  }
}

export async function createSiteExplorationUploadSession(input: {
  id: string
  kind: 'image' | 'attachment'
  field: SiteExplorationImageField | SiteExplorationContractAttachmentField
  file: File
  contentType: string
  updatedAt: number
}): Promise<SiteExplorationUploadSession> {
  const response = await authenticatedFetch(
    `${siteSelectionGatewayBase}${basePath}/${encodeURIComponent(input.id)}/uploads`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        kind: input.kind,
        field: input.field,
        originalName: input.file.name,
        contentType: input.contentType,
        size: input.file.size,
        updatedAt: input.updatedAt,
      }),
    },
  )
  if (!response.ok) throw await apiError(response)
  return parseUploadSession(await response.json())
}

export async function completeSiteExplorationUpload(
  id: string,
  ticket: string,
): Promise<SiteExplorationRecord> {
  const response = await authenticatedFetch(
    `${siteSelectionGatewayBase}${basePath}/${encodeURIComponent(id)}/uploads/complete`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ticket }),
    },
  )
  if (!response.ok) throw await apiError(response)
  return parseRecord(await response.json())
}

export async function uploadSiteExplorationBoundarySnapshot(
  file: File,
): Promise<SiteExplorationImage> {
  const body = new FormData()
  body.set('file', file)
  const response = await authenticatedFetch(
    `${siteSelectionGatewayBase}${basePath}/boundary-snapshots`,
    { method: 'POST', body },
  )
  if (!response.ok) throw await apiError(response)
  return parseImage(await response.json())
}

export async function uploadSiteExplorationLocationSnapshot(
  file: File,
): Promise<SiteExplorationImage> {
  const body = new FormData()
  body.set('file', file)
  const response = await authenticatedFetch(
    `${siteSelectionGatewayBase}${basePath}/location-snapshots`,
    { method: 'POST', body },
  )
  if (!response.ok) throw await apiError(response)
  return parseImage(await response.json())
}

export async function uploadNearbyTruckChargingStationSnapshot(
  file: File,
): Promise<SiteExplorationImage> {
  const body = new FormData()
  body.set('file', file)
  const response = await authenticatedFetch(
    `${siteSelectionGatewayBase}${basePath}/nearby-station-snapshots`,
    { method: 'POST', body },
  )
  if (!response.ok) throw await apiError(response)
  return parseImage(await response.json())
}

export async function uploadNearbyHotspotAreaSnapshot(
  file: File,
): Promise<SiteExplorationImage> {
  const body = new FormData()
  body.set('file', file)
  const response = await authenticatedFetch(
    `${siteSelectionGatewayBase}${basePath}/nearby-hotspot-snapshots`,
    { method: 'POST', body },
  )
  if (!response.ok) throw await apiError(response)
  return parseImage(await response.json())
}

export async function uploadNearbyTaskStationSnapshot(
  file: File,
): Promise<SiteExplorationImage> {
  const body = new FormData()
  body.set('file', file)
  const response = await authenticatedFetch(
    `${siteSelectionGatewayBase}${basePath}/nearby-task-station-snapshots`,
    { method: 'POST', body },
  )
  if (!response.ok) throw await apiError(response)
  return parseImage(await response.json())
}

export async function uploadSiteExplorationDistanceSnapshot(
  kind: SiteExplorationDistanceKind,
  file: File,
): Promise<SiteExplorationImage> {
  const body = new FormData()
  body.set('file', file)
  const response = await authenticatedFetch(
    `${siteSelectionGatewayBase}${basePath}/distance-snapshots/${kind}`,
    { method: 'POST', body },
  )
  if (!response.ok) throw await apiError(response)
  return parseImage(await response.json())
}

export async function deleteSiteExplorationImage(
  id: string,
  field: SiteExplorationImageField,
  objectKey: string,
  updatedAt: number,
): Promise<SiteExplorationRecord> {
  const token = base64Url(objectKey)
  const response = await request(
    `/${encodeURIComponent(id)}/images/${field}/${token}?updatedAt=${updatedAt}`,
    { method: 'DELETE' },
  )
  return parseRecord(await response.json())
}

export async function deleteSiteExplorationContractAttachment(
  id: string,
  field: SiteExplorationContractAttachmentField,
  objectKey: string,
  updatedAt: number,
): Promise<SiteExplorationRecord> {
  const token = base64Url(objectKey)
  const response = await request(
    `/${encodeURIComponent(id)}/attachments/${field}/${token}?updatedAt=${updatedAt}`,
    { method: 'DELETE' },
  )
  return parseRecord(await response.json())
}

export function siteExplorationErrorMessage(error: unknown): string | null {
  if (error instanceof SiteExplorationApiError) return error.message
  if (error instanceof TypeError) return '网络连接失败，请稍后重试。'
  return '勘探站点数据格式异常，请联系管理员。'
}

export class SiteExplorationApiError extends Error {
  constructor(readonly status: number, readonly code: string | undefined, message: string) {
    super(message)
    this.name = 'SiteExplorationApiError'
  }
}

async function apiError(response: Response): Promise<SiteExplorationApiError> {
  let code: string | undefined
  try {
    const body: unknown = await response.json()
    if (isRecord(body) && exactKeys(body, ['error']) && typeof body.error === 'string') {
      code = body.error
    }
  } catch {
    // The service contract is intentionally the only displayed error source.
  }
  return new SiteExplorationApiError(
    response.status,
    code,
    code === 'business_access_denied'
      ? '当前账号无法访问勘探站点。'
      : code === 'exploration_site_access_denied'
        ? '当前账号尚未加入可用的勘探小组，请联系管理员设置小组。'
      : code === 'exploration_report_image_unavailable'
        ? '报告图片暂时无法读取，请稍后重试。'
      : code === 'exploration_report_image_too_large' || code === 'exploration_report_images_too_large'
        ? '报告图片处理结果超出限制，请压缩站点图片后重试。'
      : code === 'exploration_report_analysis_unavailable'
        ? 'AI选址分析报告暂时无法读取，请稍后重试。'
      : code === 'exploration_report_generation_failed'
        ? '勘探报告生成失败，请稍后重试。'
      : code === 'exploration_site_conflict'
        ? '该站点已被其他人修改，请刷新后重试。'
        : code === 'analysis_task_active'
          ? '该站点正在分析中，请等待当前任务完成。'
        : code === 'exploration_site_not_eligible_for_analysis'
          ? '当前站点状态不支持选址分析。'
        : code === 'invalid_exploration_status_transition'
          ? '当前站点状态已变化，请刷新后重试。'
        : code === 'payload_too_large' || code === 'exploration_image_too_large'
          ? `图片超过 ${SITE_EXPLORATION_FILE_LIMIT_LABEL}，请压缩后重新上传。`
          : code === 'exploration_attachment_too_large'
            ? `附件超过 ${SITE_EXPLORATION_FILE_LIMIT_LABEL}，请压缩后重新上传。`
          : code === 'invalid_exploration_image_type'
            ? '仅支持 JPEG、PNG、WebP、HEIC 或 HEIF 图片。'
            : code === 'invalid_exploration_attachment_type'
              ? '仅支持 PDF、Word、Excel、JPEG、PNG、WebP、HEIC、HEIF、MP4 或 MOV 文件。'
            : code === 'exploration_upload_authorization_failed'
              ? '暂时无法取得文件上传授权，请稍后重试。'
            : code === 'exploration_upload_unavailable'
              ? '文件上传尚未配置完成，请联系管理员。'
            : code === 'exploration_object_verification_failed'
              ? '文件已上传但校验暂时失败，请重试保存。'
            : code === 'exploration_object_promotion_failed'
              ? '文件已上传但归档暂时失败，请重新上传。'
            : code === 'invalid_exploration_upload_file_type'
              ? '文件扩展名与实际声明格式不一致，请重新选择文件。'
            : code === 'invalid_exploration_upload_ticket'
              ? '上传授权已过期，请重新选择文件。'
            : code === 'exploration_image_limit_reached'
              ? '每类图片最多上传 9 张。'
              : code === 'exploration_attachment_limit_reached'
                ? '每项最多上传 9 个附件。'
        : code === 'exploration_team_unavailable'
          ? '当前账号需要且只能加入一个启用的勘探小组，请联系管理员处理。'
        : code === 'invalid_exploration_contact_phone'
          ? '联系电话格式不正确，请填写 5–32 位数字，可使用空格、短横线或开头的 +。'
        : code === 'exploration_construction_requires_contract'
          ? '请先将签约状态设置为“双方已完成签约”，再填写建设信息。'
        : '勘探站点操作失败，请稍后重试。',
  )
}

export { apiError as parseSiteExplorationApiError }

async function request(
  suffix: string,
  options: { method?: string; json?: unknown; cache?: RequestCache } = {},
): Promise<Response> {
  const response = await authenticatedFetch(`${siteSelectionGatewayBase}${basePath}${suffix}`, {
    method: options.method,
    headers: options.json === undefined ? undefined : { 'content-type': 'application/json' },
    body: options.json === undefined ? undefined : JSON.stringify(options.json),
    cache: options.cache,
  })
  if (!response.ok) throw await apiError(response)
  return response
}

function parsePage(value: unknown): SiteExplorationPage {
  if (
    !isRecord(value)
    || !exactKeys(value, ['items', 'nextCursor'])
    || !Array.isArray(value.items)
    || (value.nextCursor !== null && typeof value.nextCursor !== 'string')
  ) throw malformedResponse()
  return {
    items: value.items.map(parseListItem),
    nextCursor: value.nextCursor,
  }
}

export function parseSiteExplorationMapData(value: unknown): SiteExplorationMapData {
  if (
    !isRecord(value)
    || !exactKeys(value, ['scopeTeamName', 'data', 'summary'])
    || (value.scopeTeamName !== null && !isBoundedString(value.scopeTeamName, 64, false))
    || !isRecord(value.data)
    || !exactKeys(value.data, ['type', 'features'])
    || value.data.type !== 'FeatureCollection'
    || !Array.isArray(value.data.features)
    || !isMapSummary(value.summary)
  ) throw malformedResponse()

  const features = value.data.features.map(parseMapFeature)
  const pointCount = features.filter(({ geometry }) => geometry.type === 'Point').length
  if (pointCount !== value.summary.located) throw malformedResponse()

  return {
    scopeTeamName: value.scopeTeamName as string | null,
    data: {
      type: 'FeatureCollection',
      features,
    },
    summary: value.summary as SiteExplorationMapData['summary'],
  }
}

function isMapSummary(value: unknown): value is SiteExplorationMapData['summary'] {
  if (
    !isRecord(value)
    || !exactKeys(value, ['total', 'located', 'unlocated', 'byStatus'])
    || !isInteger(value.total, 0, Number.MAX_SAFE_INTEGER)
    || !isInteger(value.located, 0, Number.MAX_SAFE_INTEGER)
    || !isInteger(value.unlocated, 0, Number.MAX_SAFE_INTEGER)
    || value.located + value.unlocated !== value.total
    || !isRecord(value.byStatus)
    || !exactKeys(value.byStatus, siteExplorationStatuses)
  ) return false
  const byStatus = value.byStatus
  return siteExplorationStatuses.every((status) => (
    isInteger(byStatus[status], 0, Number.MAX_SAFE_INTEGER)
  )) && siteExplorationStatuses.reduce((total, status) => (
    total + Number(byStatus[status])
  ), 0) === value.total
}

function parseMapFeature(value: unknown): SiteExplorationMapFeature {
  if (
    !isRecord(value)
    || !exactKeys(value, ['type', 'id', 'geometry', 'properties'])
    || value.type !== 'Feature'
    || typeof value.id !== 'string'
    || !isRecord(value.geometry)
    || !exactKeys(value.geometry, ['type', 'coordinates'])
    || !isRecord(value.properties)
    || !exactKeys(value.properties, [
      'status',
      'explorerName',
      'explorationDate',
      'overallScore',
      'selectionRecommendation',
      'hasAnalysis',
      'projectName',
      'provinceCity',
      'countyDistrict',
      'locationAddress',
      'highwayDistanceMeters',
      'siteAreaSquareMeters',
      'trafficVisitCount',
      'arterialRoadDistanceMeters',
      'nearestRoadName',
      'uniqueTrafficVehicleCount',
      'nearbyChargingStationCount',
      'nearbyHotspotAreaCount',
    ])
    || !siteExplorationStatuses.includes(value.properties.status as SiteExplorationStatus)
    || !isBoundedString(value.properties.explorerName, 64, true)
    || !/^\d{4}-\d{2}-\d{2}$/.test(String(value.properties.explorationDate))
    || !isInteger(value.properties.overallScore, 0, 100)
    || !recommendations.includes(
      value.properties.selectionRecommendation as SiteSelectionRecommendation,
    )
    || typeof value.properties.hasAnalysis !== 'boolean'
    || !isBoundedString(value.properties.projectName, 128, true)
    || !isBoundedString(value.properties.provinceCity, 64, true)
    || !isBoundedString(value.properties.countyDistrict, 64, true)
    || !isBoundedString(value.properties.locationAddress, 255, true)
    || !isInteger(value.properties.highwayDistanceMeters, 0, 4_294_967_295)
    || !isFiniteNumber(value.properties.siteAreaSquareMeters, 0, 9_999_999_999.99)
    || !(value.properties.trafficVisitCount === null
      || isInteger(value.properties.trafficVisitCount, 0, Number.MAX_SAFE_INTEGER))
    || !isInteger(value.properties.arterialRoadDistanceMeters, 0, 4_294_967_295)
    || !(value.properties.nearestRoadName === null
      || isBoundedString(value.properties.nearestRoadName, 257, false))
    || !(value.properties.uniqueTrafficVehicleCount === null
      || isInteger(value.properties.uniqueTrafficVehicleCount, 0, Number.MAX_SAFE_INTEGER))
    || !isInteger(value.properties.nearbyChargingStationCount, 0, 20)
    || !isInteger(value.properties.nearbyHotspotAreaCount, 0, 100)
  ) throw malformedResponse()

  if (value.geometry.type === 'Point') {
    if (
      !/^[1-9]\d{0,19}$/.test(value.id)
      || !Array.isArray(value.geometry.coordinates)
      || value.geometry.coordinates.length !== 2
      || !isCoordinate(value.geometry.coordinates[0], -180, 180)
      || !isCoordinate(value.geometry.coordinates[1], -90, 90)
    ) throw malformedResponse()
  } else if (
    value.geometry.type !== 'Polygon'
    || !/^boundary:[1-9]\d{0,19}$/.test(value.id)
    || !isSiteBoundaryGeoJson({
      type: 'Feature',
      properties: {},
      geometry: value.geometry,
    })
  ) {
    throw malformedResponse()
  }
  return value as SiteExplorationMapFeature
}

const siteExplorationRecordBaseKeys = [
  'id',
  'status',
  'explorerName',
  'explorationTeamId',
  'explorationTeam',
  'explorationDate',
  'overallScore',
  'selectionRecommendation',
  'hasAnalysis',
  'projectName',
  'provinceCity',
  'countyDistrict',
  'locationSnapshot',
  'siteBoundarySnapshot',
  'createdAt',
  'updatedAt',
] as const

const siteExplorationListBaseKeys = [
  ...siteExplorationRecordBaseKeys,
  'satelliteImagePreview',
  'highwayDistanceMeters',
  'siteAreaSquareMeters',
  'trafficVisitCount',
  'arterialRoadDistanceMeters',
  'nearestRoadName',
  'uniqueTrafficVehicleCount',
  'nearbyChargingStationCount',
  'nearbyHotspotAreaCount',
] as const

type SiteExplorationListBase = Omit<
  SiteExplorationListItem,
  'completionCompleted' | 'completionTotal' | 'contractCompletionCompleted' | 'contractCompletionTotal'
>

type SiteExplorationRecordBase = Omit<
  SiteExplorationListBase,
  | 'satelliteImagePreview'
  | 'highwayDistanceMeters'
  | 'siteAreaSquareMeters'
  | 'trafficVisitCount'
  | 'arterialRoadDistanceMeters'
  | 'nearestRoadName'
  | 'uniqueTrafficVehicleCount'
  | 'nearbyChargingStationCount'
  | 'nearbyHotspotAreaCount'
>

function parseRecordBase(value: unknown): SiteExplorationRecordBase {
  if (
    !isRecord(value)
    || !exactKeys(value, siteExplorationRecordBaseKeys)
    || !isString(value.id)
    || !siteExplorationStatuses.includes(value.status as SiteExplorationStatus)
    || !isString(value.explorerName)
    || !isOptionalId(value.explorationTeamId)
    || !isString(value.explorationTeam)
    || !/^\d{4}-\d{2}-\d{2}$/.test(String(value.explorationDate))
    || !isInteger(value.overallScore, 0, 100)
    || !recommendations.includes(value.selectionRecommendation as SiteSelectionRecommendation)
    || typeof value.hasAnalysis !== 'boolean'
    || !isString(value.projectName)
    || !isString(value.provinceCity)
    || !isString(value.countyDistrict)
    || !(value.locationSnapshot === null || isSiteExplorationImage(value.locationSnapshot))
    || !(value.siteBoundarySnapshot === null || isSiteExplorationImage(value.siteBoundarySnapshot))
    || !isInteger(value.createdAt, 0, Number.MAX_SAFE_INTEGER)
    || !isInteger(value.updatedAt, 0, Number.MAX_SAFE_INTEGER)
  ) throw malformedResponse()

  return value as SiteExplorationRecordBase
}

function parseListBase(value: unknown): SiteExplorationListBase {
  if (
    !isRecord(value)
    || !exactKeys(value, siteExplorationListBaseKeys)
    || !(value.satelliteImagePreview === null || isSiteExplorationImage(value.satelliteImagePreview))
    || !isInteger(value.highwayDistanceMeters, 0, 4_294_967_295)
    || !isFiniteNumber(value.siteAreaSquareMeters, 0, 9_999_999_999.99)
    || !(value.trafficVisitCount === null
      || isInteger(value.trafficVisitCount, 0, Number.MAX_SAFE_INTEGER))
    || !isInteger(value.arterialRoadDistanceMeters, 0, 4_294_967_295)
    || !(value.nearestRoadName === null || isBoundedString(value.nearestRoadName, 257, false))
    || !(value.uniqueTrafficVehicleCount === null
      || isInteger(value.uniqueTrafficVehicleCount, 0, Number.MAX_SAFE_INTEGER))
    || !isInteger(value.nearbyChargingStationCount, 0, 20)
    || !isInteger(value.nearbyHotspotAreaCount, 0, 100)
  ) throw malformedResponse()

  return {
    ...parseRecordBase(pick(value, siteExplorationRecordBaseKeys)),
    satelliteImagePreview: value.satelliteImagePreview,
    highwayDistanceMeters: value.highwayDistanceMeters,
    siteAreaSquareMeters: value.siteAreaSquareMeters,
    trafficVisitCount: value.trafficVisitCount,
    arterialRoadDistanceMeters: value.arterialRoadDistanceMeters,
    nearestRoadName: value.nearestRoadName,
    uniqueTrafficVehicleCount: value.uniqueTrafficVehicleCount,
    nearbyChargingStationCount: value.nearbyChargingStationCount,
    nearbyHotspotAreaCount: value.nearbyHotspotAreaCount,
  }
}

function parseListItem(value: unknown): SiteExplorationListItem {
  if (
    !isRecord(value)
    || !exactKeys(value, [
      ...siteExplorationListBaseKeys,
      'completionCompleted',
      'completionTotal',
      'contractCompletionCompleted',
      'contractCompletionTotal',
    ])
    || !isInteger(value.completionTotal, 1, 100)
    || !isInteger(value.completionCompleted, 0, value.completionTotal as number)
    || !isInteger(value.contractCompletionTotal, 1, 100)
    || !isInteger(value.contractCompletionCompleted, 0, value.contractCompletionTotal as number)
  ) throw malformedResponse()

  return {
    ...parseListBase(pick(value, siteExplorationListBaseKeys)),
    completionCompleted: value.completionCompleted,
    completionTotal: value.completionTotal,
    contractCompletionCompleted: value.contractCompletionCompleted,
    contractCompletionTotal: value.contractCompletionTotal,
  } as SiteExplorationListItem
}

function parseRecord(value: unknown): SiteExplorationRecord {
  if (!isRecord(value)) throw malformedResponse()
  const list = parseRecordBase(pick(value, siteExplorationRecordBaseKeys))
  const stringFields = [
    'contractDate', 'contactName', 'contactPhone', 'locationAddress', 'landTypeDescription', 'capacityDescription',
    'transportCapacityDescription', 'cooperationTerms',
    'importantNotes',
    'chargingPileModel', 'transformerCapacity', 'preliminaryDesignNotes',
    'createdByMemberId', 'createdByMemberName', 'updatedByMemberId', 'updatedByMemberName',
  ] as const
  const numberFields = ['longitude', 'latitude', 'highwayDistanceMeters', 'siteAreaSquareMeters', 'arterialRoadDistanceMeters'] as const
  const booleanFields = ['landQualified', 'hasLandProof', 'hasLeaseAgreement', 'hasOtherStructures'] as const
  if (
    stringFields.some((field) => typeof value[field] !== 'string')
    || numberFields.some((field) => typeof value[field] !== 'number' || !Number.isFinite(value[field]))
    || booleanFields.some((field) => typeof value[field] !== 'boolean')
    || !(value.contractDate === '' || isCalendarDate(value.contractDate))
    || !(value.latestAnalysisTaskId === null
      || (typeof value.latestAnalysisTaskId === 'string'
        && /^[1-9]\d{0,19}$/.test(value.latestAnalysisTaskId)))
    || !['', 'excellent', 'good', 'average'].includes(String(value.accessConvenience))
    || !['', 'construction', 'collective-commercial', 'allocated', 'other'].includes(String(value.landType))
    || !['', 'good', 'needs-hardening', 'unhardened'].includes(String(value.groundHardening))
    || !['', 'well-drained', 'flat', 'low-lying'].includes(String(value.terrainCondition))
    || !['', 'service-fee-share', 'net-profit-share', 'fixed-rent'].includes(String(value.cooperationMode))
    || !['', 'a', 'b', 'c'].includes(String(value.siteMaturity))
    || !['', '10kv', '0.4kv'].includes(String(value.powerAccessMethod))
    || !['', 'industrial', 'commercial'].includes(String(value.electricityNature))
    || !['', 'new-box-transformer', 'distribution-room'].includes(String(value.highVoltageAccessMethod))
    || !isSiteExplorationCompetitors(value.competitors)
    || !['', 'priority-construction', 'buildable', 'reserve', 'abandon'].includes(String(value.surveyRecommendation))
    || !(value.tenKvLineAccessDistanceMeters === null
      || isFiniteNumber(value.tenKvLineAccessDistanceMeters, 0, 4_294_967_295))
    || !(value.chargingPileQuantity === null
      || isInteger(value.chargingPileQuantity, 0, 4_294_967_295))
    || !(value.transformerQuantity === null
      || isInteger(value.transformerQuantity, 0, 4_294_967_295))
    || !(value.locationSnapshot === null || isSiteExplorationImage(value.locationSnapshot))
    || !isNearbyTruckChargingStations(value.nearbyTruckChargingStations)
    || !(value.nearbyTruckChargingStationSnapshot === null
      || isSiteExplorationImage(value.nearbyTruckChargingStationSnapshot))
    || !isNearbyTaskStations(value.nearbyTaskStations)
    || !(value.nearbyTaskStationSnapshot === null
      || isSiteExplorationImage(value.nearbyTaskStationSnapshot))
    || !isNearbyHotspotAreas(value.nearbyHotspotAreas)
    || !(value.nearbyHotspotAreaSnapshot === null
      || isSiteExplorationImage(value.nearbyHotspotAreaSnapshot))
    || !isSiteDistanceGeoJson(value.highwayDistanceGeoJson)
    || !(value.highwayDistanceSnapshot === null || isSiteExplorationImage(value.highwayDistanceSnapshot))
    || !isHighwayEntrance(value.highwayEntrance)
    || !isHighwayRoutes(value.highwayRoutes)
    || !isSiteBoundaryGeoJson(value.siteBoundaryGeoJson)
    || !(value.siteBoundarySnapshot === null || isSiteExplorationImage(value.siteBoundarySnapshot))
    || !isSiteDistanceGeoJson(value.arterialRoadDistanceGeoJson)
    || !(value.arterialRoadDistanceSnapshot === null || isSiteExplorationImage(value.arterialRoadDistanceSnapshot))
    || !isArterialRoadTrafficGeoJson(value.arterialRoadTrafficGeoJson)
    || !isSiteExplorationConstruction(value.construction)
  ) throw malformedResponse()
  const imageFields: SiteExplorationImageField[] = ['satelliteImages', 'accessConvenienceImages', 'landSceneImages', 'otherStructureImages']
  const images = Object.fromEntries(imageFields.map((field) => [field, parseImages(value[field])]))
  const attachmentFields = [
    'landOwnershipDocuments', 'leaseAgreementDocuments', 'surveyDeterminationReports',
    'sourceSatelliteAttachments', 'sourceAccessConvenienceAttachments',
    'sourceLandSceneAttachments', 'sourceOtherStructureAttachments',
  ] as const
  const attachments = Object.fromEntries(attachmentFields.map((field) => [field, parseAttachments(value[field])]))
  return { ...value, ...list, ...images, ...attachments } as SiteExplorationRecord
}

function isSiteExplorationCompetitors(value: unknown): value is SiteExplorationCompetitor[] {
  return Array.isArray(value)
    && value.length >= 1
    && value.length <= 20
    && value.every((competitor) => isRecord(competitor)
      && exactKeys(competitor, ['stationName', 'scale', 'modelQuantity', 'utilizationRate', 'electricityPrice'])
      && typeof competitor.stationName === 'string'
      && typeof competitor.scale === 'string'
      && typeof competitor.modelQuantity === 'string'
      && ['', '低', '中', '高', '较高', '非常高'].includes(String(competitor.utilizationRate))
      && typeof competitor.electricityPrice === 'string')
}

function isSiteExplorationConstruction(value: unknown): value is SiteExplorationConstruction {
  return isRecord(value)
    && exactKeys(value, [
      'constructionStatus', 'constructionEntity', 'stationType', 'driverHomeProvision',
      'chargingEquipmentCapacityKva', 'batterySwapEquipmentCapacityKva',
      'photovoltaicCapacityKw', 'energyStorageCapacityKwh',
    ])
    && ['', 'not-started', 'under-construction', 'completed'].includes(String(value.constructionStatus))
    && typeof value.constructionEntity === 'string'
    && typeof value.stationType === 'string'
    && ['', 'no', 'yes'].includes(String(value.driverHomeProvision))
    && [
      value.chargingEquipmentCapacityKva,
      value.batterySwapEquipmentCapacityKva,
      value.photovoltaicCapacityKw,
      value.energyStorageCapacityKwh,
    ].every((capacity) => typeof capacity === 'number' && Number.isFinite(capacity) && capacity >= 0)
}

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function isHighwayEntrance(value: unknown): value is HighwayEntrance | null {
  if (value === null) return true
  return isRecord(value)
    && exactKeys(value, ['poiId', 'name', 'address', 'longitude', 'latitude'])
    && typeof value.poiId === 'string'
    && typeof value.name === 'string'
    && typeof value.address === 'string'
    && typeof value.longitude === 'number'
    && Number.isFinite(value.longitude)
    && typeof value.latitude === 'number'
    && Number.isFinite(value.latitude)
}

function isHighwayRoutes(value: unknown): value is HighwayRoute[] {
  if (!Array.isArray(value) || value.length > 3) return false
  const poiIds = new Set<string>()
  let previousDistance = -1
  let previousPoiId = ''
  return value.every((route) => {
    if (
      !isRecord(route)
      || !exactKeys(route, [
        'poiId', 'name', 'address', 'longitude', 'latitude',
        'straightLineDistanceMeters', 'drivingDistanceMeters', 'geoJson',
      ])
      || !isHighwayEntrance({
        poiId: route.poiId,
        name: route.name,
        address: route.address,
        longitude: route.longitude,
        latitude: route.latitude,
      })
      || !isInteger(route.straightLineDistanceMeters, 1, HIGHWAY_DISTANCE_SEARCH_RADIUS_METERS)
      || !isInteger(route.drivingDistanceMeters, 1, HIGHWAY_DISTANCE_SEARCH_RADIUS_METERS)
      || !isSiteDistanceGeoJson(route.geoJson)
      || route.geoJson === null
      || poiIds.has(route.poiId as string)
      || route.straightLineDistanceMeters < previousDistance
      || (route.straightLineDistanceMeters === previousDistance
        && (route.poiId as string).localeCompare(previousPoiId) <= 0)
    ) return false
    poiIds.add(route.poiId as string)
    previousDistance = route.straightLineDistanceMeters as number
    previousPoiId = route.poiId as string
    return true
  })
}

function isSiteDistanceGeoJson(value: unknown): value is SiteDistanceGeoJson | null {
  if (value === null) return true
  if (
    !isRecord(value)
    || !exactKeys(value, ['type', 'properties', 'geometry'])
    || value.type !== 'Feature'
    || !isRecord(value.properties)
    || Object.keys(value.properties).length !== 0
    || !isRecord(value.geometry)
    || !exactKeys(value.geometry, ['type', 'coordinates'])
    || value.geometry.type !== 'LineString'
    || !Array.isArray(value.geometry.coordinates)
    || value.geometry.coordinates.length < 2
  ) return false

  return value.geometry.coordinates.every((position) => (
    Array.isArray(position)
    && position.length >= 2
    && position.length <= 3
    && position.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate))
  ))
}

function isArterialRoadTrafficGeoJson(value: unknown): value is ArterialRoadTrafficGeoJson | null {
  if (value === null) return true
  if (!isRecord(value) || !isRecord(value.properties)) return false
  return isSiteDistanceGeoJson({ ...value, properties: {} })
}

function isSiteBoundaryGeoJson(value: unknown): value is SiteBoundaryGeoJson | null {
  if (value === null) return true
  if (
    !isRecord(value)
    || !exactKeys(value, ['type', 'properties', 'geometry'])
    || value.type !== 'Feature'
    || !isRecord(value.properties)
    || Object.keys(value.properties).length !== 0
    || !isRecord(value.geometry)
    || !exactKeys(value.geometry, ['type', 'coordinates'])
    || value.geometry.type !== 'Polygon'
    || !Array.isArray(value.geometry.coordinates)
    || value.geometry.coordinates.length < 1
  ) return false

  return value.geometry.coordinates.every((ring) => (
    Array.isArray(ring)
    && ring.length >= 4
    && ring.every((position) => (
      Array.isArray(position)
      && position.length >= 2
      && position.length <= 3
      && position.every((coordinate) => typeof coordinate === 'number' && Number.isFinite(coordinate))
    ))
  ))
}

function isNearbyTruckChargingStations(
  value: unknown,
): value is NearbyTruckChargingStation[] {
  if (!Array.isArray(value) || value.length > 20) return false
  let previousSequence = 0
  return value.every((station) => {
    if (
      !isRecord(station)
      || !exactKeys(station, [
        'sequence', 'id', 'name', 'address', 'longitude', 'latitude', 'distanceMeters', 'type', 'category',
        'surveyScale', 'surveyModelQuantity', 'surveyUtilizationRate', 'surveyElectricityPrice',
      ])
      || !isInteger(station.sequence, 1, 20)
      || !isString(station.id)
      || station.id.length > 128
      || !isString(station.name)
      || station.name.length > 128
      || !isString(station.address)
      || station.address.length > 512
      || !isFiniteNumber(station.longitude, -180, 180)
      || !isFiniteNumber(station.latitude, -90, 90)
      || !(station.distanceMeters === null || isFiniteNumber(station.distanceMeters, 0, 100_000))
      || !isString(station.type)
      || station.type.length > 255
      || !isString(station.category)
      || station.category.length === 0
      || station.category.length > 64
      || !isString(station.surveyScale)
      || station.surveyScale.length > 255
      || !isString(station.surveyModelQuantity)
      || station.surveyModelQuantity.length > 255
      || !['', '低', '中', '高', '较高', '非常高'].includes(String(station.surveyUtilizationRate))
      || !isString(station.surveyElectricityPrice)
      || station.surveyElectricityPrice.length > 1000
      || station.sequence <= previousSequence
    ) return false
    previousSequence = station.sequence
    return true
  })
}

function isNearbyHotspotAreas(value: unknown): value is NearbyHotspotArea[] {
  if (!Array.isArray(value) || value.length > 100) return false
  let previousSequence = 0
  return value.every((hotspot) => {
    if (
      !isRecord(hotspot)
      || !exactKeys(hotspot, [
        'sequence', 'id', 'name', 'address', 'longitude', 'latitude', 'distanceMeters', 'type', 'category',
      ])
      || !isInteger(hotspot.sequence, 1, 100)
      || !isString(hotspot.id)
      || hotspot.id.length > 128
      || !isString(hotspot.name)
      || hotspot.name.length > 128
      || !isString(hotspot.address)
      || hotspot.address.length > 512
      || !isFiniteNumber(hotspot.longitude, -180, 180)
      || !isFiniteNumber(hotspot.latitude, -90, 90)
      || !(hotspot.distanceMeters === null || isFiniteNumber(hotspot.distanceMeters, 0, 100_000))
      || !isString(hotspot.type)
      || hotspot.type.length > 255
      || !isString(hotspot.category)
      || !nearbyHotspotAreaCategories.includes(
        hotspot.category as (typeof nearbyHotspotAreaCategories)[number],
      )
      || hotspot.sequence <= previousSequence
    ) return false
    previousSequence = hotspot.sequence
    return true
  })
}

function isNearbyTaskStations(value: unknown): value is NearbyTaskStation[] {
  return isNearbyPlaces(value, 100, (station) => (
    /^[1-9]\d{0,19}$/.test(station.id)
    && station.category === '任务站点'
    && ['incomplete', 'completed'].includes(station.type)
    && station.distanceMeters !== null
    && station.distanceMeters <= 5_000
  ))
}

function isNearbyPlaces(
  value: unknown,
  maximum: number,
  additionalValidation: (place: NearbyPlace) => boolean,
): value is NearbyPlace[] {
  if (!Array.isArray(value) || value.length > maximum) return false
  let previousSequence = 0
  return value.every((place) => {
    if (
      !isRecord(place)
      || !exactKeys(place, [
        'sequence', 'id', 'name', 'address', 'longitude', 'latitude', 'distanceMeters', 'type', 'category',
      ])
      || !isInteger(place.sequence, 1, maximum)
      || !isString(place.id)
      || !isString(place.name)
      || !isString(place.address)
      || !isFiniteNumber(place.longitude, -180, 180)
      || !isFiniteNumber(place.latitude, -90, 90)
      || !(place.distanceMeters === null || isFiniteNumber(place.distanceMeters, 0, 100_000))
      || !isString(place.type)
      || !isString(place.category)
      || place.sequence <= previousSequence
    ) return false
    previousSequence = place.sequence
    return additionalValidation(place as NearbyTruckChargingStation)
  })
}

function parseImages(value: unknown): SiteExplorationImage[] {
  if (!Array.isArray(value)) throw malformedResponse()
  return value.map(parseImage)
}

function parseImage(value: unknown): SiteExplorationImage {
  if (!isSiteExplorationImage(value)) throw malformedResponse()
  return value
}

function isSiteExplorationImage(value: unknown): value is SiteExplorationImage {
  return isRecord(value)
    && exactKeys(value, ['objectKey', 'url', 'originalName', 'contentType', 'size'])
    && isString(value.objectKey)
    && isString(value.url)
    && isString(value.originalName)
    && ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(String(value.contentType))
    && isInteger(value.size, 1, MAX_SITE_EXPLORATION_FILE_BYTES)
}

function parseAttachments(value: unknown): SiteExplorationAttachment[] {
  if (!Array.isArray(value) || value.length > 100) throw malformedResponse()
  return value.map((attachment) => {
    if (!isSiteExplorationAttachment(attachment)) throw malformedResponse()
    return attachment
  })
}

function isSiteExplorationAttachment(value: unknown): value is SiteExplorationAttachment {
  return isRecord(value)
    && exactKeys(value, ['objectKey', 'url', 'originalName', 'contentType', 'size'])
    && isString(value.objectKey)
    && isString(value.url)
    && isString(value.originalName)
    && [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
      'video/mp4',
      'video/quicktime',
    ].includes(String(value.contentType))
    && isInteger(value.size, 1, 300 * 1024 * 1024)
}

function parseUploadSession(value: unknown): SiteExplorationUploadSession {
  if (
    !isRecord(value)
    || !exactKeys(value, ['ticket', 'objectKey', 'region', 'endpoint', 'bucket', 'credentials'])
    || !isBoundedString(value.ticket, 4096, false)
    || !isBoundedString(value.objectKey, 512, false)
    || !isBoundedString(value.region, 64, false)
    || !isHttpUrl(value.endpoint)
    || !isBoundedString(value.bucket, 64, false)
    || !isRecord(value.credentials)
    || !exactKeys(value.credentials, ['accessKeyId', 'accessKeySecret', 'securityToken', 'expiresAt'])
    || !isBoundedString(value.credentials.accessKeyId, 256, false)
    || !isBoundedString(value.credentials.accessKeySecret, 256, false)
    || !isBoundedString(value.credentials.securityToken, 8192, false)
    || typeof value.credentials.expiresAt !== 'string'
    || !Number.isFinite(Date.parse(value.credentials.expiresAt))
  ) throw malformedResponse()
  return value as SiteExplorationUploadSession
}

function pick(value: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(keys.map((key) => [key, value[key]]))
}

function base64Url(value: string): string {
  const bytes = new TextEncoder().encode(value)
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function malformedResponse(): Error {
  return new Error('malformed_site_exploration_response')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort()
  return actual.length === expected.length
    && actual.every((key, index) => key === [...expected].sort()[index])
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const parsed = new URL(value)
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:')
      && !parsed.username
      && !parsed.password
  } catch {
    return false
  }
}

function isOptionalId(value: unknown): value is string {
  return value === '' || (typeof value === 'string' && /^[1-9]\d{0,19}$/.test(value) && BigInt(value) <= 18_446_744_073_709_551_615n)
}

function isInteger(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max
}

function isFiniteNumber(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

function isCoordinate(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max
}

function isBoundedString(value: unknown, maxLength: number, allowEmpty: boolean): value is string {
  return typeof value === 'string'
    && value.length <= maxLength
    && (allowEmpty || value.trim().length > 0)
}
