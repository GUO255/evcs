import { useEffect, useRef, useState } from 'react'
import { wgs84ToGcj02 } from '@evcs/geo-coordinates'
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
import { RefreshCwIcon, SearchIcon } from '@/components/ui/icons'
import { env } from '@/config/env'
import { createTiandituStyle } from '@/features/agent-workspace/tianditu-map-style'
import { cn } from '@/lib/utils'
import {
  hasAmapConfiguration,
  loadAmapPlugins,
  type AmapDriving,
  type AmapDrivingRoute,
  type AmapNamespace,
  type AmapPlaceSearch,
  type AmapPoi,
} from './amap-js-api'
import {
  siteExplorationErrorMessage,
  uploadSiteExplorationDistanceSnapshot,
  type SiteDistanceGeoJson,
  type SiteExplorationImage,
  type HighwayRoute,
} from './site-exploration-api'
import {
  siteExplorationDialogActionClassName,
  siteExplorationDialogActionsClassName,
  siteExplorationDialogBodyClassName,
  siteExplorationDialogContentClassName,
  siteExplorationDialogFooterClassName,
  siteExplorationDialogHeaderClassName,
} from './site-exploration-dialog-layout'
import {
  normalizeDrivingRoute,
  normalizeExpresswayCandidates,
  selectNearestExpresswayCandidates,
  type ExpresswayDrivingRoute,
  type ExpresswayEntranceCandidate,
} from './site-exploration-expressway-route'
import { HIGHWAY_DISTANCE_SEARCH_RADIUS_METERS } from './site-exploration-highway-distance'
import {
  SiteExplorationMapControls,
} from './site-exploration-map-controls'

type QueryState =
  | { status: 'idle' }
  | { status: 'searching'; message: string }
  | { status: 'ready'; routes: ExpresswayDrivingRoute[] }
  | { status: 'saved' }
  | { status: 'empty' }
  | { status: 'error'; message: string }

const searchRadiusSourceId = 'expressway-entrance-search-radius'
const searchRadiusFillLayerId = 'expressway-entrance-search-radius-fill'
const searchRadiusLineLayerId = 'expressway-entrance-search-radius-line'
const routeSourceId = 'expressway-entrance-driving-route'
const routeLineLayerId = 'expressway-entrance-driving-route-line'
const routeEndpointLayerId = 'expressway-entrance-driving-route-endpoints'
const routeEndpointIconLayerId = 'expressway-entrance-driving-route-endpoint-icons'
const routeEndpointTitleLayerId = 'expressway-entrance-driving-route-endpoint-titles'
const routeDistanceLabelLayerId = 'expressway-entrance-driving-route-distance-label'
const candidateKeywords = ['高速公路出入口', '收费站'] as const
const routeConcurrency = 3
const routeColors = ['#f97316', '#2563eb', '#16a34a'] as const
const tiandituToken = env.maps.tiandituToken

