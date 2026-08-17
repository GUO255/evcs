import { useDeferredValue, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { wgs84ToGcj02 } from '@evcs/geo-coordinates'
import { centerOfMass } from '@turf/center-of-mass'
import circle from '@turf/circle'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { toast } from 'sonner'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  CursorIcon,
  LoaderCircleIcon,
  MapIcon,
  MapPinIcon,
  MapPinnedIcon,
  MaximizeIcon,
  MinimizeIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  PolylineIcon,
  RefreshCwIcon,
  RulerIcon,
  Trash2Icon,
  VectorSquareIcon,
  XIcon,
} from '@/components/ui/icons'
import maplibregl, { type GeoJSONSourceSpecification, type MapGeoJSONFeature } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  TerraDraw,
  TerraDrawLineStringMode,
  TerraDrawPolygonMode,
  TerraDrawRenderMode,
  TerraDrawSelectMode,
  type TerraDrawEventListeners,
  type GeoJSONStoreFeatures,
} from 'terra-draw'
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { env } from '@/config/env'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  createSiteExplorationDraft,
  getSiteExplorationSite,
  getSiteExplorationMapData,
  listSiteExplorationFilterOptions,
  nearbyHotspotAreaCategories,
  siteExplorationErrorMessage,
  siteExplorationRecordToInput,
  updateSiteExplorationSite,
  type SiteExplorationInput,
  type SiteExplorationFilterQuery,
  type SiteExplorationMapBoundaryFeature,
  type SiteExplorationMapFeature,
  type SiteExplorationMapPointFeature,
  type SiteExplorationRecord,
} from '@/features/site-planning/site-exploration-api'
import { siteExplorationChargingStationIconDefinition } from '@/features/site-planning/site-exploration-charging-station-icon'
import { SiteExplorationEditDialog } from '@/features/site-planning/site-exploration-edit-dialog'
import { getSiteExplorationHotspotIconDefinition } from '@/features/site-planning/site-exploration-hotspot-icon'
import { SiteExplorationRecordSummary } from '@/features/site-planning/site-exploration-record-summary'
import { SiteExplorationStatusBadge } from '@/features/site-planning/site-exploration-status-badge'
import {
  getSiteExplorationStatusConfig,
  getSiteExplorationStatusIconName,
  siteExplorationStatusConfig,
} from '@/features/site-planning/site-exploration-status-config'
import {
  siteExplorationStatusOptions,
  type SiteExplorationStatus,
} from '@/features/site-planning/site-exploration-data'
import { createEmptySiteExplorationInput } from '@/features/site-planning/site-exploration-fields'
import {
  applyConfirmedSiteExplorationLocation,
  SiteExplorationLocationPicker,
  type SiteExplorationConfirmedLocation,
} from '@/features/site-planning/site-exploration-location-picker'
import {
  calculateGreatCircleDistance,
  calculatePolygonAreaSquareMeters,
  calculatePolygonPerimeterMeters,
  findPathMidpoint,
} from '@/features/site-planning/site-exploration-geometry'
import {
  getSiteInventoryStatusLabel,
  getSiteInventoryTypeLabel,
} from '@/features/site-planning/site-inventory-data'
import {
  getSiteInventoryMapData,
  siteInventoryErrorMessage,
  type SiteInventoryLayerCategory,
  type SiteInventoryMapFeature,
} from '@/features/site-planning/site-inventory-api'
import {
  siteInventoryMapLayerOptions,
} from '@/features/site-planning/site-inventory-map-layer-options'
import { getSiteSelectionRecommendationBand } from '@/features/site-planning/site-selection-recommendation-config'
import { cn } from '@/lib/utils'

import henanAdministrativeBoundaries from './henan-administrative-boundaries.json'
import {
  getAnalysisMapSites,
  type AnalysisMapSite,
} from './site-selection-analysis-api'
import {
  SiteSelectionSiteDetailTabs,
  type SiteSelectionSiteDetailTab,
} from './site-selection-site-detail-dialog'
import {
  readMapLayerVisibility,
  restoreVisibilityRecord,
  writeMapLayerVisibility,
  type MapLayerVisibilitySnapshot,
} from './map-layer-visibility-storage'
import {
  createMapDrawing,
  deleteMapDrawing,
  listAllMapDrawings,
  mapDrawingErrorMessage,
  updateMapDrawing,
  type MapDrawing,
  type MapDrawingCorridorType,
  type MapDrawingGeoJson,
} from './site-selection-map-drawing-api'
import {
  getSiteSelectionTrafficHeatmap,
  trafficHeatmapEndDate,
  trafficHeatmapErrorMessage,
  trafficHeatmapStartDate,
} from './site-selection-traffic-heatmap-api'
import {
  dailyAverageTrafficErrorMessage,
  getSiteSelectionDailyAverageTraffic,
} from './site-selection-daily-average-traffic-api'
import {
  extractRoadRouteRef,
  getSiteSelectionRoadSegmentTraffic,
  roadSegmentTrafficErrorMessage,
  type SiteSelectionRoadSegmentTraffic,
} from './site-selection-road-segment-traffic-api'
import {
  registerSiteSelectionTrafficRasterProtocols,
  toSiteSelectionTrafficRasterUrl,
} from './site-selection-traffic-raster-color'
import { TiandituLocationCommand } from './tianditu-location-command'
import type { TiandituLocationSearchResult } from './tianditu-location-search'
import {
  reverseGeocodeTiandituLocation,
  tiandituReverseGeocodingErrorMessage,
  type TiandituReverseGeocodingResult,
} from './tianditu-reverse-geocoding'
import { createTiandituStyle } from './tianditu-map-style'
import { SiteSelectionMapStationPanel } from './site-selection-map-station-panel'
import {
  createTaskSiteFilterOptions,
  filterTaskSites,
  type TaskSiteFilters,
} from './site-selection-map-task-filters'

type MapStatus = 'loading' | 'ready' | 'error'
type ActiveMapPanel = 'stations' | 'layers' | null
type BaseMapType = 'road' | 'satellite'
type DrawingMode = 'linestring' | 'polygon'
type DrawingPurpose = 'custom'
type DrawingFeatureId = string | number
type PendingDrawing = {
  featureId: DrawingFeatureId
  geometryType: 'LineString' | 'Polygon'
}
type SelectedMapPoint = {
  source: 'map' | 'search' | 'location'
  longitude: number
  latitude: number
  location: TiandituReverseGeocodingResult | null
  locationAddress: string | null
  locationError: string | null
}
type LocationSearchMarkerRecord = {
  resultId: string
  marker: maplibregl.Marker
  button: HTMLButtonElement
  icon: HTMLImageElement
}
type AnalysisMapMarkerRecord = {
  marker: maplibregl.Marker
  element: HTMLDivElement
  taskId: string
  updatedAt: number
}
type AnalysisMarkerRoute = {
  points: [number, number][]
  cumulativeDistances: number[]
  totalDistanceMeters: number
}
type AnalysisMarkerMotion = {
  marker: maplibregl.Marker
  taskId: string
  route: AnalysisMarkerRoute
  home: [number, number]
  phase: 'patrolling' | 'returning'
  startedAt: number
  lapDurationMs: number
  returnFrom: [number, number] | null
  returnStartedAt: number
  returnDurationMs: number
  nextPauseAt: number
  pauseStartedAt: number
  pausedUntil: number
  totalPausedMs: number
  isAtHome: boolean
}
type ExplorationMapMarkerRecord = {
  marker: maplibregl.Marker
  element: HTMLButtonElement
}
type ExplorationBoundaryEditor = {
  record: SiteExplorationRecord
  featureId: DrawingFeatureId
}

const corridorTypeOptions = [
  { value: 'main', label: '主通道' },
  { value: 'secondary', label: '次通道' },
  { value: 'branch', label: '支线通道' },
] as const satisfies readonly { value: MapDrawingCorridorType; label: string }[]
type DrawingLabelFeature = {
  type: 'Feature'
  id: string
  properties: {
    name: string
    remark: string
    visible: boolean
  }
  geometry:
    | Extract<MapDrawingGeoJson['geometry'], { type: 'LineString' }>
    | { type: 'Point'; coordinates: [number, number] }
}
type InventoryStationIconAsset = HTMLImageElement | ImageBitmap

const roadBaseLayerIds = ['tianditu-vector', 'tianditu-vector-labels'] as const
const satelliteBaseLayerIds = ['tianditu-satellite', 'tianditu-satellite-labels'] as const
const measurementSourceId = 'site-selection-measurement'
const measurementLineLayerId = 'site-selection-measurement-line'
const measurementPointLayerId = 'site-selection-measurement-points'
const measurementLabelLayerId = 'site-selection-measurement-labels'
const inventoryStationSourceId = 'site-selection-inventory-stations'
const inventoryStationPointLayerId = 'site-selection-inventory-station-points'
const inventoryStationLabelLayerId = 'site-selection-inventory-station-labels'
const explorationSiteSourceId = 'site-selection-exploration-sites'
const explorationSiteLabelSourceId = 'site-selection-exploration-site-labels'
const explorationSiteBoundaryFillLayerId = 'site-selection-exploration-site-boundary-fill'
const explorationSiteBoundaryLineLayerId = 'site-selection-exploration-site-boundary-line'
const explorationSiteBoundarySelectionLayerId = 'site-selection-exploration-site-boundary-selection'
const explorationSiteEdgeLabelLayerId = 'site-selection-exploration-site-edge-labels'
const explorationSiteCenterLabelLayerId = 'site-selection-exploration-site-center-labels'
const explorationSiteNameLabelLayerId = 'site-selection-exploration-site-name-labels'
const explorationSiteShadowLayerId = 'site-selection-exploration-site-shadows'
const explorationSiteStatusIconLayerId = 'site-selection-exploration-site-status-icons'
const inventoryStationMinZoom = 7
const inventoryStationMaxZoom = 18
const inventoryStationMinIconSize = 0.34
const inventoryStationMaxIconSize = 0.56
const selectedInventoryStationMinIconSize = 0.44
const selectedInventoryStationMaxIconSize = 0.72
const inventoryStationMinTextSize = 10
const inventoryStationMaxTextSize = 14
const explorationSiteIconSize = 1.1
const selectedExplorationSiteIconSize = 1.4
const trafficHeatmapSourceId = 'site-selection-traffic-heatmap-source'
const trafficHeatmapLayerId = 'site-selection-traffic-heatmap'
const administrativeBoundarySourceId = 'henan-administrative-boundaries'
const cityBoundaryLayerId = 'henan-city-boundaries'
const provinceBoundaryLayerId = 'henan-province-boundary'
const selectedExplorationContextSourceId = 'site-selection-selected-exploration-context'
const selectedExplorationRadiusFillLayerId = 'site-selection-selected-exploration-radius-fill'
const selectedExplorationRadiusLineLayerId = 'site-selection-selected-exploration-radius-line'
const selectedExplorationDistanceLayerId = 'site-selection-selected-exploration-distances'
const selectedExplorationDistanceLabelLayerId = 'site-selection-selected-exploration-distance-labels'
const selectedExplorationChargingStationIconLayerId = 'site-selection-selected-exploration-charging-station-icons'
const selectedExplorationChargingStationLabelLayerId = 'site-selection-selected-exploration-charging-station-labels'
const selectedExplorationHotspotIconLayerId = 'site-selection-selected-exploration-hotspot-icons'
const selectedExplorationHotspotLabelLayerId = 'site-selection-selected-exploration-hotspot-labels'
const roadMatchingNetworkSourceId = 'henan-road-matching-network'
const roadMatchingNationalLayerId = 'henan-road-matching-network-national'
const roadMatchingProvincialLayerId = 'henan-road-matching-network-provincial'
const roadMatchingNetworkUrl = '/map/henan-ordinary-trunk-road-segments-1km.geojson'
const fiveVerticalSixHorizontalSourceId = 'henan-five-vertical-six-horizontal'
const fiveVerticalSixHorizontalLineLayerId = 'henan-five-vertical-six-horizontal-lines'
const fiveVerticalSixHorizontalLabelLayerId = 'henan-five-vertical-six-horizontal-labels'
const fiveVerticalSixHorizontalUrl = '/map/五纵六横.geojson'
const selectedRoadSegmentSourceId = 'site-selection-selected-road-segment'
const selectedRoadSegmentCasingLayerId = 'site-selection-selected-road-segment-casing'
const selectedRoadSegmentLineLayerId = 'site-selection-selected-road-segment-line'
const selectedRoadSegmentLabelLayerId = 'site-selection-selected-road-segment-label'
const drawingLabelSourceId = 'site-selection-drawing-labels'
const drawingAreaLabelLayerId = 'site-selection-drawing-area-labels'
const drawingLineLabelLayerId = 'site-selection-drawing-line-labels'
const analysisMarkerMotionMinZoom = 9
const analysisMarkerMetersPerSecond = 15
const analysisMarkerMinLapDurationMs = 24_000
const analysisMarkerMaxLapDurationMs = 50_000
const analysisMarkerMinReturnDurationMs = 900
const analysisMarkerMaxReturnDurationMs = 2_400
const analysisMarkerMinPauseIntervalMs = 20_000
const analysisMarkerMaxPauseIntervalMs = 30_000
const analysisMarkerMinPauseDurationMs = 1_000
const analysisMarkerMaxPauseDurationMs = 2_000
type BasicMapLayerKey =
  | 'traffic-hotspots'
  | 'road-matching-network'
  | 'five-vertical-six-horizontal'
type InventoryLayerCategory = SiteInventoryLayerCategory

const basicMapLayerOptions = [
  { id: 'traffic-hotspots', label: '车流热力图', indicatorClassName: 'size-3 rounded-sm bg-[linear-gradient(135deg,#38bdf8,#22c55e,#facc15,#ef4444)]' },
  { id: 'road-matching-network', label: '国省道匹配路网', indicatorClassName: 'h-0.5 w-3 bg-[linear-gradient(90deg,#2563eb_0_50%,#f97316_50%)]' },
  { id: 'five-vertical-six-horizontal', label: '五纵六横', indicatorClassName: 'h-1 w-3 rounded-full bg-red-500/70' },
] as const satisfies readonly {
  id: BasicMapLayerKey
  label: string
  indicatorClassName: string
}[]

const inventoryLayerOptions = siteInventoryMapLayerOptions

const cityLayerOptions = henanAdministrativeBoundaries.features
  .filter((feature) => feature.properties.level === 'city')
  .map((feature) => feature.properties.name)
  .sort((left, right) => left.localeCompare(right, 'zh-CN'))
const provinceRegionOption = '河南省'

const mapLayerGroupIds = {
  basic: 'site-selection-basic-layer-group',
  inventory: 'site-selection-inventory-layer-group',
  exploration: 'site-selection-exploration-layer-group',
  customAreas: 'site-selection-custom-area-layer-group',
  customLines: 'site-selection-custom-line-layer-group',
} as const

function createDefaultLayerVisibility(): MapLayerVisibilitySnapshot {
  return {
    groupExpansion: createVisibilityRecord(Object.values(mapLayerGroupIds)),
    basicLayers: {
      ...createVisibilityRecord(basicMapLayerOptions.map((option) => option.id)),
      'traffic-hotspots': false,
      'road-matching-network': false,
    },
    inventoryLayers: createVisibilityRecord(inventoryLayerOptions.map((option) => option.id)),
    explorationStatuses: createVisibilityRecord(
      siteExplorationStatusOptions.map((option) => option.value),
    ),
    customDrawings: {},
  }
}

