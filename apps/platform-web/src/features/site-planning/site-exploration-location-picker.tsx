import { useEffect, useRef, useState, type ReactNode } from 'react'
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
import { LoaderCircleIcon, MapPinIcon } from '@/components/ui/icons'
import { env } from '@/config/env'
import { TiandituLocationCommand } from '@/features/agent-workspace/tianditu-location-command'
import type { TiandituLocationSearchResult } from '@/features/agent-workspace/tianditu-location-search'
import { createTiandituStyle } from '@/features/agent-workspace/tianditu-map-style'
import {
  reverseGeocodeTiandituLocation,
  tiandituReverseGeocodingErrorMessage,
  type TiandituReverseGeocodingResult,
} from '@/features/agent-workspace/tianditu-reverse-geocoding'
import {
  siteExplorationErrorMessage,
  uploadSiteExplorationLocationSnapshot,
  type SiteExplorationImage,
  type SiteExplorationInput,
} from './site-exploration-api'
import {
  siteExplorationDialogActionClassName,
  siteExplorationDialogActionsClassName,
  siteExplorationDialogBodyClassName,
  siteExplorationDialogContentClassName,
  siteExplorationDialogFooterClassName,
  siteExplorationDialogHeaderClassName,
} from './site-exploration-dialog-layout'
import { SiteExplorationMapControls } from './site-exploration-map-controls'

type SelectedLocation = {
  longitude: number
  latitude: number
  location: TiandituReverseGeocodingResult | null
  displayAddress: string
}

export type SiteExplorationConfirmedLocation = SelectedLocation & { snapshot: SiteExplorationImage }

export function applyConfirmedSiteExplorationLocation(
  input: SiteExplorationInput,
  selected: SiteExplorationConfirmedLocation,
): SiteExplorationInput {
  const next = {
    ...input,
    longitude: selected.longitude,
    latitude: selected.latitude,
    locationSnapshot: selected.snapshot,
  }
  if (!selected.location) return next

  const regionName = selected.location.provinceCity === selected.location.countyDistrict
    ? selected.location.provinceCity
    : `${selected.location.provinceCity}${selected.location.countyDistrict}`

  return {
    ...next,
    locationAddress: selected.location.locationAddress,
    provinceCity: selected.location.provinceCity,
    countyDistrict: selected.location.countyDistrict,
    projectName: input.projectName.trim() || (regionName ? `${regionName}重卡充电站项目` : ''),
  }
}

const locationSnapshotSourceId = 'site-exploration-location-snapshot-point'
const locationSnapshotLayerId = 'site-exploration-location-snapshot-point-layer'
const fastPositionOptions: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 5_000,
  maximumAge: 300_000,
}

