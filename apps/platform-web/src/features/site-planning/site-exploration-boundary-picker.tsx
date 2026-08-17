import { useEffect, useRef, useState } from 'react'
import { centerOfMass } from '@turf/center-of-mass'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { toast } from 'sonner'
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawRenderMode,
  TerraDrawSelectMode,
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
import { VectorSquareIcon } from '@/components/ui/icons'
import { env } from '@/config/env'
import { createTiandituStyle } from '@/features/agent-workspace/tianditu-map-style'
import { cn } from '@/lib/utils'

import {
  siteExplorationErrorMessage,
  uploadSiteExplorationBoundarySnapshot,
  type SiteBoundaryGeoJson,
  type SiteExplorationImage,
} from './site-exploration-api'
import {
  calculatePolygonAreaSquareMeters,
  calculateGreatCircleDistance,
  calculatePolygonPerimeterMeters,
} from './site-exploration-geometry'
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

type BoundaryMeasurement = {
  areaSquareMeters: number
  perimeterMeters: number
  vertexCount: number
}

const boundaryMeasurementSourceId = 'site-exploration-boundary-measurement'
const boundaryCenterLabelLayerId = 'site-exploration-boundary-center-label'
const boundaryEdgeLabelLayerId = 'site-exploration-boundary-edge-label'

