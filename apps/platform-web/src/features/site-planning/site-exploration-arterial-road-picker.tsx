import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RulerIcon } from '@/components/ui/icons'
import { env } from '@/config/env'
import { createTiandituStyle } from '@/features/agent-workspace/tianditu-map-style'
import {
  getSiteSelectionRoadSegmentTraffic,
  roadSegmentTrafficErrorMessage,
  type SiteSelectionRoadSegmentTraffic,
} from '@/features/agent-workspace/site-selection-road-segment-traffic-api'

import { calculateGreatCircleDistance } from './site-exploration-geometry'
import {
  siteExplorationErrorMessage,
  uploadSiteExplorationDistanceSnapshot,
  type ArterialRoadTrafficGeoJson,
  type SiteDistanceGeoJson,
  type SiteExplorationImage,
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
  SiteExplorationMapControls,
} from './site-exploration-map-controls'

type Position = [number, number]

export function SiteExplorationArterialRoadPicker({
  longitude,
  latitude,
  disabled,
  onSelect,
}: {
  longitude: number
  latitude: number
  disabled?: boolean
  onSelect: (
    distanceMeters: number,
    distanceGeoJson: SiteDistanceGeoJson,
    snapshot: SiteExplorationImage,
    trafficGeoJson: ArterialRoadTrafficGeoJson,
    traffic: SiteSelectionRoadSegmentTraffic['traffic'],
  ) => void
}) {
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null)
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null)
  const [open, setOpen] = useState(false)
  const [analysis, setAnalysis] = useState<SiteSelectionRoadSegmentTraffic | null>(null)
  const [error, setError] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isMapReady, setIsMapReady] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null)
  const token = env.maps.tiandituToken
  const hasConfiguredToken = Boolean(token && token !== 'replace-with-tianditu-token')

  useEffect(() => {
    if (!open) return
    if (!hasConfiguredToken) {
      setAnalysis(null)
      setIsAnalyzing(false)
      setError('天地图服务未配置，暂时无法生成并保存分析截图。')
      return
    }
    const controller = new AbortController()
    setAnalysis(null)
    setError('')
    setIsAnalyzing(true)
    setDistanceMeters(null)
    void getSiteSelectionRoadSegmentTraffic(longitude, latitude, undefined, controller.signal, {
      coordinateSystem: 'wgs84',
      roadLevels: ['national', 'provincial'],
      searchRadiusMeters: 20_000,
    }).then((result) => {
      if (result.dataStatus !== 'ready' || !result.matchedRoute || !result.segmentGeoJson || !result.matching.nearestPoint) {
        setError('场站 20 公里范围内未找到国道或省道，请核对场站位置或补充道路数据。')
        return
      }
      setAnalysis(result)
      setDistanceMeters(result.matching.distanceMeters)
    }).catch((requestError) => {
      if (controller.signal.aborted) return
      setError(roadSegmentTrafficErrorMessage(requestError) ?? '主干道与车流分析失败，请稍后重试。')
    }).finally(() => {
      if (!controller.signal.aborted) setIsAnalyzing(false)
    })
    return () => controller.abort()
  }, [hasConfiguredToken, latitude, longitude, open])

  useEffect(() => {
    if (!open || !mapContainer || !analysis || !hasConfiguredToken) return
    const segment = analysis.segmentGeoJson
    const nearestPoint = analysis.matching.nearestPoint
    if (!segment || !nearestPoint) return

    const roadNearestPoint = nearestPoint
    const roadSegment = segment.geometry.coordinates
    const map = new maplibregl.Map({
      container: mapContainer,
      style: createTiandituStyle(token, 'vector'),
      center: [longitude, latitude],
      zoom: 14,
      attributionControl: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    })
    mapRef.current = map
    setMapInstance(map)
    setIsMapReady(false)

    const markerElement = document.createElement('img')
    markerElement.src = '/map/location-selected.png'
    markerElement.alt = ''
    markerElement.draggable = false
    markerElement.className = 'pointer-events-none block size-9 drop-shadow-md'
    new maplibregl.Marker({ element: markerElement, anchor: 'bottom' })
      .setLngLat([longitude, latitude])
      .addTo(map)

    const resizeObserver = new ResizeObserver(() => map.resize())
    resizeObserver.observe(mapContainer)
    map.once('load', () => {
      map.addSource('arterial-road-analysis', {
        type: 'geojson',
        data: createAnalysisMapData(
          analysis,
          [longitude, latitude],
          roadNearestPoint,
          roadSegment,
        ),
      })
      map.addLayer({
        id: 'arterial-road-analysis-road-casing',
        type: 'line',
        source: 'arterial-road-analysis',
        filter: ['==', ['get', 'kind'], 'road'],
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
        id: 'arterial-road-analysis-road',
        type: 'line',
        source: 'arterial-road-analysis',
        filter: ['==', ['get', 'kind'], 'road'],
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
        id: 'arterial-road-analysis-distance',
        type: 'line',
        source: 'arterial-road-analysis',
        filter: ['==', ['get', 'kind'], 'distance'],
        paint: { 'line-color': '#2563eb', 'line-width': 4, 'line-dasharray': [1.5, 1] },
      })
      map.addLayer({
        id: 'arterial-road-analysis-points',
        type: 'circle',
        source: 'arterial-road-analysis',
        filter: ['in', ['get', 'kind'], ['literal', ['site', 'road-point']]],
        paint: {
          'circle-radius': 7,
          'circle-color': '#2563eb',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 3,
        },
      })
      map.addLayer({
        id: 'arterial-road-analysis-label',
        type: 'symbol',
        source: 'arterial-road-analysis',
        filter: ['in', ['get', 'kind'], ['literal', ['road-point', 'road-segment-label']]],
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', 'sans-serif'],
          'text-size': 12,
          'text-anchor': 'bottom',
          'text-offset': [0, -0.8],
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: { 'text-color': '#111827', 'text-halo-color': '#ffffff', 'text-halo-width': 2 },
      })
      fitArterialRoadAnalysis(map, roadSegment, [longitude, latitude])
      map.once('idle', () => setIsMapReady(true))
    })

    return () => {
      resizeObserver.disconnect()
      mapRef.current = null
      setMapInstance(null)
      setIsMapReady(false)
      map.remove()
    }
  }, [analysis, hasConfiguredToken, latitude, longitude, mapContainer, open, token])

  async function save() {
    if (!analysis || !analysis.segmentGeoJson || !analysis.matching.nearestPoint || !mapRef.current || distanceMeters === null || isSaving) return
    setIsSaving(true)
    try {
      const roundedDistanceMeters = Math.max(1, Math.round(distanceMeters))
      const automaticDistanceGeoJson: SiteDistanceGeoJson = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: [[longitude, latitude], analysis.matching.nearestPoint],
        },
      }
      const trafficGeoJson = createTrafficGeoJson(
        analysis,
        roundedDistanceMeters,
      )
      const screenshot = await captureMapScreenshot(mapRef.current)
      const snapshot = await uploadSiteExplorationDistanceSnapshot('arterial-road-distance', screenshot)
      onSelect(roundedDistanceMeters, automaticDistanceGeoJson, snapshot, trafficGeoJson, analysis.traffic)
      setOpen(false)
      toast.success('主干道距离、路段车流、GeoJSON 和截图已保存到表单')
    } catch (saveError) {
      toast.error(siteExplorationErrorMessage(saveError) ?? '自动分析结果保存失败，请稍后重试。')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Button type="button" disabled={disabled} onClick={() => setOpen(true)}>
        <RulerIcon data-icon="inline-start" />
        自动分析主干道与车流
      </Button>
      <Dialog open={open} onOpenChange={(next) => !isSaving && setOpen(next)}>
        <DialogContent className={siteExplorationDialogContentClassName}>
          <DialogHeader className={siteExplorationDialogHeaderClassName}>
            <DialogTitle>场站离国/省/主干道通道距离与车流</DialogTitle>
            <DialogDescription>自动匹配最近的国道或省道，并计算场站到道路的直线距离与路段车流。</DialogDescription>
          </DialogHeader>
          <div className={siteExplorationDialogBodyClassName}>
            {isAnalyzing ? (
              <div className="flex h-80 items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">正在匹配道路并读取车流数据…</div>
            ) : error ? (
              <div className="flex h-80 items-center justify-center rounded-lg border bg-muted/30 px-6 text-center text-sm text-destructive">{error}</div>
            ) : analysis ? (
              <div className="flex flex-col gap-4">
                <div className="relative h-[min(55vh,34rem)] overflow-hidden rounded-lg border bg-muted">
                  <div ref={setMapContainer} className="h-full w-full" />
                  <SiteExplorationMapControls
                    map={mapInstance}
                    defaultBaseMap="road"
                    onReset={() => {
                      const roadSegment = analysis.segmentGeoJson?.geometry.coordinates
                      if (mapInstance && roadSegment) {
                        fitArterialRoadAnalysis(
                          mapInstance,
                          roadSegment,
                          [longitude, latitude],
                          300,
                        )
                      }
                    }}
                  />
                </div>
                <AnalysisSummary analysis={analysis} />
              </div>
            ) : null}
          </div>
          <DialogFooter className={siteExplorationDialogFooterClassName}>
            <div className={siteExplorationDialogActionsClassName}>
              <Button className={siteExplorationDialogActionClassName} type="button" variant="outline" disabled={isSaving} onClick={() => setOpen(false)}>取消</Button>
              <Button className={siteExplorationDialogActionClassName} type="button" disabled={!analysis || !isMapReady || distanceMeters === null || isSaving} onClick={() => void save()}>
                {isSaving ? '正在保存…' : '保存分析结果'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function AnalysisSummary({ analysis }: { analysis: SiteSelectionRoadSegmentTraffic }) {
  const route = analysis.matchedRoute
  const traffic = analysis.traffic
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryItem label="最近道路" value={routeLabel(analysis)} badge={roadLevelLabel(route?.roadLevel)} />
      <SummaryItem
        label="自动直线距离"
        value={formatNullableDistance(analysis.matching.distanceMeters)}
      />
      <SummaryItem label="车辆数" value={`${traffic.visitCount.toLocaleString('zh-CN')} 辆次`} />
      <SummaryItem label="去重车辆数" value={`${traffic.uniqueVehicleCount.toLocaleString('zh-CN')} 辆`} />
    </div>
  )
}

function SummaryItem({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium tabular-nums">{value}</p>
        {badge ? <Badge variant="secondary">{badge}</Badge> : null}
      </div>
    </div>
  )
}

function createAnalysisMapData(
  analysis: SiteSelectionRoadSegmentTraffic,
  sitePoint: Position,
  roadPoint: Position,
  roadCoordinates: Position[],
): GeoJSON.FeatureCollection {
  const segmentLengthMeters = Math.round(
    Math.abs((analysis.matchedRoute?.endKm ?? 0) - (analysis.matchedRoute?.startKm ?? 0)) * 1_000,
  )
  const features: GeoJSON.Feature[] = [
    { type: 'Feature', properties: { kind: 'road' }, geometry: { type: 'LineString', coordinates: roadCoordinates } },
    { type: 'Feature', properties: { kind: 'site' }, geometry: { type: 'Point', coordinates: sitePoint } },
    {
      type: 'Feature',
      properties: {
        kind: 'road-segment-label',
        label: `${analysis.traffic.visitCount.toLocaleString('zh-CN')} 辆/日 · ${segmentLengthMeters.toLocaleString('zh-CN')}米`,
      },
      geometry: { type: 'Point', coordinates: lineMidpoint(roadCoordinates) },
    },
  ]
  features.push({
    type: 'Feature',
    properties: {
      kind: 'road-point',
      label: `距离 ${analysis.matchedRoute?.ref ?? '道路'} 主路 ${Math.round(analysis.matching.distanceMeters ?? 0).toLocaleString('zh-CN')} 米`,
    },
    geometry: { type: 'Point', coordinates: roadPoint },
  })
  features.push({
    type: 'Feature',
    properties: { kind: 'distance' },
    geometry: { type: 'LineString', coordinates: [sitePoint, roadPoint] },
  })
  return { type: 'FeatureCollection', features }
}

function lineMidpoint(coordinates: Position[]): Position {
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
    const ratio = segmentLength === 0 ? 0 : (midpointDistance - traversedDistance) / segmentLength
    return [
      start[0] + (end[0] - start[0]) * ratio,
      start[1] + (end[1] - start[1]) * ratio,
    ]
  }
  return coordinates.at(-1)!
}

