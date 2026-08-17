import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { toast } from 'sonner'
import {
  TerraDraw,
  TerraDrawLineStringMode,
  TerraDrawRenderMode,
  type TerraDrawEventListeners,
} from 'terra-draw'
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter'

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

import { calculateGreatCircleDistance } from './site-exploration-geometry'
import {
  siteExplorationErrorMessage,
  uploadSiteExplorationDistanceSnapshot,
  type SiteDistanceGeoJson,
  type SiteExplorationDistanceKind,
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
type DrawingFeatureId = string | number

const measurementSourceId = 'site-exploration-distance-measurement'
const measurementLabelLayerId = 'site-exploration-distance-measurement-label'

export function SiteExplorationDistancePicker({
  title,
  kind,
  longitude,
  latitude,
  initialGeoJson,
  disabled,
  onSelect,
}: {
  title: string
  kind: SiteExplorationDistanceKind
  longitude: number
  latitude: number
  initialGeoJson: SiteDistanceGeoJson | null
  disabled?: boolean
  onSelect: (
    distanceMeters: number,
    geoJson: SiteDistanceGeoJson,
    snapshot: SiteExplorationImage,
  ) => void
}) {
  const mapRef = useRef<maplibregl.Map | null>(null)
  const terraDrawRef = useRef<TerraDraw | null>(null)
  const completedFeatureIdRef = useRef<DrawingFeatureId | null>(null)
  const completedGeoJsonRef = useRef<SiteDistanceGeoJson | null>(null)
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null)
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null)
  const [open, setOpen] = useState(false)
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const token = env.maps.tiandituToken
  const hasConfiguredToken = Boolean(token && token !== 'replace-with-tianditu-token')

  useEffect(() => {
    if (!open || !mapContainer || !hasConfiguredToken) return

    const hasLocation = isValidCoordinate(longitude, latitude)
    const map = new maplibregl.Map({
      container: mapContainer,
      style: createTiandituStyle(token, 'vector'),
      center: hasLocation ? [longitude, latitude] : [113.625368, 34.746599],
      zoom: hasLocation ? 15 : 6,
      attributionControl: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    })
    mapRef.current = map

    if (hasLocation) {
      const markerElement = document.createElement('img')
      markerElement.src = '/map/location-selected.png'
      markerElement.alt = ''
      markerElement.draggable = false
      markerElement.className = 'pointer-events-none block size-9 drop-shadow-md'
      new maplibregl.Marker({ element: markerElement, anchor: 'bottom' })
        .setLngLat([longitude, latitude])
        .addTo(map)
    }

    let terraDraw: TerraDraw | null = null
    let handleFinish: TerraDrawEventListeners['finish'] | null = null
    const resizeObserver = new ResizeObserver(() => map.resize())
    resizeObserver.observe(mapContainer)

    const handleLoad = () => {
      map.resize()
      setMapInstance(map)
      terraDraw = createDistanceDraw(map)
      handleFinish = (featureId, context) => {
        if (!terraDraw || context.action !== 'draw') return
        const feature = terraDraw.getSnapshotFeature(featureId)
        const coordinates = feature?.geometry.type === 'LineString'
          ? toPositions(feature.geometry.coordinates)
          : null
        if (!coordinates || coordinates.length < 2) {
          terraDraw.setMode('linestring')
          return
        }
        completedFeatureIdRef.current = featureId
        completedGeoJsonRef.current = toDistanceGeoJson(coordinates)
        const nextDistance = calculatePathDistance(coordinates)
        setDistanceMeters(nextDistance)
        updateMeasurementLabels(map, coordinates)
        terraDraw.setMode('render')
        map.getCanvas().style.cursor = ''
      }
      terraDraw.on('finish', handleFinish)
      terraDraw.start()
      addMeasurementLabelLayer(map)
      terraDrawRef.current = terraDraw

      if (initialGeoJson) {
        const featureId = terraDraw.getFeatureId()
        const [validation] = terraDraw.addFeatures([{
          ...initialGeoJson,
          id: featureId,
          properties: { ...initialGeoJson.properties, mode: 'linestring' as const },
        }])
        if (!validation?.valid) {
          throw new Error(`invalid_initial_site_distance:${validation?.reason ?? 'unknown'}`)
        }
        completedFeatureIdRef.current = featureId
        completedGeoJsonRef.current = initialGeoJson
        const coordinates = toPositions(initialGeoJson.geometry.coordinates)
        if (!coordinates) throw new Error('invalid_initial_site_distance_coordinates')
        setDistanceMeters(calculatePathDistance(coordinates))
        updateMeasurementLabels(map, coordinates)
        terraDraw.setMode('render')
        fitDistance(map, coordinates)
        map.getCanvas().style.cursor = ''
      } else {
        terraDraw.setMode('linestring')
        map.getCanvas().style.cursor = 'crosshair'
      }
    }

    map.once('load', handleLoad)
    return () => {
      resizeObserver.disconnect()
      if (terraDraw && handleFinish) terraDraw.off('finish', handleFinish)
      terraDraw?.stop()
      terraDrawRef.current = null
      mapRef.current = null
      setMapInstance(null)
      map.remove()
    }
  }, [hasConfiguredToken, initialGeoJson, latitude, longitude, mapContainer, open, token])

  function changeOpen(nextOpen: boolean) {
    if (isSaving && !nextOpen) return
    if (nextOpen) {
      completedFeatureIdRef.current = null
      completedGeoJsonRef.current = null
      setDistanceMeters(null)
    }
    setOpen(nextOpen)
  }

  function redraw() {
    const terraDraw = terraDrawRef.current
    const map = mapRef.current
    if (!terraDraw || !map) return
    const featureId = completedFeatureIdRef.current
    completedFeatureIdRef.current = null
    completedGeoJsonRef.current = null
    setDistanceMeters(null)
    updateMeasurementLabels(map, [])
    terraDraw.setMode('render')
    if (featureId !== null) terraDraw.removeFeatures([featureId])
    terraDraw.setMode('linestring')
    map.getCanvas().style.cursor = 'crosshair'
  }

  async function confirm() {
    const geoJson = completedGeoJsonRef.current
    const map = mapRef.current
    if (distanceMeters === null || !geoJson || !map || isSaving) return

    setIsSaving(true)
    try {
      const screenshot = await captureMapScreenshot(map, kind)
      const snapshot = await uploadSiteExplorationDistanceSnapshot(kind, screenshot)
      onSelect(Math.round(distanceMeters), geoJson, snapshot)
      setOpen(false)
      toast.success('测距结果、路线和地图截图已保存到表单')
    } catch (error) {
      toast.error(
        error instanceof Error && error.message === 'site_distance_snapshot_capture_failed'
          ? '地图截图生成失败，请稍后重试。'
          : siteExplorationErrorMessage(error) ?? '地图截图上传失败，请稍后重试。',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Button type="button" disabled={disabled} onClick={() => changeOpen(true)}>
        <RulerIcon data-icon="inline-start" />
        地图测距
      </Button>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent className={siteExplorationDialogContentClassName}>
          <DialogHeader className={siteExplorationDialogHeaderClassName}>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>在地图上依次点击绘制测距线，双击最后一点或按 Enter 完成。</DialogDescription>
          </DialogHeader>
          <div className={siteExplorationDialogBodyClassName}>
            {hasConfiguredToken ? (
              <div className="relative h-full min-h-0 overflow-hidden rounded-lg border bg-muted">
                <div ref={setMapContainer} className="h-full w-full" />
                <SiteExplorationMapControls
                  map={mapInstance}
                  defaultBaseMap="road"
                  onReset={() => {
                    if (!mapInstance) return
                    const coordinates = initialGeoJson
                      ? toPositions(initialGeoJson.geometry.coordinates)
                      : null
                    if (coordinates) {
                      fitDistance(mapInstance, coordinates, 300)
                      return
                    }
                    const hasLocation = isValidCoordinate(longitude, latitude)
                    mapInstance.easeTo({
                      center: hasLocation ? [longitude, latitude] : [113.625368, 34.746599],
                      zoom: hasLocation ? 15 : 6,
                      duration: 300,
                    })
                  }}
                />
              </div>
            ) : (
              <div className="flex h-full min-h-64 items-center justify-center rounded-lg border bg-muted/30 px-6 text-center text-sm text-destructive">
                天地图服务未配置，暂时无法进行地图测距。
              </div>
            )}
          </div>
          <DialogFooter className={siteExplorationDialogFooterClassName}>
            <p className="text-sm">
              测距结果：<strong className="tabular-nums">{formatDistance(distanceMeters)}</strong>
            </p>
            <div className={siteExplorationDialogActionsClassName}>
              <Button className={siteExplorationDialogActionClassName} type="button" variant="outline" disabled={distanceMeters === null || isSaving} onClick={redraw}>重新测距</Button>
              <Button className={siteExplorationDialogActionClassName} type="button" variant="outline" disabled={isSaving} onClick={() => setOpen(false)}>取消</Button>
              <Button className={siteExplorationDialogActionClassName} type="button" disabled={distanceMeters === null || isSaving} onClick={() => void confirm()}>
                {isSaving ? '正在保存…' : '保存测距结果'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function toDistanceGeoJson(coordinates: Position[]): SiteDistanceGeoJson {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates },
  }
}

function fitDistance(map: maplibregl.Map, positions: readonly Position[], duration = 0) {
  const bounds = new maplibregl.LngLatBounds()
  positions.forEach((position) => bounds.extend(position))
  if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 64, duration, maxZoom: 17 })
}