export function SiteExplorationExpresswayRoutePicker({
  longitude,
  latitude,
  initialGeoJson,
  initialRoutes,
  hasSavedResult,
  disabled,
  onSelect,
  onOutsideSearchRadius,
}: {
  longitude: number
  latitude: number
  initialGeoJson: SiteDistanceGeoJson | null
  initialRoutes: HighwayRoute[]
  hasSavedResult: boolean
  disabled?: boolean
  onSelect: (snapshot: SiteExplorationImage, routes: HighwayRoute[]) => void
  onOutsideSearchRadius: () => void
}) {
  const [open, setOpen] = useState(false)
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null)
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null)
  const [queryState, setQueryState] = useState<QueryState>({ status: 'idle' })
  const [isSaving, setIsSaving] = useState(false)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const currentSiteMarkerRef = useRef<maplibregl.Marker | null>(null)
  const placeSearchesRef = useRef<AmapPlaceSearch[]>([])
  const drivingSearchesRef = useRef<AmapDriving[]>([])
  const requestIdRef = useRef(0)
  const hasSiteLocation = isValidCoordinate(longitude, latitude)
  const hasTiandituToken = Boolean(tiandituToken && tiandituToken !== 'replace-with-tianditu-token')

  useEffect(() => {
    if (!open || !mapContainer || !hasSiteLocation || !hasTiandituToken) return

    const map = new maplibregl.Map({
      container: mapContainer,
      style: createTiandituStyle(tiandituToken, 'vector'),
      center: [longitude, latitude],
      zoom: 12,
      attributionControl: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    })
    mapRef.current = map
    currentSiteMarkerRef.current = new maplibregl.Marker({
      element: createSiteMarkerElement(),
      anchor: 'bottom',
    }).setLngLat([longitude, latitude]).addTo(map)
    const resizeObserver = new ResizeObserver(() => map.resize())
    resizeObserver.observe(mapContainer)

    map.once('load', () => {
      map.resize()
      addSearchRadiusLayers(map, longitude, latitude)
      addRouteLayers(map, initialRoutes, initialGeoJson)
      fitSearchRadius(map, longitude, latitude)
      setMapInstance(map)
    })

    return () => {
      resizeObserver.disconnect()
      currentSiteMarkerRef.current?.remove()
      currentSiteMarkerRef.current = null
      mapRef.current = null
      setMapInstance(null)
      map.remove()
    }
  }, [hasSiteLocation, hasTiandituToken, initialGeoJson, initialRoutes, latitude, longitude, mapContainer, open])

  useEffect(() => {
    if (!open || !hasSiteLocation) return
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    if (initialRoutes.length > 0) {
      setQueryState({ status: 'ready', routes: initialRoutes.map(toDrivingRoute) })
    } else if (hasSavedResult) {
      setQueryState({ status: 'saved' })
    } else {
      void queryNearestEntrances(requestId)
    }
    return () => {
      requestIdRef.current += 1
      clearAmapSearches()
    }
  }, [hasSavedResult, hasSiteLocation, initialRoutes, latitude, longitude, open])

  useEffect(() => {
    if (!mapInstance || queryState.status !== 'ready') return
    updateRouteSource(mapInstance, queryState.routes, [longitude, latitude])
    fitRoutes(mapInstance, queryState.routes)
  }, [mapInstance, queryState])

  async function queryNearestEntrances(requestId: number) {
    if (!hasTiandituToken) {
      setQueryState({ status: 'error', message: '天地图服务未配置，无法展示和保存导航路线。' })
      return
    }
    if (!hasAmapConfiguration()) {
      setQueryState({ status: 'error', message: '高德地图服务未配置，无法查询高速出入口。' })
      return
    }
    setQueryState({ status: 'searching', message: '正在查询 20 公里内的高速出入口…' })
    clearAmapSearches()

    try {
      const amap = await loadAmapPlugins(['AMap.PlaceSearch', 'AMap.Driving'])
      if (requestIdRef.current !== requestId) return
      const gcjSite = wgs84ToGcj02(longitude, latitude)
      const poiGroups: AmapPoi[][] = []
      for (const [index, keyword] of candidateKeywords.entries()) {
        setQueryState({
          status: 'searching',
          message: `正在查询高速出入口（${index + 1}/${candidateKeywords.length}）…`,
        })
        poiGroups.push(await searchNearby(amap, keyword, [gcjSite.longitude, gcjSite.latitude]))
        if (requestIdRef.current !== requestId) return
      }
      const candidates = selectNearestExpresswayCandidates(normalizeExpresswayCandidates(poiGroups.flat()))
      if (candidates.length === 0) {
        setQueryState({ status: 'empty' })
        return
      }

      setQueryState({
        status: 'searching',
        message: `已找到 ${candidates.length} 个候选高速口，正在计算驾车路线…`,
      })
      const routes = await mapWithConcurrency(
        candidates,
        routeConcurrency,
        (candidate) => searchDrivingRoute(amap, candidate, [gcjSite.longitude, gcjSite.latitude]),
      )
      if (requestIdRef.current !== requestId) return
      if (routes.some((route) => route === null)) {
        setQueryState({ status: 'error', message: '部分高速出入口的驾车路线规划失败，请重新加载。' })
        return
      }
      const routesWithinDrivingRadius = (routes as ExpresswayDrivingRoute[])
        .filter((route) => route.distanceMeters <= HIGHWAY_DISTANCE_SEARCH_RADIUS_METERS)
      setQueryState(routesWithinDrivingRadius.length > 0
        ? { status: 'ready', routes: routesWithinDrivingRadius }
        : { status: 'empty' })
    } catch (error) {
      if (requestIdRef.current !== requestId) return
      setQueryState({
        status: 'error',
        message: error instanceof Error && error.message === 'missing_amap_configuration'
          ? '高德地图服务未配置，无法查询高速出入口。'
          : '高速出入口或驾车路线查询失败，请稍后重试。',
      })
    }
  }

  function searchNearby(
    amap: AmapNamespace,
    keyword: string,
    center: [number, number],
  ): Promise<AmapPoi[]> {
    const placeSearch = new amap.PlaceSearch({
      city: '全国',
      citylimit: false,
      extensions: 'base',
      pageIndex: 1,
      pageSize: 50,
    })
    placeSearchesRef.current.push(placeSearch)
    return new Promise((resolve, reject) => {
      placeSearch.searchNearBy(keyword, center, HIGHWAY_DISTANCE_SEARCH_RADIUS_METERS, (status, result) => {
        if (status === 'no_data') {
          resolve([])
          return
        }
        if (status !== 'complete') {
          reject(new Error(`amap_expressway_search_failed:${result.info ?? status}`))
          return
        }
        resolve(result.poiList?.pois ?? [])
      })
    })
  }

  function searchDrivingRoute(
    amap: AmapNamespace,
    candidate: ExpresswayEntranceCandidate,
    destination: [number, number],
  ): Promise<ExpresswayDrivingRoute | null> {
    const driving = new amap.Driving({ extensions: 'base', policy: 0 })
    drivingSearchesRef.current.push(driving)
    return new Promise((resolve) => {
      driving.search(candidate.gcj02, destination, (status, result) => {
        if (status !== 'complete') {
          resolve(null)
          return
        }
        const routes = (result.routes ?? []).flatMap((route) => {
          const normalized = normalizeDrivingRoute(candidate, route as AmapDrivingRoute)
          return normalized ? [normalized] : []
        })
        resolve(routes.sort(compareRoutes)[0] ?? null)
      })
    })
  }

  function clearAmapSearches() {
    placeSearchesRef.current.forEach((search) => search.clear())
    placeSearchesRef.current = []
    drivingSearchesRef.current.forEach((search) => search.clear())
    drivingSearchesRef.current = []
  }

  function changeOpen(nextOpen: boolean) {
    if (isSaving && !nextOpen) return
    if (nextOpen) setQueryState({ status: 'idle' })
    setOpen(nextOpen)
  }

  function reload() {
    if (queryState.status === 'searching' || isSaving) return
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    void queryNearestEntrances(requestId)
  }

  async function confirm() {
    if (queryState.status === 'empty') {
      onOutsideSearchRadius()
      setOpen(false)
      toast.success('已回填为大于 20 公里')
      return
    }
    if (queryState.status === 'saved') {
      setOpen(false)
      toast.success('已确认当前保存结果')
      return
    }
    if (queryState.status !== 'ready' || !mapRef.current || isSaving) return
    setIsSaving(true)
    try {
      const screenshot = await captureRouteScreenshot(
        mapRef.current,
        [longitude, latitude],
      )
      const snapshot = await uploadSiteExplorationDistanceSnapshot('highway-distance', screenshot)
      onSelect(snapshot, queryState.routes.map(toHighwayRoute))
      setOpen(false)
      toast.success('高速口、驾车路线和地图截图已保存到表单')
    } catch (error) {
      toast.error(
        error instanceof Error && error.message === 'expressway_route_snapshot_capture_failed'
          ? '路线截图生成失败，请稍后重试。'
          : siteExplorationErrorMessage(error) ?? '路线截图上传失败，请稍后重试。',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Button type="button" disabled={disabled || !hasSiteLocation} onClick={() => changeOpen(true)}>
        <SearchIcon data-icon="inline-start" aria-hidden="true" />
        查找高速口
      </Button>
      {!hasSiteLocation ? (
        <p className="mt-2 text-xs text-muted-foreground">请先选择项目位置，再查询最近高速口。</p>
      ) : null}
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent className={siteExplorationDialogContentClassName}>
          <DialogHeader className={siteExplorationDialogHeaderClassName}>
            <DialogTitle>查找高速出入口</DialogTitle>
            <DialogDescription>
              查询当前站点附近的高速出入口，仅保留驾车距离不超过 20 公里的路线。
            </DialogDescription>
          </DialogHeader>

          <div className={cn(siteExplorationDialogBodyClassName, 'grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(19rem,0.7fr)] lg:overflow-hidden')}>
            <div className="flex min-w-0 flex-col lg:min-h-0">
              {hasTiandituToken ? (
                <div className="relative h-[min(58dvh,36rem)] min-h-80 overflow-hidden rounded-lg border bg-muted lg:h-full lg:min-h-0">
                  <div ref={setMapContainer} className="h-full w-full" />
                  <SiteExplorationMapControls
                    map={mapInstance}
                    defaultBaseMap="road"
                    onReset={() => {
                      if (mapInstance) fitSearchRadius(mapInstance, longitude, latitude, 300)
                    }}
                  />
                </div>
              ) : (
                <div className="flex min-h-80 flex-1 items-center justify-center rounded-lg border bg-muted/30 px-6 text-center text-sm text-destructive">
                  天地图服务未配置，无法展示和保存导航路线。
                </div>
              )}
            </div>

            <div className="flex flex-col rounded-lg border bg-muted/30 lg:min-h-0">
              <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <div>
                  <h3 className="font-medium">查询结果</h3>
                  <p className="text-xs text-muted-foreground">搜索半径 20 公里</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={queryState.status === 'searching' || isSaving}
                  onClick={reload}
                >
                  <RefreshCwIcon data-icon="inline-start" aria-hidden="true" />
                  重新加载
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <RouteResult state={queryState} />
              </div>
            </div>
          </div>

          <DialogFooter className={siteExplorationDialogFooterClassName}>
            <div className={siteExplorationDialogActionsClassName}>
              <Button className={siteExplorationDialogActionClassName} type="button" variant="outline" disabled={isSaving} onClick={() => changeOpen(false)}>
                取消
              </Button>
              <Button
                className={siteExplorationDialogActionClassName}
                type="button"
                disabled={(
                  queryState.status !== 'ready'
                  && queryState.status !== 'empty'
                  && queryState.status !== 'saved'
                ) || isSaving || !hasTiandituToken}
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

function RouteResult({ state }: { state: QueryState }) {
  if (state.status === 'ready') {
    return (
      <div className="space-y-3">
        {state.routes.map((route, index) => (
          <div key={route.candidate.id} className="rounded-lg bg-background p-4">
            <div className="flex items-start gap-3">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full font-bold text-white"
                style={{ backgroundColor: routeColors[index] }}
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="font-medium">{route.candidate.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{route.candidate.address}</p>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3 pl-11">
              <div><dt className="text-xs text-muted-foreground">直线距离</dt><dd className="mt-1 font-medium tabular-nums">{formatDistance(route.candidate.straightLineDistanceMeters)}</dd></div>
              <div><dt className="text-xs text-muted-foreground">驾车距离</dt><dd className="mt-1 font-medium tabular-nums" style={{ color: routeColors[index] }}>{formatDistance(route.distanceMeters)}</dd></div>
            </dl>
          </div>
        ))}
        <p className="text-xs leading-5 text-muted-foreground">仅显示驾车距离不超过 20 公里的路线；结果按直线距离稳定排序。</p>
      </div>
    )
  }
  if (state.status === 'searching') {
    return <p className="text-sm text-muted-foreground">{state.message}</p>
  }
  if (state.status === 'empty') {
    return (
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>未找到驾车距离不超过 20 公里的高速出入口或收费站。</p>
        <p>确认后将距离回填为“&gt; 20 公里”。</p>
      </div>
    )
  }
  if (state.status === 'error') {
    return <p className="text-sm text-destructive">{state.message}</p>
  }
  if (state.status === 'saved') {
    return <p className="text-sm text-muted-foreground">已加载保存的高速口路线。需要更新时请点击“重新加载”。</p>
  }
  return <p className="text-sm text-muted-foreground">准备查询高速出入口…</p>
}

async function mapWithConcurrency<Input, Output>(
  inputs: readonly Input[],
  concurrency: number,
  operation: (input: Input) => Promise<Output>,
): Promise<Output[]> {
  const results = new Array<Output>(inputs.length)
  let nextIndex = 0
  const workers = Array.from({ length: Math.min(concurrency, inputs.length) }, async () => {
    while (nextIndex < inputs.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await operation(inputs[index]!)
    }
  })
  await Promise.all(workers)
  return results
}

function compareRoutes(left: ExpresswayDrivingRoute, right: ExpresswayDrivingRoute): number {
  return left.distanceMeters - right.distanceMeters
    || left.candidate.straightLineDistanceMeters - right.candidate.straightLineDistanceMeters
    || left.candidate.id.localeCompare(right.candidate.id)
}

function toHighwayRoute(route: ExpresswayDrivingRoute): HighwayRoute {
  return {
    poiId: route.candidate.id,
    name: route.candidate.name,
    address: route.candidate.address,
    longitude: route.candidate.wgs84[0],
    latitude: route.candidate.wgs84[1],
    straightLineDistanceMeters: route.candidate.straightLineDistanceMeters,
    drivingDistanceMeters: route.distanceMeters,
    geoJson: route.geoJson,
  }
}

function toDrivingRoute(route: HighwayRoute): ExpresswayDrivingRoute {
  const gcj02 = wgs84ToGcj02(route.longitude, route.latitude)
  return {
    candidate: {
      id: route.poiId,
      name: route.name,
      address: route.address,
      type: '高速公路出入口',
      straightLineDistanceMeters: route.straightLineDistanceMeters,
      gcj02: [gcj02.longitude, gcj02.latitude],
      wgs84: [route.longitude, route.latitude],
    },
    distanceMeters: route.drivingDistanceMeters,
    geoJson: route.geoJson,
  }
}

function addSearchRadiusLayers(map: maplibregl.Map, longitude: number, latitude: number) {
  map.addSource(searchRadiusSourceId, {
    type: 'geojson',
    data: circle([longitude, latitude], HIGHWAY_DISTANCE_SEARCH_RADIUS_METERS / 1_000, { units: 'kilometers', steps: 96 }),
  })
  map.addLayer({
    id: searchRadiusFillLayerId,
    type: 'fill',
    source: searchRadiusSourceId,
    paint: { 'fill-color': '#2563eb', 'fill-opacity': 0.08 },
  })
  map.addLayer({
    id: searchRadiusLineLayerId,
    type: 'line',
    source: searchRadiusSourceId,
    paint: { 'line-color': '#2563eb', 'line-width': 2 },
  })
}

function addRouteLayers(
  map: maplibregl.Map,
  initialRoutes: HighwayRoute[],
  initialGeoJson: SiteDistanceGeoJson | null,
) {
  map.addSource(routeSourceId, {
    type: 'geojson',
    data: initialRoutes.length > 0
      ? toRouteFeatureCollection(initialRoutes.map(toDrivingRoute))
      : initialGeoJson
        ? legacyRouteFeatureCollection(initialGeoJson)
        : emptyFeatureCollection(),
  })
  map.addLayer({
    id: routeLineLayerId,
    type: 'line',
    source: routeSourceId,
    filter: ['==', '$type', 'LineString'],
    paint: {
      'line-color': ['coalesce', ['get', 'color'], routeColors[0]],
      'line-width': 5,
      'line-opacity': 0.95,
    },
  })
  map.addLayer({
    id: routeEndpointLayerId,
    type: 'circle',
    source: routeSourceId,
    filter: ['has', 'role'],
    paint: {
      'circle-radius': 10,
      'circle-color': ['coalesce', ['get', 'color'], routeColors[0]],
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 2,
    },
  })
  map.addLayer({
    id: routeEndpointIconLayerId,
    type: 'symbol',
    source: routeSourceId,
    filter: ['has', 'role'],
    layout: {
      'text-field': ['get', 'sequence'],
      'text-font': ['PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', 'sans-serif'],
      'text-size': 10,
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-width': 0,
    },
  })
  map.addLayer({
    id: routeEndpointTitleLayerId,
    type: 'symbol',
    source: routeSourceId,
    filter: ['has', 'title'],
    layout: {
      'text-field': ['get', 'title'],
      'text-font': ['PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', 'sans-serif'],
      'text-size': 12,
      'text-anchor': 'bottom',
      'text-offset': [0, -1.2],
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    },
    paint: {
      'text-color': '#111827',
      'text-halo-color': '#ffffff',
      'text-halo-width': 2,
    },
  })
  map.addLayer({
    id: routeDistanceLabelLayerId,
    type: 'symbol',
    source: routeSourceId,
    filter: ['has', 'label'],
    layout: {
      'text-field': ['get', 'label'],
      'text-font': ['PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', 'sans-serif'],
      'text-size': 12,
      'text-anchor': 'bottom',
      'text-offset': [0, -2.8],
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    },
    paint: {
      'text-color': '#111827',
      'text-halo-color': '#ffffff',
      'text-halo-width': 2,
    },
  })
}

function updateRouteSource(
  map: maplibregl.Map,
  routes: ExpresswayDrivingRoute[],
  sitePosition: [number, number],
) {
  const source = map.getSource(routeSourceId) as maplibregl.GeoJSONSource | undefined
  source?.setData(toRouteFeatureCollection(routes, sitePosition))
}

function fitSearchRadius(
  map: maplibregl.Map,
  longitude: number,
  latitude: number,
  duration = 0,
) {
  const feature = circle([longitude, latitude], HIGHWAY_DISTANCE_SEARCH_RADIUS_METERS / 1_000, { units: 'kilometers', steps: 32 })
  const bounds = new maplibregl.LngLatBounds()
  feature.geometry.coordinates[0]?.forEach((position) => bounds.extend(position as [number, number]))
  if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 48, duration, maxZoom: 14 })
}

function fitRoutes(map: maplibregl.Map, routes: ExpresswayDrivingRoute[]) {
  const bounds = new maplibregl.LngLatBounds()
  routes.forEach((route) => route.geoJson.geometry.coordinates.forEach(
    (position) => bounds.extend([position[0], position[1]]),
  ))
  if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 72, duration: 400, maxZoom: 17 })
}