function fitArterialRoadAnalysis(
  map: maplibregl.Map,
  roadSegment: Position[],
  sitePosition: Position,
  duration = 0,
) {
  const bounds = new maplibregl.LngLatBounds()
  roadSegment.forEach((position) => bounds.extend(position))
  bounds.extend(sitePosition)
  map.fitBounds(bounds, { padding: 72, duration, maxZoom: 16 })
}

function createTrafficGeoJson(
  analysis: SiteSelectionRoadSegmentTraffic,
  measuredDistanceMeters: number,
): ArterialRoadTrafficGeoJson {
  const segment = analysis.segmentGeoJson!
  return {
    type: 'Feature',
    geometry: segment.geometry,
    properties: {
      ...analysis.matchedRoute,
      ...analysis.traffic,
      periodStartDate: analysis.period?.startDate ?? '',
      periodEndDate: analysis.period?.endDate ?? '',
      publishedDayCount: analysis.period?.publishedDayCount ?? 0,
      distanceMeters: measuredDistanceMeters,
      automaticDistanceMeters: analysis.matching.distanceMeters,
      distanceMeasurementMode: 'automatic',
      nearestPoint: analysis.matching.nearestPoint,
      coordinateSystem: analysis.geometryCoordinateSystem,
      roadNetworkVersion: analysis.versions.roadNetworkVersion,
      matchingAlgorithmVersion: analysis.versions.matchingAlgorithmVersion,
      queryCoordinateSystem: analysis.query.coordinateSystem,
      queryLongitude: analysis.query.longitude,
      queryLatitude: analysis.query.latitude,
      searchRadiusMeters: analysis.query.searchRadiusMeters,
    },
  }
}

function routeLabel(analysis: SiteSelectionRoadSegmentTraffic) {
  const route = analysis.matchedRoute
  return [route?.ref, route?.name].filter(Boolean).join(' · ') || '未命名道路'
}

function roadLevelLabel(level?: string) {
  return level === 'national' ? '国道' : level === 'provincial' ? '省道' : ''
}

function formatDistance(distanceMeters: number) {
  return distanceMeters < 1_000
    ? `${Math.round(distanceMeters).toLocaleString('zh-CN')} 米`
    : `${(distanceMeters / 1_000).toFixed(2)} 公里`
}

function formatNullableDistance(distanceMeters: number | null) {
  return distanceMeters === null ? '尚未测距' : formatDistance(distanceMeters)
}

function captureMapScreenshot(map: maplibregl.Map): Promise<File> {
  return new Promise((resolve, reject) => {
    map.getCanvas().toBlob((blob) => {
      if (!blob) {
        reject(new Error('site_distance_snapshot_capture_failed'))
        return
      }
      resolve(new File([blob], 'arterial-road-distance-snapshot.webp', { type: 'image/webp' }))
    }, 'image/webp', 0.9)
  })
}