function createDistanceDraw(map: maplibregl.Map): TerraDraw {
  return new TerraDraw({
    adapter: new TerraDrawMapLibreGLAdapter({
      map,
      prefixId: 'site-exploration-distance-draw',
    }),
    modes: [
      new TerraDrawLineStringMode({
        showCoordinatePoints: true,
        styles: {
          lineStringColor: '#2563eb',
          lineStringWidth: 4,
          closingPointColor: '#ffffff',
          closingPointWidth: 5,
          closingPointOutlineColor: '#2563eb',
          closingPointOutlineWidth: 2,
          coordinatePointColor: '#ffffff',
          coordinatePointWidth: 5,
          coordinatePointOutlineColor: '#2563eb',
          coordinatePointOutlineWidth: 2,
        },
      }),
      new TerraDrawRenderMode({
        modeName: 'render',
        styles: {
          lineStringColor: '#2563eb',
          lineStringWidth: 4,
        },
      }),
    ],
  })
}

function addMeasurementLabelLayer(map: maplibregl.Map) {
  map.addSource(measurementSourceId, {
    type: 'geojson',
    data: emptyFeatureCollection(),
  })
  map.addLayer({
    id: measurementLabelLayerId,
    type: 'symbol',
    source: measurementSourceId,
    layout: {
      'text-field': ['get', 'label'],
      'text-font': ['PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', 'sans-serif'],
      'text-size': 12,
      'text-anchor': 'bottom',
      'text-offset': [0, -0.8],
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

function updateMeasurementLabels(map: maplibregl.Map, positions: readonly Position[]) {
  let cumulativeDistance = 0
  const features: GeoJSON.Feature<GeoJSON.Point>[] = []
  for (let index = 1; index < positions.length; index += 1) {
    const start = positions[index - 1]
    const end = positions[index]
    if (!start || !end) continue
    cumulativeDistance += calculateGreatCircleDistance(start, end)
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: end },
      properties: { label: formatDistance(cumulativeDistance) },
    })
  }
  const source = map.getSource(measurementSourceId) as maplibregl.GeoJSONSource | undefined
  source?.setData({ type: 'FeatureCollection', features })
}

function calculatePathDistance(positions: readonly Position[]): number {
  let distance = 0
  for (let index = 1; index < positions.length; index += 1) {
    const start = positions[index - 1]
    const end = positions[index]
    if (start && end) distance += calculateGreatCircleDistance(start, end)
  }
  return distance
}

function toPositions(coordinates: GeoJSON.Position[]): Position[] | null {
  const positions = coordinates.map((position) => (
    typeof position[0] === 'number'
    && Number.isFinite(position[0])
    && typeof position[1] === 'number'
    && Number.isFinite(position[1])
      ? [position[0], position[1]] as Position
      : null
  ))
  return positions.some((position) => position === null) ? null : positions as Position[]
}

function formatDistance(distanceMeters: number | null): string {
  if (distanceMeters === null) return '尚未测距'
  if (distanceMeters < 1_000) return `约 ${Math.round(distanceMeters)} 米`
  return `约 ${(distanceMeters / 1_000).toFixed(2)} 公里`
}

function emptyFeatureCollection(): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: [] }
}

function isValidCoordinate(longitude: number, latitude: number): boolean {
  return Number.isFinite(longitude)
    && longitude >= -180
    && longitude <= 180
    && Number.isFinite(latitude)
    && latitude >= -90
    && latitude <= 90
    && !(longitude === 0 && latitude === 0)
}

function captureMapScreenshot(
  map: maplibregl.Map,
  kind: SiteExplorationDistanceKind,
): Promise<File> {
  return new Promise((resolve, reject) => {
    map.getCanvas().toBlob((blob) => {
      if (!blob) {
        reject(new Error('site_distance_snapshot_capture_failed'))
        return
      }
      resolve(new File([blob], `${kind}-snapshot.webp`, { type: 'image/webp' }))
    }, 'image/webp', 0.9)
  })
}