function toRouteFeatureCollection(
  routes: ExpresswayDrivingRoute[],
  sitePosition?: [number, number],
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [
      ...routes.flatMap((route, index) => {
        const color = routeColors[index] ?? routeColors[0]
        return [
          {
            type: 'Feature' as const,
            properties: { color, routeIndex: index + 1 },
            geometry: route.geoJson.geometry,
          },
          {
            type: 'Feature' as const,
            properties: {
              role: 'entrance', color, sequence: String(index + 1),
              title: route.candidate.name, label: formatDistance(route.distanceMeters),
            },
            geometry: { type: 'Point' as const, coordinates: route.candidate.wgs84 },
          },
        ]
      }),
      ...sitePosition ? [{
        type: 'Feature' as const,
        properties: { title: '当前位置' },
        geometry: { type: 'Point' as const, coordinates: sitePosition },
      }] : [],
    ],
  }
}

function legacyRouteFeatureCollection(geoJson: SiteDistanceGeoJson): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: { color: routeColors[0] }, geometry: geoJson.geometry }],
  }
}

function emptyFeatureCollection(): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [],
  }
}

function createSiteMarkerElement() {
  const icon = document.createElement('img')
  icon.src = '/map/location-selected.png'
  icon.alt = '当前站点'
  icon.draggable = false
  icon.className = 'pointer-events-none block size-9 drop-shadow-md'
  return icon
}