export function SiteExplorationBoundaryPicker({
  longitude,
  latitude,
  initialBoundary,
  disabled,
  onSelect,
}: {
  longitude: number
  latitude: number
  initialBoundary: SiteBoundaryGeoJson | null
  disabled?: boolean
  onSelect: (
    boundary: SiteBoundaryGeoJson,
    areaSquareMeters: number,
    snapshot: SiteExplorationImage,
  ) => void
}) {
  const mapRef = useRef<maplibregl.Map | null>(null)
  const terraDrawRef = useRef<TerraDraw | null>(null)
  const locationMarkerRef = useRef<maplibregl.Marker | null>(null)
  const completedFeatureIdRef = useRef<DrawingFeatureId | null>(null)
  const completedBoundaryRef = useRef<SiteBoundaryGeoJson | null>(null)
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null)
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null)
  const [open, setOpen] = useState(false)
  const [measurement, setMeasurement] = useState<BoundaryMeasurement | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const token = env.maps.tiandituToken
  const hasConfiguredToken = Boolean(token && token !== 'replace-with-tianditu-token')

  useEffect(() => {
    if (!open || !mapContainer || !hasConfiguredToken) return

    const hasLocation = isValidCoordinate(longitude, latitude)
    const map = new maplibregl.Map({
      container: mapContainer,
      style: createTiandituStyle(token, 'satellite'),
      center: hasLocation ? [longitude, latitude] : [113.625368, 34.746599],
      zoom: hasLocation ? 17 : 6,
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
      locationMarkerRef.current = new maplibregl.Marker({ element: markerElement, anchor: 'bottom' })
        .setLngLat([longitude, latitude])
        .addTo(map)
    }

    let terraDraw: TerraDraw | null = null
    let handleFinish: TerraDrawEventListeners['finish'] | null = null
    let handleChange: TerraDrawEventListeners['change'] | null = null
    const resizeObserver = new ResizeObserver(() => map.resize())
    resizeObserver.observe(mapContainer)

    const handleLoad = () => {
      map.resize()
      setMapInstance(map)
      terraDraw = createBoundaryDraw(map)

      const updateBoundary = (featureId: DrawingFeatureId) => {
        if (!terraDraw) return false
        const feature = terraDraw.getSnapshotFeature(featureId)
        const boundary = feature?.geometry.type === 'Polygon'
          ? toBoundary(feature.geometry.coordinates)
          : null
        if (!boundary) return false

        completedBoundaryRef.current = boundary
        const nextMeasurement = createBoundaryMeasurement(boundary)
        setMeasurement(nextMeasurement)
        showBoundaryMeasurement(map, boundary, nextMeasurement)
        return true
      }

      handleFinish = (featureId, context) => {
        if (!terraDraw) return
        if (!updateBoundary(featureId)) {
          terraDraw.setMode('polygon')
          return
        }
        if (context.action === 'draw') {
          completedFeatureIdRef.current = featureId
          terraDraw.setMode('select')
          terraDraw.selectFeature(featureId)
          map.getCanvas().style.cursor = 'pointer'
        }
      }
      handleChange = (featureIds, changeType) => {
        const completedFeatureId = completedFeatureIdRef.current
        if (completedFeatureId === null || !featureIds.includes(completedFeatureId)) return
        if (changeType === 'delete') {
          completedFeatureIdRef.current = null
          completedBoundaryRef.current = null
          setMeasurement(null)
          clearBoundaryMeasurement(map)
          return
        }
        if (!updateBoundary(completedFeatureId)) {
          completedBoundaryRef.current = null
          setMeasurement(null)
          clearBoundaryMeasurement(map)
        }
      }
      terraDraw.on('finish', handleFinish)
      terraDraw.on('change', handleChange)
      terraDraw.start()
      addBoundaryMeasurementLayers(map)
      terraDrawRef.current = terraDraw

      if (initialBoundary) {
        const featureId = terraDraw.getFeatureId()
        const [validation] = terraDraw.addFeatures([{
          ...initialBoundary,
          id: featureId,
          properties: {
            ...initialBoundary.properties,
            mode: 'polygon' as const,
          },
        }])
        if (!validation?.valid) {
          throw new Error(`invalid_initial_site_boundary:${validation?.reason ?? 'unknown'}`)
        }

        completedFeatureIdRef.current = featureId
        completedBoundaryRef.current = initialBoundary
        const initialMeasurement = createBoundaryMeasurement(initialBoundary)
        setMeasurement(initialMeasurement)
        showBoundaryMeasurement(map, initialBoundary, initialMeasurement)
        terraDraw.setMode('select')
        terraDraw.selectFeature(featureId)
        fitBoundary(map, initialBoundary)
        map.getCanvas().style.cursor = 'pointer'
      } else {
        terraDraw.setMode('polygon')
        map.getCanvas().style.cursor = 'crosshair'
      }
    }

    map.once('load', handleLoad)
    return () => {
      resizeObserver.disconnect()
      if (terraDraw && handleFinish) terraDraw.off('finish', handleFinish)
      if (terraDraw && handleChange) terraDraw.off('change', handleChange)
      terraDraw?.stop()
      terraDrawRef.current = null
      locationMarkerRef.current?.remove()
      locationMarkerRef.current = null
      mapRef.current = null
      setMapInstance(null)
      map.remove()
    }
  }, [hasConfiguredToken, initialBoundary, latitude, longitude, mapContainer, open, token])

  function changeOpen(nextOpen: boolean) {
    if (isSaving && !nextOpen) return
    if (nextOpen) resetBoundaryState()
    setOpen(nextOpen)
  }

  function resetBoundaryState() {
    completedFeatureIdRef.current = null
    completedBoundaryRef.current = null
    setMeasurement(null)
  }

  function closeDrawing() {
    if (isSaving) return
    const terraDraw = terraDrawRef.current
    const map = mapRef.current
    terraDraw?.setMode('render')
    if (map) map.getCanvas().style.cursor = ''
    setOpen(false)
  }

  function redrawBoundary() {
    if (isSaving) return
    const terraDraw = terraDrawRef.current
    const map = mapRef.current
    if (!terraDraw || !map) return

    const completedFeatureId = completedFeatureIdRef.current
    completedFeatureIdRef.current = null
    completedBoundaryRef.current = null
    setMeasurement(null)
    clearBoundaryMeasurement(map)
    terraDraw.setMode('render')
    if (completedFeatureId !== null) terraDraw.removeFeatures([completedFeatureId])
    terraDraw.setMode('polygon')
    map.getCanvas().style.cursor = 'crosshair'
  }

  async function confirm() {
    const boundary = completedBoundaryRef.current
    const map = mapRef.current
    if (!boundary || !map || isSaving) return

    setIsSaving(true)
    try {
      const screenshot = await captureMapScreenshot(map)
      const snapshot = await uploadSiteExplorationBoundarySnapshot(screenshot)
      onSelect(
        boundary,
        calculatePolygonAreaSquareMeters(boundary.geometry.coordinates),
        snapshot,
      )
      setOpen(false)
      toast.success('测绘结果和地图截图已保存到表单')
    } catch (error) {
      toast.error(
        error instanceof Error && error.message === 'site_boundary_snapshot_capture_failed'
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
        <VectorSquareIcon aria-hidden="true" />
        卫星测绘
      </Button>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent className={siteExplorationDialogContentClassName}>
          <DialogHeader className={siteExplorationDialogHeaderClassName}>
            <DialogTitle>卫星测绘场站边界</DialogTitle>
            <DialogDescription>
              依次点击添加场站边界点，点击起点或按 Enter 完成；完成后可拖动顶点和边中点调整边界。
            </DialogDescription>
          </DialogHeader>
          <div className={siteExplorationDialogBodyClassName}>
            {hasConfiguredToken ? (
              <div className="relative h-full min-h-0 overflow-hidden rounded-lg border bg-muted">
                <div ref={setMapContainer} className="h-full w-full" />
                <SiteExplorationMapControls
                  map={mapInstance}
                  onReset={() => {
                    if (!mapInstance) return
                    if (initialBoundary) {
                      fitBoundary(mapInstance, initialBoundary, 300)
                      return
                    }
                    const hasLocation = isValidCoordinate(longitude, latitude)
                    mapInstance.easeTo({
                      center: hasLocation ? [longitude, latitude] : [113.625368, 34.746599],
                      zoom: hasLocation ? 17 : 6,
                      duration: 300,
                    })
                  }}
                />
              </div>
            ) : (
              <div className="flex h-full min-h-64 items-center justify-center rounded-lg border bg-muted/30 px-6 text-center text-sm text-destructive">
                天地图服务未配置，暂时无法进行卫星测绘。
              </div>
            )}
          </div>
          <DialogFooter className={siteExplorationDialogFooterClassName}>
            <div className="flex min-h-8 flex-wrap items-center gap-x-5 gap-y-1 text-sm" aria-live="polite">
              {measurement ? (
                <>
                  <span>边界点：<strong className="tabular-nums">{measurement.vertexCount} 个</strong></span>
                  <span>面积：<strong className="tabular-nums">{formatArea(measurement.areaSquareMeters)}</strong></span>
                  <span>周长：<strong className="tabular-nums">{formatDistance(measurement.perimeterMeters)}</strong></span>
                </>
              ) : (
                <span className="text-muted-foreground">请在地图上绘制场站边界</span>
              )}
            </div>
            <div className={siteExplorationDialogActionsClassName}>
              <Button className={cn(siteExplorationDialogActionClassName, 'order-3 sm:order-none')} type="button" variant="outline" disabled={!measurement || isSaving} onClick={redrawBoundary}>
                重绘
              </Button>
              <Button className={cn(siteExplorationDialogActionClassName, 'order-1 sm:order-none')} type="button" variant="outline" disabled={isSaving} onClick={closeDrawing}>取消</Button>
              <Button className={cn(siteExplorationDialogActionClassName, 'order-2 sm:order-none')} type="button" disabled={!measurement || isSaving} onClick={() => void confirm()}>
                {isSaving ? '正在上传截图…' : '保存测绘结果'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function createBoundaryDraw(map: maplibregl.Map): TerraDraw {
  const previewColor = '#2563eb' as const
  const previewFillColor = '#93c5fd' as const
  const editingColor = '#f97316' as const
  const editingFillColor = '#fdba74' as const

  return new TerraDraw({
    adapter: new TerraDrawMapLibreGLAdapter({
      map,
      prefixId: 'site-exploration-boundary-draw',
    }),
    modes: [
      new TerraDrawPolygonMode({
        editable: true,
        showCoordinatePoints: true,
        styles: {
          fillColor: ({ properties }) => properties.currentlyDrawing
            ? editingFillColor
            : previewFillColor,
          fillOpacity: ({ properties }) => properties.currentlyDrawing ? 0.35 : 0.28,
          outlineColor: ({ properties }) => properties.currentlyDrawing
            ? editingColor
            : previewColor,
          outlineWidth: ({ properties }) => properties.currentlyDrawing ? 5 : 3,
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
        allowManualSelection: false,
        allowManualDeselection: false,
        flags: {
          polygon: {
            feature: {
              draggable: false,
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
          selectedPolygonColor: editingFillColor,
          selectedPolygonFillOpacity: 0.35,
          selectedPolygonOutlineColor: editingColor,
          selectedPolygonOutlineWidth: 4,
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
          polygonFillColor: previewFillColor,
          polygonFillOpacity: 0.28,
          polygonOutlineColor: previewColor,
          polygonOutlineWidth: 3,
        },
      }),
    ],
  })
}

function addBoundaryMeasurementLayers(map: maplibregl.Map) {
  map.addSource(boundaryMeasurementSourceId, {
    type: 'geojson',
    data: emptyFeatureCollection(),
  })
  map.addLayer({
    id: boundaryEdgeLabelLayerId,
    type: 'symbol',
    source: boundaryMeasurementSourceId,
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
      'text-color': '#111827',
      'text-halo-color': '#ffffff',
      'text-halo-width': 2,
    },
  })
  map.addLayer({
    id: boundaryCenterLabelLayerId,
    type: 'symbol',
    source: boundaryMeasurementSourceId,
    filter: ['==', ['get', 'labelKind'], 'center'],
    layout: {
      'text-field': ['get', 'label'],
      'text-font': [
        'PingFang SC',
        'Microsoft YaHei',
        'Noto Sans CJK SC',
        'sans-serif',
      ],
      'text-size': 14,
      'text-line-height': 1.25,
      'text-anchor': 'top',
      'text-offset': [0, 1],
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    },
    paint: {
      'text-color': '#111827',
      'text-halo-color': '#ffffff',
      'text-halo-width': 2.5,
    },
  })
}

function showBoundaryMeasurement(
  map: maplibregl.Map,
  boundary: SiteBoundaryGeoJson,
  measurement: BoundaryMeasurement,
) {
  const [longitude, latitude] = centerOfMass(boundary as never).geometry.coordinates
  if (
    typeof longitude !== 'number'
    || !Number.isFinite(longitude)
    || typeof latitude !== 'number'
    || !Number.isFinite(latitude)
  ) return

  const features: GeoJSON.Feature<GeoJSON.Point>[] = [{
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [longitude, latitude] },
    properties: {
      labelKind: 'center',
      label: `${formatArea(measurement.areaSquareMeters)}\n周长 ${formatDistance(measurement.perimeterMeters)}`,
      rotation: 0,
    },
  }]

  boundary.geometry.coordinates.forEach((ring) => {
    for (let positionIndex = 1; positionIndex < ring.length; positionIndex += 1) {
      const start = ring[positionIndex - 1]
      const end = ring[positionIndex]
      if (!start || !end) continue
      const startPosition: Position = [start[0], start[1]]
      const endPosition: Position = [end[0], end[1]]
      const distanceMeters = calculateGreatCircleDistance(startPosition, endPosition)
      if (distanceMeters <= 0) continue
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [
            (start[0] + end[0]) / 2,
            (start[1] + end[1]) / 2,
          ],
        },
        properties: {
          labelKind: 'edge',
          label: formatDistance(distanceMeters),
          rotation: calculateEdgeLabelRotation(startPosition, endPosition),
        },
      })
    }
  })

  getBoundaryMeasurementSource(map)?.setData({
    type: 'FeatureCollection',
    features,
  })
}

function createBoundaryMeasurement(boundary: SiteBoundaryGeoJson): BoundaryMeasurement {
  const outerRing = boundary.geometry.coordinates[0] ?? []
  const hasClosingCoordinate = outerRing.length > 1
    && outerRing[0]?.[0] === outerRing.at(-1)?.[0]
    && outerRing[0]?.[1] === outerRing.at(-1)?.[1]
  return {
    areaSquareMeters: calculatePolygonAreaSquareMeters(boundary.geometry.coordinates),
    perimeterMeters: calculatePolygonPerimeterMeters(boundary.geometry.coordinates),
    vertexCount: Math.max(0, outerRing.length - (hasClosingCoordinate ? 1 : 0)),
  }
}

function fitBoundary(map: maplibregl.Map, boundary: SiteBoundaryGeoJson, duration = 0) {
  const bounds = new maplibregl.LngLatBounds()
  boundary.geometry.coordinates.forEach((ring) => {
    ring.forEach(([longitude, latitude]) => bounds.extend([longitude, latitude]))
  })
  if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 64, duration })
}

function calculateEdgeLabelRotation(start: Position, end: Position): number {
  let rotation = -Math.atan2(end[1] - start[1], end[0] - start[0]) * 180 / Math.PI
  if (rotation > 90) rotation -= 180
  if (rotation < -90) rotation += 180
  return rotation
}

function clearBoundaryMeasurement(map: maplibregl.Map) {
  getBoundaryMeasurementSource(map)?.setData(emptyFeatureCollection())
}

function getBoundaryMeasurementSource(map: maplibregl.Map) {
  return map.getSource(boundaryMeasurementSourceId) as maplibregl.GeoJSONSource | undefined
}

function emptyFeatureCollection(): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: [] }
}

