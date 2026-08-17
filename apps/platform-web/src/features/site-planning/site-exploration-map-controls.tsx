import { useEffect, useState } from 'react'
import maplibregl from 'maplibre-gl'

import { Button } from '@/components/ui/button'
import { LocateFixedIcon } from '@/components/ui/icons'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

type BaseMapType = 'road' | 'satellite'

const roadBaseLayerIds = ['tianditu-vector', 'tianditu-vector-labels'] as const
const satelliteBaseLayerIds = ['tianditu-satellite', 'tianditu-satellite-labels'] as const

export function SiteExplorationMapBaseLayerToggle({
  map,
  defaultBaseMap = 'satellite',
}: {
  map: maplibregl.Map | null
  defaultBaseMap?: BaseMapType
}) {
  const [baseMapType, setBaseMapType] = useState<BaseMapType>(defaultBaseMap)

  useEffect(() => {
    if (!map) return
    setLayerGroupVisibility(map, roadBaseLayerIds, baseMapType === 'road')
    setLayerGroupVisibility(map, satelliteBaseLayerIds, baseMapType === 'satellite')
  }, [baseMapType, map])

  return (
    <div
      className="absolute left-3 top-3 z-10 rounded-lg border bg-card/95 p-1 shadow-sm backdrop-blur"
      onPointerDown={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <ToggleGroup
        value={[baseMapType]}
        variant="default"
        size="sm"
        spacing={0}
        aria-label="切换测绘地图底图"
        onValueChange={(next) => {
          const selected = next[0]
          if (selected === 'road' || selected === 'satellite') setBaseMapType(selected)
        }}
      >
        <ToggleGroupItem value="road" aria-label="公路地图">公路</ToggleGroupItem>
        <ToggleGroupItem value="satellite" aria-label="卫星图">卫星</ToggleGroupItem>
      </ToggleGroup>
    </div>
  )
}

export function SiteExplorationMapControls({
  map,
  defaultBaseMap = 'satellite',
  onReset,
}: {
  map: maplibregl.Map | null
  defaultBaseMap?: BaseMapType
  onReset: () => void
}) {
  return (
    <>
      <SiteExplorationMapBaseLayerToggle map={map} defaultBaseMap={defaultBaseMap} />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="absolute right-3 top-3 z-10 rounded-lg bg-card/95 shadow-sm backdrop-blur"
        disabled={!map}
        aria-label="回到地图初始视图"
        title="回到初始视图"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={onReset}
      >
        <LocateFixedIcon aria-hidden="true" />
      </Button>
    </>
  )
}

function setLayerGroupVisibility(
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