export function SiteSelectionMapCard() {
  const queryClient = useQueryClient()
  const shouldReduceMotion = useReducedMotion()
  const initialLayerVisibilityRef = useRef<MapLayerVisibilitySnapshot | null>(null)
  initialLayerVisibilityRef.current ??= readMapLayerVisibility(
    window.localStorage,
    createDefaultLayerVisibility(),
  )
  const initialLayerVisibility = initialLayerVisibilityRef.current
  const mapSurfaceRef = useRef<HTMLDivElement>(null)
  const locationSearchPanelRef = useRef<HTMLElement>(null)
  const layerPanelRef = useRef<HTMLElement>(null)
  const stationListPanelRef = useRef<HTMLDivElement>(null)
  const selectedExplorationPanelRef = useRef<HTMLElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const locationSearchMarkersRef = useRef<LocationSearchMarkerRecord[]>([])
  const userLocationRequestIdRef = useRef(0)
  const selectedMapPointMarkerRef = useRef<maplibregl.Marker | null>(null)
  const selectedMapPointAbortRef = useRef<AbortController | null>(null)
  const analysisMapMarkersRef = useRef<Map<string, AnalysisMapMarkerRecord>>(new Map())
  const analysisMarkerMotionsRef = useRef<Map<string, AnalysisMarkerMotion>>(new Map())
  const analysisTaskStatusesRef = useRef<Map<string, AnalysisMapSite['task']['status']>>(new Map())
  const explorationMapMarkersRef = useRef<Map<string, ExplorationMapMarkerRecord>>(new Map())
  const analysisMapDateRef = useRef(shanghaiDate(new Date()))
  const editingExplorationBoundaryFeatureIdRef = useRef<DrawingFeatureId | null>(null)
  const terraDrawRef = useRef<TerraDraw | null>(null)
  const measurementPointsRef = useRef<[number, number][]>([])
  const isMeasuringRef = useRef(false)
  const drawingModeRef = useRef<DrawingMode | null>(null)
  const drawingPurposeRef = useRef<DrawingPurpose | null>(null)
  const suppressNextMapSelectionRef = useRef(false)
  const mapSelectionSuppressionTimerRef = useRef<number | null>(null)
  const isSelectingDrawingRef = useRef(false)
  const selectedDrawingIdsRef = useRef<Set<DrawingFeatureId>>(new Set())
  const drawingRecordsRef = useRef<Map<DrawingFeatureId, MapDrawing>>(new Map())
  const drawingFeatureIdsByRecordIdRef = useRef<Map<string, DrawingFeatureId>>(new Map())
  const drawingVisibilityRef = useRef<Record<string, boolean>>({
    ...initialLayerVisibility.customDrawings,
  })
  const drawingUpdateQueuesRef = useRef<Map<DrawingFeatureId, Promise<void>>>(new Map())
  const inventoryFeatureByIdRef = useRef<Map<string, SiteInventoryMapFeature>>(new Map())
  const explorationFeatureByIdRef = useRef<Map<string, SiteExplorationMapPointFeature>>(new Map())
  const explorationBoundaryBySiteIdRef = useRef<Map<string, AnalysisMarkerRoute>>(new Map())
  const nextExplorationSiteTabRef = useRef<SiteSelectionSiteDetailTab>('site')
  const analysisMarkerFocusedSiteIdRef = useRef<string | null>(null)
  const selectedExplorationCameraStateRef = useRef<{
    siteId: string
    spatialSignature: string
  } | null>(null)
  const inventoryIconAssetsRef = useRef<Map<InventoryLayerCategory, InventoryStationIconAsset>>(
    new Map(),
  )
  const pendingDrawingIdRef = useRef<DrawingFeatureId | null>(null)
  const [status, setStatus] = useState<MapStatus>('loading')
  const [selectedAnalysisSiteId, setSelectedAnalysisSiteId] = useState<string | null>(null)
  const [isLocatingUser, setIsLocatingUser] = useState(false)
  const [activeMapPanel, setActiveMapPanel] = useState<ActiveMapPanel>(null)
  const [locationSearchOpen, setLocationSearchOpen] = useState(false)
  const [selectedLocationSearchResultId, setSelectedLocationSearchResultId] = useState<
    string | null
  >(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isMeasuring, setIsMeasuring] = useState(false)
  const [isCreatingExplorationSite, setIsCreatingExplorationSite] = useState(false)
  const [selectedMapPoint, setSelectedMapPoint] = useState<SelectedMapPoint | null>(null)
  const isUserLocationSelected = selectedMapPoint?.source === 'location'
  const [measurementDistance, setMeasurementDistance] = useState<number | null>(null)
  const [isMeasurementInfoOpen, setIsMeasurementInfoOpen] = useState(false)
  const [drawingMode, setDrawingMode] = useState<DrawingMode | null>(null)
  const [drawingPurpose, setDrawingPurpose] = useState<DrawingPurpose | null>(null)
  const [isSelectingDrawing, setIsSelectingDrawing] = useState(false)
  const isMeasurementInfoVisible = (
    isMeasurementInfoOpen
    && !drawingMode
    && !isSelectingDrawing
    && (isMeasuring || measurementDistance !== null)
  )
  const [selectedDrawingCount, setSelectedDrawingCount] = useState(0)
  const [drawnFeatureCount, setDrawnFeatureCount] = useState(0)
  const [customDrawings, setCustomDrawings] = useState<MapDrawing[]>([])
  const [drawingVisibility, setDrawingVisibility] = useState<Record<string, boolean>>(() => ({
    ...initialLayerVisibility.customDrawings,
  }))
  const [pendingDrawing, setPendingDrawing] = useState<PendingDrawing | null>(null)
  const [drawingName, setDrawingName] = useState('')
  const [drawingCorridorType, setDrawingCorridorType] = useState<MapDrawingCorridorType | ''>('')
  const [drawingShowName, setDrawingShowName] = useState(true)
  const [drawingRemark, setDrawingRemark] = useState('')
  const [drawingFormSubmitted, setDrawingFormSubmitted] = useState(false)
  const [isSavingDrawing, setIsSavingDrawing] = useState(false)
  const [isDeletingDrawing, setIsDeletingDrawing] = useState(false)
  const [editingDrawing, setEditingDrawing] = useState<MapDrawing | null>(null)
  const [editingDrawingName, setEditingDrawingName] = useState('')
  const [editingDrawingCorridorType, setEditingDrawingCorridorType] = useState<
    MapDrawingCorridorType | ''
  >('')
  const [editingDrawingShowName, setEditingDrawingShowName] = useState(true)
  const [editingDrawingRemark, setEditingDrawingRemark] = useState('')
  const [editingDrawingFormSubmitted, setEditingDrawingFormSubmitted] = useState(false)
  const [isUpdatingDrawing, setIsUpdatingDrawing] = useState(false)
  const [drawingToDelete, setDrawingToDelete] = useState<MapDrawing | null>(null)
  const [selectedInventoryStationId, setSelectedInventoryStationId] = useState<string | null>(null)
  const [selectedExplorationSiteId, setSelectedExplorationSiteId] = useState<string | null>(null)
  const [selectedExplorationSiteTab, setSelectedExplorationSiteTab] = useState<
    SiteSelectionSiteDetailTab
  >('site')
  const [editingExplorationSiteId, setEditingExplorationSiteId] = useState<string | null>(null)
  const explorationDraft = useMutation({ mutationFn: createSiteExplorationDraft })
  const [explorationBoundaryEditor, setExplorationBoundaryEditor] = useState<
    ExplorationBoundaryEditor | null
  >(null)
  const [isLoadingExplorationBoundary, setIsLoadingExplorationBoundary] = useState(false)
  const [isSavingExplorationBoundary, setIsSavingExplorationBoundary] = useState(false)
  const [baseMapType, setBaseMapType] = useState<BaseMapType>('road')
  const [expandedLayerGroups, setExpandedLayerGroups] = useState<Record<string, boolean>>(
    () => ({ ...initialLayerVisibility.groupExpansion }),
  )
  const [visibleBasicLayers, setVisibleBasicLayers] = useState<
    Record<BasicMapLayerKey, boolean>
  >(() => initialLayerVisibility.basicLayers as Record<BasicMapLayerKey, boolean>)
  const [visibleInventoryLayers, setVisibleInventoryLayers] = useState<
    Record<InventoryLayerCategory, boolean>
  >(() => initialLayerVisibility.inventoryLayers as Record<InventoryLayerCategory, boolean>)
  const [visibleExplorationStatuses, setVisibleExplorationStatuses] = useState<
    Record<SiteExplorationStatus, boolean>
  >(() => (
    initialLayerVisibility.explorationStatuses as Record<SiteExplorationStatus, boolean>
  ))
  const [explorationFilters, setExplorationFilters] = useState<SiteExplorationFilterQuery>({})
  const [taskFilters, setTaskFilters] = useState<TaskSiteFilters>({})
  const deferredExplorationProjectPrefix = useDeferredValue(
    explorationFilters.projectPrefix?.trim() ?? '',
  )
  const activeExplorationFilters: SiteExplorationFilterQuery = {
    ...explorationFilters,
    projectPrefix: deferredExplorationProjectPrefix || undefined,
  }
  const explorationFilterKey = [
    activeExplorationFilters.status ?? '',
    activeExplorationFilters.team ?? '',
    activeExplorationFilters.explorer ?? '',
    activeExplorationFilters.city ?? '',
    activeExplorationFilters.route ?? '',
    activeExplorationFilters.projectPrefix ?? '',
  ].join('\u0000')
  const trafficHeatmapVisible = visibleBasicLayers['traffic-hotspots']
  const inventoryMap = useQuery({
    queryKey: ['site-selection', 'inventory-stations', 'map'],
    queryFn: getSiteInventoryMapData,
    staleTime: 60_000,
    retry: false,
  })
  const explorationMap = useQuery({
    queryKey: ['site-exploration', 'map', explorationFilterKey],
    queryFn: () => getSiteExplorationMapData(activeExplorationFilters),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    retry: false,
  })
  const explorationFilterOptions = useQuery({
    queryKey: ['site-exploration', 'filter-options', explorationFilterKey],
    queryFn: () => listSiteExplorationFilterOptions(activeExplorationFilters),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: false,
  })
  const stationTitle = explorationMap.data?.scopeTeamName
    ? `站点（${explorationMap.data.scopeTeamName}）`
    : '站点'
  const analysisMapSites = useQuery({
    queryKey: ['site-analysis', 'map-sites', analysisMapDateRef.current],
    queryFn: () => getAnalysisMapSites(analysisMapDateRef.current),
    refetchInterval: 2_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: false,
  })

  useEffect(() => {
    if (!analysisMapSites.data) return

    const previousStatuses = analysisTaskStatusesRef.current
    const nextStatuses = new Map<string, AnalysisMapSite['task']['status']>()
    let hasNewCompletion = false

    for (const site of analysisMapSites.data.sites) {
      nextStatuses.set(site.task.taskId, site.task.status)
      if (
        site.task.status === 'completed'
        && previousStatuses.get(site.task.taskId) !== 'completed'
      ) {
        hasNewCompletion = true
      }
    }

    analysisTaskStatusesRef.current = nextStatuses
    if (!hasNewCompletion) return

    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ['site-exploration', 'map'] }),
      queryClient.invalidateQueries({ queryKey: ['site-exploration', 'list'] }),
      queryClient.invalidateQueries({ queryKey: ['site-exploration', 'detail'] }),
    ])
  }, [analysisMapSites.data, queryClient])

  const selectedInventoryStation = inventoryMap.data?.data.features.find(
    (feature) => feature.id === selectedInventoryStationId,
  ) ?? null
  const selectedExplorationSiteDetail = useQuery({
    queryKey: ['site-exploration', 'detail', selectedExplorationSiteId],
    queryFn: () => {
      if (!selectedExplorationSiteId) throw new Error('site_exploration_record_unavailable')
      return getSiteExplorationSite(selectedExplorationSiteId)
    },
    enabled: Boolean(selectedExplorationSiteId),
    staleTime: 60_000,
    retry: false,
  })
  const selectedAnalysisMapTask = analysisMapSites.data?.sites.find(
    (site) => site.siteId === selectedExplorationSiteId,
  )?.task ?? null
  const selectedExplorationAnalysisTaskId = selectedAnalysisMapTask?.taskId
    ?? selectedExplorationSiteDetail.data?.latestAnalysisTaskId
    ?? null
  const trafficHeatmap = useQuery({
    queryKey: ['site-selection', 'traffic-heatmap', '2026-01-15', '2026-01-21'],
    queryFn: getSiteSelectionTrafficHeatmap,
    enabled: trafficHeatmapVisible,
    staleTime: 5 * 60_000,
    retry: false,
  })
  const selectedMapPointTraffic = useQuery({
    queryKey: [
      'site-selection',
      'road-segment-traffic',
      trafficHeatmapStartDate,
      trafficHeatmapEndDate,
      selectedMapPoint?.longitude,
      selectedMapPoint?.latitude,
    ],
    queryFn: ({ signal }) => getSiteSelectionRoadSegmentTraffic(
      selectedMapPoint!.longitude,
      selectedMapPoint!.latitude,
      undefined,
      signal,
      {
        aggregationMode: 'daily_average',
        startDate: trafficHeatmapStartDate,
        endDate: trafficHeatmapEndDate,
      },
    ),
    enabled: selectedMapPoint !== null,
    retry: false,
  })
  const selectedInventoryStationTraffic = useQuery({
    queryKey: [
      'site-selection',
      'road-segment-traffic',
      selectedInventoryStation?.geometry.coordinates[0],
      selectedInventoryStation?.geometry.coordinates[1],
      selectedInventoryStation?.properties.routeName,
      trafficHeatmapStartDate,
      trafficHeatmapEndDate,
    ],
    queryFn: ({ signal }) => getSiteSelectionRoadSegmentTraffic(
      selectedInventoryStation!.geometry.coordinates[0],
      selectedInventoryStation!.geometry.coordinates[1],
      extractRoadRouteRef(selectedInventoryStation!.properties.routeName),
      signal,
      {
        aggregationMode: 'daily_average',
        startDate: trafficHeatmapStartDate,
        endDate: trafficHeatmapEndDate,
      },
    ),
    enabled: selectedInventoryStation !== null,
    retry: false,
  })
  const selectedRoadSegmentTraffic = selectedInventoryStation
    ? selectedInventoryStationTraffic.data ?? null
    : selectedMapPointTraffic.data ?? null
  const selectedTrafficCoordinate = selectedInventoryStation
    ? selectedInventoryStation.geometry.coordinates
    : selectedMapPoint
      ? [selectedMapPoint.longitude, selectedMapPoint.latitude] as const
      : null
  const selectedGridQueryCoordinate = selectedTrafficCoordinate
    ? wgs84ToGcj02(selectedTrafficCoordinate[0], selectedTrafficCoordinate[1])
    : null
  const selectedGridFallbackTraffic = useQuery({
    queryKey: [
      'site-selection',
      'road-segment-grid-fallback',
      selectedGridQueryCoordinate?.longitude,
      selectedGridQueryCoordinate?.latitude,
    ],
    queryFn: ({ signal }) => getSiteSelectionDailyAverageTraffic(
      selectedGridQueryCoordinate!.longitude,
      selectedGridQueryCoordinate!.latitude,
      signal,
    ),
    enabled: selectedRoadSegmentTraffic?.dataStatus === 'no_road'
      && selectedGridQueryCoordinate !== null,
    retry: false,
  })
  const inventoryLayerCounts = inventoryMap.data?.summary.byLayer
    ?? countBy([], inventoryLayerOptions.map((option) => option.id))
  const explorationStatusCounts = explorationMap.data?.summary.byStatus
    ?? countBy([], siteExplorationStatusOptions.map((option) => option.value))
  const analysisSites = analysisMapSites.data?.sites ?? []
  const inventorySites = inventoryMap.data?.data.features ?? []
  const filteredInventorySites = filterTaskSites(inventorySites, taskFilters)
  const taskFilterOptions = createTaskSiteFilterOptions(inventorySites, taskFilters)
  const explorationSites = (explorationMap.data?.data.features ?? []).filter(
    (feature): feature is SiteExplorationMapPointFeature => feature.geometry.type === 'Point',
  )
  const selectedExplorationSite = explorationSites.find(
    (feature) => feature.id === selectedExplorationSiteId,
  ) ?? null
  const selectedExplorationBoundary = explorationMap.data?.data.features.find(
    (feature): feature is SiteExplorationMapBoundaryFeature => (
      feature.geometry.type === 'Polygon'
      && feature.id === `boundary:${selectedExplorationSiteId}`
    ),
  ) ?? null
  const tiandituToken = env.maps.tiandituToken
  const hasValidToken = Boolean(tiandituToken && tiandituToken !== 'replace-with-tianditu-token')

  useEffect(() => registerSiteSelectionTrafficRasterProtocols(), [])

  useEffect(() => {
    setSelectedExplorationSiteTab(nextExplorationSiteTabRef.current)
    nextExplorationSiteTabRef.current = 'site'
  }, [selectedExplorationSiteId])

  useEffect(() => {
    if (
      !selectedExplorationSiteId
      || explorationMap.isFetching
      || !explorationMap.data
      || selectedExplorationSite !== null
    ) return
    setSelectedExplorationSiteId(null)
  }, [explorationMap.data, explorationMap.isFetching, selectedExplorationSite, selectedExplorationSiteId])

  useEffect(() => {
    writeMapLayerVisibility(window.localStorage, {
      groupExpansion: expandedLayerGroups,
      basicLayers: visibleBasicLayers,
      inventoryLayers: visibleInventoryLayers,
      explorationStatuses: visibleExplorationStatuses,
      customDrawings: drawingVisibility,
    })
  }, [
    drawingVisibility,
    expandedLayerGroups,
    visibleBasicLayers,
    visibleExplorationStatuses,
    visibleInventoryLayers,
  ])

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === mapSurfaceRef.current)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  useEffect(() => {
    if (!inventoryMap.isError) return
    const message = siteInventoryErrorMessage(inventoryMap.error)
    if (message) toast.error(message)
  }, [inventoryMap.error, inventoryMap.isError])

  useEffect(() => {
    if (!explorationMap.isError) return
    const message = siteExplorationErrorMessage(explorationMap.error)
    if (message) toast.error(message)
  }, [explorationMap.error, explorationMap.isError])

  useEffect(() => {
    if (!trafficHeatmap.isError) return
    const message = trafficHeatmapErrorMessage(trafficHeatmap.error)
    if (message) toast.error(message)
  }, [trafficHeatmap.error, trafficHeatmap.isError])

  useEffect(() => {
    const map = mapRef.current
    const product = trafficHeatmap.data
    if (!map || status !== 'ready' || !product || product.status !== 'ready' || !product.tileUrl) return

    if (map.getLayer(trafficHeatmapLayerId)) map.removeLayer(trafficHeatmapLayerId)
    if (map.getSource(trafficHeatmapSourceId)) map.removeSource(trafficHeatmapSourceId)
    map.addSource(trafficHeatmapSourceId, {
      type: 'raster',
      tiles: [toSiteSelectionTrafficRasterUrl(product.tileUrl)],
      tileSize: 256,
      bounds: [110, 31, 117, 37],
      minzoom: 5,
      maxzoom: 14,
    })
    map.addLayer({
      id: trafficHeatmapLayerId,
      type: 'raster',
      source: trafficHeatmapSourceId,
      layout: {
        visibility: trafficHeatmapVisible ? 'visible' : 'none',
      },
      paint: {
        'raster-opacity': 0.72,
        'raster-fade-duration': 0,
      },
    }, roadBaseLayerIds[1])
  }, [status, trafficHeatmap.data, trafficHeatmapVisible])

  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready') return
    const source = map.getSource(selectedRoadSegmentSourceId) as maplibregl.GeoJSONSource | undefined
    if (!source) return
    source.setData(
      selectedRoadSegmentTraffic?.segmentGeoJson
        ? roadSegmentFeatureForMap(selectedRoadSegmentTraffic)
        : { type: 'FeatureCollection', features: [] },
    )
  }, [selectedRoadSegmentTraffic, status])

  useEffect(() => {
    const features = inventoryMap.data?.data.features ?? []
    inventoryFeatureByIdRef.current = new Map(features.map((feature) => [feature.id, feature]))
    const visibleFeatures = filterTaskSites(features, taskFilters)
    const map = mapRef.current
    if (!map || status !== 'ready') return
    registerInventoryStationMarkerImages(map, inventoryIconAssetsRef.current, features)
    const inventorySource = map.getSource(
      inventoryStationSourceId,
    ) as maplibregl.GeoJSONSource | undefined
    inventorySource?.setData(createInventoryStationFeatureCollection(visibleFeatures))
    popupRef.current?.remove()
  }, [inventoryMap.data, status, taskFilters])

  useEffect(() => {
    const features = inventoryMap.data?.data.features ?? []
    if (
      !selectedInventoryStationId
      || filterTaskSites(features, taskFilters).some(
        (site) => site.id === selectedInventoryStationId,
      )
    ) return
    setSelectedInventoryStationId(null)
  }, [inventoryMap.data, selectedInventoryStationId, taskFilters])

  useEffect(() => {
    const features = explorationMap.data?.data.features ?? []
    explorationFeatureByIdRef.current = new Map(features
      .filter((feature): feature is SiteExplorationMapPointFeature => (
        feature.geometry.type === 'Point'
      ))
      .map((feature) => [feature.id, feature]))
    explorationBoundaryBySiteIdRef.current = new Map(features
      .filter((feature): feature is SiteExplorationMapBoundaryFeature => (
        feature.geometry.type === 'Polygon'
      ))
      .flatMap((feature) => {
        const siteId = feature.id.startsWith('boundary:')
          ? feature.id.slice('boundary:'.length)
          : ''
        const route = createAnalysisMarkerRoute(feature.geometry.coordinates[0] ?? [])
        return siteId && route ? [[siteId, route] as const] : []
      }))
    const map = mapRef.current
    if (!map || status !== 'ready') return
    const source = map.getSource(explorationSiteSourceId) as maplibregl.GeoJSONSource | undefined
    source?.setData(createExplorationSiteFeatureCollection(features))
    const labelSource = map.getSource(
      explorationSiteLabelSourceId,
    ) as maplibregl.GeoJSONSource | undefined
    labelSource?.setData(createExplorationSiteLabelFeatureCollection(features))
    popupRef.current?.remove()
  }, [explorationMap.data, status])

  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready') return
    map.setLayoutProperty(
      inventoryStationPointLayerId,
      'icon-size',
      createZoomResponsiveSelectedMapIconSizeExpression(
        'stationId',
        selectedInventoryStationId,
        inventoryStationMinIconSize,
        inventoryStationMaxIconSize,
        selectedInventoryStationMinIconSize,
        selectedInventoryStationMaxIconSize,
      ),
    )
    map.setFilter(
      explorationSiteBoundarySelectionLayerId,
      selectedExplorationSiteId
        ? ['==', ['get', 'siteId'], selectedExplorationSiteId]
        : ['==', ['get', 'siteId'], '__hidden__'],
    )
    map.setLayoutProperty(
      explorationSiteStatusIconLayerId,
      'icon-size',
      createSelectedMapIconSizeExpression(
        'siteId',
        selectedExplorationSiteId,
        explorationSiteIconSize,
        selectedExplorationSiteIconSize,
      ),
    )
  }, [
    selectedExplorationSiteId,
    selectedInventoryStationId,
    status,
  ])

  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready') return
    const source = map.getSource(
      selectedExplorationContextSourceId,
    ) as maplibregl.GeoJSONSource | undefined
    const record = selectedExplorationSiteDetail.data?.id === selectedExplorationSiteId
      ? selectedExplorationSiteDetail.data
      : null
    source?.setData(createSelectedExplorationContextFeatureCollection(record))
    popupRef.current?.remove()
    if (record) {
      const spatialSignature = createSelectedExplorationSpatialSignature(record)
      const previousCameraState = selectedExplorationCameraStateRef.current
      const isNewSelection = previousCameraState?.siteId !== record.id
      const spatialDataChanged = previousCameraState?.siteId === record.id
        && previousCameraState.spatialSignature !== spatialSignature
      if (analysisMarkerFocusedSiteIdRef.current === record.id) {
        focusMapOnExplorationSite(
          map,
          [record.longitude, record.latitude],
          explorationBoundaryBySiteIdRef.current.get(record.id),
          getExplorationFocusPanelWidths(),
        )
        analysisMarkerFocusedSiteIdRef.current = null
      } else if (isNewSelection) {
        analysisMarkerFocusedSiteIdRef.current = null
        fitMapToSelectedExplorationContext(map, record)
      } else if (spatialDataChanged) {
        const boundary = createAnalysisMarkerRoute(
          record.siteBoundaryGeoJson?.geometry.coordinates[0] ?? [],
        ) ?? explorationBoundaryBySiteIdRef.current.get(record.id)
        focusMapOnExplorationSite(
          map,
          [record.longitude, record.latitude],
          boundary,
          getExplorationFocusPanelWidths(),
        )
      }
      selectedExplorationCameraStateRef.current = { siteId: record.id, spatialSignature }
    } else if (!selectedExplorationSiteId) {
      selectedExplorationCameraStateRef.current = null
    }
  }, [selectedExplorationSiteDetail.data, selectedExplorationSiteId, status])

  useEffect(() => {
    const container = containerRef.current
    if (!container || !hasValidToken || !tiandituToken) {
      setStatus('error')
      return
    }

    setStatus('loading')
    const colors = getMapThemeColors(container)
    const map = new maplibregl.Map({
      container,
      style: createTiandituStyle(tiandituToken),
      center: [113.86, 34.35],
      zoom: 6,
      scrollZoom: true,
      attributionControl: false,
    })
    const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, offset: 14 })
    mapRef.current = map
    popupRef.current = popup
    let initialViewTimeout: number | undefined
    let mapLoaded = false
    let initialViewFitted = false
    let disposed = false
    let terraDraw: TerraDraw | null = null
    let handleDrawingFinished: TerraDrawEventListeners['finish'] | null = null
    let handleDrawingChanged: ((
      ids: DrawingFeatureId[],
      type: string,
    ) => void) | null = null
    let handleDrawingSelected: ((id: DrawingFeatureId) => void) | null = null
    let handleDrawingDeselected: ((id: DrawingFeatureId) => void) | null = null

    const scheduleInitialViewFit = () => {
      if (!mapLoaded || initialViewFitted) return
      window.clearTimeout(initialViewTimeout)
      initialViewTimeout = window.setTimeout(() => {
        map.resize()
        fitMapToHenanProvince(map, 0)
        initialViewFitted = true
      }, 120)
    }

    const resizeObserver = new ResizeObserver(() => {
      map.resize()
      scheduleInitialViewFit()
    })
    resizeObserver.observe(container)

    const handleMapError = () => {
      if (!mapLoaded) setStatus('error')
    }
    const handleInventoryStationClick = (event: maplibregl.MapLayerMouseEvent) => {
      if (
        isMeasuringRef.current
        || drawingModeRef.current
        || isSelectingDrawingRef.current
      ) return
      const station = getInventoryStationFromFeature(
        event.features?.[0],
        inventoryFeatureByIdRef.current,
      )
      if (!station) return

      event.preventDefault()
      popup.remove()
      clearSelectedMapPoint()
      setSelectedAnalysisSiteId(null)
      setSelectedExplorationSiteId(null)
      setSelectedInventoryStationId(station.id)
    }
    const handleExplorationBoundaryClick = (event: maplibregl.MapLayerMouseEvent) => {
      if (
        isMeasuringRef.current
        || drawingModeRef.current
        || isSelectingDrawingRef.current
        || editingExplorationBoundaryFeatureIdRef.current !== null
      ) return
      const siteId = event.features?.[0]?.properties?.siteId
      if (typeof siteId !== 'string') return
      if (!explorationFeatureByIdRef.current.has(siteId)) return

      event.preventDefault()
      popup.remove()
      clearSelectedMapPoint()
      setSelectedAnalysisSiteId(null)
      setSelectedInventoryStationId(null)
      setSelectedExplorationSiteId(siteId)
    }
    const handleExplorationSiteClick = (event: maplibregl.MapLayerMouseEvent) => {
      if (
        isMeasuringRef.current
        || drawingModeRef.current
        || isSelectingDrawingRef.current
        || editingExplorationBoundaryFeatureIdRef.current !== null
      ) return
      const site = getExplorationSiteFromFeature(
        event.features?.[0],
        explorationFeatureByIdRef.current,
      )
      if (!site) return

      event.preventDefault()
      popup.remove()
      clearSelectedMapPoint()
      setSelectedAnalysisSiteId(null)
      setSelectedInventoryStationId(null)
      setSelectedExplorationSiteId(site.id)
    }
    const handleSelectedExplorationPlaceClick = (event: maplibregl.MapLayerMouseEvent) => {
      if (
        isMeasuringRef.current
        || drawingModeRef.current
        || isSelectingDrawingRef.current
      ) return
      const place = getSelectedExplorationPlaceFromFeature(event.features?.[0])
      if (!place) return

      popup
        .setLngLat([place.longitude, place.latitude])
        .setDOMContent(createSelectedExplorationPlacePopupContent(place))
        .addTo(map)
    }
    const handleMapClick = (event: maplibregl.MapMouseEvent) => {
      if (suppressNextMapSelectionRef.current) {
        suppressNextMapSelectionRef.current = false
        if (mapSelectionSuppressionTimerRef.current !== null) {
          window.clearTimeout(mapSelectionSuppressionTimerRef.current)
          mapSelectionSuppressionTimerRef.current = null
        }
        return
      }
      if (isMeasuringRef.current) {
        const points = [
          ...measurementPointsRef.current,
          [event.lngLat.lng, event.lngLat.lat] as [number, number],
        ]
        measurementPointsRef.current = points
        setMeasurementDistance(calculatePathDistance(points))
        updateMeasurementSource(map, points)
        return
      }
      if (
        drawingModeRef.current
        || isSelectingDrawingRef.current
        || editingExplorationBoundaryFeatureIdRef.current !== null
      ) return
      if (map.queryRenderedFeatures(event.point, {
        layers: [
          inventoryStationPointLayerId,
          explorationSiteBoundaryFillLayerId,
          explorationSiteStatusIconLayerId,
          selectedExplorationChargingStationIconLayerId,
          selectedExplorationChargingStationLabelLayerId,
          selectedExplorationHotspotIconLayerId,
          selectedExplorationHotspotLabelLayerId,
        ],
      }).length > 0) return

      selectMapPoint({
        source: 'map',
        longitude: event.lngLat.lng,
        latitude: event.lngLat.lat,
      })
    }
    const handleDrawingDoubleClick = (event: maplibregl.MapMouseEvent) => {
      if (
        event.defaultPrevented
        || isMeasuringRef.current
        || drawingModeRef.current
        || isSelectingDrawingRef.current
      ) return

      const feature = terraDraw?.getFeaturesAtLngLat(event.lngLat, {
        pointerDistance: 16,
      }).find(({ id }) => {
        if (id === undefined) return false
        const drawing = drawingRecordsRef.current.get(id)
        return drawing !== undefined && drawingVisibilityRef.current[drawing.id] !== false
      })
      const featureId = feature?.id
      if (featureId === undefined) return
      const drawing = drawingRecordsRef.current.get(featureId)
      if (!drawing) return

      event.preventDefault()
      popup.remove()
      openDrawingEditor(drawing)
    }
    const handlePointEnter = () => {
      map.getCanvas().style.cursor = (
        isMeasuringRef.current
        || drawingModeRef.current
        || isSelectingDrawingRef.current
      ) ? 'crosshair' : 'pointer'
    }
    const handlePointLeave = () => {
      map.getCanvas().style.cursor = (
        isMeasuringRef.current
        || drawingModeRef.current
        || isSelectingDrawingRef.current
      ) ? 'crosshair' : ''
    }

    map.on('error', handleMapError)
    map.once('load', async () => {
      const loadedIconAssets = await Promise.all([
        loadInventoryStationIconAssets(map),
        registerExplorationSiteStatusIcons(map),
      ]).catch(() => null)
      if (disposed) return
      if (!loadedIconAssets) {
        setStatus('error')
        return
      }
      const [inventoryIconAssets] = loadedIconAssets
      inventoryIconAssetsRef.current = inventoryIconAssets
      const inventoryFeatures = inventoryMap.data?.data.features ?? []
      const explorationFeatures = explorationMap.data?.data.features ?? []
      registerInventoryStationMarkerImages(map, inventoryIconAssets, inventoryFeatures)
      mapLoaded = true
      // GeoJSON line layers: https://maplibre.org/maplibre-gl-js/docs/examples/geojson-line/
      map.addSource(administrativeBoundarySourceId, {
        type: 'geojson',
        data: henanAdministrativeBoundaries as unknown as GeoJSONSourceSpecification['data'],
        attribution: '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors · ODbL</a>',
      })
      map.addSource(selectedRoadSegmentSourceId, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addLayer({
        id: selectedRoadSegmentCasingLayerId,
        type: 'line',
        source: selectedRoadSegmentSourceId,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#ffffff',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            6, 7,
            10, 9,
            14, 12,
            18, 16,
          ],
          'line-opacity': 0.95,
        },
      })
      map.addLayer({
        id: selectedRoadSegmentLineLayerId,
        type: 'line',
        source: selectedRoadSegmentSourceId,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#2563eb',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            6, 3,
            10, 4,
            14, 7,
            18, 10,
          ],
          'line-opacity': 1,
        },
      })
      map.addLayer({
        id: selectedRoadSegmentLabelLayerId,
        type: 'symbol',
        source: selectedRoadSegmentSourceId,
        filter: ['==', ['geometry-type'], 'Point'],
        layout: {
          'text-field': [
            'format',
            ['to-string', ['get', 'trafficCount']], {
              'font-scale': 1.08,
              'text-color': '#1d4ed8',
            },
            ' 辆/日 · ', { 'text-color': '#475569' },
            ['to-string', ['get', 'segmentLengthMeters']], {
              'font-scale': 1.08,
              'text-color': '#1d4ed8',
            },
            '米', { 'text-color': '#475569' },
          ],
          'text-font': [
            'PingFang SC',
            'Microsoft YaHei',
            'Noto Sans CJK SC',
            'sans-serif',
          ],
          'text-size': 13,
          'text-line-height': 1.35,
          'text-max-width': 24,
          'text-anchor': 'center',
          'text-justify': 'center',
          'text-offset': [0, -1.35],
          'text-rotation-alignment': 'viewport',
          'text-pitch-alignment': 'viewport',
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': '#475569',
          'text-halo-color': '#ffffff',
          'text-halo-width': 3.5,
          'text-halo-blur': 0.75,
        },
      })
      map.addLayer({
        id: cityBoundaryLayerId,
        type: 'line',
        source: administrativeBoundarySourceId,
        filter: ['==', ['get', 'level'], 'city'],
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': colors.mutedForeground,
          'line-width': 1,
          'line-opacity': 0.6,
          'line-dasharray': [3, 2],
        },
      })
      map.addLayer({
        id: provinceBoundaryLayerId,
        type: 'line',
        source: administrativeBoundarySourceId,
        filter: ['==', ['get', 'level'], 'province'],
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#b4b4b4',
          'line-width': 5,
          'line-opacity': 0.9,
        },
      })
      registerSelectedExplorationChargingStationIcon(map, colors)
      registerSelectedExplorationHotspotIcons(map, colors)
      map.addSource(inventoryStationSourceId, {
        type: 'geojson',
        data: createInventoryStationFeatureCollection(inventoryFeatures),
      })
      map.addSource(explorationSiteSourceId, {
        type: 'geojson',
        data: createExplorationSiteFeatureCollection(explorationFeatures),
      })
      map.addSource(explorationSiteLabelSourceId, {
        type: 'geojson',
        data: createExplorationSiteLabelFeatureCollection(explorationFeatures),
      })
      map.addSource(selectedExplorationContextSourceId, {
        type: 'geojson',
        data: createSelectedExplorationContextFeatureCollection(null),
      })
      map.addSource(measurementSourceId, {
        type: 'geojson',
        data: createMeasurementFeatureCollection([]),
      })
      map.addLayer({
        id: explorationSiteBoundaryFillLayerId,
        type: 'fill',
        source: explorationSiteSourceId,
        paint: {
          'fill-color': createExplorationStatusColorExpression(),
          'fill-opacity': 0.18,
        },
      })
      map.addLayer({
        id: explorationSiteBoundaryLineLayerId,
        type: 'line',
        source: explorationSiteSourceId,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': createExplorationStatusColorExpression(),
          'line-width': 2,
          'line-opacity': 0.85,
        },
      })
      map.addLayer({
        id: explorationSiteBoundarySelectionLayerId,
        type: 'line',
        source: explorationSiteSourceId,
        filter: ['==', ['id'], '__hidden__'],
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#0ECC00',
          'line-width': 4,
          'line-opacity': 1,
        },
      })
      map.addLayer({
        id: explorationSiteEdgeLabelLayerId,
        type: 'symbol',
        source: explorationSiteLabelSourceId,
        minzoom: 10,
        filter: ['==', ['get', 'labelKind'], 'edge'],
        layout: {
          'text-field': ['get', 'label'],
          'text-font': [
            'PingFang SC',
            'Microsoft YaHei',
            'Noto Sans CJK SC',
            'sans-serif',
          ],
          'text-size': 11,
          'text-rotate': ['get', 'rotation'],
          'text-rotation-alignment': 'map',
          'text-pitch-alignment': 'map',
          'text-keep-upright': false,
          'text-offset': [0, -0.7],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': colors.foreground,
          'text-halo-color': colors.background,
          'text-halo-width': 2,
        },
      })
      map.addLayer({
        id: explorationSiteCenterLabelLayerId,
        type: 'symbol',
        source: explorationSiteLabelSourceId,
        minzoom: 10,
        filter: ['==', ['get', 'labelKind'], 'center'],
        layout: {
          'text-field': ['get', 'label'],
          'text-font': [
            'PingFang SC',
            'Microsoft YaHei',
            'Noto Sans CJK SC',
            'sans-serif',
          ],
          'text-size': 13,
          'text-line-height': 1.25,
          'text-anchor': 'top',
          'text-offset': [0, 0.9],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': colors.foreground,
          'text-halo-color': colors.background,
          'text-halo-width': 2.5,
        },
      })
      map.addLayer({
        id: explorationSiteNameLabelLayerId,
        type: 'symbol',
        source: explorationSiteLabelSourceId,
        minzoom: 10,
        filter: ['==', ['get', 'labelKind'], 'point-name'],
        layout: {
          'text-field': ['get', 'label'],
          'text-font': [
            'PingFang SC',
            'Microsoft YaHei',
            'Noto Sans CJK SC',
            'sans-serif',
          ],
          'text-size': 13,
          'text-anchor': 'top',
          'text-offset': [0, 1.4],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': colors.foreground,
          'text-halo-color': colors.background,
          'text-halo-width': 2.5,
        },
      })
      map.addLayer({
        id: inventoryStationPointLayerId,
        type: 'symbol',
        source: inventoryStationSourceId,
        layout: {
          'icon-image': ['get', 'markerIcon'],
          'icon-size': createZoomResponsiveSelectedMapIconSizeExpression(
            'stationId',
            null,
            inventoryStationMinIconSize,
            inventoryStationMaxIconSize,
            selectedInventoryStationMinIconSize,
            selectedInventoryStationMaxIconSize,
          ),
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
      })
      map.addLayer({
        id: inventoryStationLabelLayerId,
        type: 'symbol',
        source: inventoryStationSourceId,
        minzoom: 9,
        layout: {
          'text-field': ['get', 'stationName'],
          'text-font': [
            'PingFang SC',
            'Microsoft YaHei',
            'Noto Sans CJK SC',
            'sans-serif',
          ],
          'text-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            inventoryStationMinZoom, inventoryStationMinTextSize,
            inventoryStationMaxZoom, inventoryStationMaxTextSize,
          ],
          'text-line-height': 1.25,
          'text-max-width': 18,
          'text-anchor': 'top',
          'text-offset': [0, 1.35],
          'text-optional': true,
        },
        paint: {
          'text-color': '#111827',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2,
          'text-halo-blur': 0.5,
        },
      })
      map.addLayer({
        id: explorationSiteShadowLayerId,
        type: 'circle',
        source: explorationSiteSourceId,
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-radius': 10,
          'circle-color': colors.foreground,
          'circle-opacity': 0.16,
          'circle-blur': 0.35,
        },
      })
      map.addLayer({
        id: explorationSiteStatusIconLayerId,
        type: 'symbol',
        source: explorationSiteSourceId,
        filter: [
          'all',
          ['==', ['geometry-type'], 'Point'],
          ['in', ['get', 'status'], ['literal', siteExplorationStatusOptions.map(({ value }) => value)]],
        ],
        layout: {
          'icon-image': [
            'match',
            ['get', 'status'],
            'draft', getSiteExplorationStatusIconName('draft'),
            'completed', getSiteExplorationStatusIconName('completed'),
            'signed', getSiteExplorationStatusIconName('signed'),
            'under-construction', getSiteExplorationStatusIconName('under-construction'),
            'operating', getSiteExplorationStatusIconName('operating'),
            getSiteExplorationStatusIconName('draft'),
          ],
          'icon-size': explorationSiteIconSize,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'text-field': ['to-string', ['get', 'siteId']],
          'text-font': [
            'PingFang SC',
            'Microsoft YaHei',
            'Noto Sans CJK SC',
            'sans-serif',
          ],
          'text-size': [
            'case',
            ['<=', ['length', ['to-string', ['get', 'siteId']]], 2], 13,
            ['<=', ['length', ['to-string', ['get', 'siteId']]], 3], 11,
            9,
          ],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'icon-opacity': 0,
          'text-color': createExplorationStatusIconForegroundColorExpression(),
          'text-opacity': 0,
        },
      })
      map.addLayer({
        id: selectedExplorationRadiusFillLayerId,
        type: 'fill',
        source: selectedExplorationContextSourceId,
        filter: ['==', ['get', 'contextKind'], 'nearby-station-radius'],
        paint: {
          'fill-color': '#2563eb',
          'fill-opacity': 0.08,
        },
      })
      map.addLayer({
        id: selectedExplorationRadiusLineLayerId,
        type: 'line',
        source: selectedExplorationContextSourceId,
        filter: ['==', ['get', 'contextKind'], 'nearby-station-radius'],
        paint: {
          'line-color': '#2563eb',
          'line-width': 2,
          'line-opacity': 0.9,
        },
      })
      map.addLayer({
        id: selectedExplorationDistanceLayerId,
        type: 'line',
        source: selectedExplorationContextSourceId,
        filter: ['==', ['geometry-type'], 'LineString'],
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': ['coalesce', ['get', 'routeColor'], [
            'match', ['get', 'contextKind'],
            'highway-distance', '#f97316', 'arterial-road-distance', '#2563eb', colors.primary,
          ]],
          'line-width': 4,
          'line-opacity': 0.95,
          'line-dasharray': [2, 1.25],
        },
      })
      map.addLayer({
        id: selectedExplorationDistanceLabelLayerId,
        type: 'symbol',
        source: selectedExplorationContextSourceId,
        filter: ['==', ['get', 'contextKind'], 'distance-label'],
        layout: {
          'text-field': ['get', 'label'],
          'text-font': [
            'PingFang SC',
            'Microsoft YaHei',
            'Noto Sans CJK SC',
            'sans-serif',
          ],
          'text-size': 12,
          'text-anchor': 'bottom',
          'text-offset': [0, -0.8],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': colors.foreground,
          'text-halo-color': colors.background,
          'text-halo-width': 2,
        },
      })
      map.addLayer({
        id: selectedExplorationChargingStationIconLayerId,
        type: 'symbol',
        source: selectedExplorationContextSourceId,
        filter: ['==', ['get', 'contextKind'], 'nearby-station'],
        maxzoom: 12,
        layout: {
          'icon-image': siteExplorationChargingStationIconDefinition.name,
          'icon-size': 1,
          'symbol-sort-key': ['get', 'sequence'],
        },
      })
      map.addLayer({
        id: selectedExplorationChargingStationLabelLayerId,
        type: 'symbol',
        source: selectedExplorationContextSourceId,
        filter: ['==', ['get', 'contextKind'], 'nearby-station'],
        minzoom: 12,
        layout: {
          'icon-image': siteExplorationChargingStationIconDefinition.name,
          'icon-size': 1,
          'text-field': ['get', 'name'],
          'text-font': [
            'PingFang SC',
            'Microsoft YaHei',
            'Noto Sans CJK SC',
            'sans-serif',
          ],
          'text-size': 11,
          'text-anchor': 'top',
          'text-offset': [0, 1.35],
          'text-max-width': 14,
          'text-line-height': 1.15,
          'symbol-sort-key': ['get', 'sequence'],
        },
        paint: {
          'text-color': colors.foreground,
          'text-halo-color': colors.background,
          'text-halo-width': 2,
          'text-halo-blur': 0.5,
        },
      })
      map.addLayer({
        id: selectedExplorationHotspotIconLayerId,
        type: 'symbol',
        source: selectedExplorationContextSourceId,
        filter: ['==', ['get', 'contextKind'], 'nearby-hotspot'],
        maxzoom: 12,
        layout: {
          'icon-image': ['get', 'hotspotIcon'],
          'icon-size': 1,
          'symbol-sort-key': ['get', 'sequence'],
        },
      })
      map.addLayer({
        id: selectedExplorationHotspotLabelLayerId,
        type: 'symbol',
        source: selectedExplorationContextSourceId,
        filter: ['==', ['get', 'contextKind'], 'nearby-hotspot'],
        minzoom: 12,
        layout: {
          'icon-image': ['get', 'hotspotIcon'],
          'icon-size': 1,
          'text-field': [
            'concat',
            ['get', 'category'],
            '\n',
            ['get', 'name'],
          ],
          'text-font': [
            'PingFang SC',
            'Microsoft YaHei',
            'Noto Sans CJK SC',
            'sans-serif',
          ],
          'text-size': 11,
          'text-anchor': 'top',
          'text-offset': [0, 1.35],
          'text-max-width': 14,
          'text-line-height': 1.15,
          'symbol-sort-key': ['get', 'sequence'],
        },
        paint: {
          'text-color': colors.foreground,
          'text-halo-color': colors.background,
          'text-halo-width': 2,
          'text-halo-blur': 0.5,
        },
      })
      map.addLayer({
        id: measurementLineLayerId,
        type: 'line',
        source: measurementSourceId,
        filter: ['==', ['geometry-type'], 'LineString'],
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': colors.primary,
          'line-width': 3,
          'line-dasharray': [2, 1.5],
        },
      })
      map.addLayer({
        id: measurementPointLayerId,
        type: 'circle',
        source: measurementSourceId,
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-radius': 5,
          'circle-color': colors.background,
          'circle-stroke-color': colors.primary,
          'circle-stroke-width': 2.5,
        },
      })
      map.addLayer({
        id: measurementLabelLayerId,
        type: 'symbol',
        source: measurementSourceId,
        filter: ['==', ['geometry-type'], 'Point'],
        layout: {
          'text-field': ['get', 'distanceLabel'],
          'text-font': [
            'PingFang SC',
            'Microsoft YaHei',
            'Noto Sans CJK SC',
            'sans-serif',
          ],
          'text-size': 12,
          'text-anchor': 'bottom',
          'text-offset': [0, -0.8],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': colors.foreground,
          'text-halo-color': colors.background,
          'text-halo-width': 2,
        },
      })
      terraDraw = createTerraDraw(map)
      handleDrawingFinished = (id, context) => {
        if (!terraDraw) return
        if (context.action === 'draw') {
          suppressNextMapSelectionRef.current = true
          if (mapSelectionSuppressionTimerRef.current !== null) {
            window.clearTimeout(mapSelectionSuppressionTimerRef.current)
          }
          mapSelectionSuppressionTimerRef.current = window.setTimeout(() => {
            suppressNextMapSelectionRef.current = false
            mapSelectionSuppressionTimerRef.current = null
          }, 0)
          terraDraw.setMode('render')
          drawingModeRef.current = null
          drawingPurposeRef.current = null
          isSelectingDrawingRef.current = false
          setDrawingMode(null)
          setDrawingPurpose(null)
          setIsSelectingDrawing(false)
          map.getCanvas().style.cursor = ''
          const feature = terraDraw.getSnapshotFeature(id)
          if (
            feature
            && (feature.geometry.type === 'LineString' || feature.geometry.type === 'Polygon')
          ) {
            pendingDrawingIdRef.current = id
            setPendingDrawing({
              featureId: id,
              geometryType: feature.geometry.type,
            })
            setDrawingName(feature.geometry.type === 'LineString' ? '未命名线条' : '未命名区域')
            setDrawingCorridorType('')
            setDrawingShowName(true)
            setDrawingRemark('')
            setDrawingFormSubmitted(false)
          }
        } else {
          const feature = terraDraw.getSnapshotFeature(id)
          if (drawingRecordsRef.current.has(id) && feature) {
            queueDrawingGeometryUpdate(id, feature, terraDraw)
          }
        }
        setDrawnFeatureCount(countCompletedDrawings(terraDraw))
      }
      handleDrawingChanged = (ids, type) => {
        if (!terraDraw) return
        if (type === 'delete') {
          for (const id of ids) selectedDrawingIdsRef.current.delete(id)
          setSelectedDrawingCount(selectedDrawingIdsRef.current.size)
        }
        setDrawnFeatureCount(countCompletedDrawings(terraDraw))
      }
      handleDrawingSelected = (id) => {
        if (editingExplorationBoundaryFeatureIdRef.current === id) return
        const drawing = drawingRecordsRef.current.get(id)
        if (drawing && drawingVisibilityRef.current[drawing.id] === false) {
          terraDraw?.deselectFeature(id)
          return
        }
        selectedDrawingIdsRef.current.add(id)
        setSelectedDrawingCount(selectedDrawingIdsRef.current.size)
      }
      handleDrawingDeselected = (id) => {
        if (editingExplorationBoundaryFeatureIdRef.current === id) return
        selectedDrawingIdsRef.current.delete(id)
        setSelectedDrawingCount(selectedDrawingIdsRef.current.size)
      }
      terraDraw.on('finish', handleDrawingFinished)
      terraDraw.on('change', handleDrawingChanged)
      terraDraw.on('select', handleDrawingSelected)
      terraDraw.on('deselect', handleDrawingDeselected)
      terraDraw.start()
      configureDrawingLayerVisibilityFilters(map)
      configureDrawingLabelLayer(map)
      terraDraw.setMode('render')
      terraDrawRef.current = terraDraw
      void listAllMapDrawings()
        .then((drawings) => {
          if (disposed || !terraDraw) return
          const nextVisibility = restoreVisibilityRecord(
            drawings.map((drawing) => drawing.id),
            drawingVisibilityRef.current,
          )
          const features = drawings.map((drawing) => (
            toTerraDrawFeature(drawing, nextVisibility[drawing.id] ?? true)
          ))
          const validationResults = terraDraw.addFeatures(features)
          for (const [index, result] of validationResults.entries()) {
            const drawing = drawings[index]
            if (!result.valid || result.id === undefined || !drawing) {
              throw new Error(
                `Map drawing data failed Terra Draw validation: ${result.reason ?? 'missing feature id'}`,
              )
            }
            drawingRecordsRef.current.set(result.id, drawing)
            drawingFeatureIdsByRecordIdRef.current.set(drawing.id, result.id)
          }
          drawingVisibilityRef.current = nextVisibility
          syncDrawingLabelSource(map, drawingRecordsRef.current, nextVisibility)
          setDrawingVisibility(nextVisibility)
          setCustomDrawings(drawings)
          setDrawnFeatureCount(countCompletedDrawings(terraDraw))
        })
        .catch((error: unknown) => {
          if (!disposed) showMapDrawingError(error)
        })

      map.on('click', handleMapClick)
      map.on('click', explorationSiteBoundaryFillLayerId, handleExplorationBoundaryClick)
      map.on('click', explorationSiteBoundaryLineLayerId, handleExplorationBoundaryClick)
      map.on('click', inventoryStationPointLayerId, handleInventoryStationClick)
      map.on('click', explorationSiteStatusIconLayerId, handleExplorationSiteClick)
      map.on('click', selectedExplorationChargingStationIconLayerId, handleSelectedExplorationPlaceClick)
      map.on('click', selectedExplorationChargingStationLabelLayerId, handleSelectedExplorationPlaceClick)
      map.on('click', selectedExplorationHotspotIconLayerId, handleSelectedExplorationPlaceClick)
      map.on('click', selectedExplorationHotspotLabelLayerId, handleSelectedExplorationPlaceClick)
      map.on('dblclick', handleDrawingDoubleClick)
      map.on('mouseenter', inventoryStationPointLayerId, handlePointEnter)
      map.on('mouseleave', inventoryStationPointLayerId, handlePointLeave)
      map.on('mouseenter', explorationSiteStatusIconLayerId, handlePointEnter)
      map.on('mouseleave', explorationSiteStatusIconLayerId, handlePointLeave)
      map.on('mouseenter', explorationSiteBoundaryFillLayerId, handlePointEnter)
      map.on('mouseleave', explorationSiteBoundaryFillLayerId, handlePointLeave)
      map.on('mouseenter', explorationSiteBoundaryLineLayerId, handlePointEnter)
      map.on('mouseleave', explorationSiteBoundaryLineLayerId, handlePointLeave)
      map.on('mouseenter', selectedExplorationChargingStationIconLayerId, handlePointEnter)
      map.on('mouseleave', selectedExplorationChargingStationIconLayerId, handlePointLeave)
      map.on('mouseenter', selectedExplorationChargingStationLabelLayerId, handlePointEnter)
      map.on('mouseleave', selectedExplorationChargingStationLabelLayerId, handlePointLeave)
      map.on('mouseenter', selectedExplorationHotspotIconLayerId, handlePointEnter)
      map.on('mouseleave', selectedExplorationHotspotIconLayerId, handlePointLeave)
      map.on('mouseenter', selectedExplorationHotspotLabelLayerId, handlePointEnter)
      map.on('mouseleave', selectedExplorationHotspotLabelLayerId, handlePointLeave)

      map.moveLayer(cityBoundaryLayerId, provinceBoundaryLayerId)
      scheduleInitialViewFit()
      setStatus('ready')
    })

    return () => {
      disposed = true
      window.clearTimeout(initialViewTimeout)
      resizeObserver.disconnect()
      popup.remove()
      if (mapSelectionSuppressionTimerRef.current !== null) {
        window.clearTimeout(mapSelectionSuppressionTimerRef.current)
        mapSelectionSuppressionTimerRef.current = null
      }
      suppressNextMapSelectionRef.current = false
      selectedMapPointAbortRef.current?.abort()
      selectedMapPointAbortRef.current = null
      locationSearchMarkersRef.current.forEach(({ marker }) => marker.remove())
      locationSearchMarkersRef.current = []
      userLocationRequestIdRef.current += 1
      selectedMapPointMarkerRef.current?.remove()
      selectedMapPointMarkerRef.current = null
      analysisMapMarkersRef.current.forEach(({ marker }) => marker.remove())
      analysisMapMarkersRef.current.clear()
      analysisMarkerMotionsRef.current.clear()
      explorationMapMarkersRef.current.forEach(({ marker }) => marker.remove())
      explorationMapMarkersRef.current.clear()
      editingExplorationBoundaryFeatureIdRef.current = null
      if (
        terraDraw
        && handleDrawingFinished
        && handleDrawingChanged
        && handleDrawingSelected
        && handleDrawingDeselected
      ) {
        terraDraw.off('finish', handleDrawingFinished)
        terraDraw.off('change', handleDrawingChanged)
        terraDraw.off('select', handleDrawingSelected)
        terraDraw.off('deselect', handleDrawingDeselected)
        terraDraw.stop()
      }
      map.remove()
      mapRef.current = null
      popupRef.current = null
      terraDrawRef.current = null
      drawingModeRef.current = null
      drawingPurposeRef.current = null
      isSelectingDrawingRef.current = false
      selectedDrawingIdsRef.current.clear()
      drawingRecordsRef.current.clear()
      drawingFeatureIdsByRecordIdRef.current.clear()
      drawingUpdateQueuesRef.current.clear()
      inventoryIconAssetsRef.current.clear()
      explorationFeatureByIdRef.current.clear()
      explorationBoundaryBySiteIdRef.current.clear()
      pendingDrawingIdRef.current = null
    }
  }, [hasValidToken, tiandituToken])

  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready' || !analysisMapSites.data) return

    const visibleSiteIds = new Set<string>()
    for (const site of analysisMapSites.data.sites) {
      const explorationFeature = explorationFeatureByIdRef.current.get(site.siteId)
      if (
        !explorationFeature
        || !visibleExplorationStatuses[explorationFeature.properties.status]
      ) continue

      visibleSiteIds.add(site.siteId)
      const home: [number, number] = [site.longitude, site.latitude]
      const route = explorationBoundaryBySiteIdRef.current.get(site.siteId)
      const current = analysisMapMarkersRef.current.get(site.siteId)
      if (!current) {
        const element = createAnalysisMapMarkerElement(
          site,
          (siteId) => {
            selectExplorationAnalysisFromRobot(siteId, home, route)
          },
        )
        const marker = new maplibregl.Marker({ element, anchor: 'bottom', offset: [0, -18] })
          .setLngLat(home)
          .addTo(map)
        setAnalysisMapMarkerVisibility(element, map.getZoom())
        analysisMapMarkersRef.current.set(site.siteId, {
          marker,
          element,
          taskId: site.task.taskId,
          updatedAt: site.task.updatedAt,
        })
      }

      const markerRecord = analysisMapMarkersRef.current.get(site.siteId)
      if (!markerRecord) continue
      markerRecord.element.style.zIndex = String(
        getExplorationRobotMarkerZIndex(explorationFeature.properties.status),
      )
      const isMovingAlongBoundary = site.task.status === 'running' && Boolean(route)
      if (
        markerRecord.taskId !== site.task.taskId
        || markerRecord.updatedAt !== site.task.updatedAt
      ) {
        updateAnalysisMapMarkerElement(markerRecord.element, site)
        markerRecord.taskId = site.task.taskId
        markerRecord.updatedAt = site.task.updatedAt
      }

      if (isMovingAlongBoundary && route) {
        markerRecord.marker.setOffset([0, 0])
        const existingMotion = analysisMarkerMotionsRef.current.get(site.siteId)
        if (
          existingMotion
          && existingMotion.marker === markerRecord.marker
          && existingMotion.taskId === site.task.taskId
        ) {
          existingMotion.route = route
          existingMotion.home = home
          existingMotion.lapDurationMs = calculateAnalysisMarkerLapDuration(route)
          existingMotion.phase = 'patrolling'
          existingMotion.returnFrom = null
        } else {
          const startedAt = performance.now()
          analysisMarkerMotionsRef.current.set(site.siteId, {
            marker: markerRecord.marker,
            taskId: site.task.taskId,
            route,
            home,
            phase: 'patrolling',
            startedAt,
            lapDurationMs: calculateAnalysisMarkerLapDuration(route),
            returnFrom: null,
            returnStartedAt: 0,
            returnDurationMs: 0,
            nextPauseAt: startedAt + randomAnalysisMarkerPauseInterval(),
            pauseStartedAt: 0,
            pausedUntil: 0,
            totalPausedMs: 0,
            isAtHome: true,
          })
        }
      } else {
        const existingMotion = analysisMarkerMotionsRef.current.get(site.siteId)
        if (existingMotion && !existingMotion.isAtHome) {
          markerRecord.marker.setOffset([0, 0])
          if (existingMotion.phase !== 'returning') {
            const current = markerRecord.marker.getLngLat()
            const returnFrom: [number, number] = [current.lng, current.lat]
            existingMotion.phase = 'returning'
            existingMotion.returnFrom = returnFrom
            existingMotion.returnStartedAt = performance.now()
            existingMotion.returnDurationMs = calculateAnalysisMarkerReturnDuration(returnFrom, home)
            existingMotion.home = home
          }
        } else {
          analysisMarkerMotionsRef.current.delete(site.siteId)
          markerRecord.marker.setOffset([0, -18])
          markerRecord.marker.setLngLat(home)
        }
      }
      setAnalysisMapMarkerVisibility(markerRecord.element, map.getZoom())
    }

    analysisMapMarkersRef.current.forEach(({ marker }, siteId) => {
      if (visibleSiteIds.has(siteId)) return
      marker.remove()
      analysisMapMarkersRef.current.delete(siteId)
      analysisMarkerMotionsRef.current.delete(siteId)
    })
  }, [analysisMapSites.data, explorationMap.data, status, visibleExplorationStatuses])

  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready') return

    let animationFrameId = 0
    const animateMarkers = (timestamp: number) => {
      const motionEnabled = !shouldReduceMotion
        && !document.hidden
        && map.getZoom() >= analysisMarkerMotionMinZoom
      analysisMarkerMotionsRef.current.forEach((motion, siteId) => {
        if (!motionEnabled) {
          motion.marker.setLngLat(motion.home)
          motion.marker.setOffset([0, -18])
          motion.isAtHome = true
          analysisMarkerMotionsRef.current.delete(siteId)
          return
        }

        if (motion.phase === 'returning' && motion.returnFrom) {
          const progress = Math.min(1, Math.max(0,
            (timestamp - motion.returnStartedAt) / motion.returnDurationMs,
          ))
          const easedProgress = 1 - (1 - progress) ** 3
          motion.marker.setLngLat([
            motion.returnFrom[0] + (motion.home[0] - motion.returnFrom[0]) * easedProgress,
            motion.returnFrom[1] + (motion.home[1] - motion.returnFrom[1]) * easedProgress,
          ])
          if (progress >= 1) {
            motion.marker.setLngLat(motion.home)
            motion.marker.setOffset([0, -18])
            motion.isAtHome = true
            analysisMarkerMotionsRef.current.delete(siteId)
          }
          return
        }

        if (motion.pausedUntil > timestamp) return
        if (motion.pausedUntil > 0) {
          motion.totalPausedMs += motion.pausedUntil - motion.pauseStartedAt
          motion.pauseStartedAt = 0
          motion.pausedUntil = 0
          motion.nextPauseAt = timestamp + randomAnalysisMarkerPauseInterval()
        }
        if (timestamp >= motion.nextPauseAt) {
          motion.pauseStartedAt = timestamp
          motion.pausedUntil = timestamp + randomAnalysisMarkerPauseDuration()
          return
        }

        const elapsed = Math.max(0, timestamp - motion.startedAt - motion.totalPausedMs)
        const distance = elapsed % motion.lapDurationMs
          / motion.lapDurationMs
          * motion.route.totalDistanceMeters
        motion.marker.setLngLat(interpolateAnalysisMarkerRoute(motion.route, distance))
        motion.isAtHome = false
      })
      animationFrameId = window.requestAnimationFrame(animateMarkers)
    }
    animationFrameId = window.requestAnimationFrame(animateMarkers)
    return () => window.cancelAnimationFrame(animationFrameId)
  }, [shouldReduceMotion, status])

  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready') return

    const visibleSiteIds = new Set<string>()
    for (const site of explorationSites) {
      if (!visibleExplorationStatuses[site.properties.status]) continue
      visibleSiteIds.add(site.id)
      const current = explorationMapMarkersRef.current.get(site.id)
      if (current) {
        current.marker.setLngLat(site.geometry.coordinates)
        updateExplorationMapMarkerElement(
          current.element,
          site,
          site.id === selectedExplorationSiteId,
        )
        continue
      }

      const element = createExplorationMapMarkerElement(site, (siteId) => {
        if (
          isMeasuringRef.current
          || drawingModeRef.current
          || isSelectingDrawingRef.current
          || editingExplorationBoundaryFeatureIdRef.current !== null
        ) return
        const selectedSite = explorationFeatureByIdRef.current.get(siteId)
        if (!selectedSite) return
        popupRef.current?.remove()
        clearSelectedMapPoint()
        setSelectedAnalysisSiteId(null)
        setSelectedInventoryStationId(null)
        setSelectedExplorationSiteId(selectedSite.id)
      })
      updateExplorationMapMarkerElement(
        element,
        site,
        site.id === selectedExplorationSiteId,
      )
      const marker = new maplibregl.Marker({ element, anchor: 'center' })
        .setLngLat(site.geometry.coordinates)
        .addTo(map)
      explorationMapMarkersRef.current.set(site.id, { marker, element })
    }

    explorationMapMarkersRef.current.forEach(({ marker }, siteId) => {
      if (visibleSiteIds.has(siteId)) return
      marker.remove()
      explorationMapMarkersRef.current.delete(siteId)
    })
  }, [
    explorationMap.data,
    selectedExplorationSiteId,
    status,
    visibleExplorationStatuses,
  ])

  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready') return

    const updateMarkerVisibility = () => {
      analysisMapMarkersRef.current.forEach(({ element }) => {
        setAnalysisMapMarkerVisibility(element, map.getZoom())
      })
    }
    map.on('zoomend', updateMarkerVisibility)
    updateMarkerVisibility()
    return () => {
      map.off('zoomend', updateMarkerVisibility)
    }
  }, [status])

  useEffect(() => {
    if (!analysisMapSites.isError) return
    toast.error('今日站点任务加载失败，请稍后重试。')
  }, [analysisMapSites.isError])

  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready') return

    setMapLayerVisibility(map, roadBaseLayerIds, baseMapType === 'road')
    setMapLayerVisibility(map, satelliteBaseLayerIds, baseMapType === 'satellite')
  }, [baseMapType, status])

  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready') return

    const visible = visibleBasicLayers['road-matching-network']
    const layerIds = [roadMatchingNationalLayerId, roadMatchingProvincialLayerId]
    if (!visible || map.getSource(roadMatchingNetworkSourceId)) {
      setMapLayerVisibility(map, layerIds, visible)
      return
    }

    map.addSource(roadMatchingNetworkSourceId, {
      type: 'geojson',
      data: roadMatchingNetworkUrl,
      attribution: '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors · ODbL</a>',
    })
    map.addLayer({
      id: roadMatchingNationalLayerId,
      type: 'line',
      source: roadMatchingNetworkSourceId,
      filter: ['==', ['get', 'level'], 'national'],
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#2563eb',
        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.8, 10, 1.4, 14, 2.4],
        'line-opacity': 0.72,
      },
    }, selectedRoadSegmentCasingLayerId)
    map.addLayer({
      id: roadMatchingProvincialLayerId,
      type: 'line',
      source: roadMatchingNetworkSourceId,
      filter: ['==', ['get', 'level'], 'provincial'],
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#f97316',
        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.7, 10, 1.2, 14, 2],
        'line-opacity': 0.68,
      },
    }, selectedRoadSegmentCasingLayerId)
  }, [status, visibleBasicLayers])

  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready') return

    const visible = visibleBasicLayers['five-vertical-six-horizontal']
    const layerIds = [
      fiveVerticalSixHorizontalLineLayerId,
      fiveVerticalSixHorizontalLabelLayerId,
    ]
    if (!visible || map.getSource(fiveVerticalSixHorizontalSourceId)) {
      setMapLayerVisibility(map, layerIds, visible)
      return
    }

    map.addSource(fiveVerticalSixHorizontalSourceId, {
      type: 'geojson',
      data: fiveVerticalSixHorizontalUrl,
    })
    map.addLayer({
      id: fiveVerticalSixHorizontalLineLayerId,
      type: 'line',
      source: fiveVerticalSixHorizontalSourceId,
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#ef4444',
        'line-width': [
          'match',
          ['get', 'corridorType'],
          'main', 10,
          'secondary', 6,
          'branch', 3,
          3,
        ],
        'line-opacity': 0.5,
      },
    }, selectedRoadSegmentCasingLayerId)
    map.addLayer({
      id: fiveVerticalSixHorizontalLabelLayerId,
      type: 'symbol',
      source: fiveVerticalSixHorizontalSourceId,
      filter: ['==', ['get', 'showName'], true],
      layout: {
        'symbol-placement': 'line-center',
        'text-field': ['get', 'name'],
        'text-font': [
          'PingFang SC',
          'Microsoft YaHei',
          'Noto Sans CJK SC',
          'sans-serif',
        ],
        'text-size': 12,
        'text-max-angle': 180,
        'text-rotation-alignment': 'map',
        'text-pitch-alignment': 'map',
        'text-keep-upright': true,
        'text-allow-overlap': true,
        'text-ignore-placement': true,
      },
      paint: {
        'text-color': '#111827',
        'text-halo-color': '#ffffff',
        'text-halo-width': 2,
        'text-halo-blur': 0.5,
      },
    }, selectedRoadSegmentCasingLayerId)
  }, [status, visibleBasicLayers])

  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready') return

    setMapLayerVisibility(map, [trafficHeatmapLayerId], visibleBasicLayers['traffic-hotspots'])

    const visibleInventoryLayerIds = inventoryLayerOptions
      .filter((option) => visibleInventoryLayers[option.id])
      .map((option) => option.id)
    const inventoryFilter = createPropertyInFilter(
      'layerCategory',
      visibleInventoryLayerIds,
    )
    map.setFilter(inventoryStationPointLayerId, inventoryFilter)
    map.setFilter(inventoryStationLabelLayerId, inventoryFilter)

    const visibleExplorationStatusIds = siteExplorationStatusOptions
      .filter((option) => visibleExplorationStatuses[option.value])
      .map((option) => option.value)
    const explorationFilter = createPropertyInFilter(
      'status',
      visibleExplorationStatusIds,
    )
    const explorationVisiblePointFilter: maplibregl.FilterSpecification = [
      'all',
      explorationFilter,
      ['==', ['geometry-type'], 'Point'],
    ]
    const explorationStatusIconFilter: maplibregl.FilterSpecification = [
      'all',
      explorationFilter,
      ['==', ['geometry-type'], 'Point'],
      ['in', ['get', 'status'], ['literal', siteExplorationStatusOptions.map(({ value }) => value)]],
    ]
    map.setFilter(explorationSiteShadowLayerId, explorationVisiblePointFilter)
    map.setFilter(explorationSiteStatusIconLayerId, explorationStatusIconFilter)
    map.setFilter(explorationSiteBoundaryFillLayerId, explorationFilter)
    map.setFilter(explorationSiteBoundaryLineLayerId, explorationFilter)
    map.setFilter(
      explorationSiteEdgeLabelLayerId,
      createPropertyInAndEqualsFilter('status', visibleExplorationStatusIds, 'labelKind', 'edge'),
    )
    map.setFilter(
      explorationSiteCenterLabelLayerId,
      createPropertyInAndEqualsFilter('status', visibleExplorationStatusIds, 'labelKind', 'center'),
    )
    map.setFilter(
      explorationSiteNameLabelLayerId,
      createPropertyInAndEqualsFilter(
        'status',
        visibleExplorationStatusIds,
        'labelKind',
        'point-name',
      ),
    )
    popupRef.current?.remove()
  }, [
    status,
    visibleBasicLayers,
    visibleExplorationStatuses,
    visibleInventoryLayers,
  ])

  function setLocationSearchMarkerSelection(resultId: string | null) {
    setSelectedLocationSearchResultId(resultId)
    locationSearchMarkersRef.current.forEach((markerRecord) => {
      const selected = markerRecord.resultId === resultId
      markerRecord.button.dataset.selected = String(selected)
      markerRecord.button.setAttribute('aria-pressed', String(selected))
      markerRecord.icon.src = selected
        ? '/map/location-number-selected.png'
        : '/map/location-number.png'
    })
  }

  function selectMapPoint({
    source,
    longitude,
    latitude,
    locationAddress = null,
  }: {
    source: SelectedMapPoint['source']
    longitude: number
    latitude: number
    locationAddress?: string | null
  }) {
    const map = mapRef.current
    if (!map || editingExplorationBoundaryFeatureIdRef.current !== null) return

    setSelectedAnalysisSiteId(null)
    setSelectedInventoryStationId(null)
    setSelectedExplorationSiteId(null)
    if (source !== 'search') {
      setLocationSearchMarkerSelection(null)
      let marker = selectedMapPointMarkerRef.current
      if (!marker) {
        const markerIcon = document.createElement('img')
        markerIcon.src = '/map/location-selected.png'
        markerIcon.alt = ''
        markerIcon.draggable = false
        markerIcon.className = 'pointer-events-none block size-9 drop-shadow-md'
        marker = new maplibregl.Marker({ element: markerIcon, anchor: 'bottom' })
        selectedMapPointMarkerRef.current = marker
      }
      marker.setLngLat([longitude, latitude]).addTo(map)
    } else {
      selectedMapPointMarkerRef.current?.remove()
      selectedMapPointMarkerRef.current = null
    }

    selectedMapPointAbortRef.current?.abort()
    selectedMapPointAbortRef.current = null
    setSelectedMapPoint({
      source,
      longitude,
      latitude,
      location: null,
      locationAddress,
      locationError: null,
    })

    const controller = new AbortController()
    selectedMapPointAbortRef.current = controller
    void reverseGeocodeTiandituLocation({
      longitude,
      latitude,
      token: tiandituToken ?? '',
      signal: controller.signal,
    }).then((location) => {
      if (selectedMapPointAbortRef.current !== controller) return
      setSelectedMapPoint((current) => current
        ? {
            ...current,
            location,
            locationAddress: location.locationAddress,
            locationError: null,
          }
        : null)
    }).catch((error: unknown) => {
      if (selectedMapPointAbortRef.current !== controller) return
      const message = tiandituReverseGeocodingErrorMessage(error)
      if (!message) return
      setSelectedMapPoint((current) => current
        ? { ...current, locationError: message }
        : null)
    }).finally(() => {
      if (selectedMapPointAbortRef.current === controller) {
        selectedMapPointAbortRef.current = null
      }
    })
  }

  function locateUser() {
    if (!navigator.geolocation || isLocatingUser) {
      if (!navigator.geolocation) toast.error('当前浏览器不支持位置定位。')
      return
    }

    const requestId = ++userLocationRequestIdRef.current
    setIsLocatingUser(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (requestId !== userLocationRequestIdRef.current) return
        setIsLocatingUser(false)
        const map = mapRef.current
        if (!map) return

        const coordinates: [number, number] = [coords.longitude, coords.latitude]
        selectMapPoint({
          source: 'location',
          longitude: coords.longitude,
          latitude: coords.latitude,
        })
        map.flyTo({
          center: coordinates,
          zoom: Math.max(map.getZoom(), 15),
          duration: 700,
          essential: true,
        })
      },
      (error) => {
        if (requestId !== userLocationRequestIdRef.current) return
        setIsLocatingUser(false)
        if (error.code === 1) {
          toast.error('位置权限已被拒绝，请在浏览器设置中允许位置访问。')
        } else if (error.code === 3) {
          toast.error('获取当前位置超时，请重试。')
        } else {
          toast.error('暂时无法获取当前位置，请稍后重试。')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 30_000,
      },
    )
  }

  function clearSelectedMapPoint() {
    userLocationRequestIdRef.current += 1
    selectedMapPointAbortRef.current?.abort()
    selectedMapPointAbortRef.current = null
    setLocationSearchMarkerSelection(null)
    selectedMapPointMarkerRef.current?.remove()
    selectedMapPointMarkerRef.current = null
    setSelectedMapPoint(null)
  }

  function toggleUserLocation() {
    if (editingExplorationBoundaryFeatureIdRef.current !== null) return
    if (!isUserLocationSelected) {
      locateUser()
      return
    }

    clearSelectedMapPoint()
  }

  function removeLocationSearchMarkers() {
    locationSearchMarkersRef.current.forEach(({ marker }) => marker.remove())
    locationSearchMarkersRef.current = []
    setSelectedLocationSearchResultId(null)
    setSelectedMapPoint((current) => current?.source === 'search' ? null : current)
  }

  function showLocationSearchResults(results: readonly TiandituLocationSearchResult[]) {
    const map = mapRef.current
    if (!map) return

    removeLocationSearchMarkers()
    const visibleResults = results.slice(0, 10)
    const bounds = new maplibregl.LngLatBounds()
    locationSearchMarkersRef.current = visibleResults.map((result, index) => {
      const element = document.createElement('div')
      const button = document.createElement('button')
      const icon = document.createElement('img')
      const number = document.createElement('span')

      button.type = 'button'
      button.className = 'group relative block size-9 origin-bottom border-0 bg-transparent p-0 outline-none transition-transform hover:scale-110 focus-visible:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[selected=true]:scale-125'
      button.dataset.selected = 'false'
      button.setAttribute('aria-label', `定位搜索结果 ${index + 1}：${result.name}`)
      button.setAttribute('aria-pressed', 'false')
      icon.src = '/map/location-number.png'
      icon.alt = ''
      icon.draggable = false
      icon.className = 'block size-full drop-shadow-md'
      number.className = 'pointer-events-none absolute left-1/2 top-[43%] -translate-x-1/2 -translate-y-1/2 text-xs font-bold text-primary group-data-[selected=true]:text-[#0ECC00]'
      number.textContent = String(index + 1)
      button.append(icon, number)
      element.append(button)
      button.addEventListener('click', (event) => {
        event.stopPropagation()
        selectLocationSearchResult(result)
      })

      const marker = new maplibregl.Marker({ element, anchor: 'bottom' })
        .setLngLat([result.longitude, result.latitude])
        .addTo(map)
      bounds.extend([result.longitude, result.latitude])
      return { resultId: result.id, marker, button, icon }
    })

    if (visibleResults.length === 1) {
      const result = visibleResults[0]
      if (!result) return
      map.flyTo({
        center: [result.longitude, result.latitude],
        zoom: 15,
        duration: 500,
        essential: true,
      })
    } else if (visibleResults.length > 1) {
      const horizontalPadding = Math.max(
        48,
        Math.min(240, Math.floor(map.getContainer().clientWidth * 0.22)),
      )
      map.fitBounds(bounds, {
        padding: {
          top: 72,
          bottom: 72,
          left: horizontalPadding,
          right: horizontalPadding,
        },
        maxZoom: 15,
        duration: 500,
      })
    }
    popupRef.current?.remove()
  }

  function selectLocationSearchResult(result: TiandituLocationSearchResult) {
    const map = mapRef.current
    if (!map) return

    setLocationSearchMarkerSelection(result.id)
    selectMapPoint({
      source: 'search',
      longitude: result.longitude,
      latitude: result.latitude,
      locationAddress: result.address
        ? `${result.name} · ${result.address}`
        : result.name,
    })
    map.flyTo({
      center: [result.longitude, result.latitude],
      zoom: 15,
      duration: 700,
      essential: true,
    })
    popupRef.current?.remove()
  }

  function selectExplorationSiteFromList(site: SiteExplorationMapPointFeature) {
    if (editingExplorationBoundaryFeatureIdRef.current !== null) return

    const map = mapRef.current
    popupRef.current?.remove()
    clearSelectedMapPoint()
    setSelectedAnalysisSiteId(null)
    setSelectedInventoryStationId(null)
    setSelectedExplorationSiteId(site.id)
    if (!map) return

    map.flyTo({
      center: site.geometry.coordinates,
      zoom: Math.max(map.getZoom(), 16),
      duration: 700,
      essential: true,
    })
  }

  function selectExplorationAnalysisFromRobot(
    siteId: string,
    center: [number, number],
    boundary: AnalysisMarkerRoute | undefined,
  ) {
    analysisMarkerFocusedSiteIdRef.current = siteId
    const map = mapRef.current
    if (map) {
      focusMapOnExplorationSite(
        map,
        center,
        boundary,
        getExplorationFocusPanelWidths(),
      )
    }
    if (selectedExplorationSiteId !== siteId) {
      nextExplorationSiteTabRef.current = 'analysis'
    }
    setSelectedExplorationSiteTab('analysis')
    clearSelectedMapPoint()
    setSelectedAnalysisSiteId(null)
    setSelectedInventoryStationId(null)
    setVisibleExplorationStatuses((current) => ({
      ...current,
      completed: true,
    }))
    setExplorationFilters((current) => (
      current.status === undefined ? current : { ...current, status: undefined }
    ))
    setSelectedExplorationSiteId(siteId)
  }

  function getExplorationFocusPanelWidths(): MapFocusPanelWidths {
    return {
      left: Math.max(
        locationSearchPanelRef.current?.offsetWidth ?? 0,
        layerPanelRef.current?.offsetWidth ?? 0,
        stationListPanelRef.current?.offsetWidth ?? 0,
      ),
      right: selectedExplorationPanelRef.current?.offsetWidth ?? 0,
    }
  }

  function openExplorationAnalysis(record: SiteExplorationRecord) {
    const boundary = createAnalysisMarkerRoute(
      record.siteBoundaryGeoJson?.geometry.coordinates[0] ?? [],
    ) ?? explorationBoundaryBySiteIdRef.current.get(record.id)
    selectExplorationAnalysisFromRobot(
      record.id,
      [record.longitude, record.latitude],
      boundary,
    )
    setEditingExplorationSiteId(null)
  }

  function selectInventoryStationFromList(site: SiteInventoryMapFeature) {
    if (editingExplorationBoundaryFeatureIdRef.current !== null) return

    const map = mapRef.current
    popupRef.current?.remove()
    clearSelectedMapPoint()
    setSelectedAnalysisSiteId(null)
    setSelectedExplorationSiteId(null)
    setSelectedInventoryStationId(site.id)
    setVisibleInventoryLayers((current) => ({
      ...current,
      [site.properties.layerCategory]: true,
    }))
    if (!map) return

    map.flyTo({
      center: site.geometry.coordinates,
      zoom: Math.max(map.getZoom(), 16),
      duration: 700,
      essential: true,
    })
  }

  function resetMapView() {
    const map = mapRef.current
    setActiveMapPanel(null)
    setLocationSearchOpen(false)
    removeLocationSearchMarkers()
    clearSelectedMapPoint()
    setSelectedAnalysisSiteId(null)
    setSelectedInventoryStationId(null)
    setSelectedExplorationSiteId(null)
    setSelectedExplorationSiteTab('site')
    popupRef.current?.remove()
    if (!map) return

    fitMapToHenanProvince(map, 700)
  }

  function clearSelectedExplorationSite() {
    if (explorationBoundaryEditor) closeExplorationBoundaryEditor()
    setSelectedExplorationSiteId(null)
    setSelectedExplorationSiteTab('site')
    popupRef.current?.remove()
    const map = mapRef.current
    if (map) fitMapToHenanProvince(map, 700)
  }

  function toggleBasicLayer(layerId: BasicMapLayerKey, checked: boolean) {
    setVisibleBasicLayers((current) => ({ ...current, [layerId]: checked }))
  }

  function toggleInventoryLayer(
    layerCategory: InventoryLayerCategory,
    checked: boolean,
  ) {
    setVisibleInventoryLayers((current) => ({
      ...current,
      [layerCategory]: checked,
    }))
  }

  function setLayerGroupExpanded(groupId: string, expanded: boolean) {
    setExpandedLayerGroups((current) => ({ ...current, [groupId]: expanded }))
  }

  function toggleExplorationStatus(
    explorationStatus: SiteExplorationStatus,
    checked: boolean,
  ) {
    setVisibleExplorationStatuses((current) => ({
      ...current,
      [explorationStatus]: checked,
    }))
  }

  const basicLayerSelection = getGroupSelectionState(
    basicMapLayerOptions.map((option) => visibleBasicLayers[option.id]),
  )
  const inventorySelection = getGroupSelectionState(
    inventoryLayerOptions.map((option) => visibleInventoryLayers[option.id]),
  )
  const explorationSelection = getGroupSelectionState(
    siteExplorationStatusOptions.map(
      (option) => visibleExplorationStatuses[option.value],
    ),
  )
  const customAreaDrawings = customDrawings.filter(
    (drawing) => drawing.geoJson.geometry.type === 'Polygon',
  )
  const customLineDrawings = customDrawings.filter(
    (drawing) => drawing.geoJson.geometry.type === 'LineString',
  )
  const customAreaSelection = getNonEmptyGroupSelectionState(
    customAreaDrawings.map((drawing) => drawingVisibility[drawing.id] !== false),
  )
  const customLineSelection = getNonEmptyGroupSelectionState(
    customLineDrawings.map((drawing) => drawingVisibility[drawing.id] !== false),
  )
  const selectedLayerCount = [
    ...basicMapLayerOptions.map((option) => visibleBasicLayers[option.id]),
    ...inventoryLayerOptions.map((option) => visibleInventoryLayers[option.id]),
    ...siteExplorationStatusOptions.map(
      (option) => visibleExplorationStatuses[option.value],
    ),
    ...customAreaDrawings.map((drawing) => drawingVisibility[drawing.id] !== false),
    ...customLineDrawings.map((drawing) => drawingVisibility[drawing.id] !== false),
  ].filter(Boolean).length

  function setCustomDrawingLayersVisibility(
    drawings: readonly MapDrawing[],
    visible: boolean,
  ) {
    const terraDraw = terraDrawRef.current
    const nextVisibility = { ...drawingVisibilityRef.current }
    for (const drawing of drawings) {
      nextVisibility[drawing.id] = visible
      const featureId = drawingFeatureIdsByRecordIdRef.current.get(drawing.id)
      if (!terraDraw || featureId === undefined || !terraDraw.hasFeature(featureId)) continue
      if (!visible && selectedDrawingIdsRef.current.has(featureId)) {
        terraDraw.deselectFeature(featureId)
      }
      terraDraw.updateFeatureProperties(featureId, { visible })
    }
    drawingVisibilityRef.current = nextVisibility
    const map = mapRef.current
    if (map) syncDrawingLabelSource(map, drawingRecordsRef.current, nextVisibility)
    setDrawingVisibility(nextVisibility)
  }

  function queueDrawingGeometryUpdate(
    featureId: DrawingFeatureId,
    feature: GeoJSONStoreFeatures,
    terraDraw: TerraDraw,
  ) {
    const previous = drawingUpdateQueuesRef.current.get(featureId) ?? Promise.resolve()
    const update = previous.then(async () => {
      const record = drawingRecordsRef.current.get(featureId)
      if (!record) return
      try {
        const updated = await updateMapDrawing(record.id, {
          name: record.name,
          geoJson: toMapDrawingGeoJson(feature),
          corridorType: record.corridorType,
          showName: record.showName,
          remark: record.remark,
        })
        drawingRecordsRef.current.set(featureId, updated)
        const map = mapRef.current
        if (map) syncDrawingLabelSource(
          map,
          drawingRecordsRef.current,
          drawingVisibilityRef.current,
        )
        setCustomDrawings((current) => current.map(
          (drawing) => drawing.id === updated.id ? updated : drawing,
        ))
        toast.success(`“${updated.name}”已更新`)
      } catch (error) {
        if (drawingUpdateQueuesRef.current.get(featureId) === update) {
          terraDraw.updateFeatureGeometry(featureId, record.geoJson.geometry)
        }
        showMapDrawingError(error)
      }
    })
    drawingUpdateQueuesRef.current.set(featureId, update)
    void update.finally(() => {
      if (drawingUpdateQueuesRef.current.get(featureId) === update) {
        drawingUpdateQueuesRef.current.delete(featureId)
      }
    })
  }

  function closeDrawingDialog() {
    if (isSavingDrawing) return
    const terraDraw = terraDrawRef.current
    const featureId = pendingDrawingIdRef.current
    if (terraDraw && featureId !== null) {
      terraDraw.removeFeatures([featureId])
      setDrawnFeatureCount(countCompletedDrawings(terraDraw))
    }
    pendingDrawingIdRef.current = null
    setPendingDrawing(null)
    setDrawingCorridorType('')
    setDrawingShowName(true)
    setDrawingFormSubmitted(false)
  }

  async function savePendingDrawing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setDrawingFormSubmitted(true)
    const name = drawingName.trim()
    if (
      !pendingDrawing
      || !name
      || name.length > 128
      || drawingRemark.length > 1_000
      || (pendingDrawing.geometryType === 'LineString' && !drawingCorridorType)
    ) return

    const terraDraw = terraDrawRef.current
    const featureId = pendingDrawingIdRef.current
    const feature = featureId === null ? undefined : terraDraw?.getSnapshotFeature(featureId)
    if (!terraDraw || featureId === null || !feature) {
      toast.error('待保存的地图图形已不存在。')
      return
    }

    setIsSavingDrawing(true)
    try {
      const record = await createMapDrawing({
        name,
        geoJson: toMapDrawingGeoJson(feature),
        corridorType: feature.geometry.type === 'LineString' ? drawingCorridorType || null : null,
        showName: feature.geometry.type === 'LineString' ? drawingShowName : true,
        remark: drawingRemark.trim(),
      })
      if (record.corridorType) {
        terraDraw.updateFeatureProperties(featureId, { corridorType: record.corridorType })
      }
      drawingRecordsRef.current.set(featureId, record)
      drawingFeatureIdsByRecordIdRef.current.set(record.id, featureId)
      drawingVisibilityRef.current = {
        ...drawingVisibilityRef.current,
        [record.id]: true,
      }
      setDrawingVisibility(drawingVisibilityRef.current)
      setCustomDrawings((current) => [...current, record])
      const map = mapRef.current
      if (map) syncDrawingLabelSource(
        map,
        drawingRecordsRef.current,
        drawingVisibilityRef.current,
      )
      pendingDrawingIdRef.current = null
      setPendingDrawing(null)
      setDrawingCorridorType('')
      setDrawingShowName(true)
      setDrawingFormSubmitted(false)
      toast.success(`“${record.name}”已保存`)
    } catch (error) {
      showMapDrawingError(error)
    } finally {
      setIsSavingDrawing(false)
    }
  }

  function openDrawingEditor(drawing: MapDrawing) {
    const featureId = drawingFeatureIdsByRecordIdRef.current.get(drawing.id)
    const current = featureId === undefined
      ? drawing
      : drawingRecordsRef.current.get(featureId) ?? drawing
    setEditingDrawing(current)
    setEditingDrawingName(current.name)
    setEditingDrawingCorridorType(current.corridorType ?? '')
    setEditingDrawingShowName(current.showName)
    setEditingDrawingRemark(current.remark)
    setEditingDrawingFormSubmitted(false)
  }

  function locateDrawing(drawing: MapDrawing) {
    const map = mapRef.current
    if (!map) return

    const featureId = drawingFeatureIdsByRecordIdRef.current.get(drawing.id)
    const feature = featureId === undefined
      ? undefined
      : terraDrawRef.current?.getSnapshotFeature(featureId)
    const bounds = new maplibregl.LngLatBounds()
    extendBoundsFromCoordinates(
      bounds,
      feature?.geometry.coordinates ?? drawing.geoJson.geometry.coordinates,
    )
    if (bounds.isEmpty()) {
      toast.error(`“${drawing.name}”没有可定位的坐标。`)
      return
    }

    setCustomDrawingLayersVisibility([drawing], true)
    map.fitBounds(bounds, {
      padding: 48,
      maxZoom: 15,
      duration: 500,
    })
    popupRef.current?.remove()
  }

  function renderDrawingActions(drawing: MapDrawing) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={(
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-6"
              aria-label={`打开${drawing.name}操作菜单`}
            />
          )}
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-28">
          <DropdownMenuItem onClick={() => locateDrawing(drawing)}>
            <MapPinIcon />
            定位
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openDrawingEditor(drawing)}>
            <PencilIcon />
            编辑
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDrawingToDelete(drawing)}
          >
            <Trash2Icon />
            删除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  async function saveEditedDrawing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setEditingDrawingFormSubmitted(true)
    const name = editingDrawingName.trim()
    if (
      !editingDrawing
      || !name
      || name.length > 128
      || editingDrawingRemark.length > 1_000
      || (
        editingDrawing.geoJson.geometry.type === 'LineString'
        && !editingDrawingCorridorType
      )
    ) {
      return
    }

    const featureId = drawingFeatureIdsByRecordIdRef.current.get(editingDrawing.id)
    if (featureId === undefined) {
      toast.error('待编辑的地图图形已不存在。')
      return
    }

    setIsUpdatingDrawing(true)
    try {
      await drawingUpdateQueuesRef.current.get(featureId)
      const current = drawingRecordsRef.current.get(featureId)
      if (!current) throw new Error('Drawing record is not persisted')
      const updated = await updateMapDrawing(current.id, {
        name,
        geoJson: current.geoJson,
        corridorType: current.geoJson.geometry.type === 'LineString'
          ? editingDrawingCorridorType || null
          : null,
        showName: current.geoJson.geometry.type === 'LineString'
          ? editingDrawingShowName
          : true,
        remark: editingDrawingRemark.trim(),
      })
      if (updated.corridorType) {
        terraDrawRef.current?.updateFeatureProperties(featureId, {
          corridorType: updated.corridorType,
        })
      }
      drawingRecordsRef.current.set(featureId, updated)
      const map = mapRef.current
      if (map) syncDrawingLabelSource(
        map,
        drawingRecordsRef.current,
        drawingVisibilityRef.current,
      )
      setCustomDrawings((drawings) => drawings.map(
        (drawing) => drawing.id === updated.id ? updated : drawing,
      ))
      setEditingDrawing(null)
      setEditingDrawingFormSubmitted(false)
      toast.success(`“${updated.name}”已更新`)
    } catch (error) {
      showMapDrawingError(error)
    } finally {
      setIsUpdatingDrawing(false)
    }
  }

  async function confirmDeleteDrawing() {
    const drawing = drawingToDelete
    const terraDraw = terraDrawRef.current
    if (!drawing || !terraDraw || isDeletingDrawing) return

    const featureId = drawingFeatureIdsByRecordIdRef.current.get(drawing.id)
    if (featureId === undefined) {
      setDrawingToDelete(null)
      toast.error('待删除的地图图形已不存在。')
      return
    }

    setIsDeletingDrawing(true)
    try {
      await drawingUpdateQueuesRef.current.get(featureId)
      await deleteMapDrawing(drawing.id)
      if (selectedDrawingIdsRef.current.has(featureId)) {
        terraDraw.deselectFeature(featureId)
        selectedDrawingIdsRef.current.delete(featureId)
        setSelectedDrawingCount(selectedDrawingIdsRef.current.size)
      }
      if (terraDraw.hasFeature(featureId)) terraDraw.removeFeatures([featureId])
      drawingRecordsRef.current.delete(featureId)
      drawingFeatureIdsByRecordIdRef.current.delete(drawing.id)
      delete drawingVisibilityRef.current[drawing.id]
      syncDrawingLabelSource(
        mapRef.current,
        drawingRecordsRef.current,
        drawingVisibilityRef.current,
      )
      setDrawingVisibility({ ...drawingVisibilityRef.current })
      setCustomDrawings((drawings) => drawings.filter((item) => item.id !== drawing.id))
      setDrawnFeatureCount(countCompletedDrawings(terraDraw))
      setDrawingToDelete(null)
      if (editingDrawing?.id === drawing.id) {
        setEditingDrawing(null)
        setEditingDrawingFormSubmitted(false)
      }
      toast.success(`“${drawing.name}”已删除`)
    } catch (error) {
      showMapDrawingError(error)
    } finally {
      setIsDeletingDrawing(false)
    }
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement === mapSurfaceRef.current) {
      await document.exitFullscreen()
      return
    }

    await mapSurfaceRef.current?.requestFullscreen()
  }

  async function createExplorationSite(selectedLocation: SiteExplorationConfirmedLocation) {
    if (isCreatingExplorationSite) return
    setIsCreatingExplorationSite(true)
    try {
      const initialValue = applyConfirmedSiteExplorationLocation(
        createEmptySiteExplorationInput(),
        selectedLocation,
      )
      const record = await explorationDraft.mutateAsync(initialValue)
      queryClient.setQueryData(['site-exploration', 'detail', record.id], record)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['site-exploration', 'map'] }),
        queryClient.invalidateQueries({ queryKey: ['site-exploration', 'list'] }),
      ])
      setEditingExplorationSiteId(record.id)
    } catch (error) {
      toast.error(siteExplorationErrorMessage(error) ?? '勘探站点创建失败，请稍后重试。')
    } finally {
      setIsCreatingExplorationSite(false)
    }
  }

  async function editSelectedExplorationBoundary() {
    const terraDraw = terraDrawRef.current
    const map = mapRef.current
    if (
      !selectedExplorationSiteId
      || !selectedExplorationBoundary
      || !terraDraw
      || !map
      || isLoadingExplorationBoundary
      || explorationBoundaryEditor
    ) return

    setIsLoadingExplorationBoundary(true)
    let addedFeatureId: DrawingFeatureId | null = null
    try {
      const record = await getSiteExplorationSite(selectedExplorationSiteId)
      if (!record.siteBoundaryGeoJson) {
        toast.error('该场站没有可编辑的边界。')
        return
      }
      const [validation] = terraDraw.addFeatures([{
        type: 'Feature',
        properties: { mode: 'polygon', visible: true },
        geometry: record.siteBoundaryGeoJson.geometry,
      }])
      if (!validation?.valid || validation.id === undefined) {
        throw new Error(validation?.reason ?? '场站边界无法进入编辑模式')
      }
      addedFeatureId = validation.id
      editingExplorationBoundaryFeatureIdRef.current = validation.id
      setExplorationBoundaryEditor({ record, featureId: validation.id })
      terraDraw.setMode('select')
      terraDraw.selectFeature(validation.id)
      map.getCanvas().style.cursor = 'pointer'
    } catch (error) {
      if (addedFeatureId !== null) terraDraw.removeFeatures([addedFeatureId])
      editingExplorationBoundaryFeatureIdRef.current = null
      const message = siteExplorationErrorMessage(error)
      toast.error(message ?? '场站边界加载失败，请稍后重试。')
    } finally {
      setIsLoadingExplorationBoundary(false)
    }
  }

  function closeExplorationBoundaryEditor(force = false) {
    if (isSavingExplorationBoundary && !force) return
    const terraDraw = terraDrawRef.current
    const featureId = editingExplorationBoundaryFeatureIdRef.current
    if (terraDraw && featureId !== null) {
      terraDraw.removeFeatures([featureId])
      terraDraw.setMode('render')
    }
    editingExplorationBoundaryFeatureIdRef.current = null
    setExplorationBoundaryEditor(null)
    const map = mapRef.current
    if (map) map.getCanvas().style.cursor = ''
  }

  async function saveExplorationBoundary() {
    const terraDraw = terraDrawRef.current
    const editor = explorationBoundaryEditor
    if (!terraDraw || !editor || isSavingExplorationBoundary) return
    const feature = terraDraw.getSnapshotFeature(editor.featureId)
    if (!feature || feature.geometry.type !== 'Polygon') {
      toast.error('场站边界数据无效，请重新编辑。')
      return
    }
    const geoJson = toMapDrawingGeoJson(feature)
    if (geoJson.geometry.type !== 'Polygon') return
    const center = centerOfMass(geoJson as never).geometry.coordinates
    const longitude = center[0]
    const latitude = center[1]
    if (
      typeof longitude !== 'number'
      || !Number.isFinite(longitude)
      || typeof latitude !== 'number'
      || !Number.isFinite(latitude)
    ) {
      toast.error('无法计算场站区域中心点，请继续调整边界。')
      return
    }

    setIsSavingExplorationBoundary(true)
    try {
      const controller = new AbortController()
      const location = await reverseGeocodeTiandituLocation({
        longitude,
        latitude,
        token: tiandituToken ?? '',
        signal: controller.signal,
      })
      const updated = await updateSiteExplorationSite(
        editor.record.id,
        {
          ...siteExplorationRecordToInput(editor.record),
          siteBoundaryGeoJson: {
            type: 'Feature',
            properties: {},
            geometry: geoJson.geometry,
          },
          longitude,
          latitude,
          provinceCity: location.provinceCity,
          countyDistrict: location.countyDistrict,
          locationAddress: location.locationAddress,
          siteAreaSquareMeters: calculatePolygonAreaSquareMeters(
            geoJson.geometry.coordinates,
          ),
        },
        editor.record.updatedAt,
      )
      queryClient.setQueryData(
        ['site-exploration', 'detail', editor.record.id],
        updated,
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['site-exploration', 'map'] }),
        queryClient.invalidateQueries({ queryKey: ['site-exploration', 'list'] }),
      ])
      closeExplorationBoundaryEditor(true)
      toast.success(`“${updated.projectName}”边界已更新`)
    } catch (error) {
      const message = siteExplorationErrorMessage(error)
      if (message) toast.error(message)
    } finally {
      setIsSavingExplorationBoundary(false)
    }
  }

  function toggleMeasurement() {
    const map = mapRef.current
    if (!map || editingExplorationBoundaryFeatureIdRef.current !== null) return

    const nextIsMeasuring = !isMeasuringRef.current
    if (!nextIsMeasuring) {
      closeMeasurement()
      return
    }

    setIsMeasurementInfoOpen(true)
    terraDrawRef.current?.setMode('render')
    drawingModeRef.current = null
    drawingPurposeRef.current = null
    isSelectingDrawingRef.current = false
    setDrawingMode(null)
    setDrawingPurpose(null)
    setIsSelectingDrawing(false)
    measurementPointsRef.current = []
    setMeasurementDistance(null)
    updateMeasurementSource(map, [])
    popupRef.current?.remove()
    isMeasuringRef.current = true
    setIsMeasuring(true)
    map.getCanvas().style.cursor = 'crosshair'
  }

  function toggleDrawingMode(mode: DrawingMode, purpose: DrawingPurpose = 'custom') {
    const terraDraw = terraDrawRef.current
    const map = mapRef.current
    if (!terraDraw || !map || editingExplorationBoundaryFeatureIdRef.current !== null) return

    if (isMeasuringRef.current) {
      isMeasuringRef.current = false
      setIsMeasuring(false)
    }

    const isSameDrawingMode = (
      drawingModeRef.current === mode
      && drawingPurposeRef.current === purpose
    )
    const nextMode = isSameDrawingMode ? null : mode
    const nextPurpose = nextMode ? purpose : null
    drawingModeRef.current = nextMode
    drawingPurposeRef.current = nextPurpose
    isSelectingDrawingRef.current = false
    setDrawingMode(nextMode)
    setDrawingPurpose(nextPurpose)
    setIsSelectingDrawing(false)
    terraDraw.setMode(nextMode ?? 'render')
    popupRef.current?.remove()
    map.getCanvas().style.cursor = nextMode ? 'crosshair' : ''
  }

  function toggleDrawingSelection() {
    const terraDraw = terraDrawRef.current
    const map = mapRef.current
    if (!terraDraw || !map || editingExplorationBoundaryFeatureIdRef.current !== null) return

    if (isMeasuringRef.current) {
      isMeasuringRef.current = false
      setIsMeasuring(false)
    }

    const nextIsSelecting = !isSelectingDrawingRef.current
    drawingModeRef.current = null
    drawingPurposeRef.current = null
    isSelectingDrawingRef.current = nextIsSelecting
    setDrawingMode(null)
    setDrawingPurpose(null)
    setIsSelectingDrawing(nextIsSelecting)
    terraDraw.setMode(nextIsSelecting ? 'select' : 'render')
    popupRef.current?.remove()
    map.getCanvas().style.cursor = nextIsSelecting ? 'pointer' : ''
  }

  async function deleteSelectedDrawings() {
    const terraDraw = terraDrawRef.current
    const selectedIds = [...selectedDrawingIdsRef.current]
    if (!terraDraw || selectedIds.length === 0 || isDeletingDrawing) return

    setIsDeletingDrawing(true)
    const results = await Promise.allSettled(selectedIds.map(async (featureId) => {
      await drawingUpdateQueuesRef.current.get(featureId)
      const record = drawingRecordsRef.current.get(featureId)
      if (!record) throw new Error('Drawing record is not persisted')
      await deleteMapDrawing(record.id)
      return { featureId, record }
    }))
    const deletedIds: DrawingFeatureId[] = []
    let failedError: unknown
    for (const result of results) {
      if (result.status === 'fulfilled') {
        deletedIds.push(result.value.featureId)
        drawingRecordsRef.current.delete(result.value.featureId)
        drawingFeatureIdsByRecordIdRef.current.delete(result.value.record.id)
        delete drawingVisibilityRef.current[result.value.record.id]
      } else {
        failedError ??= result.reason
      }
    }
    if (deletedIds.length > 0) {
      const deletedRecordIds = new Set(results.flatMap((result) => (
        result.status === 'fulfilled' ? [result.value.record.id] : []
      )))
      setCustomDrawings((current) => current.filter(
        (drawing) => !deletedRecordIds.has(drawing.id),
      ))
      setDrawingVisibility({ ...drawingVisibilityRef.current })
      syncDrawingLabelSource(
        mapRef.current,
        drawingRecordsRef.current,
        drawingVisibilityRef.current,
      )
      terraDraw.removeFeatures(deletedIds)
      for (const id of deletedIds) selectedDrawingIdsRef.current.delete(id)
      setSelectedDrawingCount(selectedDrawingIdsRef.current.size)
      setDrawnFeatureCount(countCompletedDrawings(terraDraw))
      toast.success(deletedIds.length === 1 ? '绘制内容已删除' : `已删除 ${deletedIds.length} 项绘制内容`)
    }
    if (failedError) showMapDrawingError(failedError)
    setIsDeletingDrawing(false)
  }

  function clearMeasurement() {
    const map = mapRef.current
    measurementPointsRef.current = []
    setMeasurementDistance(null)
    if (map) updateMeasurementSource(map, [])
  }

  function closeMeasurement() {
    const map = mapRef.current
    isMeasuringRef.current = false
    setIsMeasuring(false)
    setIsMeasurementInfoOpen(false)
    measurementPointsRef.current = []
    setMeasurementDistance(null)
    if (map) {
      updateMeasurementSource(map, [])
      map.getCanvas().style.cursor = ''
    }
  }

  return (
    <>
      <Card className="h-full border-0 py-0 shadow-none ring-0">
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 px-0">
        <div
          ref={mapSurfaceRef}
          className="@container/map relative min-h-[24rem] w-full flex-1 overflow-hidden border-t bg-muted"
          aria-busy={status === 'loading'}
        >
          <div
            ref={containerRef}
            className={cn(
              'absolute inset-0 z-0 overflow-hidden',
              status !== 'ready' && 'invisible',
            )}
            role="region"
            aria-label={`使用天地图底图的智能选址地图，支持滚轮缩放，显示${filteredInventorySites.length}个任务站点、${explorationSites.length}个勘探站点和${analysisSites.length}个智能分析任务标记`}
          />
          {status === 'ready' ? (
            <>
              <div
                className="pointer-events-none absolute bottom-3 left-3 top-3 z-10 flex w-[17rem] max-w-[calc(100%-1.5rem)] flex-col gap-2 @5xl/map:w-96 @7xl/map:w-[26rem]"
                onPointerDown={(event) => event.stopPropagation()}
                onWheel={(event) => event.stopPropagation()}
              >
                {activeMapPanel === null && !locationSearchOpen ? (
                  <div className="pointer-events-auto flex flex-col items-start gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 gap-2 bg-card/95 px-3 shadow-sm backdrop-blur"
                      aria-label={`展开站点列表，共 ${explorationSites.length} 个勘探站点和 ${filteredInventorySites.length} 个任务站点`}
                      onClick={() => {
                        setLocationSearchOpen(false)
                        setActiveMapPanel('stations')
                      }}
                    >
                      <MapPinnedIcon aria-hidden="true" />
                      <span>{stationTitle}</span>
                      <span className="flex min-w-6 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold tabular-nums text-primary-foreground">
                        {explorationMap.isPending || inventoryMap.isPending
                          ? '…'
                          : explorationSites.length + filteredInventorySites.length}
                      </span>
                      <ChevronRightIcon aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 gap-2 bg-card/95 px-3 shadow-sm backdrop-blur"
                      aria-label={`展开地图图层，当前已勾选 ${selectedLayerCount} 个图层`}
                      onClick={() => {
                        setLocationSearchOpen(false)
                        setActiveMapPanel('layers')
                      }}
                    >
                      <MapIcon aria-hidden="true" />
                      <span>地图图层</span>
                      <span className="flex min-w-6 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold tabular-nums text-primary-foreground">
                        {selectedLayerCount}
                      </span>
                      <ChevronRightIcon aria-hidden="true" />
                    </Button>
                    <div
                      className="inline-flex rounded-lg border bg-card/95 p-1 shadow-sm backdrop-blur"
                      role="group"
                      aria-label="切换地图底图"
                    >
                      <Button
                        type="button"
                        variant={baseMapType === 'road' ? 'secondary' : 'ghost'}
                        size="sm"
                        aria-pressed={baseMapType === 'road'}
                        onClick={() => setBaseMapType('road')}
                      >
                        道路
                      </Button>
                      <Button
                        type="button"
                        variant={baseMapType === 'satellite' ? 'secondary' : 'ghost'}
                        size="sm"
                        aria-pressed={baseMapType === 'satellite'}
                        onClick={() => setBaseMapType('satellite')}
                      >
                        卫星
                      </Button>
                    </div>
                  </div>
                ) : null}

                <section
                  ref={locationSearchPanelRef}
                  className="pointer-events-auto order-first flex max-h-full min-h-0 w-full flex-col"
                  aria-label="位置搜索"
                  hidden={activeMapPanel !== null}
                  inert={activeMapPanel !== null}
                >
                  <TiandituLocationCommand
                    token={tiandituToken ?? ''}
                    selectedResultId={selectedLocationSearchResultId}
                    open={locationSearchOpen}
                    formClassName="flex max-h-full min-h-0 flex-col"
                    className="max-h-full min-h-0"
                    listClassName="max-h-none min-h-0"
                    onOpenChange={setLocationSearchOpen}
                    onResultsChange={showLocationSearchResults}
                    onSelect={selectLocationSearchResult}
                  />
                </section>

                <aside
                  ref={layerPanelRef}
                  className={cn(
                    'pointer-events-auto h-full min-h-0 w-full flex-col overflow-hidden rounded-lg border bg-card/95 shadow-sm backdrop-blur',
                    activeMapPanel === 'layers' ? 'flex' : 'hidden',
                  )}
                  aria-label="地图图层切换"
                  hidden={activeMapPanel !== 'layers'}
                  inert={activeMapPanel !== 'layers'}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto w-full shrink-0 justify-between rounded-b-none rounded-t-lg border-b px-3 py-2.5 text-left hover:bg-muted/50"
                    aria-label="收起为 Mini 图层侧栏"
                    title="收起"
                    onClick={() => setActiveMapPanel(null)}
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      <MapIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="font-medium">地图图层</p>
                        <p className="text-xs text-muted-foreground">
                          已勾选 {selectedLayerCount} 个
                        </p>
                      </div>
                    </div>
                    <ChevronRightIcon className="shrink-0 rotate-180" aria-hidden="true" />
                  </Button>
                  <div className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent min-h-0 flex-1 space-y-3 overflow-y-auto p-2.5">
                <MapLayerGroup
                  id={mapLayerGroupIds.basic}
                  title="基本图层"
                  expanded={expandedLayerGroups[mapLayerGroupIds.basic] ?? false}
                  onExpandedChange={(expanded) => setLayerGroupExpanded(
                    mapLayerGroupIds.basic,
                    expanded,
                  )}
                  {...basicLayerSelection}
                  onCheckedChange={(checked) => setVisibleBasicLayers(
                    createVisibilityRecord(
                      basicMapLayerOptions.map((option) => option.id),
                      checked,
                    ),
                  )}
                >
                  {basicMapLayerOptions.map((layer) => (
                    <MapLayerOption
                      key={layer.id}
                      id={`site-selection-basic-layer-${layer.id}`}
                      label={layer.label}
                      indicatorClassName={layer.indicatorClassName}
                      checked={visibleBasicLayers[layer.id]}
                      onCheckedChange={(checked) => toggleBasicLayer(layer.id, checked)}
                    />
                  ))}
                </MapLayerGroup>

                <MapLayerGroup
                  id={mapLayerGroupIds.inventory}
                  title="任务站点"
                  expanded={expandedLayerGroups[mapLayerGroupIds.inventory] ?? false}
                  onExpandedChange={(expanded) => setLayerGroupExpanded(
                    mapLayerGroupIds.inventory,
                    expanded,
                  )}
                  {...inventorySelection}
                  onCheckedChange={(checked) => setVisibleInventoryLayers(
                    createVisibilityRecord(
                      inventoryLayerOptions.map((option) => option.id),
                      checked,
                    ),
                  )}
                >
                  {inventoryLayerOptions.map((option) => (
                    <MapLayerOption
                      key={option.id}
                      id={`site-selection-inventory-layer-${option.id}`}
                      label={option.label}
                      count={inventoryLayerCounts[option.id]}
                      indicatorClassName="size-3"
                      indicatorImageSrc={option.iconPath}
                      checked={visibleInventoryLayers[option.id]}
                      onCheckedChange={(checked) => toggleInventoryLayer(option.id, checked)}
                    />
                  ))}
                </MapLayerGroup>

                <MapLayerGroup
                  id={mapLayerGroupIds.exploration}
                  title="勘探站点"
                  expanded={expandedLayerGroups[mapLayerGroupIds.exploration] ?? false}
                  onExpandedChange={(expanded) => setLayerGroupExpanded(
                    mapLayerGroupIds.exploration,
                    expanded,
                  )}
                  {...explorationSelection}
                  onCheckedChange={(checked) => setVisibleExplorationStatuses(
                    createVisibilityRecord(
                      siteExplorationStatusOptions.map((option) => option.value),
                      checked,
                    ),
                  )}
                >
                  {siteExplorationStatusOptions.map((option) => (
                    <MapLayerOption
                      key={option.value}
                      id={`site-selection-exploration-layer-${option.value}`}
                      label={option.label}
                      count={explorationStatusCounts[option.value]}
                      indicatorClassName="size-5"
                      indicatorImageSrc={getSiteExplorationStatusConfig(option.value).iconPath}
                      checked={visibleExplorationStatuses[option.value]}
                      onCheckedChange={(checked) => (
                        toggleExplorationStatus(option.value, checked)
                      )}
                    />
                  ))}
                </MapLayerGroup>

                <MapLayerGroup
                  id={mapLayerGroupIds.customAreas}
                  title="自定义区域"
                  expanded={expandedLayerGroups[mapLayerGroupIds.customAreas] ?? false}
                  onExpandedChange={(expanded) => setLayerGroupExpanded(
                    mapLayerGroupIds.customAreas,
                    expanded,
                  )}
                  {...customAreaSelection}
                  onCheckedChange={(checked) => (
                    setCustomDrawingLayersVisibility(customAreaDrawings, checked)
                  )}
                >
                  {customAreaDrawings.length === 0
                    ? <MapLayerEmpty label="暂无自定义区域" />
                    : customAreaDrawings.map((drawing) => (
                        <MapLayerOption
                          key={drawing.id}
                          id={`site-selection-custom-area-layer-${drawing.id}`}
                          label={drawing.name}
                          indicatorClassName="size-2.5 rounded-sm border-2 border-primary bg-primary/20"
                          checked={drawingVisibility[drawing.id] !== false}
                          onCheckedChange={(checked) => (
                            setCustomDrawingLayersVisibility([drawing], checked)
                          )}
                          actions={renderDrawingActions(drawing)}
                        />
                      ))}
                </MapLayerGroup>

                <MapLayerGroup
                  id={mapLayerGroupIds.customLines}
                  title="自定义线路"
                  expanded={expandedLayerGroups[mapLayerGroupIds.customLines] ?? false}
                  onExpandedChange={(expanded) => setLayerGroupExpanded(
                    mapLayerGroupIds.customLines,
                    expanded,
                  )}
                  {...customLineSelection}
                  onCheckedChange={(checked) => (
                    setCustomDrawingLayersVisibility(customLineDrawings, checked)
                  )}
                >
                  {customLineDrawings.length === 0
                    ? <MapLayerEmpty label="暂无自定义线路" />
                    : customLineDrawings.map((drawing) => (
                        <MapLayerOption
                          key={drawing.id}
                          id={`site-selection-custom-line-layer-${drawing.id}`}
                          label={drawing.name}
                          indicatorClassName="h-0.5 w-3 rounded-full bg-primary"
                          checked={drawingVisibility[drawing.id] !== false}
                          onCheckedChange={(checked) => (
                            setCustomDrawingLayersVisibility([drawing], checked)
                          )}
                          onDoubleClick={() => {
                            setCustomDrawingLayersVisibility([drawing], true)
                            openDrawingEditor(drawing)
                          }}
                          actions={renderDrawingActions(drawing)}
                        />
                      ))}
                </MapLayerGroup>

                  </div>
                </aside>
              </div>
              <AnimatePresence initial={false}>
                {activeMapPanel === 'stations' ? (
                  <motion.div
                    ref={stationListPanelRef}
                    initial={shouldReduceMotion
                      ? false
                      : { x: 'calc(-100% - 1rem)', opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={shouldReduceMotion
                      ? { opacity: 0 }
                      : { x: 'calc(-100% - 1rem)', opacity: 0 }}
                    transition={shouldReduceMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 380, damping: 36, mass: 0.85 }}
                    className="absolute inset-y-0 left-0 z-20 flex w-[17rem] max-w-[calc(100%-0.75rem)] flex-col @5xl/map:w-96"
                    onPointerDown={(event) => event.stopPropagation()}
                    onWheel={(event) => event.stopPropagation()}
                  >
                    <SiteSelectionMapStationPanel
                      scopeTeamName={explorationMap.data?.scopeTeamName ?? null}
                      explorationSites={explorationSites}
                      selectedExplorationSiteId={selectedExplorationSiteId}
                      explorationPending={explorationMap.isPending}
                      explorationError={explorationMap.isError ? explorationMap.error : null}
                      onRetryExploration={() => void explorationMap.refetch()}
                      onSelectExploration={selectExplorationSiteFromList}
                      explorationFilters={explorationFilters}
                      explorationFilterOptions={explorationFilterOptions.data ?? null}
                      explorationFilterOptionsPending={explorationFilterOptions.isPending}
                      explorationFilterOptionsError={explorationFilterOptions.isError
                        ? explorationFilterOptions.error
                        : null}
                      onExplorationFiltersChange={setExplorationFilters}
                      onRetryExplorationFilterOptions={() => (
                        void explorationFilterOptions.refetch()
                      )}
                      taskSites={filteredInventorySites}
                      taskFilters={taskFilters}
                      taskFilterOptions={taskFilterOptions}
                      onTaskFiltersChange={setTaskFilters}
                      selectedTaskSiteId={selectedInventoryStationId}
                      tasksPending={inventoryMap.isPending}
                      tasksError={inventoryMap.isError ? inventoryMap.error : null}
                      onRetryTasks={() => void inventoryMap.refetch()}
                      onSelectTask={selectInventoryStationFromList}
                      onCollapse={() => setActiveMapPanel(null)}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </>
          ) : null}
          {status === 'ready' ? (
            <div
              className="absolute right-3 top-3 z-10 flex gap-2"
              onPointerDown={(event) => event.stopPropagation()}
              onWheel={(event) => event.stopPropagation()}
            >
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={(
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="bg-card/95 shadow-sm backdrop-blur @2xl/map:hidden"
                      aria-label="打开地图工具菜单"
                      title="地图工具"
                    />
                  )}
                >
                  <MoreHorizontalIcon aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      className={cn(drawingMode === 'linestring' && 'bg-accent')}
                      disabled={explorationBoundaryEditor !== null}
                      onClick={() => toggleDrawingMode('linestring')}
                    >
                      <PolylineIcon aria-hidden="true" />
                      {drawingMode === 'linestring' ? '结束绘制线条' : '绘制线条'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className={cn(
                        drawingMode === 'polygon' && drawingPurpose === 'custom' && 'bg-accent',
                      )}
                      disabled={explorationBoundaryEditor !== null}
                      onClick={() => toggleDrawingMode('polygon')}
                    >
                      <VectorSquareIcon aria-hidden="true" />
                      {drawingMode === 'polygon' && drawingPurpose === 'custom'
                        ? '结束绘制区域'
                        : '绘制区域'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className={cn(isSelectingDrawing && 'bg-accent')}
                      disabled={explorationBoundaryEditor !== null
                        || (!isSelectingDrawing && drawnFeatureCount === 0)}
                      onClick={toggleDrawingSelection}
                    >
                      <CursorIcon aria-hidden="true" />
                      {isSelectingDrawing ? '退出选择模式' : '选择绘制内容'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      disabled={explorationBoundaryEditor !== null
                        || selectedDrawingCount === 0
                        || isDeletingDrawing}
                      onClick={() => void deleteSelectedDrawings()}
                    >
                      {isDeletingDrawing
                        ? <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
                        : <Trash2Icon aria-hidden="true" />}
                      删除选中内容
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={resetMapView}>
                      <RefreshCwIcon aria-hidden="true" />
                      重置地图
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => void toggleFullscreen()}>
                      {isFullscreen
                        ? <MinimizeIcon aria-hidden="true" />
                        : <MaximizeIcon aria-hidden="true" />}
                      {isFullscreen ? '退出全屏' : '全屏显示'}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="hidden gap-2 @2xl/map:flex">
                <Button
                  type="button"
                  variant={drawingMode === 'linestring' ? 'secondary' : 'outline'}
                  size="icon"
                  className={cn(
                    'shadow-sm backdrop-blur',
                    drawingMode === 'linestring'
                      ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-card/95',
                  )}
                  aria-label={drawingMode === 'linestring' ? '结束绘制线条' : '绘制线条'}
                  aria-pressed={drawingMode === 'linestring'}
                  disabled={explorationBoundaryEditor !== null}
                  title="绘制线条"
                  onClick={() => toggleDrawingMode('linestring')}
                >
                  <PolylineIcon aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant={drawingMode === 'polygon' && drawingPurpose === 'custom'
                    ? 'secondary'
                    : 'outline'}
                  size="icon"
                  className={cn(
                    'shadow-sm backdrop-blur',
                    drawingMode === 'polygon' && drawingPurpose === 'custom'
                      ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-card/95',
                  )}
                  aria-label={drawingMode === 'polygon' && drawingPurpose === 'custom'
                    ? '结束绘制多边形'
                    : '绘制多边形'}
                  aria-pressed={drawingMode === 'polygon' && drawingPurpose === 'custom'}
                  disabled={explorationBoundaryEditor !== null}
                  title="绘制多边形"
                  onClick={() => toggleDrawingMode('polygon')}
                >
                  <VectorSquareIcon aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant={isSelectingDrawing ? 'secondary' : 'outline'}
                  size="icon"
                  className={cn(
                    'shadow-sm backdrop-blur',
                    isSelectingDrawing
                      ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-card/95',
                  )}
                  aria-label={isSelectingDrawing ? '退出绘制内容编辑模式' : '编辑绘制内容'}
                  aria-pressed={isSelectingDrawing}
                  title={isSelectingDrawing ? '退出编辑模式' : '编辑绘制内容'}
                  disabled={explorationBoundaryEditor !== null
                    || (!isSelectingDrawing && drawnFeatureCount === 0)}
                  onClick={toggleDrawingSelection}
                >
                  <CursorIcon aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="bg-card/95 shadow-sm backdrop-blur"
                  aria-label="删除选中的绘制内容"
                  title="删除选中"
                  disabled={explorationBoundaryEditor !== null
                    || selectedDrawingCount === 0
                    || isDeletingDrawing}
                  onClick={() => void deleteSelectedDrawings()}
                >
                  {isDeletingDrawing
                    ? <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
                    : <Trash2Icon aria-hidden="true" />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="bg-card/95 shadow-sm backdrop-blur"
                  aria-label="重置地图并收起侧边栏"
                  title="重置地图"
                  onClick={resetMapView}
                >
                  <RefreshCwIcon aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="bg-card/95 shadow-sm backdrop-blur"
                  aria-label={isFullscreen ? '退出全屏地图' : '全屏显示地图'}
                  title={isFullscreen ? '退出全屏' : '全屏'}
                  onClick={() => void toggleFullscreen()}
                >
                  {isFullscreen
                    ? <MinimizeIcon aria-hidden="true" />
                    : <MaximizeIcon aria-hidden="true" />}
                </Button>
              </div>
            </div>
          ) : null}
          <AnimatePresence initial={false}>
            {status === 'ready' && selectedInventoryStation ? (
              <motion.section
                key={selectedInventoryStation.id}
                initial={shouldReduceMotion ? false : { x: 'calc(100% + 1rem)', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={shouldReduceMotion
                  ? { opacity: 0 }
                  : { x: 'calc(100% + 1rem)', opacity: 0 }}
                transition={shouldReduceMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 380, damping: 36, mass: 0.85 }}
                className="absolute inset-y-0 right-0 z-20 flex w-[17rem] max-w-[calc(100%-0.75rem)] flex-col overflow-hidden rounded-l-lg border bg-card/95 text-sm backdrop-blur @5xl/map:w-96 @7xl/map:w-[26rem]"
                aria-label="选中117站点信息"
                onPointerDown={(event) => event.stopPropagation()}
                onWheel={(event) => event.stopPropagation()}
              >
                <header
                  className="flex min-w-0 shrink-0 cursor-pointer select-none items-start justify-between gap-3 border-b px-3 py-2.5 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  role="button"
                  tabIndex={0}
                  aria-label="收起117站点信息"
                  onClick={() => setSelectedInventoryStationId(null)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return
                    event.preventDefault()
                    event.currentTarget.click()
                  }}
                >
                  <div className="min-w-0">
                    <h3 className="break-words font-semibold leading-5">
                      {selectedInventoryStation.properties.stationName}
                    </h3>
                    <span className="mt-1 inline-flex rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {getSiteInventoryStatusLabel(selectedInventoryStation.properties.status)}
                    </span>
                  </div>
                  <span className="flex size-9 shrink-0 items-center justify-center self-center">
                    <ChevronRightIcon className="size-5" aria-hidden="true" />
                  </span>
                </header>
                <dl className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent grid min-h-0 flex-1 content-start grid-cols-2 gap-x-3 gap-y-3 overflow-y-auto p-4">
                  <div className="col-span-2 min-w-0">
                    <dt className="text-xs text-muted-foreground">位置</dt>
                    <dd className="mt-1 break-words font-medium">
                      {selectedInventoryStation.properties.specificLocation}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">省辖市</dt>
                    <dd className="mt-1 font-medium">
                      {selectedInventoryStation.properties.provincialCity}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">所在县（区）</dt>
                    <dd className="mt-1 font-medium">
                      {selectedInventoryStation.properties.countyDistrict}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">所在线路</dt>
                    <dd className="mt-1 font-medium">
                      {selectedInventoryStation.properties.routeName || '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">站点类型</dt>
                    <dd className="mt-1 font-medium">
                      {getSiteInventoryTypeLabel(selectedInventoryStation.properties.siteType)}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">站点坐标</dt>
                    <dd className="mt-1 font-medium tabular-nums">
                      {selectedInventoryStation.geometry.coordinates[0].toFixed(6)}, {' '}
                      {selectedInventoryStation.geometry.coordinates[1].toFixed(6)}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-xs text-muted-foreground">日平均车流量</dt>
                    <dd className="mt-1 font-medium tabular-nums">
                      {selectedInventoryStationTraffic.data?.dataStatus === 'ready'
                        ? `${selectedInventoryStationTraffic.data.traffic.visitCount.toLocaleString('zh-CN')} 次 · 去重 ${selectedInventoryStationTraffic.data.traffic.uniqueVehicleCount.toLocaleString('zh-CN')} 辆`
                        : selectedInventoryStationTraffic.data?.dataStatus === 'no_road'
                          ? selectedGridFallbackTraffic.data
                            ? `${selectedGridFallbackTraffic.data.averageDailyVehicleCount.toLocaleString('zh-CN')} 辆 · 新能源 ${selectedGridFallbackTraffic.data.averageDailyNewEnergyVehicleCount.toLocaleString('zh-CN')} 辆`
                            : selectedGridFallbackTraffic.isPending
                              ? '未命中路段，正在查询栅格…'
                              : dailyAverageTrafficErrorMessage(selectedGridFallbackTraffic.error) ?? '—'
                        : selectedInventoryStationTraffic.isPending
                          ? '正在匹配路段…'
                          : roadSegmentTrafficErrorMessage(selectedInventoryStationTraffic.error) ?? '—'}
                      {selectedInventoryStationTraffic.data?.dataStatus === 'ready'
                        && selectedInventoryStationTraffic.data.traffic.energyStatisticsAvailable
                        && selectedInventoryStationTraffic.data.traffic.newEnergyVisitCount !== null
                        && selectedInventoryStationTraffic.data.traffic.newEnergyUniqueVehicleCount !== null ? (
                          <span className="mt-1 block text-xs font-normal text-muted-foreground">
                            新能源 {selectedInventoryStationTraffic.data.traffic.newEnergyVisitCount.toLocaleString('zh-CN')} 次
                            {' · '}去重 {selectedInventoryStationTraffic.data.traffic.newEnergyUniqueVehicleCount.toLocaleString('zh-CN')} 辆
                          </span>
                        ) : null}
                    </dd>
                  </div>
                  {selectedInventoryStationTraffic.data?.matchedRoute ? (
                    <div className="col-span-2">
                      <dt className="text-xs text-muted-foreground">命中路段</dt>
                      <dd className="mt-1 break-words font-medium">
                        {`${selectedInventoryStationTraffic.data.matchedRoute.ref} · ${selectedInventoryStationTraffic.data.matchedRoute.name || selectedInventoryStationTraffic.data.matchedRoute.segmentId} · 距离 ${Math.round(selectedInventoryStationTraffic.data.matching.distanceMeters ?? 0)} 米`}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </motion.section>
            ) : null}
          </AnimatePresence>
          <AnimatePresence initial={false} mode="wait">
            {status === 'ready' && selectedExplorationSite ? (
              <motion.section
                ref={selectedExplorationPanelRef}
                key={selectedExplorationSite.id}
                initial={shouldReduceMotion ? false : { x: 'calc(100% + 1rem)', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={shouldReduceMotion ? { opacity: 0 } : { x: 'calc(100% + 1rem)', opacity: 0 }}
                transition={shouldReduceMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 380, damping: 36, mass: 0.85 }}
                className="absolute inset-y-0 right-0 z-20 flex w-[17rem] max-w-[calc(100%-0.75rem)] flex-col overflow-hidden rounded-l-lg border bg-card/95 text-sm backdrop-blur @5xl/map:w-96 @7xl/map:w-[26rem]"
                aria-label="选中场站信息"
                onPointerDown={(event) => event.stopPropagation()}
                onWheel={(event) => event.stopPropagation()}
              >
              <header
                className={cn(
                  'flex min-w-0 shrink-0 select-none items-start justify-between gap-3 border-b px-3 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  isSavingExplorationBoundary
                    ? 'cursor-not-allowed opacity-60'
                    : 'cursor-pointer hover:bg-muted/50',
                )}
                role="button"
                tabIndex={isSavingExplorationBoundary ? -1 : 0}
                aria-label="收起场站信息"
                aria-disabled={isSavingExplorationBoundary}
                onClick={() => {
                  if (isSavingExplorationBoundary) return
                  clearSelectedExplorationSite()
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  event.currentTarget.click()
                }}
              >
                <div className="min-w-0">
                  <h3 className="break-words font-semibold leading-5">
                    {selectedExplorationSiteDetail.data?.projectName
                      ?? selectedExplorationSite.properties.projectName}
                  </h3>
                  <div className="mt-1">
                    <SiteExplorationStatusBadge
                      status={selectedExplorationSiteDetail.data?.status
                        ?? selectedExplorationSite.properties.status}
                    />
                  </div>
                </div>
                <span className="flex size-9 shrink-0 items-center justify-center self-center">
                  <ChevronRightIcon className="size-5" aria-hidden="true" />
                </span>
              </header>
              <SiteSelectionSiteDetailTabs
                value={selectedExplorationSiteTab}
                onValueChange={setSelectedExplorationSiteTab}
                record={selectedExplorationSiteDetail.data ?? null}
                isRecordLoading={selectedExplorationSiteDetail.isPending}
                recordError={selectedExplorationSiteDetail.error}
                onRetryRecord={() => void selectedExplorationSiteDetail.refetch()}
                siteId={selectedExplorationSiteId}
                latestAnalysisTaskId={selectedExplorationAnalysisTaskId}
              />
              {explorationBoundaryEditor ? (
                <div className={`grid shrink-0 gap-2 border-t p-4 ${
                  selectedExplorationBoundary ? 'grid-cols-2' : 'grid-cols-1'
                }`}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSavingExplorationBoundary}
                    onClick={() => closeExplorationBoundaryEditor()}
                  >
                    取消编辑
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isSavingExplorationBoundary}
                    onClick={() => void saveExplorationBoundary()}
                  >
                    {isSavingExplorationBoundary
                      ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
                      : null}
                    {isSavingExplorationBoundary ? '保存中' : '保存边界'}
                  </Button>
                </div>
              ) : (
                <div className="grid shrink-0 gap-2 border-t p-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingExplorationSiteId(selectedExplorationSite.id)}
                  >
                    <PencilIcon data-icon="inline-start" />
                    编辑信息
                  </Button>
                </div>
              )}
              </motion.section>
            ) : null}
          </AnimatePresence>
          {status === 'ready'
          && selectedMapPoint
          && !isMeasurementInfoVisible ? (
            <section
              className="absolute bottom-16 left-1/2 z-10 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-3 rounded-xl border bg-card/95 px-4 py-2.5 text-sm shadow-md backdrop-blur"
              aria-label="地图选中点信息"
              aria-live="polite"
              onPointerDown={(event) => event.stopPropagation()}
              onWheel={(event) => event.stopPropagation()}
            >
              <div className="min-w-0 max-w-md">
                <p className="truncate font-medium">
                  {selectedMapPoint.locationAddress
                    ?? selectedMapPoint.locationError
                    ?? '正在解析位置…'}
                </p>
                <p className="mt-0.5 whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                  {selectedMapPoint.longitude.toFixed(6)}, {selectedMapPoint.latitude.toFixed(6)}
                </p>
              </div>
              <div className="h-8 w-px shrink-0 bg-border" aria-hidden="true" />
              <div className="shrink-0 whitespace-nowrap">
                <p className="text-xs text-muted-foreground">日平均车流量</p>
                <p className="mt-0.5 font-semibold tabular-nums">
                  {selectedMapPointTraffic.data?.dataStatus === 'ready'
                    ? `${selectedMapPointTraffic.data.traffic.visitCount.toLocaleString('zh-CN')} 次`
                    : selectedMapPointTraffic.data?.dataStatus === 'no_road'
                      ? selectedGridFallbackTraffic.data
                        ? `${selectedGridFallbackTraffic.data.averageDailyVehicleCount.toLocaleString('zh-CN')} 辆`
                        : selectedGridFallbackTraffic.isPending
                          ? '正在查询栅格…'
                          : dailyAverageTrafficErrorMessage(selectedGridFallbackTraffic.error) ?? '—'
                    : selectedMapPointTraffic.isPending
                      ? '正在匹配路段…'
                      : roadSegmentTrafficErrorMessage(selectedMapPointTraffic.error) ?? '—'}
                </p>
                {selectedMapPointTraffic.data ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {selectedMapPointTraffic.data.matchedRoute
                      ? `${selectedMapPointTraffic.data.matchedRoute.ref} · 去重 ${selectedMapPointTraffic.data.traffic.uniqueVehicleCount.toLocaleString('zh-CN')} 辆`
                      : selectedGridFallbackTraffic.data
                        ? `1 公里内无道路 · 新能源 ${selectedGridFallbackTraffic.data.averageDailyNewEnergyVehicleCount.toLocaleString('zh-CN')} 辆`
                        : '1 公里内未匹配到统计道路'}
                  </p>
                ) : null}
                {selectedMapPointTraffic.data?.dataStatus === 'ready'
                  && selectedMapPointTraffic.data.traffic.energyStatisticsAvailable
                  && selectedMapPointTraffic.data.traffic.newEnergyVisitCount !== null
                  && selectedMapPointTraffic.data.traffic.newEnergyUniqueVehicleCount !== null ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      新能源 {selectedMapPointTraffic.data.traffic.newEnergyVisitCount.toLocaleString('zh-CN')} 次
                      {' · '}去重 {selectedMapPointTraffic.data.traffic.newEnergyUniqueVehicleCount.toLocaleString('zh-CN')} 辆
                    </p>
                  ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="-mr-2 shrink-0"
                aria-label="取消选中地点"
                title="取消选中"
                onClick={clearSelectedMapPoint}
              >
                <XIcon aria-hidden="true" />
              </Button>
            </section>
          ) : null}
          {status === 'ready' ? (
            <nav
              className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-xl border bg-card/95 p-1 shadow-md backdrop-blur"
              aria-label="地图常用工具"
              onPointerDown={(event) => event.stopPropagation()}
              onWheel={(event) => event.stopPropagation()}
            >
              <SiteExplorationLocationPicker
                longitude={selectedMapPoint?.longitude ?? 0}
                latitude={selectedMapPoint?.latitude ?? 0}
                locationAddress={selectedMapPoint?.locationAddress ?? ''}
                disabled={isCreatingExplorationSite || explorationBoundaryEditor !== null}
                successMessage="项目位置已确认，正在创建勘探站点"
                renderTrigger={(openPicker) => (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 px-3"
                    disabled={isCreatingExplorationSite || explorationBoundaryEditor !== null}
                    onClick={openPicker}
                  >
                    {isCreatingExplorationSite
                      ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
                      : <PlusIcon data-icon="inline-start" />}
                    {isCreatingExplorationSite ? '创建中' : '新建勘探站点'}
                  </Button>
                )}
                onSelect={(selected) => void createExplorationSite(selected)}
              />
              <Button
                type="button"
                variant={isMeasuring ? 'secondary' : 'ghost'}
                size="sm"
                className="h-9 px-3"
                aria-pressed={isMeasuring}
                disabled={explorationBoundaryEditor !== null}
                onClick={toggleMeasurement}
              >
                <RulerIcon data-icon="inline-start" />
                测距
              </Button>
              <Button
                type="button"
                variant={isUserLocationSelected ? 'secondary' : 'ghost'}
                size="sm"
                className="h-9 px-3"
                disabled={isLocatingUser || explorationBoundaryEditor !== null}
                aria-pressed={isUserLocationSelected}
                onClick={toggleUserLocation}
              >
                {isLocatingUser
                  ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
                  : <MapPinnedIcon data-icon="inline-start" />}
                定位
              </Button>
            </nav>
          ) : null}
          {status === 'ready' && drawingMode ? (
            <div
              className="absolute right-3 top-14 z-10 w-52 rounded-lg border bg-card/95 p-3 text-xs shadow-sm backdrop-blur"
              onPointerDown={(event) => event.stopPropagation()}
              onWheel={(event) => event.stopPropagation()}
            >
              <p className="font-medium">
                {drawingMode === 'linestring'
                  ? '绘制线条'
                  : '绘制多边形'}
              </p>
              <p className="mt-1.5 text-muted-foreground">
                单击地图添加节点，点击终点或按 Enter 完成，按 Esc 取消。
              </p>
            </div>
          ) : null}
          {status === 'ready' && isSelectingDrawing ? (
            <div
              className="absolute right-3 top-14 z-10 w-52 rounded-lg border bg-card/95 p-3 text-xs shadow-sm backdrop-blur"
              onPointerDown={(event) => event.stopPropagation()}
              onWheel={(event) => event.stopPropagation()}
            >
              <p className="font-medium">编辑绘制内容</p>
              <p className="mt-1.5 text-muted-foreground">
                点击线条或多边形进入编辑样式，可拖动图形、顶点或边中点，选中后也可删除。
              </p>
            </div>
          ) : null}
          {status === 'ready' && isMeasurementInfoVisible ? (
            <section
              className="absolute bottom-16 left-1/2 z-10 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-3 rounded-xl border bg-card/95 px-4 py-2.5 text-sm shadow-md backdrop-blur"
              aria-label="地图测距信息"
              aria-live="polite"
              onPointerDown={(event) => event.stopPropagation()}
              onWheel={(event) => event.stopPropagation()}
            >
              <div className="min-w-0 max-w-md">
                <p className="font-medium">测距信息</p>
                <p className="mt-0.5 whitespace-nowrap text-xs text-muted-foreground">
                  {isMeasuring ? '在地图上依次点击添加测量点' : '测量已结束'}
                </p>
              </div>
              <div className="h-8 w-px shrink-0 bg-border" aria-hidden="true" />
              <div className="shrink-0 whitespace-nowrap">
                <p className="text-xs text-muted-foreground">累计距离</p>
                <p className="mt-0.5 font-semibold tabular-nums">
                  {formatMeasurementDistance(measurementDistance ?? 0)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                disabled={measurementDistance === null}
                aria-label="清理测距结果"
                title="清理测距结果"
                onClick={clearMeasurement}
              >
                <Trash2Icon aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="-mr-2 shrink-0"
                aria-label="关闭测距"
                title="关闭测距"
                onClick={closeMeasurement}
              >
                <XIcon aria-hidden="true" />
              </Button>
            </section>
          ) : null}
          {status === 'loading' ? <Skeleton className="absolute inset-0 rounded-none" /> : null}
          {status === 'error' ? (
            <Empty className="absolute inset-0 rounded-none border-0 bg-card">
              <EmptyHeader>
                <EmptyMedia variant="icon"><CircleAlertIcon aria-hidden="true" /></EmptyMedia>
                <EmptyTitle>天地图加载失败</EmptyTitle>
                <EmptyDescription>
                  请配置有效的 PUBLIC_TIANDITU_TOKEN，并确认天地图服务可访问。
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : null}
          </div>
        </CardContent>
      </Card>
      <Dialog
        open={Boolean(pendingDrawing)}
        onOpenChange={(open) => {
          if (!open) closeDrawingDialog()
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!isSavingDrawing}>
          <DialogHeader>
            <DialogTitle>保存绘制内容</DialogTitle>
            <DialogDescription>
              {pendingDrawing?.geometryType === 'LineString'
                ? '填写线条名称和备注，保存后可在地图中继续编辑。'
                : '填写区域名称和备注，保存后可在地图中继续编辑。'}
            </DialogDescription>
          </DialogHeader>
          <form className="flex flex-col gap-5" onSubmit={(event) => void savePendingDrawing(event)}>
            <FieldGroup>
              <Field data-invalid={drawingFormSubmitted && !drawingName.trim()}>
                <FieldLabel htmlFor="map-drawing-name">名称 *</FieldLabel>
                <Input
                  id="map-drawing-name"
                  autoFocus
                  maxLength={128}
                  value={drawingName}
                  onChange={(event) => setDrawingName(event.target.value)}
                  aria-invalid={drawingFormSubmitted && !drawingName.trim()}
                />
                {drawingFormSubmitted && !drawingName.trim()
                  ? <FieldError>请输入名称</FieldError>
                  : null}
              </Field>
              {pendingDrawing?.geometryType === 'LineString' ? (
                <>
                  <Field data-invalid={drawingFormSubmitted && !drawingCorridorType}>
                    <FieldLabel>线路类型 *</FieldLabel>
                    <Select
                      value={drawingCorridorType}
                      onValueChange={(value) => {
                        if (isMapDrawingCorridorType(value)) setDrawingCorridorType(value)
                      }}
                    >
                      <SelectTrigger
                        className="w-full"
                        aria-invalid={drawingFormSubmitted && !drawingCorridorType}
                      >
                        <SelectValue placeholder="请选择线路类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {corridorTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {drawingFormSubmitted && !drawingCorridorType
                      ? <FieldError>请选择线路类型</FieldError>
                      : null}
                  </Field>
                  <Field orientation="horizontal">
                    <Checkbox
                      id="map-drawing-show-name"
                      checked={drawingShowName}
                      onCheckedChange={(checked) => setDrawingShowName(checked === true)}
                    />
                    <FieldLabel htmlFor="map-drawing-show-name">在地图上显示线路名称</FieldLabel>
                  </Field>
                </>
              ) : null}
              <Field data-invalid={drawingRemark.length > 1_000}>
                <FieldLabel htmlFor="map-drawing-remark">备注</FieldLabel>
                <Textarea
                  id="map-drawing-remark"
                  maxLength={1_000}
                  rows={4}
                  value={drawingRemark}
                  onChange={(event) => setDrawingRemark(event.target.value)}
                  placeholder="补充绘制目的、现场情况等信息"
                  aria-invalid={drawingRemark.length > 1_000}
                />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSavingDrawing}
                onClick={closeDrawingDialog}
              >
                取消
              </Button>
              <Button type="submit" size="sm" disabled={isSavingDrawing}>
                {isSavingDrawing
                  ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
                  : null}
                {isSavingDrawing ? '保存中' : '保存'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(editingDrawing)}
        onOpenChange={(open) => {
          if (!open && !isUpdatingDrawing) setEditingDrawing(null)
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!isUpdatingDrawing}>
          <DialogHeader>
            <DialogTitle>
              编辑{editingDrawing?.geoJson.geometry.type === 'LineString'
                ? '自定义线路'
                : '自定义区域'}
            </DialogTitle>
            <DialogDescription>
              {editingDrawing?.geoJson.geometry.type === 'LineString'
                ? '修改名称、线路类型和备注，地图图形保持不变。'
                : '修改名称和备注，地图图形保持不变。'}
            </DialogDescription>
          </DialogHeader>
          <form className="flex flex-col gap-5" onSubmit={(event) => void saveEditedDrawing(event)}>
            <FieldGroup>
              <Field data-invalid={editingDrawingFormSubmitted && !editingDrawingName.trim()}>
                <FieldLabel htmlFor="edit-map-drawing-name">名称 *</FieldLabel>
                <Input
                  id="edit-map-drawing-name"
                  autoFocus
                  maxLength={128}
                  value={editingDrawingName}
                  onChange={(event) => setEditingDrawingName(event.target.value)}
                  aria-invalid={editingDrawingFormSubmitted && !editingDrawingName.trim()}
                />
                {editingDrawingFormSubmitted && !editingDrawingName.trim()
                  ? <FieldError>请输入名称</FieldError>
                  : null}
              </Field>
              {editingDrawing?.geoJson.geometry.type === 'LineString' ? (
                <>
                  <Field data-invalid={
                    editingDrawingFormSubmitted && !editingDrawingCorridorType
                  }>
                    <FieldLabel>线路类型 *</FieldLabel>
                    <Select
                      value={editingDrawingCorridorType}
                      onValueChange={(value) => {
                        if (isMapDrawingCorridorType(value)) {
                          setEditingDrawingCorridorType(value)
                        }
                      }}
                    >
                      <SelectTrigger
                        className="w-full"
                        aria-invalid={
                          editingDrawingFormSubmitted && !editingDrawingCorridorType
                        }
                      >
                        <SelectValue placeholder="请选择线路类型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {corridorTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {editingDrawingFormSubmitted && !editingDrawingCorridorType
                      ? <FieldError>请选择线路类型</FieldError>
                      : null}
                  </Field>
                  <Field orientation="horizontal">
                    <Checkbox
                      id="edit-map-drawing-show-name"
                      checked={editingDrawingShowName}
                      onCheckedChange={(checked) => setEditingDrawingShowName(checked === true)}
                    />
                    <FieldLabel htmlFor="edit-map-drawing-show-name">
                      在地图上显示线路名称
                    </FieldLabel>
                  </Field>
                </>
              ) : null}
              <Field data-invalid={editingDrawingRemark.length > 1_000}>
                <FieldLabel htmlFor="edit-map-drawing-remark">备注</FieldLabel>
                <Textarea
                  id="edit-map-drawing-remark"
                  maxLength={1_000}
                  rows={4}
                  value={editingDrawingRemark}
                  onChange={(event) => setEditingDrawingRemark(event.target.value)}
                  placeholder="补充绘制目的、现场情况等信息"
                  aria-invalid={editingDrawingRemark.length > 1_000}
                />
              </Field>
            </FieldGroup>
            <DialogFooter className="border-t border-border pt-4 sm:justify-between">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isUpdatingDrawing || isDeletingDrawing}
                onClick={() => {
                  if (editingDrawing) setDrawingToDelete(editingDrawing)
                }}
              >
                <Trash2Icon data-icon="inline-start" />
                删除
              </Button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUpdatingDrawing}
                  onClick={() => setEditingDrawing(null)}
                >
                  取消
                </Button>
                <Button type="submit" size="sm" disabled={isUpdatingDrawing}>
                  {isUpdatingDrawing
                    ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
                    : null}
                  {isUpdatingDrawing ? '保存中' : '保存'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {editingExplorationSiteId ? (
        <SiteExplorationEditDialog
          key={editingExplorationSiteId}
          siteId={editingExplorationSiteId}
          open
          onOpenChange={(open) => {
            if (!open) setEditingExplorationSiteId(null)
          }}
          onMarkedExplored={openExplorationAnalysis}
        />
      ) : null}
      <AlertDialog
        open={Boolean(drawingToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeletingDrawing) setDrawingToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              删除{drawingToDelete?.geoJson.geometry.type === 'LineString'
                ? '自定义线路'
                : '自定义区域'}？
            </AlertDialogTitle>
            <AlertDialogDescription>
              删除“{drawingToDelete?.name ?? ''}”后，地图和数据库中的绘制数据都会被移除，此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingDrawing}>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeletingDrawing}
              onClick={(event) => {
                event.preventDefault()
                void confirmDeleteDrawing()
              }}
            >
              {isDeletingDrawing
                ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
                : null}
              {isDeletingDrawing ? '删除中' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function shanghaiDate(value: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value)
}

function createExplorationMapMarkerElement(
  site: SiteExplorationMapPointFeature,
  onSelect: (siteId: string) => void,
): HTMLButtonElement {
  const element = document.createElement('button')
  element.type = 'button'
  element.className = 'relative flex cursor-pointer appearance-none items-center justify-center border-0 bg-transparent p-0 transition-[width,height]'

  const icon = document.createElement('img')
  icon.dataset.role = 'icon'
  icon.className = 'pointer-events-none absolute inset-0 size-full object-contain'
  icon.alt = ''
  icon.draggable = false

  element.append(icon)
  element.addEventListener('pointerdown', (event) => event.stopPropagation())
  element.addEventListener('dblclick', (event) => event.stopPropagation())
  element.addEventListener('click', (event) => {
    event.stopPropagation()
    const siteId = element.dataset.siteId
    if (siteId) onSelect(siteId)
  })
  updateExplorationMapMarkerElement(element, site, false)
  return element
}

function updateExplorationMapMarkerElement(
  element: HTMLButtonElement,
  site: SiteExplorationMapPointFeature,
  selected: boolean,
): void {
  const config = getSiteExplorationStatusConfig(site.properties.status)
  const icon = element.querySelector<HTMLImageElement>('[data-role="icon"]')
  if (!icon) throw new Error('exploration_map_marker_part_missing')

  element.dataset.siteId = site.id
  element.style.width = selected ? '35px' : '28px'
  element.style.height = selected ? '35px' : '28px'
  element.style.zIndex = String(getExplorationSiteMarkerZIndex(site.properties.status, selected))
  element.setAttribute('aria-label', `${site.properties.projectName}，${config.label}`)
  element.setAttribute('aria-pressed', String(selected))
  icon.src = config.iconPath
}

const explorationMarkerZIndexBase = 100

function getExplorationSiteMarkerZIndex(
  status: SiteExplorationStatus,
  selected: boolean,
): number {
  if (selected) {
    return explorationMarkerZIndexBase + (siteExplorationStatusConfig.length + 1) * 2
  }
  return explorationMarkerZIndexBase
    + getSiteExplorationStatusConfig(status).mapLayerOrder * 2
}

function getExplorationRobotMarkerZIndex(status: SiteExplorationStatus): number {
  return explorationMarkerZIndexBase
    + getSiteExplorationStatusConfig(status).mapLayerOrder * 2
    + 1
}

function createAnalysisMapMarkerElement(
  site: AnalysisMapSite,
  onOpenSiteAnalysis: (siteId: string) => void,
): HTMLDivElement {
  const element = document.createElement('div')
  element.className = 'relative h-20 w-[60px] select-none'
  element.innerHTML = `
    <span data-role="pulse" class="pointer-events-none absolute bottom-2 left-1/2 hidden size-11 -translate-x-1/2 rounded-full border border-primary/40 motion-safe:animate-ping"></span>
    <button data-role="avatar-button" type="button" class="absolute bottom-2 left-1/2 size-11 -translate-x-1/2 rounded-full outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      <img data-role="avatar" class="size-full rounded-full border-[3px] border-background bg-muted object-cover shadow-md" src="/agent-avatars/robot/evaluation-summary.webp" alt="" />
    </button>
    <span data-role="thinking" class="pointer-events-none absolute bottom-[3.7rem] left-1/2 z-20 hidden -translate-x-1/2" aria-hidden="true">
      <span class="flex h-6 items-center justify-center gap-1 rounded-full border border-primary/25 bg-popover/95 px-2.5 shadow-[0_4px_12px_rgba(15,23,42,0.18)] backdrop-blur-md">
        <span class="size-1.5 rounded-full bg-primary/60 motion-safe:animate-bounce motion-safe:[animation-delay:-300ms]"></span>
        <span class="size-1.5 rounded-full bg-primary/75 motion-safe:animate-bounce motion-safe:[animation-delay:-150ms]"></span>
        <span class="size-1.5 rounded-full bg-primary motion-safe:animate-bounce"></span>
      </span>
      <span class="absolute -bottom-1 left-1/2 size-2 -translate-x-1/2 rotate-45 border-b border-r border-primary/25 bg-popover/95"></span>
    </span>
    <span data-role="pin" class="pointer-events-none absolute bottom-0 left-1/2 size-3 -translate-x-1/2 rounded-full border-[3px] border-background bg-primary shadow-sm"></span>
    <button data-role="score" type="button" class="absolute bottom-[3.375rem] left-1/2 z-10 hidden -translate-x-1/2 items-center justify-center whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-bold leading-none shadow-md outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"></button>
    <button data-role="bubble" type="button" class="absolute bottom-[4.8rem] left-7 hidden h-[76px] w-64 origin-bottom-left bg-transparent p-0 text-left text-popover-foreground drop-shadow-md outline-none transition-[left] duration-300 focus-visible:ring-2 focus-visible:ring-ring">
      <svg data-role="bubble-shape" class="pointer-events-none absolute inset-0 size-full overflow-visible transition-transform duration-300" viewBox="0 0 320 104" preserveAspectRatio="none" aria-hidden="true">
        <path class="fill-popover stroke-primary/80 [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:2.5]" vector-effect="non-scaling-stroke" d="M 42 8 H 278 C 297 8 308 20 308 38 V 66 C 308 84 297 94 278 94 H 94 L 57 102 L 63 88 H 42 C 23 88 12 78 12 60 V 38 C 12 20 23 8 42 8 Z" />
      </svg>
      <span data-role="message" class="absolute inset-x-8 top-[43%] block min-w-0 -translate-y-1/2">
        <span data-role="text" class="block min-w-0 truncate text-[11px] font-semibold"></span>
      </span>
    </button>
  `
  element.addEventListener('pointerdown', (event) => event.stopPropagation())
  element.addEventListener('dblclick', (event) => event.stopPropagation())
  markerPart<HTMLButtonElement>(element, 'bubble').addEventListener('click', (event) => {
    event.stopPropagation()
    if (element.dataset.status === 'completed') {
      onOpenSiteAnalysis(site.siteId)
    }
  })
  markerPart<HTMLButtonElement>(element, 'score').addEventListener('click', (event) => {
    event.stopPropagation()
    if (element.dataset.status === 'completed') {
      onOpenSiteAnalysis(site.siteId)
    }
  })
  markerPart<HTMLButtonElement>(element, 'avatar-button').addEventListener('click', (event) => {
    event.stopPropagation()
    onOpenSiteAnalysis(site.siteId)
  })
  updateAnalysisMapMarkerElement(element, site)
  return element
}

function updateAnalysisMapMarkerElement(element: HTMLDivElement, site: AnalysisMapSite): void {
  const { task } = site
  const isCompleted = task.status === 'completed'
  const statusLabel = analysisTaskStatusLabel(task.status)
  element.dataset.taskId = task.taskId
  element.dataset.status = task.status
  element.dataset.hasScore = String(isCompleted && Boolean(task.result))
  element.style.width = '60px'
  markerPart<HTMLButtonElement>(element, 'avatar-button')
    .setAttribute('aria-label', `查看${site.siteName}站点信息`)

  markerPart(element, 'text').textContent = task.displayText
  markerPart(element, 'thinking').classList.toggle('hidden', task.status !== 'running')
  markerPart(element, 'pulse').classList.toggle('hidden', task.status !== 'running')
  markerPart(element, 'pin').classList.toggle('bg-destructive', task.status === 'failed')
  markerPart(element, 'pin').classList.toggle('bg-primary', task.status !== 'failed')

  const bubble = markerPart<HTMLButtonElement>(element, 'bubble')
  const score = markerPart<HTMLButtonElement>(element, 'score')
  if (isCompleted && task.result) {
    const recommendationBand = getSiteSelectionRecommendationBand(task.result.overallScore)
    score.textContent = recommendationBand.label
    score.className = cn(
      'absolute bottom-[3.375rem] left-1/2 z-10 flex -translate-x-1/2 items-center justify-center whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-bold leading-none shadow-md outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      recommendationBand.badgeClassName,
    )
    score.setAttribute('aria-label', `${site.siteName}${recommendationBand.label}，查看任务报告`)
    bubble.setAttribute('aria-label', `查看${site.siteName}任务报告`)
    bubble.style.cursor = 'pointer'
  } else if (task.status === 'failed') {
    markerPart(element, 'text').textContent = '分析暂时中断'
    bubble.setAttribute('aria-label', `${site.siteName}任务执行失败`)
    bubble.style.cursor = 'default'
  } else {
    bubble.setAttribute('aria-label', `${site.siteName}${statusLabel}，进度 ${task.progress.percent}%`)
    bubble.style.cursor = 'default'
  }
  score.classList.toggle('hidden', !isCompleted || !task.result)
}

function setAnalysisMapMarkerVisibility(element: HTMLDivElement, zoom: number): void {
  const isVisible = zoom >= analysisMarkerMotionMinZoom
  const hasScore = element.dataset.hasScore === 'true'
  element.classList.toggle('hidden', !isVisible)
  markerPart(element, 'bubble').classList.add('hidden')
  markerPart(element, 'score').classList.toggle('hidden', !hasScore)
}

function markerPart<T extends HTMLElement = HTMLElement>(
  element: HTMLDivElement,
  role: string,
): T {
  const part = element.querySelector<HTMLElement>(`[data-role="${role}"]`)
  if (!part) throw new Error(`analysis_map_marker_part_missing:${role}`)
  return part as T
}

function analysisTaskStatusLabel(status: AnalysisMapSite['task']['status']): string {
  return {
    queued: '排队中',
    running: '执行中',
    completed: '已完成',
    failed: '失败',
  }[status]
}

function showMapDrawingError(error: unknown): void {
  const message = mapDrawingErrorMessage(error)
  if (message) toast.error(message)
}

function MapLayerGroup({
  id,
  title,
  expanded,
  onExpandedChange,
  checked,
  indeterminate,
  onCheckedChange,
  children,
}: {
  id: string
  title: string
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  checked: boolean
  indeterminate: boolean
  onCheckedChange: (checked: boolean) => void
  children: ReactNode
}) {
  const contentId = `${id}-content`

  return (
    <section
      className="border-t border-border pt-3 first:border-t-0 first:pt-0"
      aria-label={`${title}图层`}
    >
      <div className="flex items-center gap-2 rounded-md px-1 py-1 text-xs font-medium hover:bg-muted">
        <Checkbox
          id={id}
          checked={checked}
          indeterminate={indeterminate}
          onCheckedChange={onCheckedChange}
          aria-label={`全选或取消全选${title}图层`}
        />
        <button
          type="button"
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-1 text-left"
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => onExpandedChange(!expanded)}
        >
          <span className="min-w-0 flex-1">{title}</span>
          {expanded
            ? <ChevronDownIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
            : <ChevronRightIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />}
        </button>
      </div>
      {expanded
        ? (
            <div id={contentId} className="mt-1 grid pl-5">
              {children}
            </div>
          )
        : null}
    </section>
  )
}

function MapLayerOption({
  id,
  label,
  count,
  indicatorClassName,
  indicatorImageSrc,
  checked,
  onCheckedChange,
  onDoubleClick,
  actions,
}: {
  id: string
  label: string
  count?: number
  indicatorClassName: string
  indicatorImageSrc?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  onDoubleClick?: () => void
  actions?: ReactNode
}) {
  return (
    <div className="group/layer-option flex min-w-0 items-center gap-1.5 rounded-md px-1 py-1.5 text-xs hover:bg-muted">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(value === true)}
        aria-label={`显示${label}图层`}
      />
      <button
        type="button"
        title={label}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5 text-left"
        onClick={() => onCheckedChange(!checked)}
        onDoubleClick={onDoubleClick}
      >
        {indicatorImageSrc ? (
          <img
            src={indicatorImageSrc}
            alt=""
            className={cn('shrink-0 object-contain', indicatorClassName)}
            aria-hidden="true"
          />
        ) : (
          <span className={cn('shrink-0', indicatorClassName)} aria-hidden="true" />
        )}
        <span className="truncate">{label}</span>
        {count === undefined ? null : (
          <span className="ml-auto min-w-5 shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-center text-[10px] leading-none tabular-nums text-muted-foreground">
            {count}
          </span>
        )}
      </button>
      {actions === undefined ? null : (
        <div className="shrink-0 opacity-0 transition-opacity group-hover/layer-option:opacity-100 group-focus-within/layer-option:opacity-100">
          {actions}
        </div>
      )}
    </div>
  )
}

function MapLayerEmpty({ label }: { label: string }) {
  return (
    <p className="px-1 py-1.5 text-xs text-muted-foreground">
      {label}
    </p>
  )
}

function isMapDrawingCorridorType(value: unknown): value is MapDrawingCorridorType {
  return value === 'main' || value === 'secondary' || value === 'branch'
}

function createHenanProvinceBounds(): maplibregl.LngLatBounds {
  return createAdministrativeAreaBounds(provinceRegionOption)
}

function fitMapToHenanProvince(map: maplibregl.Map, duration: number): void {
  map.stop()
  map.fitBounds(createHenanProvinceBounds(), {
    padding: 16,
    maxZoom: 8,
    duration,
  })
}

function createAdministrativeAreaBounds(region: string): maplibregl.LngLatBounds {
  const area = henanAdministrativeBoundaries.features.find(
    (feature) => feature.properties.name === region,
  )
  if (!area) throw new Error(`${region} administrative boundary is missing`)

  const bounds = new maplibregl.LngLatBounds()
  extendBoundsFromCoordinates(bounds, area.geometry.coordinates)
  if (bounds.isEmpty()) throw new Error(`${region} administrative boundary has no coordinates`)

  return bounds
}

function extendBoundsFromCoordinates(
  bounds: maplibregl.LngLatBounds,
  coordinates: unknown,
): void {
  if (!Array.isArray(coordinates)) return

  if (
    coordinates.length >= 2
    && typeof coordinates[0] === 'number'
    && typeof coordinates[1] === 'number'
  ) {
    bounds.extend([coordinates[0], coordinates[1]])
    return
  }

  for (const child of coordinates) {
    extendBoundsFromCoordinates(bounds, child)
  }
}

function toTerraDrawFeature(
  drawing: MapDrawing,
  visible = true,
): GeoJSONStoreFeatures {
  return {
    type: 'Feature',
    properties: {
      mode: drawing.geoJson.geometry.type === 'LineString' ? 'linestring' : 'polygon',
      visible,
      ...(drawing.corridorType ? { corridorType: drawing.corridorType } : {}),
    },
    geometry: drawing.geoJson.geometry,
  }
}

function toMapDrawingGeoJson(feature: GeoJSONStoreFeatures): MapDrawingGeoJson {
  if (feature.geometry.type === 'LineString') {
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: feature.geometry.coordinates.map(copyMapDrawingPosition),
      },
    }
  }
  if (feature.geometry.type === 'Polygon') {
    return {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: feature.geometry.coordinates.map(
          (ring) => ring.map(copyMapDrawingPosition),
        ),
      },
    }
  }
  throw new Error('Only LineString and Polygon drawings can be persisted')
}

function copyMapDrawingPosition(position: number[]): [number, number, ...number[]] {
  const [longitude, latitude, ...additionalCoordinates] = position
  if (
    longitude === undefined
    || latitude === undefined
    || !Number.isFinite(longitude)
    || !Number.isFinite(latitude)
  ) {
    throw new Error('Drawing contains an invalid position')
  }
  return [longitude, latitude, ...additionalCoordinates]
}

function configureDrawingLabelLayer(map: maplibregl.Map): void {
  map.addSource(drawingLabelSourceId, {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: [],
    },
  })
  map.addLayer({
    id: drawingAreaLabelLayerId,
    type: 'symbol',
    source: drawingLabelSourceId,
    filter: [
      'all',
      ['==', ['geometry-type'], 'Point'],
      ['==', ['get', 'visible'], true],
    ],
    layout: {
      'text-field': [
        'concat',
        ['get', 'name'],
        ['case',
          ['==', ['get', 'remark'], ''],
          '',
          ['concat', '\n', ['get', 'remark']],
        ],
      ],
      'text-font': [
        'PingFang SC',
        'Microsoft YaHei',
        'Noto Sans CJK SC',
        'sans-serif',
      ],
      'text-size': 12,
      'text-line-height': 1.25,
      'text-max-width': 18,
      'text-anchor': 'center',
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    },
    paint: {
      'text-color': '#111827',
      'text-halo-color': '#ffffff',
      'text-halo-width': 2,
      'text-halo-blur': 0.5,
    },
  })
  map.addLayer({
    id: drawingLineLabelLayerId,
    type: 'symbol',
    source: drawingLabelSourceId,
    filter: [
      'all',
      ['==', ['geometry-type'], 'LineString'],
      ['==', ['get', 'visible'], true],
    ],
    layout: {
      'symbol-placement': 'line-center',
      'text-field': [
        'concat',
        ['get', 'name'],
        ['case',
          ['==', ['get', 'remark'], ''],
          '',
          ['concat', '\n', ['get', 'remark']],
        ],
      ],
      'text-font': [
        'PingFang SC',
        'Microsoft YaHei',
        'Noto Sans CJK SC',
        'sans-serif',
      ],
      'text-size': 12,
      'text-line-height': 1.25,
      'text-max-width': 18,
      'text-max-angle': 180,
      'text-anchor': 'center',
      'text-rotation-alignment': 'map',
      'text-pitch-alignment': 'map',
      'text-keep-upright': true,
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    },
    paint: {
      'text-color': '#111827',
      'text-halo-color': '#ffffff',
      'text-halo-width': 2,
      'text-halo-blur': 0.5,
    },
  })
}

function syncDrawingLabelSource(
  map: maplibregl.Map | null,
  records: ReadonlyMap<DrawingFeatureId, MapDrawing>,
  visibility: Readonly<Record<string, boolean>>,
): void {
  if (!map) return
  const features: DrawingLabelFeature[] = []
  for (const drawing of records.values()) {
    const properties = {
      name: drawing.name,
      remark: drawing.remark,
      visible: visibility[drawing.id] !== false,
    }
    if (drawing.geoJson.geometry.type === 'LineString') {
      if (!drawing.showName) continue
      features.push({
        type: 'Feature' as const,
        id: drawing.id,
        properties,
        geometry: drawing.geoJson.geometry,
      })
      continue
    }
    const [longitude, latitude] = centerOfMass(drawing.geoJson).geometry.coordinates
    if (
      longitude === undefined
      || latitude === undefined
      || !Number.isFinite(longitude)
      || !Number.isFinite(latitude)
    ) {
      throw new Error('Turf returned an invalid center of mass')
    }
    features.push({
      type: 'Feature' as const,
      id: drawing.id,
      properties,
      geometry: {
        type: 'Point' as const,
        coordinates: [longitude, latitude],
      },
    })
  }
  const source = map.getSource(drawingLabelSourceId)
  if (!(source instanceof maplibregl.GeoJSONSource)) {
    throw new Error('Drawing label source is unavailable')
  }
  source.setData({
    type: 'FeatureCollection',
    features,
  })
}

function createTerraDraw(map: maplibregl.Map): TerraDraw {
  const previewColor = '#2563eb' as const
  const previewFillColor = '#93c5fd' as const
  const editingColor = '#f97316' as const
  const editingFillColor = '#fdba74' as const
  const corridorColor = '#ef4444' as const
  const corridorOpacity = 0.5
  const corridorLineWidth = (corridorType: unknown, defaultWidth: number) => {
    switch (corridorType) {
      case 'main': return 10
      case 'secondary': return 6
      case 'branch': return 3
      default: return defaultWidth
    }
  }

  return new TerraDraw({
    adapter: new TerraDrawMapLibreGLAdapter({
      map,
      prefixId: 'site-selection-draw',
      renderBelowLayerId: inventoryStationPointLayerId,
    }),
    modes: [
      new TerraDrawLineStringMode({
        showCoordinatePoints: false,
        styles: {
          lineStringColor: ({ properties }) => (
            properties.currentlyDrawing
              ? editingColor
              : isMapDrawingCorridorType(properties.corridorType)
                ? corridorColor
                : previewColor
          ),
          lineStringWidth: ({ properties }) => (
            properties.visible === false
              ? 0
              : properties.currentlyDrawing
                ? 5
                : corridorLineWidth(properties.corridorType, 3)
          ),
          lineStringOpacity: ({ properties }) => (
            properties.visible === false
              ? 0
              : isMapDrawingCorridorType(properties.corridorType) ? corridorOpacity : 1
          ),
          closingPointColor: '#ffffff',
          closingPointWidth: 5,
          closingPointOutlineColor: editingColor,
          closingPointOutlineWidth: 2,
          coordinatePointColor: '#ffffff',
          coordinatePointWidth: 5,
          coordinatePointOutlineColor: editingColor,
          coordinatePointOutlineWidth: 2,
        },
      }),
      new TerraDrawPolygonMode({
        showCoordinatePoints: false,
        styles: {
          fillColor: ({ properties }) => (
            properties.currentlyDrawing ? editingFillColor : previewFillColor
          ),
          fillOpacity: ({ properties }) => (
            properties.visible === false ? 0 : properties.currentlyDrawing ? 0.35 : 0.28
          ),
          outlineColor: ({ properties }) => (
            properties.currentlyDrawing ? editingColor : previewColor
          ),
          outlineWidth: ({ properties }) => (
            properties.visible === false ? 0 : properties.currentlyDrawing ? 5 : 3
          ),
          outlineOpacity: ({ properties }) => properties.visible === false ? 0 : 1,
          closingPointColor: '#ffffff',
          closingPointWidth: 5,
          closingPointOutlineColor: editingColor,
          closingPointOutlineWidth: 2,
          coordinatePointColor: '#ffffff',
          coordinatePointWidth: 5,
          coordinatePointOutlineColor: editingColor,
          coordinatePointOutlineWidth: 2,
        },
      }),
      new TerraDrawSelectMode({
        allowManualSelection: true,
        allowManualDeselection: true,
        flags: {
          linestring: {
            feature: {
              draggable: true,
              coordinates: {
                midpoints: {
                  draggable: true,
                },
                draggable: true,
                deletable: true,
              },
            },
          },
          polygon: {
            feature: {
              draggable: true,
              coordinates: {
                midpoints: {
                  draggable: true,
                },
                draggable: true,
                deletable: true,
              },
            },
          },
        },
        styles: {
          selectedLineStringColor: ({ properties }) => (
            isMapDrawingCorridorType(properties.corridorType) ? corridorColor : editingColor
          ),
          selectedLineStringWidth: ({ properties }) => (
            properties.visible === false
              ? 0
              : corridorLineWidth(properties.corridorType, 5)
          ),
          selectedLineStringOpacity: ({ properties }) => (
            properties.visible === false
              ? 0
              : isMapDrawingCorridorType(properties.corridorType) ? corridorOpacity : 1
          ),
          selectedPolygonColor: editingFillColor,
          selectedPolygonFillOpacity: ({ properties }) => (
            properties.visible === false ? 0 : 0.35
          ),
          selectedPolygonOutlineColor: editingColor,
          selectedPolygonOutlineWidth: ({ properties }) => properties.visible === false ? 0 : 5,
          selectedPolygonOutlineOpacity: ({ properties }) => (
            properties.visible === false ? 0 : 1
          ),
          selectionPointColor: '#ffffff',
          selectionPointWidth: 5,
          selectionPointOutlineColor: editingColor,
          selectionPointOutlineWidth: 2,
          midPointColor: '#ffffff',
          midPointWidth: 4,
          midPointOutlineColor: editingColor,
          midPointOutlineWidth: 2,
        },
      }),
      new TerraDrawRenderMode({
        modeName: 'render',
        styles: {
          lineStringColor: ({ properties }) => (
            isMapDrawingCorridorType(properties.corridorType) ? corridorColor : previewColor
          ),
          lineStringWidth: ({ properties }) => (
            properties.visible === false
              ? 0
              : corridorLineWidth(properties.corridorType, 3)
          ),
          lineStringOpacity: ({ properties }) => (
            properties.visible === false
              ? 0
              : isMapDrawingCorridorType(properties.corridorType) ? corridorOpacity : 1
          ),
          polygonFillColor: previewFillColor,
          polygonFillOpacity: ({ properties }) => properties.visible === false ? 0 : 0.28,
          polygonOutlineColor: previewColor,
          polygonOutlineWidth: ({ properties }) => properties.visible === false ? 0 : 3,
        },
      }),
    ],
  })
}

function configureDrawingLayerVisibilityFilters(map: maplibregl.Map): void {
  const visibleFeatureFilter: maplibregl.FilterSpecification = [
    '!=',
    ['get', 'visible'],
    false,
  ]
  map.setFilter('site-selection-draw-linestring', visibleFeatureFilter)
  map.setFilter('site-selection-draw-polygon', visibleFeatureFilter)
  map.setFilter('site-selection-draw-polygon-outline', visibleFeatureFilter)
}

function countCompletedDrawings(terraDraw: TerraDraw): number {
  return terraDraw.getSnapshot().filter((feature) => (
    feature.geometry.type === 'LineString' || feature.geometry.type === 'Polygon'
  )).length
}

function createInventoryStationFeatureCollection(
  features: readonly SiteInventoryMapFeature[] = [],
) {
  return {
    type: 'FeatureCollection' as const,
    features: features.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        stationId: feature.id,
        markerIcon: getInventoryStationMarkerIconName(feature),
      },
    })),
  }
}