export function SiteExplorationLocationPicker({
  longitude,
  latitude,
  locationAddress,
  disabled,
  renderTrigger,
  successMessage = '项目位置和地图截图已保存到表单',
  onSelect,
}: {
  longitude: number
  latitude: number
  locationAddress: string
  disabled?: boolean
  renderTrigger?: (openPicker: () => void) => ReactNode
  successMessage?: string
  onSelect: (location: SiteExplorationConfirmedLocation) => void
}) {
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const reverseAbortRef = useRef<AbortController | null>(null)
  const locationRequestIdRef = useRef(0)
  const selectedCoordinateRef = useRef<[number, number] | null>(null)
  const initialMapViewRef = useRef<{ center: [number, number]; zoom: number }>({
    center: [113.625368, 34.746599],
    zoom: 6,
  })
  const [mapContainer, setMapContainer] = useState<HTMLDivElement | null>(null)
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<SelectedLocation | null>(null)
  const [selectedSearchResultId, setSelectedSearchResultId] = useState<string | null>(null)
  const [isResolving, setIsResolving] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const token = env.maps.tiandituToken
  const hasConfiguredToken = Boolean(token && token !== 'replace-with-tianditu-token')

  useEffect(() => {
    if (!open || !mapContainer || !hasConfiguredToken) return

    const hasCurrentLocation = isValidCoordinate(longitude, latitude)
    initialMapViewRef.current = {
      center: hasCurrentLocation ? [longitude, latitude] : [113.625368, 34.746599],
      zoom: hasCurrentLocation ? 15 : 6,
    }
    const map = new maplibregl.Map({
      container: mapContainer,
      style: createTiandituStyle(token),
      center: initialMapViewRef.current.center,
      zoom: initialMapViewRef.current.zoom,
      attributionControl: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    })
    mapRef.current = map
    map.once('load', () => {
      map.resize()
      addLocationSnapshotMarkerLayer(map)
      setMapInstance(map)
      const selectedCoordinate = selectedCoordinateRef.current
      if (selectedCoordinate) {
        showMarker(...selectedCoordinate)
        map.jumpTo({ center: selectedCoordinate, zoom: 16 })
      } else if (hasCurrentLocation) {
        showMarker(longitude, latitude)
      }
    })

    if (hasCurrentLocation) showMarker(longitude, latitude)

    const handleClick = (event: maplibregl.MapMouseEvent) => {
      void selectCoordinate(event.lngLat.lng, event.lngLat.lat)
    }
    map.on('click', handleClick)
    return () => {
      reverseAbortRef.current?.abort()
      map.off('click', handleClick)
      markerRef.current?.remove()
      markerRef.current = null
      mapRef.current = null
      setMapInstance(null)
      map.remove()
    }
  }, [hasConfiguredToken, latitude, longitude, mapContainer, open, token])

  function showMarker(nextLongitude: number, nextLatitude: number) {
    const map = mapRef.current
    if (!map) return
    markerRef.current?.remove()
    markerRef.current = new maplibregl.Marker({ color: '#1956e8' })
      .setLngLat([nextLongitude, nextLatitude])
      .addTo(map)
    const source = map.getSource(locationSnapshotSourceId) as maplibregl.GeoJSONSource | undefined
    source?.setData({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [nextLongitude, nextLatitude] },
    })
  }

  async function selectCoordinate(
    rawLongitude: number,
    rawLatitude: number,
    fallbackAddress = '',
    searchResultId: string | null = null,
  ) {
    const nextLongitude = roundCoordinate(rawLongitude)
    const nextLatitude = roundCoordinate(rawLatitude)
    selectedCoordinateRef.current = [nextLongitude, nextLatitude]
    showMarker(nextLongitude, nextLatitude)
    setSelectedSearchResultId(searchResultId)

    reverseAbortRef.current?.abort()
    const controller = new AbortController()
    reverseAbortRef.current = controller
    setSelected({
      longitude: nextLongitude,
      latitude: nextLatitude,
      location: null,
      displayAddress: fallbackAddress || '正在解析位置…',
    })
    setError(null)
    setIsResolving(true)
    try {
      const location = await reverseGeocodeTiandituLocation({
        longitude: nextLongitude,
        latitude: nextLatitude,
        token,
        signal: controller.signal,
      })
      if (reverseAbortRef.current !== controller) return
      setSelected({
        longitude: nextLongitude,
        latitude: nextLatitude,
        location,
        displayAddress: location.locationAddress,
      })
    } catch (resolveError) {
      if (reverseAbortRef.current !== controller) return
      setSelected({
        longitude: nextLongitude,
        latitude: nextLatitude,
        location: null,
        displayAddress: fallbackAddress || '位置解析失败，请确认坐标后在表单中手动填写地址。',
      })
      setError(tiandituReverseGeocodingErrorMessage(resolveError))
    } finally {
      if (reverseAbortRef.current === controller) {
        reverseAbortRef.current = null
        setIsResolving(false)
      }
    }
  }

  function chooseSearchResult(result: TiandituLocationSearchResult) {
    mapRef.current?.flyTo({
      center: [result.longitude, result.latitude],
      zoom: 16,
      duration: 500,
      essential: true,
    })
    void selectCoordinate(
      result.longitude,
      result.latitude,
      result.address ? `${result.name} · ${result.address}` : result.name,
      result.id,
    )
  }

  function changeOpen(nextOpen: boolean) {
    if (isSaving && !nextOpen) return
    setOpen(nextOpen)
    if (!nextOpen) {
      locationRequestIdRef.current += 1
      return
    }
    const hasCurrentLocation = isValidCoordinate(longitude, latitude)
    selectedCoordinateRef.current = hasCurrentLocation ? [longitude, latitude] : null
    setSelected(hasCurrentLocation ? {
      longitude,
      latitude,
      location: null,
      displayAddress: locationAddress || '当前表单位置',
    } : null)
    setSelectedSearchResultId(null)
    setError(null)
    if (hasCurrentLocation && hasConfiguredToken) {
      void selectCoordinate(longitude, latitude, locationAddress)
    } else if (hasConfiguredToken) {
      locateCurrentPosition()
    }
  }

  function locateCurrentPosition() {
    if (!navigator.geolocation) {
      setError('当前浏览器不支持定位，请在地图上手动选择。')
      return
    }
    const requestId = locationRequestIdRef.current + 1
    locationRequestIdRef.current = requestId
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (locationRequestIdRef.current !== requestId) return
        const nextLongitude = position.coords.longitude
        const nextLatitude = position.coords.latitude
        const map = mapRef.current
        if (map?.loaded()) {
          map.flyTo({
            center: [nextLongitude, nextLatitude],
            zoom: 16,
            duration: 300,
            essential: true,
          })
        }
        void selectCoordinate(nextLongitude, nextLatitude, '当前位置')
      },
      (positionError) => {
        if (locationRequestIdRef.current !== requestId) return
        setError(geolocationErrorMessage(positionError))
      },
      fastPositionOptions,
    )
  }

  async function confirm() {
    const map = mapRef.current
    if (!selected?.location || !map || isResolving || isSaving) return
    setIsSaving(true)
    try {
      const screenshot = await captureLocationScreenshot(map)
      const snapshot = await uploadSiteExplorationLocationSnapshot(screenshot)
      onSelect({ ...selected, snapshot })
      setOpen(false)
      toast.success(successMessage)
    } catch (saveError) {
      toast.error(
        saveError instanceof Error && saveError.message === 'site_location_snapshot_capture_failed'
          ? '位置地图截图生成失败，请稍后重试。'
          : siteExplorationErrorMessage(saveError) ?? '位置地图截图上传失败，请稍后重试。',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      {renderTrigger
        ? renderTrigger(() => changeOpen(true))
        : (
          <Button type="button" disabled={disabled} onClick={() => changeOpen(true)}>
            <MapPinIcon data-icon="inline-start" aria-hidden="true" />
            {isValidCoordinate(longitude, latitude) ? '重新选择' : '选择位置'}
          </Button>
        )}
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent className={siteExplorationDialogContentClassName}>
          <DialogHeader className={siteExplorationDialogHeaderClassName}>
            <DialogTitle>选择项目地理位置</DialogTitle>
            <DialogDescription>搜索地点、使用当前位置，或在地图上点击重新选择，确认后回填地址和经纬度。</DialogDescription>
          </DialogHeader>
          <div className="relative min-w-0 shrink-0 px-4 pb-3 sm:px-5">
            <TiandituLocationCommand
              token={token}
              selectedResultId={selectedSearchResultId}
              formClassName="min-w-0 w-full"
              overlayResults
              closeOnSelect
              listClassName="max-h-72"
              onSelect={chooseSearchResult}
            />
          </div>
          <div className={siteExplorationDialogBodyClassName}>
            {hasConfiguredToken ? (
              <div className="relative h-full min-h-0 overflow-hidden rounded-lg border bg-muted">
                <div ref={setMapContainer} className="h-full w-full" />
                <SiteExplorationMapControls
                  map={mapInstance}
                  defaultBaseMap="road"
                  onReset={() => mapInstance?.easeTo({
                    center: initialMapViewRef.current.center,
                    zoom: initialMapViewRef.current.zoom,
                    duration: 300,
                  })}
                />
              </div>
            ) : (
              <div className="flex h-full min-h-64 items-center justify-center rounded-lg border bg-muted/30 px-6 text-center text-sm text-destructive">
                天地图服务未配置，暂时无法选择地图位置。
              </div>
            )}
          </div>
          <DialogFooter className={siteExplorationDialogFooterClassName}>
            <div className="min-w-0 text-sm sm:flex-1">
              <p className="break-words font-medium sm:truncate">
                地址：{selected?.displayAddress || '尚未选择位置'}
              </p>
              <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                {selected
                  ? `${selected.longitude.toFixed(6)}, ${selected.latitude.toFixed(6)}`
                  : '可搜索地点，或直接点击地图重新选择位置。'}
              </p>
              {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
            </div>
            <div className={siteExplorationDialogActionsClassName}>
              <Button className={siteExplorationDialogActionClassName} type="button" variant="outline" disabled={isSaving} onClick={() => changeOpen(false)}>
                取消
              </Button>
              <Button className={siteExplorationDialogActionClassName} type="button" disabled={!selected?.location || isResolving || isSaving} onClick={() => void confirm()}>
                {isResolving || isSaving ? <LoaderCircleIcon className="animate-spin" aria-hidden="true" /> : null}
                {isSaving ? '正在保存…' : '确认'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
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

function roundCoordinate(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000
}

function geolocationErrorMessage(error: GeolocationPositionError): string {
  return error.code === error.PERMISSION_DENIED
    ? '位置权限未开启，请允许浏览器访问当前位置。'
    : '当前位置获取失败，请在地图上手动选择。'
}

function addLocationSnapshotMarkerLayer(map: maplibregl.Map) {
  map.addSource(locationSnapshotSourceId, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })
  map.addLayer({
    id: locationSnapshotLayerId,
    type: 'circle',
    source: locationSnapshotSourceId,
    paint: {
      'circle-radius': 9,
      'circle-color': '#1956e8',
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 3,
    },
  })
}

function captureLocationScreenshot(map: maplibregl.Map): Promise<File> {
  return new Promise((resolve, reject) => {
    map.getCanvas().toBlob((blob) => {
      if (!blob) {
        reject(new Error('site_location_snapshot_capture_failed'))
        return
      }
      resolve(new File([blob], 'site-location-snapshot.webp', { type: 'image/webp' }))
    }, 'image/webp', 0.9)
  })
}