function toBoundary(coordinates: GeoJSON.Position[][]): SiteBoundaryGeoJson | null {
  const ring = coordinates[0]?.map((position) => {
    const longitude = position[0]
    const latitude = position[1]
    return typeof longitude === 'number'
      && Number.isFinite(longitude)
      && typeof latitude === 'number'
      && Number.isFinite(latitude)
      ? [longitude, latitude] as Position
      : null
  })
  if (!ring || ring.length < 4 || ring.some((position) => position === null)) return null
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [ring as Position[]],
    },
  }
}

function formatArea(squareMeters: number): string {
  if (squareMeters <= 0) return '—'
  const mu = squareMeters * 3 / 2_000
  return `${mu.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 亩`
}

function formatDistance(meters: number): string {
  if (meters < 1_000) {
    return `${meters.toLocaleString('zh-CN', { maximumFractionDigits: 2 })} 米`
  }
  return `${(meters / 1_000).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} 公里`
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

function captureMapScreenshot(map: maplibregl.Map): Promise<File> {
  return new Promise((resolve, reject) => {
    map.getCanvas().toBlob((blob) => {
      if (!blob) {
        reject(new Error('site_boundary_snapshot_capture_failed'))
        return
      }
      resolve(new File([blob], 'site-boundary-snapshot.webp', { type: 'image/webp' }))
    }, 'image/webp', 0.9)
  })
}