async function loadInventoryStationIconAssets(
  map: maplibregl.Map,
): Promise<Map<InventoryLayerCategory, InventoryStationIconAsset>> {
  const assets = await Promise.all(inventoryLayerOptions.map(async (option) => {
    const response = await map.loadImage(option.iconPath)
    return [option.id, response.data] as const
  }))
  return new Map(assets)
}

async function registerExplorationSiteStatusIcons(map: maplibregl.Map): Promise<void> {
  const icons = await Promise.all(siteExplorationStatusConfig.map(async (config) => ({
    status: config.value,
    image: await map.loadImage(config.iconPath),
  })))
  for (const { status, image } of icons) {
    map.addImage(getSiteExplorationStatusIconName(status), image.data, { pixelRatio: 2 })
  }
}

function registerInventoryStationMarkerImages(
  map: maplibregl.Map,
  assets: ReadonlyMap<InventoryLayerCategory, InventoryStationIconAsset>,
  features: readonly SiteInventoryMapFeature[],
): void {
  for (const feature of features) {
    const asset = assets.get(feature.properties.layerCategory)
    if (!asset) {
      throw new Error(`Inventory station icon is unavailable: ${feature.properties.layerCategory}`)
    }
    const name = getInventoryStationMarkerIconName(feature)
    const image = createNumberedInventoryStationIcon(
      asset,
      feature.properties.sequenceNumber,
      feature.properties.layerCategory,
    )
    if (map.hasImage(name)) {
      map.updateImage(name, image)
    } else {
      map.addImage(name, image, { pixelRatio: 2 })
    }
  }
}

