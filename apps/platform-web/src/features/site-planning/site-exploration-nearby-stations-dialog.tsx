import { useEffect, useRef, useState } from 'react'
import { gcj02ToWgs84, wgs84ToGcj02 } from '@evcs/geo-coordinates'
import circle from '@turf/circle'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ClipboardListIcon, LoaderCircleIcon, RefreshCwIcon, SearchIcon } from '@/components/ui/icons'
import { env } from '@/config/env'
import { cn } from '@/lib/utils'
import { createTiandituStyle } from '@/features/agent-workspace/tianditu-map-style'
import {
  loadAmapPlugins,
  type AmapNamespace,
  type AmapPlaceSearch,
  type AmapPoi,
} from './amap-js-api'
import {
  SiteExplorationChargingStationIcon,
  siteExplorationChargingStationIconDefinition,
} from './site-exploration-charging-station-icon'
import {
  getSiteExplorationHotspotIconDefinition,
  SiteExplorationHotspotIcon,
} from './site-exploration-hotspot-icon'
import {
  siteExplorationErrorMessage,
  uploadNearbyTaskStationSnapshot,
  nearbyHotspotAreaCategories,
  uploadNearbyHotspotAreaSnapshot,
  uploadNearbyTruckChargingStationSnapshot,
  type SiteExplorationImage,
} from './site-exploration-api'
import { getNearbySiteInventoryStations } from './site-inventory-api'
import {
  siteExplorationDialogActionClassName,
  siteExplorationDialogActionsClassName,
  siteExplorationDialogBodyClassName,
  siteExplorationDialogContentClassName,
  siteExplorationDialogFooterClassName,
  siteExplorationDialogHeaderClassName,
} from './site-exploration-dialog-layout'
import { SiteExplorationMapControls } from './site-exploration-map-controls'