async function captureRouteScreenshot(
  map: maplibregl.Map,
  sitePosition: [number, number],
): Promise<File> {
  const mapCanvas = map.getCanvas()
  const screenshotCanvas = document.createElement('canvas')
  screenshotCanvas.width = mapCanvas.width
  screenshotCanvas.height = mapCanvas.height
  const context = screenshotCanvas.getContext('2d')
  if (!context || mapCanvas.clientWidth <= 0 || mapCanvas.clientHeight <= 0) {
    throw new Error('expressway_route_snapshot_capture_failed')
  }

  context.drawImage(mapCanvas, 0, 0)
  const scale = mapCanvas.width / mapCanvas.clientWidth
  const currentLocationIcon = await loadRouteScreenshotIcon('/map/location-selected.png')
  const markerSize = 36 * scale
  const sitePoint = map.project(sitePosition)
  context.drawImage(
    currentLocationIcon,
    sitePoint.x * scale - markerSize / 2,
    sitePoint.y * scale - markerSize,
    markerSize,
    markerSize,
  )
  currentLocationIcon.close()

  return new Promise((resolve, reject) => {
    screenshotCanvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('expressway_route_snapshot_capture_failed'))
        return
      }
      resolve(new File([blob], 'highway-distance-snapshot.webp', { type: 'image/webp' }))
    }, 'image/webp', 0.9)
  })
}

async function loadRouteScreenshotIcon(path: string): Promise<ImageBitmap> {
  const response = await fetch(path)
  if (!response.ok) throw new Error('expressway_route_snapshot_capture_failed')
  return createImageBitmap(await response.blob())
}

function formatDistance(distanceMeters: number): string {
  return distanceMeters < 1_000
    ? `${Math.round(distanceMeters)} 米`
    : `${(distanceMeters / 1_000).toFixed(1)} 公里`
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