function createNumberedInventoryStationIcon(
  asset: InventoryStationIconAsset,
  sequenceNumber: number,
  layerCategory: InventoryLayerCategory,
): ImageData {
  const size = 100
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Unable to create inventory station marker canvas')

  context.drawImage(asset, 0, 0, size, size)
  const label = String(sequenceNumber)
  context.font = `700 ${label.length >= 3 ? 36 : 44}px Inter, Arial, sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.lineJoin = 'round'
  const isCompleted = layerCategory.endsWith('-completed')
  context.strokeStyle = isCompleted
    ? 'rgba(15, 23, 42, 0.55)'
    : 'rgba(255, 255, 255, 0.92)'
  context.lineWidth = isCompleted ? 3 : 5
  context.strokeText(label, size / 2, size / 2 + 1, 72)
  context.fillStyle = isCompleted ? '#ffffff' : '#111827'
  context.fillText(label, size / 2, size / 2 + 1, 72)
  return context.getImageData(0, 0, size, size)
}

function getInventoryStationMarkerIconName(feature: SiteInventoryMapFeature): string {
  return `inventory-station-${feature.id}-${feature.properties.layerCategory}-${
    feature.properties.sequenceNumber
  }`
}

function createExplorationSiteFeatureCollection(
  features: readonly SiteExplorationMapFeature[] = [],
) {
  return {
    type: 'FeatureCollection' as const,
    features: features.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        siteId: feature.geometry.type === 'Polygon'
          ? feature.id.slice('boundary:'.length)
          : feature.id,
      },
    })),
  }
}

function createExplorationSiteLabelFeatureCollection(
  features: readonly SiteExplorationMapFeature[] = [],
) {
  const labels: Array<{
    type: 'Feature'
    id: string
    geometry: { type: 'Point'; coordinates: [number, number] }
    properties: {
      status: SiteExplorationStatus
      labelKind: 'center' | 'edge' | 'point-name'
      label: string
      compactLabel: string
      rotation: number
    }
  }> = []
  const boundarySiteIds = new Set(features.flatMap((feature) => (
    feature.geometry.type === 'Polygon'
      ? [feature.id.slice('boundary:'.length)]
      : []
  )))

  for (const feature of features) {
    if (feature.geometry.type === 'Point') {
      if (!boundarySiteIds.has(feature.id)) {
        labels.push({
          type: 'Feature',
          id: `${feature.id}:name`,
          geometry: feature.geometry,
          properties: {
            status: feature.properties.status,
            labelKind: 'point-name',
            label: feature.properties.projectName,
            compactLabel: feature.properties.projectName,
            rotation: 0,
          },
        })
      }
      continue
    }
    const center = centerOfMass(feature as never).geometry.coordinates
    const longitude = center[0]
    const latitude = center[1]
    const perimeterMeters = calculatePolygonPerimeterMeters(feature.geometry.coordinates)
    const areaSquareMeters = calculatePolygonAreaSquareMeters(feature.geometry.coordinates)
    if (
      typeof longitude === 'number'
      && Number.isFinite(longitude)
      && typeof latitude === 'number'
      && Number.isFinite(latitude)
    ) {
      labels.push({
        type: 'Feature',
        id: `${feature.id}:center`,
        geometry: { type: 'Point', coordinates: [longitude, latitude] },
        properties: {
          status: feature.properties.status,
          labelKind: 'center',
          label: `${feature.properties.projectName}\n${formatSquareMetersAsMu(
            areaSquareMeters,
          )} 亩 · 周长 ${formatMeasurementDistance(perimeterMeters)}`,
          compactLabel: `${formatSquareMetersAsMu(areaSquareMeters)} 亩`,
          rotation: 0,
        },
      })
    }

    feature.geometry.coordinates.forEach((ring, ringIndex) => {
      for (let positionIndex = 1; positionIndex < ring.length; positionIndex += 1) {
        const start = ring[positionIndex - 1]
        const end = ring[positionIndex]
        if (!start || !end) continue
        const startLongitude = start[0]
        const startLatitude = start[1]
        const endLongitude = end[0]
        const endLatitude = end[1]
        if (
          startLongitude === undefined
          || startLatitude === undefined
          || endLongitude === undefined
          || endLatitude === undefined
        ) continue
        const distanceMeters = calculateGreatCircleDistance(
          [startLongitude, startLatitude],
          [endLongitude, endLatitude],
        )
        if (distanceMeters <= 0) continue
        labels.push({
          type: 'Feature',
          id: `${feature.id}:edge:${ringIndex}:${positionIndex - 1}`,
          geometry: {
            type: 'Point',
            coordinates: [
              (startLongitude + endLongitude) / 2,
              (startLatitude + endLatitude) / 2,
            ],
          },
          properties: {
            status: feature.properties.status,
            labelKind: 'edge',
            label: formatMeasurementDistance(distanceMeters),
            compactLabel: formatMeasurementDistance(distanceMeters),
            rotation: calculateEdgeLabelRotation(
              startLongitude,
              startLatitude,
              endLongitude,
              endLatitude,
            ),
          },
        })
      }
    })
  }

  return {
    type: 'FeatureCollection' as const,
    features: labels,
  }
}

function calculateEdgeLabelRotation(
  startLongitude: number,
  startLatitude: number,
  endLongitude: number,
  endLatitude: number,
): number {
  let rotation = -Math.atan2(
    endLatitude - startLatitude,
    endLongitude - startLongitude,
  ) * 180 / Math.PI
  if (rotation > 90) rotation -= 180
  if (rotation < -90) rotation += 180
  return rotation
}

function createSelectedExplorationContextFeatureCollection(
  record: SiteExplorationRecord | null,
): GeoJSON.FeatureCollection {
  if (!record) return { type: 'FeatureCollection', features: [] }

  const features: GeoJSON.Feature[] = []
  const nearbyStationRadius = createSelectedExplorationNearbyStationRadius(record)
  if (nearbyStationRadius) features.push(nearbyStationRadius)
  if (record.highwayRoutes.length > 0) {
    record.highwayRoutes.forEach((route, index) => {
      features.push(...createSelectedExplorationDistanceFeatures(
        route.geoJson,
        'highway-distance',
        route.name,
        route.drivingDistanceMeters,
        [route.longitude, route.latitude],
        index,
      ))
    })
  } else if (record.highwayDistanceGeoJson) {
    features.push(...createSelectedExplorationDistanceFeatures(
      record.highwayDistanceGeoJson,
      'highway-distance',
      '距离高速口距离',
      record.highwayDistanceMeters,
      record.highwayEntrance
        ? [record.highwayEntrance.longitude, record.highwayEntrance.latitude]
        : undefined,
    ))
  }
  if (record.arterialRoadDistanceGeoJson) {
    features.push(...createSelectedExplorationDistanceFeatures(
      record.arterialRoadDistanceGeoJson,
      'arterial-road-distance',
      '场站离国/省/主干道通道距离',
      record.arterialRoadDistanceMeters,
    ))
  }

  const places = [
    ...record.nearbyTruckChargingStations.map((place) => ({
      ...place,
      contextKind: 'nearby-station',
    })),
    ...record.nearbyHotspotAreas.map((place) => ({
      ...place,
      contextKind: 'nearby-hotspot',
    })),
  ]
  for (const place of places) {
    if (!isMappableCoordinate(place.longitude, place.latitude)) continue
    features.push({
      type: 'Feature',
      id: `${place.contextKind}:${place.id || place.sequence}`,
      geometry: {
        type: 'Point',
        coordinates: [place.longitude, place.latitude],
      },
      properties: {
        contextKind: place.contextKind,
        sequence: place.sequence,
        name: place.name,
        category: place.category,
        address: place.address,
        hotspotIcon: place.contextKind === 'nearby-hotspot'
          ? getSiteExplorationHotspotIconDefinition(place.category).name
          : '',
        distanceLabel: place.distanceMeters === null
          ? ''
          : formatMeasurementDistance(place.distanceMeters),
      },
    })
  }

  return { type: 'FeatureCollection', features }
}

function createSelectedExplorationDistanceFeatures(
  geoJson: NonNullable<SiteExplorationRecord['highwayDistanceGeoJson']>,
  distanceKind: 'highway-distance' | 'arterial-road-distance',
  name: string,
  distanceMeters: number,
  highwayEntrancePosition?: [number, number],
  routeIndex = 0,
): GeoJSON.Feature[] {
  const routeColor = ['#f97316', '#2563eb', '#16a34a'][routeIndex] ?? '#f97316'
  const features: GeoJSON.Feature[] = [{
    ...geoJson,
    properties: { contextKind: distanceKind, name, routeColor },
  }]
  const firstPosition = geoJson.geometry.coordinates[0]
  const labelPosition = distanceKind === 'highway-distance'
    ? highwayEntrancePosition ?? (
        firstPosition?.[0] !== undefined && firstPosition[1] !== undefined
          ? [firstPosition[0], firstPosition[1]]
          : null
      )
    : findPathMidpoint(geoJson.geometry.coordinates)
  if (labelPosition && distanceMeters > 0) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: labelPosition },
      properties: {
        contextKind: 'distance-label',
        distanceKind,
        label: distanceKind === 'highway-distance'
          ? `${routeIndex + 1} ${name}\n${formatSelectedExplorationDistance(distanceMeters)}`
          : formatSelectedExplorationDistance(distanceMeters),
      },
    })
  }
  return features
}

function formatSelectedExplorationDistance(distanceMeters: number): string {
  return distanceMeters < 1_000
    ? `约 ${Math.round(distanceMeters)} 米`
    : `约 ${(distanceMeters / 1_000).toFixed(2)} 公里`
}

function createSelectedExplorationNearbyStationRadius(
  record: SiteExplorationRecord,
): GeoJSON.Feature<GeoJSON.Polygon> | null {
  if (!isMappableCoordinate(record.longitude, record.latitude)) return null
  return circle([record.longitude, record.latitude], 5, {
    steps: 128,
    units: 'kilometers',
    properties: { contextKind: 'nearby-station-radius' },
  })
}

function createSelectedExplorationSpatialSignature(record: SiteExplorationRecord): string {
  return JSON.stringify([
    record.longitude,
    record.latitude,
    record.siteBoundaryGeoJson?.geometry.coordinates ?? null,
  ])
}

function fitMapToSelectedExplorationContext(
  map: maplibregl.Map,
  record: SiteExplorationRecord,
) {
  const bounds = new maplibregl.LngLatBounds()
  if (isMappableCoordinate(record.longitude, record.latitude)) {
    bounds.extend([record.longitude, record.latitude])
  }
  const nearbyStationRadius = createSelectedExplorationNearbyStationRadius(record)
  for (const position of nearbyStationRadius?.geometry.coordinates[0] ?? []) {
    const [longitude, latitude] = position
    if (
      longitude !== undefined
      && latitude !== undefined
      && isMappableCoordinate(longitude, latitude)
    ) bounds.extend([longitude, latitude])
  }
  for (const geoJson of [
    ...record.highwayRoutes.map((route) => route.geoJson),
    ...record.highwayRoutes.length === 0 && record.highwayDistanceGeoJson ? [record.highwayDistanceGeoJson] : [],
    record.arterialRoadDistanceGeoJson,
  ]) {
    for (const position of geoJson?.geometry.coordinates ?? []) {
      const [longitude, latitude] = position
      if (isMappableCoordinate(longitude, latitude)) bounds.extend([longitude, latitude])
    }
  }
  for (const place of [
    ...record.nearbyTruckChargingStations,
    ...record.nearbyHotspotAreas,
  ]) {
    if (isMappableCoordinate(place.longitude, place.latitude)) {
      bounds.extend([place.longitude, place.latitude])
    }
  }
  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, { padding: 72, maxZoom: 13, duration: 500 })
  }
}

function focusMapOnExplorationSite(
  map: maplibregl.Map,
  center: [number, number],
  boundary: AnalysisMarkerRoute | undefined,
  panelWidths: MapFocusPanelWidths,
) {
  if (boundary) {
    const bounds = new maplibregl.LngLatBounds()
    boundary.points.forEach((point) => bounds.extend(point))
    const mapWidth = map.getContainer().clientWidth
    const horizontalInset = 96
    const availablePanelPadding = Math.max(0, mapWidth - horizontalInset * 2 - 128)
    const requestedPanelPadding = panelWidths.left + panelWidths.right
    const panelPaddingScale = requestedPanelPadding > availablePanelPadding
      ? availablePanelPadding / requestedPanelPadding
      : 1
    map.fitBounds(bounds, {
      padding: {
        top: 96,
        bottom: 96,
        left: horizontalInset + panelWidths.left * panelPaddingScale,
        right: horizontalInset + panelWidths.right * panelPaddingScale,
      },
      maxZoom: 17,
      duration: 700,
    })
    return
  }

  map.flyTo({
    center,
    zoom: 16,
    duration: 700,
    essential: true,
  })
}

type MapFocusPanelWidths = {
  left: number
  right: number
}

function isMappableCoordinate(
  longitude: number | undefined,
  latitude: number | undefined,
): boolean {
  return typeof longitude === 'number'
    && Number.isFinite(longitude)
    && longitude >= -180
    && longitude <= 180
    && typeof latitude === 'number'
    && Number.isFinite(latitude)
    && latitude >= -90
    && latitude <= 90
    && !(longitude === 0 && latitude === 0)
}

type SelectedExplorationContextPlace = {
  longitude: number
  latitude: number
  contextKind: 'nearby-station' | 'nearby-hotspot'
  name: string
  category: string
  address: string
  distanceLabel: string
}

function getSelectedExplorationPlaceFromFeature(
  feature?: MapGeoJSONFeature,
): SelectedExplorationContextPlace | null {
  if (!feature || feature.geometry.type !== 'Point') return null
  const [longitude, latitude] = feature.geometry.coordinates
  const { contextKind, name, category, address, distanceLabel } = feature.properties
  if (
    longitude === undefined
    || latitude === undefined
    || !isMappableCoordinate(longitude, latitude)
    || (contextKind !== 'nearby-station' && contextKind !== 'nearby-hotspot')
    || typeof name !== 'string'
    || typeof category !== 'string'
    || typeof address !== 'string'
    || typeof distanceLabel !== 'string'
  ) return null
  return { longitude, latitude, contextKind, name, category, address, distanceLabel }
}

function createSelectedExplorationPlacePopupContent(
  place: SelectedExplorationContextPlace,
) {
  const content = document.createElement('div')
  content.className = 'min-w-48 space-y-1 text-sm'
  const title = document.createElement('p')
  title.className = 'font-semibold'
  title.textContent = place.name
  const category = document.createElement('p')
  category.className = 'text-muted-foreground'
  category.textContent = place.contextKind === 'nearby-station'
    ? '周边充电站'
    : place.category
  content.append(title, category)
  if (place.address) {
    const address = document.createElement('p')
    address.textContent = place.address
    content.append(address)
  }
  if (place.distanceLabel) {
    const distance = document.createElement('p')
    distance.textContent = `距离勘探站点 ${place.distanceLabel}`
    content.append(distance)
  }
  return content
}

function createMeasurementFeatureCollection(points: readonly [number, number][]) {
  const lineFeature = points.length < 2
    ? []
    : [{
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: points.map(([longitude, latitude]) => [longitude, latitude]),
        },
        properties: {},
      }]
  let cumulativeDistance = 0
  const pointFeatures = points.map((coordinates, index) => {
    const previousPoint = points[index - 1]
    if (previousPoint) {
      cumulativeDistance += calculateGreatCircleDistance(previousPoint, coordinates)
    }

    return {
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates,
      },
      properties: {
        sequence: index + 1,
        distanceLabel: formatMeasurementDistance(cumulativeDistance),
      },
    }
  })

  return {
    type: 'FeatureCollection' as const,
    features: [...lineFeature, ...pointFeatures],
  }
}

function updateMeasurementSource(
  map: maplibregl.Map,
  points: readonly [number, number][],
) {
  const source = map.getSource(measurementSourceId) as maplibregl.GeoJSONSource | undefined
  source?.setData(createMeasurementFeatureCollection(points))
}

function calculatePathDistance(points: readonly [number, number][]): number {
  let distance = 0
  for (let index = 1; index < points.length; index += 1) {
    const previousPoint = points[index - 1]
    const currentPoint = points[index]
    if (!previousPoint || !currentPoint) continue
    distance += calculateGreatCircleDistance(previousPoint, currentPoint)
  }
  return distance
}

function createAnalysisMarkerRoute(coordinates: readonly number[][]): AnalysisMarkerRoute | null {
  const points = coordinates.flatMap((coordinate) => {
    const longitude = coordinate[0]
    const latitude = coordinate[1]
    return isMappableCoordinate(longitude, latitude)
      ? [[longitude, latitude] as [number, number]]
      : []
  })
  if (points.length < 3) return null

  const first = points[0]
  const last = points[points.length - 1]
  if (!first || !last) return null
  if (first[0] !== last[0] || first[1] !== last[1]) points.push([first[0], first[1]])

  const cumulativeDistances = [0]
  let totalDistanceMeters = 0
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]
    const current = points[index]
    if (!previous || !current) return null
    totalDistanceMeters += calculateGreatCircleDistance(previous, current)
    cumulativeDistances.push(totalDistanceMeters)
  }
  if (!Number.isFinite(totalDistanceMeters) || totalDistanceMeters <= 0) return null
  return { points, cumulativeDistances, totalDistanceMeters }
}

function calculateAnalysisMarkerLapDuration(route: AnalysisMarkerRoute): number {
  return Math.min(
    analysisMarkerMaxLapDurationMs,
    Math.max(
      analysisMarkerMinLapDurationMs,
      route.totalDistanceMeters / analysisMarkerMetersPerSecond * 1_000,
    ),
  )
}

function calculateAnalysisMarkerReturnDuration(
  from: [number, number],
  home: [number, number],
): number {
  return Math.min(
    analysisMarkerMaxReturnDurationMs,
    Math.max(
      analysisMarkerMinReturnDurationMs,
      calculateGreatCircleDistance(from, home) / analysisMarkerMetersPerSecond * 1_000,
    ),
  )
}

function randomAnalysisMarkerPauseInterval(): number {
  return analysisMarkerMinPauseIntervalMs
    + Math.random() * (analysisMarkerMaxPauseIntervalMs - analysisMarkerMinPauseIntervalMs)
}

function randomAnalysisMarkerPauseDuration(): number {
  return analysisMarkerMinPauseDurationMs
    + Math.random() * (analysisMarkerMaxPauseDurationMs - analysisMarkerMinPauseDurationMs)
}

function interpolateAnalysisMarkerRoute(
  route: AnalysisMarkerRoute,
  distanceMeters: number,
): [number, number] {
  const targetDistance = Math.min(
    route.totalDistanceMeters,
    Math.max(0, distanceMeters),
  )
  let lowerBound = 1
  let upperBound = route.cumulativeDistances.length - 1
  while (lowerBound < upperBound) {
    const middle = Math.floor((lowerBound + upperBound) / 2)
    if ((route.cumulativeDistances[middle] ?? 0) < targetDistance) {
      lowerBound = middle + 1
    } else {
      upperBound = middle
    }
  }
  const upperIndex = lowerBound

  const startIndex = Math.max(0, upperIndex - 1)
  const start = route.points[startIndex] ?? route.points[0]
  const end = route.points[upperIndex] ?? route.points[route.points.length - 1]
  if (!start || !end) throw new Error('analysis_marker_route_invariant')
  const startDistance = route.cumulativeDistances[startIndex] ?? 0
  const endDistance = route.cumulativeDistances[upperIndex] ?? route.totalDistanceMeters
  const segmentDistance = endDistance - startDistance
  const progress = segmentDistance > 0
    ? (targetDistance - startDistance) / segmentDistance
    : 0
  return [
    start[0] + (end[0] - start[0]) * progress,
    start[1] + (end[1] - start[1]) * progress,
  ]
}

function formatSquareMetersAsMu(squareMeters: number): string {
  return (squareMeters * 3 / 2_000).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatMeasurementDistance(distanceInMeters: number): string {
  if (distanceInMeters < 1_000) return `${Math.round(distanceInMeters)} 米`
  return `${(distanceInMeters / 1_000).toFixed(2)} 公里`
}

function createVisibilityRecord<Key extends string>(
  keys: readonly Key[],
  visible = true,
): Record<Key, boolean> {
  return Object.fromEntries(keys.map((key) => [key, visible])) as Record<Key, boolean>
}

function countBy<Key extends string>(
  values: readonly Key[],
  keys: readonly Key[],
): Record<Key, number> {
  const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<Key, number>
  for (const value of values) {
    if (value in counts) counts[value] += 1
  }
  return counts
}

function getGroupSelectionState(values: readonly boolean[]): {
  checked: boolean
  indeterminate: boolean
} {
  const checkedCount = values.filter(Boolean).length
  return {
    checked: checkedCount === values.length,
    indeterminate: checkedCount > 0 && checkedCount < values.length,
  }
}

function getNonEmptyGroupSelectionState(values: readonly boolean[]): {
  checked: boolean
  indeterminate: boolean
} {
  return values.length === 0
    ? { checked: false, indeterminate: false }
    : getGroupSelectionState(values)
}

function createPropertyInFilter(
  property: string,
  values: readonly string[],
): maplibregl.ExpressionSpecification {
  return values.length > 0
    ? ['in', ['get', property], ['literal', values]]
    : ['==', ['get', property], '__hidden__']
}

function createSelectedMapIconSizeExpression(
  idProperty: string,
  selectedId: string | null,
  defaultSize: number,
  selectedSize: number,
): number | maplibregl.ExpressionSpecification {
  if (selectedId === null) return defaultSize
  return [
    'case',
    ['==', ['get', idProperty], selectedId],
    selectedSize,
    defaultSize,
  ]
}

function createZoomResponsiveSelectedMapIconSizeExpression(
  idProperty: string,
  selectedId: string | null,
  minSize: number,
  maxSize: number,
  selectedMinSize: number,
  selectedMaxSize: number,
): maplibregl.ExpressionSpecification {
  const sizeAtZoom = (defaultSize: number, selectedSize: number) => (
    selectedId === null
      ? defaultSize
      : [
          'case',
          ['==', ['get', idProperty], selectedId],
          selectedSize,
          defaultSize,
        ]
  )

  return [
    'interpolate',
    ['linear'],
    ['zoom'],
    inventoryStationMinZoom, sizeAtZoom(minSize, selectedMinSize),
    inventoryStationMaxZoom, sizeAtZoom(maxSize, selectedMaxSize),
  ] as maplibregl.ExpressionSpecification
}

function createExplorationStatusColorExpression(): maplibregl.ExpressionSpecification {
  return [
    'match',
    ['get', 'status'],
    'draft', getSiteExplorationStatusConfig('draft').color,
    'completed', getSiteExplorationStatusConfig('completed').color,
    'signed', getSiteExplorationStatusConfig('signed').color,
    'under-construction', getSiteExplorationStatusConfig('under-construction').color,
    'operating', getSiteExplorationStatusConfig('operating').color,
    getSiteExplorationStatusConfig('draft').color,
  ]
}

function createExplorationStatusIconForegroundColorExpression(): maplibregl.ExpressionSpecification {
  return [
    'match',
    ['get', 'status'],
    'draft', getSiteExplorationStatusConfig('draft').iconForegroundColor,
    'completed', getSiteExplorationStatusConfig('completed').iconForegroundColor,
    'signed', getSiteExplorationStatusConfig('signed').iconForegroundColor,
    'under-construction', getSiteExplorationStatusConfig('under-construction').iconForegroundColor,
    'operating', getSiteExplorationStatusConfig('operating').iconForegroundColor,
    getSiteExplorationStatusConfig('draft').iconForegroundColor,
  ]
}

function createPropertyInAndEqualsFilter(
  property: string,
  values: readonly string[],
  exactProperty: string,
  exactValue: string,
): maplibregl.FilterSpecification {
  const valueFilter: maplibregl.ExpressionSpecification = values.length > 0
    ? ['in', ['get', property], ['literal', values]]
    : ['==', ['get', property], '__hidden__']
  return [
    'all',
    valueFilter,
    ['==', ['get', exactProperty], exactValue],
  ]
}

function setMapLayerVisibility(
  map: maplibregl.Map,
  layerIds: readonly string[],
  visible: boolean,
) {
  for (const layerId of layerIds) {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
    }
  }
}

function registerSelectedExplorationChargingStationIcon(
  map: maplibregl.Map,
  colors: ReturnType<typeof getMapThemeColors>,
) {
  map.addImage(
    siteExplorationChargingStationIconDefinition.name,
    createFacilityIconImage(
      siteExplorationChargingStationIconDefinition.color,
      '#ffffff',
      colors.background,
      siteExplorationChargingStationIconDefinition.paths,
      'square',
    ),
    { pixelRatio: 2 },
  )
}

function registerSelectedExplorationHotspotIcons(
  map: maplibregl.Map,
  colors: ReturnType<typeof getMapThemeColors>,
) {
  for (const category of nearbyHotspotAreaCategories) {
    const definition = getSiteExplorationHotspotIconDefinition(category)
    map.addImage(
      definition.name,
      createFacilityIconImage(
        definition.color,
        '#ffffff',
        colors.background,
        definition.paths,
      ),
      { pixelRatio: 2 },
    )
  }
}

function createFacilityIconImage(
  backgroundColor: string,
  foregroundColor: string,
  borderColor: string,
  paths: readonly string[],
  shape: 'circle' | 'square' = 'circle',
): ImageData {
  const size = 48
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Unable to create facility icon canvas')

  context.beginPath()
  if (shape === 'square') context.roundRect(3, 3, 42, 42, 7)
  else context.arc(size / 2, size / 2, 21.5, 0, Math.PI * 2)
  context.fillStyle = backgroundColor
  context.fill()
  context.strokeStyle = borderColor
  context.lineWidth = 2.5
  context.stroke()

  context.save()
  context.translate(7.8, 7.8)
  context.scale(1.35, 1.35)
  context.strokeStyle = foregroundColor
  context.lineWidth = 1.9
  context.lineCap = 'round'
  context.lineJoin = 'round'
  for (const path of paths) context.stroke(new Path2D(path))
  context.restore()

  return context.getImageData(0, 0, size, size)
}

function roadSegmentFeatureForMap(
  traffic: SiteSelectionRoadSegmentTraffic,
) {
  const feature = traffic.segmentGeoJson
  if (!feature) return { type: 'FeatureCollection' as const, features: [] }
  const segmentLengthMeters = Math.round(
    Math.abs((traffic.matchedRoute?.endKm ?? 0) - (traffic.matchedRoute?.startKm ?? 0)) * 1_000,
  )

  return {
    type: 'FeatureCollection' as const,
    features: [
      feature,
      {
        type: 'Feature' as const,
        properties: {
          trafficCount: traffic.traffic.visitCount,
          segmentLengthMeters,
        },
        geometry: {
          type: 'Point' as const,
          coordinates: lineMidpoint(feature.geometry.coordinates),
        },
      },
    ],
  }
}

function lineMidpoint(coordinates: [number, number][]): [number, number] {
  const segmentLengths = coordinates.slice(1).map((coordinate, index) => (
    calculateGreatCircleDistance(coordinates[index]!, coordinate)
  ))
  const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0)
  if (totalLength === 0) return coordinates[Math.floor(coordinates.length / 2)]!

  const midpointDistance = totalLength / 2
  let traversedDistance = 0
  for (let index = 0; index < segmentLengths.length; index += 1) {
    const segmentLength = segmentLengths[index]!
    if (traversedDistance + segmentLength < midpointDistance) {
      traversedDistance += segmentLength
      continue
    }
    const start = coordinates[index]!
    const end = coordinates[index + 1]!
    const ratio = (midpointDistance - traversedDistance) / segmentLength
    return [
      start[0] + (end[0] - start[0]) * ratio,
      start[1] + (end[1] - start[1]) * ratio,
    ]
  }

  return coordinates.at(-1)!
}

function getInventoryStationFromFeature(
  feature?: MapGeoJSONFeature,
  featureById: ReadonlyMap<string, SiteInventoryMapFeature> = new Map(),
): SiteInventoryMapFeature | undefined {
  const stationId = feature?.properties.stationId
  if (typeof stationId !== 'string') return undefined
  return featureById.get(stationId)
}

function getExplorationSiteFromFeature(
  feature?: MapGeoJSONFeature,
  featureById: ReadonlyMap<string, SiteExplorationMapPointFeature> = new Map(),
): SiteExplorationMapPointFeature | undefined {
  const siteId = feature?.properties.siteId
  if (typeof siteId !== 'string') return undefined
  return featureById.get(siteId)
}

function getMapThemeColors(container: HTMLElement) {
  const styles = getComputedStyle(container)
  return {
    background: resolveCssColor(styles, '--background'),
    foreground: resolveCssColor(styles, '--foreground'),
    primary: resolveCssColor(styles, '--primary'),
    mutedForeground: resolveCssColor(styles, '--muted-foreground'),
  }
}

function resolveCssColor(styles: CSSStyleDeclaration, property: string): string {
  const value = styles.getPropertyValue(property).trim()
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context || !CSS.supports('color', value)) throw new Error(`Invalid map theme color: ${property}`)

  context.fillStyle = value
  context.fillRect(0, 0, 1, 1)
  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data
  if (red === undefined || green === undefined || blue === undefined || alpha === undefined) {
    throw new Error(`Unable to resolve map theme color: ${property}`)
  }
  return `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`
}