export type NearbyChargingStation = {
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

export type NearbyHotspotAreaResult = NearbyChargingStation

type NearbyStationMarkerRecord = {
  marker: maplibregl.Marker
}

const DEFAULT_KEYWORD = '重卡充电站'
const searchRadiusSourceId = 'nearby-stations-search-radius'
const searchRadiusFillLayerId = 'nearby-stations-search-radius-fill'
const searchRadiusLineLayerId = 'nearby-stations-search-radius-line'
const tiandituToken = env.maps.tiandituToken
const amapPlaceSearchMinIntervalMs = 500

export function SiteExplorationNearbyStationsDialog({
  latitude,
  longitude,
  locationAddress,
  initialPlaces,
  onConfirm,
}: {
  latitude: number
  longitude: number
  locationAddress: string
  initialPlaces: readonly NearbyChargingStation[]
  onConfirm: (stations: NearbyChargingStation[], snapshot: SiteExplorationImage) => void
}) {
  return (
    <NearbyPlacesDialog
      latitude={latitude}
      longitude={longitude}
      locationAddress={locationAddress}
      initialPlaces={initialPlaces}
      radiusMeters={5_000}
      searchTargets={[{ keyword: DEFAULT_KEYWORD, category: '新能源重卡充电站' }]}
      maxResults={20}
      title="查询附近重卡充电站"
      description="使用高德开放数据查询当前站点 5 公里内的新能源重卡充电站，并在地图中展示。"
      actionLabel="查询附近重卡充电站"
      resultTitle="附近站点"
      resultNoun="站点"
      uploadSnapshot={uploadNearbyTruckChargingStationSnapshot}
      snapshotFileName="nearby-truck-charging-stations-snapshot.webp"
      onConfirm={onConfirm}
    />
  )
}

export function SiteExplorationNearbyHotspotsDialog({
  latitude,
  longitude,
  locationAddress,
  initialPlaces,
  onConfirm,
}: {
  latitude: number
  longitude: number
  locationAddress: string
  initialPlaces: readonly NearbyHotspotAreaResult[]
  onConfirm: (hotspots: NearbyHotspotAreaResult[], snapshot: SiteExplorationImage) => void
}) {
  return (
    <NearbyPlacesDialog
      latitude={latitude}
      longitude={longitude}
      locationAddress={locationAddress}
      initialPlaces={initialPlaces}
      radiusMeters={5_000}
      searchTargets={nearbyHotspotAreaCategories.map((category) => ({
        keyword: category,
        category,
        poiType: category === '港口' || category === '码头' ? '港口码头' : undefined,
      }))}
      maxResults={100}
      title="查询周边热点区域"
      description="查询当前站点 5 公里内的物流、矿区、港口、能源、制造业及产业园区等热点区域。"
      actionLabel="查询周边热点区域"
      resultTitle="热点区域"
      resultNoun="热点区域"
      uploadSnapshot={uploadNearbyHotspotAreaSnapshot}
      snapshotFileName="nearby-hotspot-areas-snapshot.webp"
      onConfirm={onConfirm}
    />
  )
}

export function SiteExplorationNearbyTaskStationsDialog({
  latitude,
  longitude,
  locationAddress,
  initialPlaces,
  onConfirm,
}: {
  latitude: number
  longitude: number
  locationAddress: string
  initialPlaces: readonly NearbyChargingStation[]
  onConfirm: (stations: NearbyChargingStation[], snapshot: SiteExplorationImage) => void
}) {
  return (
    <NearbyPlacesDialog
      latitude={latitude}
      longitude={longitude}
      locationAddress={locationAddress}
      initialPlaces={initialPlaces}
      radiusMeters={5_000}
      searchTargets={[]}
      maxResults={100}
      title="查询周边任务站点"
      description="查询当前站点 5 公里内的任务站点，并在地图中展示。"
      actionLabel="查询周边任务站点"
      resultTitle="任务站点"
      resultNoun="任务站点"
      loadPlaces={async () => (await getNearbySiteInventoryStations({ longitude, latitude })).map((station, index) => ({
        sequence: index + 1,
        id: station.id,
        name: station.stationName,
        address: [station.provincialCity, station.countyDistrict, station.specificLocation].filter(Boolean).join(' · '),
        longitude: station.longitude,
        latitude: station.latitude,
        distanceMeters: station.distanceMeters,
        type: station.status,
        category: '任务站点',
      }))}
      uploadSnapshot={uploadNearbyTaskStationSnapshot}
      snapshotFileName="nearby-task-stations-snapshot.webp"
      onConfirm={onConfirm}
    />
  )
}

function NearbyPlacesDialog({
  latitude,
  longitude,
  locationAddress,
  initialPlaces,
  radiusMeters,
  searchTargets,
  maxResults,
  title,
  description,
  actionLabel,
  resultTitle,
  resultNoun,
  loadPlaces,
  uploadSnapshot,
  snapshotFileName,
  onConfirm,
}: {
  latitude: number
  longitude: number
  locationAddress: string
  initialPlaces: readonly NearbyChargingStation[]
  radiusMeters: number
  searchTargets: readonly { keyword: string; category: string; poiType?: string }[]
  maxResults: number
  title: string
  description: string
  actionLabel: string
  resultTitle: string
  resultNoun: string
  loadPlaces?: () => Promise<NearbyChargingStation[]>
  uploadSnapshot: (file: File) => Promise<SiteExplorationImage>
  snapshotFileName: string
  onConfirm: (places: NearbyChargingStation[], snapshot: SiteExplorationImage) => void
}) {
  const [open, setOpen] = useState(false)
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null)
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null)
  const [stations, setStations] = useState<NearbyChargingStation[]>([])
  const [status, setStatus] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearchCompleted, setHasSearchCompleted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const currentSiteMarkerRef = useRef<maplibregl.Marker | null>(null)
  const stationMarkersRef = useRef<NearbyStationMarkerRecord[]>([])
  const placeSearchRef = useRef<AmapPlaceSearch[]>([])
  const requestIdRef = useRef(0)
  const initialPlacesRef = useRef(initialPlaces)
  const loadPlacesRef = useRef(loadPlaces)
  initialPlacesRef.current = initialPlaces
  loadPlacesRef.current = loadPlaces
  const hasSiteLocation = isValidCoordinate(longitude, latitude)
  const hasTiandituToken = Boolean(tiandituToken && tiandituToken !== 'replace-with-tianditu-token')

  useEffect(() => {
    if (!open) return

    const savedPlaces = [...initialPlacesRef.current]
    const hasSavedPlaces = savedPlaces.length > 0
    setStations(savedPlaces)
    setHasSearchCompleted(hasSavedPlaces)
    setStatus(hasSavedPlaces
      ? `已加载 ${savedPlaces.length} 个已保存的${resultNoun}，点击“重新加载”可重新查询。`
      : `正在查询当前站点 ${radiusMeters / 1_000} 公里内的${resultNoun}…`)

    if (!mapContainer || !hasSiteLocation || !hasTiandituToken) return

    let cancelled = false

    const map = new maplibregl.Map({
      container: mapContainer,
      style: createTiandituStyle(tiandituToken),
      center: [longitude, latitude],
      zoom: 13,
      attributionControl: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    })
    mapRef.current = map
    setMapInstance(map)
    currentSiteMarkerRef.current = new maplibregl.Marker({
      anchor: 'bottom',
      element: createSelectedLocationMarkerElement(),
    }).setLngLat([longitude, latitude]).addTo(map)

    map.once('load', () => {
      if (cancelled) return
      addSearchRadiusLayers(map, longitude, latitude, radiusMeters)
      fitMapToSearchRadius(map, longitude, latitude, radiusMeters, 0)
      if (hasSavedPlaces) return
      void reloadNearbyPlaces()
    })

    return () => {
      cancelled = true
      requestIdRef.current += 1
      placeSearchRef.current.forEach((search) => search.clear())
      placeSearchRef.current = []
      currentSiteMarkerRef.current?.remove()
      currentSiteMarkerRef.current = null
      stationMarkersRef.current.forEach(({ marker }) => marker.remove())
      stationMarkersRef.current = []
      mapRef.current = null
      setMapInstance(null)
      map.remove()
    }
  }, [hasSiteLocation, hasTiandituToken, latitude, longitude, mapContainer, open, radiusMeters, resultNoun])

  useEffect(() => {
    if (!mapInstance) return

    stationMarkersRef.current.forEach(({ marker }) => marker.remove())
    stationMarkersRef.current = stations.filter((station) => (
      isValidCoordinate(station.longitude, station.latitude)
    )).map((station) => {
      const marker = new maplibregl.Marker({
        element: createNearbyPlaceMarkerElement(station),
        anchor: 'top',
        offset: [0, -12],
      })
        .setLngLat([station.longitude, station.latitude])
        .addTo(mapInstance)
      return { marker }
    })

    return () => {
      stationMarkersRef.current.forEach(({ marker }) => marker.remove())
      stationMarkersRef.current = []
    }
  }, [mapInstance, stations])

  async function searchNearbyPlaces(amap: AmapNamespace) {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setIsSearching(true)
    setHasSearchCompleted(false)
    setStatus(`正在查询当前站点 ${radiusMeters / 1_000} 公里内的${resultNoun}…`)
    setStations([])
    placeSearchRef.current.forEach((search) => search.clear())
    placeSearchRef.current = []
    const gcjCenter = wgs84ToGcj02(longitude, latitude)

    try {
      const results: NearbyChargingStation[] = []
      let previousSearchStartedAt = 0
      for (const [targetIndex, target] of searchTargets.entries()) {
        const waitMilliseconds = Math.max(
          0,
          amapPlaceSearchMinIntervalMs - (Date.now() - previousSearchStartedAt),
        )
        if (waitMilliseconds > 0) await wait(waitMilliseconds)
        if (requestIdRef.current !== requestId) return
        setStatus(`正在查询${resultNoun}（${targetIndex + 1}/${searchTargets.length}）…`)

        const placeSearch = new amap.PlaceSearch({
          city: '全国',
          citylimit: false,
          extensions: 'base',
          pageIndex: 1,
          pageSize: 20,
          ...(target.poiType ? { type: target.poiType } : {}),
        })
        placeSearchRef.current.push(placeSearch)
        previousSearchStartedAt = Date.now()
        const targetResults = await new Promise<NearbyChargingStation[]>((resolve, reject) => {
          placeSearch.searchNearBy(
            target.keyword,
            [gcjCenter.longitude, gcjCenter.latitude],
            radiusMeters,
            (searchStatus, result) => {
              if (searchStatus === 'no_data') {
                resolve([])
                return
              }
              if (searchStatus !== 'complete') {
                reject(new Error(
                  `amap_nearby_place_search_failed:${target.keyword}:${result.info ?? searchStatus}`,
                ))
                return
              }
              resolve((result.poiList?.pois ?? []).flatMap((poi, index) => {
                const place = toNearbyChargingStation(poi, index, target.category)
                return place ? [place] : []
              }))
            },
          )
        })
        results.push(...targetResults)
      }
      if (requestIdRef.current !== requestId) return
      const uniqueResults = Array.from(results.reduce((resultMap, station) => {
        const existing = resultMap.get(station.id)
        if (!existing || station.category.length > existing.category.length) {
          resultMap.set(station.id, station)
        }
        return resultMap
      }, new Map<string, NearbyChargingStation>()).values()).sort((left, right) => (
        (left.distanceMeters ?? Number.POSITIVE_INFINITY)
        - (right.distanceMeters ?? Number.POSITIVE_INFINITY)
      )).slice(0, maxResults).map((station, index) => ({ ...station, sequence: index + 1 }))
      setStations(uniqueResults)
      setHasSearchCompleted(true)
      fitMapToSearchRadius(mapRef.current, longitude, latitude, radiusMeters)
      setStatus(uniqueResults.length
        ? `已找到 ${uniqueResults.length} 个结果。`
        : `当前站点 ${radiusMeters / 1_000} 公里内未查询到${resultNoun}。`)
    } catch {
      if (requestIdRef.current === requestId) {
        setHasSearchCompleted(false)
        setStatus(`${resultNoun}查询失败，请稍后重试。`)
      }
    } finally {
      if (requestIdRef.current === requestId) setIsSearching(false)
    }
  }

  async function reloadNearbyPlaces() {
    if (isSearching || isSaving) return
    if (loadPlacesRef.current) {
      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId
      setIsSearching(true)
      setHasSearchCompleted(false)
      setStatus(`正在查询当前站点 ${radiusMeters / 1_000} 公里内的${resultNoun}…`)
      setStations([])
      try {
        const results = await loadPlacesRef.current()
        if (requestIdRef.current !== requestId) return
        const normalized = results.slice(0, maxResults).map((place, index) => ({
          ...place,
          sequence: index + 1,
        }))
        setStations(normalized)
        setHasSearchCompleted(true)
        fitMapToSearchRadius(mapRef.current, longitude, latitude, radiusMeters)
        setStatus(normalized.length
          ? `已找到 ${normalized.length} 个结果。`
          : `当前站点 ${radiusMeters / 1_000} 公里内未查询到${resultNoun}。`)
      } catch {
        if (requestIdRef.current === requestId) {
          setStatus(`${resultNoun}查询失败，请稍后重试。`)
        }
      } finally {
        if (requestIdRef.current === requestId) setIsSearching(false)
      }
      return
    }
    try {
      const amap = await loadAmapPlugins(['AMap.PlaceSearch'])
      await searchNearbyPlaces(amap)
    } catch {
      setStatus('高德开放数据加载失败，请检查高德地图 Key 与安全密钥配置。')
    }
  }

  async function confirm() {
    const map = mapRef.current
    if (!map || !hasSearchCompleted || isSaving) return
    setIsSaving(true)
    try {
      const screenshot = await captureNearbyStationsScreenshot(
        map,
        longitude,
        latitude,
        stations,
        snapshotFileName,
      )
      const snapshot = await uploadSnapshot(screenshot)
      onConfirm(stations, snapshot)
      setOpen(false)
    } catch (error) {
      toast.error(
        error instanceof Error && error.message === 'nearby_station_snapshot_capture_failed'
          ? '地图截图生成失败，请稍后重试。'
          : siteExplorationErrorMessage(error) ?? '地图截图上传失败，请稍后重试。',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Button
        type="button"
        disabled={!hasSiteLocation}
        onClick={() => setOpen(true)}
      >
        <SearchIcon data-icon="inline-start" aria-hidden="true" />
        {actionLabel}
      </Button>
      {!hasSiteLocation ? (
        <p className="mt-2 text-xs text-muted-foreground">请先选择项目位置，再查询{resultNoun}。</p>
      ) : null}

      <Dialog open={open} onOpenChange={(nextOpen) => { if (!isSaving) setOpen(nextOpen) }}>
        <DialogContent className={siteExplorationDialogContentClassName}>
          <DialogHeader className={siteExplorationDialogHeaderClassName}>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className={cn(siteExplorationDialogBodyClassName, 'grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:overflow-hidden')}>
            <div className="flex min-w-0 flex-col gap-3 lg:min-h-0">
              {hasTiandituToken ? (
                <div className="relative h-[min(56dvh,34rem)] min-h-80 overflow-hidden rounded-lg border bg-muted lg:h-auto lg:min-h-0 lg:flex-1">
                  <div ref={setMapContainer} className="h-full w-full" />
                  <SiteExplorationMapControls
                    map={mapInstance}
                    defaultBaseMap="road"
                    onReset={() => fitMapToSearchRadius(
                      mapInstance,
                      longitude,
                      latitude,
                      radiusMeters,
                    )}
                  />
                </div>
              ) : (
                <div className="flex h-80 items-center justify-center rounded-lg border bg-muted/30 px-6 text-center text-sm text-destructive lg:h-auto lg:min-h-0 lg:flex-1">
                  天地图服务未配置，暂时无法展示地图。
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                当前站点：{locationAddress || `${longitude.toFixed(6)}, ${latitude.toFixed(6)}`}
              </p>
            </div>

            <div className="flex min-w-0 flex-col gap-2 lg:min-h-0">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{resultTitle}</p>
                <p className="text-xs text-muted-foreground">搜到 {stations.length} 个</p>
              </div>
              <div
                className="min-h-64 flex-1 overflow-y-auto rounded-lg border bg-card p-1"
                aria-busy={isSearching}
              >
                {stations.length ? stations.map((station) => (
                  <div
                    key={station.id}
                    className="flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-sm"
                  >
                    {station.category === '任务站点'
                      ? <ClipboardListIcon className="mt-0.5 size-5 shrink-0 text-primary" />
                      : isNearbyHotspotCategory(station.category)
                      ? <SiteExplorationHotspotIcon category={station.category} />
                      : <SiteExplorationChargingStationIcon />}
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{station.name}</span>
                      <span className="block text-xs leading-5 text-muted-foreground">
                        {[station.category, formatDistance(station.distanceMeters), station.address].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </div>
                )) : (
                  <div
                    className="flex min-h-64 flex-col items-center justify-center gap-3 px-5 text-center text-sm text-muted-foreground"
                    role={isSearching ? 'status' : undefined}
                    aria-live={isSearching ? 'polite' : undefined}
                  >
                    {isSearching ? (
                      <>
                        <LoaderCircleIcon className="size-6 animate-spin text-primary" aria-hidden="true" />
                        <span>{status || `正在查询${resultNoun}…`}</span>
                      </>
                    ) : `暂无${resultNoun}结果`}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 text-xs leading-5 text-muted-foreground">{status}</p>
                <div className="shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!mapInstance || isSearching || isSaving}
                    onClick={() => void reloadNearbyPlaces()}
                  >
                    <RefreshCwIcon className={cn(isSearching && 'animate-spin')} aria-hidden="true" />
                    {isSearching ? '加载中…' : '重新加载'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className={siteExplorationDialogFooterClassName}>
            <div className={siteExplorationDialogActionsClassName}>
              <Button
                className={siteExplorationDialogActionClassName}
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={() => setOpen(false)}
              >
                取消
              </Button>
              <Button
                className={siteExplorationDialogActionClassName}
                type="button"
                disabled={!hasSearchCompleted || isSaving}
                onClick={() => void confirm()}
              >
                {isSaving ? '正在保存…' : '确认回填'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function createSelectedLocationMarkerElement(): HTMLImageElement {
  const icon = document.createElement('img')
  icon.src = '/map/location-selected.png'
  icon.alt = '当前站点'
  icon.draggable = false
  icon.className = 'pointer-events-none block size-9 drop-shadow-md'
  return icon
}

function createNearbyPlaceMarkerElement(place: NearbyChargingStation) {
  const root = document.createElement('div')
  const icon = document.createElement('span')
  const label = document.createElement('span')
  const definition = getNearbyPlaceIconDefinition(place.category)
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

  root.className = 'pointer-events-none flex flex-col items-center'
  icon.className = 'flex size-6 items-center justify-center border border-background p-1 text-white shadow-sm'
  icon.style.backgroundColor = definition.color
  icon.style.borderRadius = isNearbyHotspotCategory(place.category) ? '9999px' : '0.25rem'
  label.className = 'mt-0.5 max-w-36 whitespace-pre-line text-center text-[11px] font-medium leading-[1.15] text-foreground'
  label.style.textShadow = '-1px -1px 0 var(--background), 1px -1px 0 var(--background), -1px 1px 0 var(--background), 1px 1px 0 var(--background)'
  label.textContent = isNearbyHotspotCategory(place.category)
    ? `${place.category}\n${place.name}`
    : place.name
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '1.9')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.classList.add('size-4')
  for (const pathData of definition.paths) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', pathData)
    svg.append(path)
  }
  icon.append(svg)
  root.append(icon, label)

  return root
}

function isNearbyHotspotCategory(
  category: string,
): category is (typeof nearbyHotspotAreaCategories)[number] {
  return nearbyHotspotAreaCategories.includes(
    category as (typeof nearbyHotspotAreaCategories)[number],
  )
}

function getNearbyPlaceIconDefinition(category: string) {
  return category === '任务站点'
    ? taskStationIconDefinition
    : isNearbyHotspotCategory(category)
    ? getSiteExplorationHotspotIconDefinition(category)
    : siteExplorationChargingStationIconDefinition
}

const taskStationIconDefinition = {
  color: '#7c3aed',
  paths: [
    'M9 5h6',
    'M9 3h6v4H9z',
    'M7 5H5v16h14V5h-2',
    'M9 12h6',
    'M9 16h6',
  ],
}

function createSearchRadiusFeature(longitude: number, latitude: number, radiusMeters: number) {
  return circle([longitude, latitude], radiusMeters / 1_000, {
    steps: 128,
    units: 'kilometers',
  })
}

function addSearchRadiusLayers(
  map: maplibregl.Map,
  longitude: number,
  latitude: number,
  radiusMeters: number,
) {
  map.addSource(searchRadiusSourceId, {
    type: 'geojson',
    data: createSearchRadiusFeature(longitude, latitude, radiusMeters),
  })
  map.addLayer({
    id: searchRadiusFillLayerId,
    type: 'fill',
    source: searchRadiusSourceId,
    paint: {
      'fill-color': '#1956E8',
      'fill-opacity': 0.08,
    },
  })
  map.addLayer({
    id: searchRadiusLineLayerId,
    type: 'line',
    source: searchRadiusSourceId,
    paint: {
      'line-color': '#1956E8',
      'line-opacity': 0.85,
      'line-width': 2,
    },
  })
}

function fitMapToSearchRadius(
  map: maplibregl.Map | null,
  longitude: number,
  latitude: number,
  radiusMeters: number,
  duration = 500,
) {
  if (!map) return
  const radiusFeature = createSearchRadiusFeature(longitude, latitude, radiusMeters)
  const bounds = new maplibregl.LngLatBounds()
  for (const coordinate of radiusFeature.geometry.coordinates[0] ?? []) {
    const [coordinateLongitude, coordinateLatitude] = coordinate
    if (coordinateLongitude === undefined || coordinateLatitude === undefined) continue
    bounds.extend([coordinateLongitude, coordinateLatitude])
  }
  map.fitBounds(bounds, { padding: 56, maxZoom: 13, duration })
}

async function captureNearbyStationsScreenshot(
  map: maplibregl.Map,
  longitude: number,
  latitude: number,
  stations: readonly NearbyChargingStation[],
  snapshotFileName: string,
): Promise<File> {
  const mapCanvas = map.getCanvas()
  const screenshotCanvas = document.createElement('canvas')
  screenshotCanvas.width = mapCanvas.width
  screenshotCanvas.height = mapCanvas.height
  const context = screenshotCanvas.getContext('2d')
  if (!context || mapCanvas.clientWidth <= 0 || mapCanvas.clientHeight <= 0) {
    throw new Error('nearby_station_snapshot_capture_failed')
  }

  context.drawImage(mapCanvas, 0, 0)
  const currentLocationIcon = await loadScreenshotIcon('/map/location-selected.png')
  const scale = mapCanvas.width / mapCanvas.clientWidth
  const markerSize = 36 * scale
  const currentPoint = map.project([longitude, latitude])
  context.drawImage(
    currentLocationIcon,
    currentPoint.x * scale - markerSize / 2,
    currentPoint.y * scale - markerSize,
    markerSize,
    markerSize,
  )

  for (const station of stations) {
    if (!isValidCoordinate(station.longitude, station.latitude)) continue
    const point = map.project([station.longitude, station.latitude])
    drawNearbyPlaceScreenshotIcon(
      context,
      station,
      point.x * scale,
      point.y * scale,
      24 * scale,
    )
  }
  currentLocationIcon.close()

  return new Promise((resolve, reject) => {
    screenshotCanvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('nearby_station_snapshot_capture_failed'))
        return
      }
      resolve(new File(
        [blob],
        snapshotFileName,
        { type: 'image/webp' },
      ))
    }, 'image/webp', 0.9)
  })
}

function drawNearbyPlaceScreenshotIcon(
  context: CanvasRenderingContext2D,
  place: NearbyChargingStation,
  centerX: number,
  centerY: number,
  size: number,
) {
  const definition = getNearbyPlaceIconDefinition(place.category)
  const isHotspot = isNearbyHotspotCategory(place.category)
  const left = centerX - size / 2
  const top = centerY - size / 2

  context.save()
  context.beginPath()
  if (isHotspot) context.arc(centerX, centerY, size / 2, 0, Math.PI * 2)
  else context.roundRect(left, top, size, size, size * 0.2)
  context.fillStyle = definition.color
  context.fill()
  context.strokeStyle = '#ffffff'
  context.lineWidth = 2 * size / 32
  context.stroke()

  context.translate(left + size * 0.2, top + size * 0.2)
  context.scale(size * 0.6 / 24, size * 0.6 / 24)
  context.strokeStyle = '#ffffff'
  context.lineWidth = 1.9
  context.lineCap = 'round'
  context.lineJoin = 'round'
  for (const path of definition.paths) context.stroke(new Path2D(path))
  context.restore()

  const labelLines = isHotspot ? [place.category, place.name] : [place.name]
  const fontSize = size * 11 / 24
  context.save()
  context.font = `600 ${fontSize}px sans-serif`
  context.textAlign = 'center'
  context.textBaseline = 'top'
  context.lineJoin = 'round'
  context.strokeStyle = '#ffffff'
  context.lineWidth = Math.max(2, size * 2 / 24)
  context.fillStyle = '#111827'
  labelLines.forEach((line, index) => {
    const lineY = centerY + size / 2 + size * 2 / 24 + index * fontSize * 1.15
    context.strokeText(line, centerX, lineY)
    context.fillText(line, centerX, lineY)
  })
  context.restore()
}

async function loadScreenshotIcon(path: string): Promise<ImageBitmap> {
  const response = await fetch(path)
  if (!response.ok) throw new Error('nearby_station_snapshot_capture_failed')
  return createImageBitmap(await response.blob())
}

function toNearbyChargingStation(
  poi: AmapPoi,
  index: number,
  category: string,
): NearbyChargingStation | null {
  const gcjLongitude = poi.location?.getLng?.() ?? poi.location?.lng
  const gcjLatitude = poi.location?.getLat?.() ?? poi.location?.lat
  if (
    !poi.name
    || typeof gcjLongitude !== 'number'
    || typeof gcjLatitude !== 'number'
    || !isValidCoordinate(gcjLongitude, gcjLatitude)
  ) return null
  const coordinate = gcj02ToWgs84(gcjLongitude, gcjLatitude)
  const rawDistance = typeof poi.distance === 'number'
    ? poi.distance
    : typeof poi.distance === 'string'
      ? Number.parseFloat(poi.distance)
      : Number.NaN
  return {
    sequence: index + 1,
    id: poi.id || `${poi.name}-${gcjLongitude}-${gcjLatitude}`,
    name: poi.name,
    address: [
      poi.pname,
      normalizeAddressPart(poi.cityname),
      poi.adname,
      normalizeAddressPart(poi.address),
    ].filter(Boolean).join('') || poi.name,
    longitude: coordinate.longitude,
    latitude: coordinate.latitude,
    distanceMeters: Number.isFinite(rawDistance) ? rawDistance : null,
    type: poi.type ?? '',
    category,
  }
}

function normalizeAddressPart(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value.filter(Boolean).join('') : value ?? ''
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}

function isValidCoordinate(longitude: number, latitude: number): boolean {
  return Number.isFinite(longitude)
    && Number.isFinite(latitude)
    && longitude >= -180
    && longitude <= 180
    && latitude >= -90
    && latitude <= 90
    && !(longitude === 0 && latitude === 0)
}

function formatDistance(distanceMeters: number | null): string {
  if (distanceMeters === null) return ''
  return distanceMeters < 1_000
    ? `${Math.round(distanceMeters)} 米`
    : `${(distanceMeters / 1_000).toFixed(1)} 公里`
}
