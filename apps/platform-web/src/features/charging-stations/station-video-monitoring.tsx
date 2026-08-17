import { useMemo, useState } from 'react'
import { CameraIcon, Clock3Icon, MapPinIcon, VideoOffIcon } from '@/components/ui/icons'

import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import type { ChargingStation, StationCamera } from './station-data'

export function StationVideoMonitoring({ station }: { station: ChargingStation }) {
  const [zone, setZone] = useState('all')
  const zoneOptions = useMemo(() => [
    { value: 'all', label: '全部区域' },
    ...Array.from(new Set(station.cameras.map((camera) => camera.zone))).map((value) => ({
      value,
      label: value,
    })),
  ], [station.cameras])
  const cameras = zone === 'all'
    ? station.cameras
    : station.cameras.filter((camera) => camera.zone === zone)
  const onlineCount = station.cameras.filter((camera) => camera.status === 'online').length

  if (station.cameras.length === 0) {
    return (
      <Empty className="min-h-72 border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><CameraIcon /></EmptyMedia>
          <EmptyTitle>暂无视频监控</EmptyTitle>
          <EmptyDescription>该充电站尚未接入视频监控设备。</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>视频监控</CardTitle>
        <CardDescription>
          共 {station.cameras.length} 路，{onlineCount} 路在线，{station.cameras.length - onlineCount} 路离线
        </CardDescription>
        <CardAction>
          <Select items={zoneOptions} value={zone} onValueChange={(value) => setZone(value ?? 'all')}>
            <SelectTrigger className="w-36" aria-label="按监控区域筛选">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {zoneOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cameras.map((camera) => <CameraFeedCard key={camera.id} camera={camera} />)}
        </div>
      </CardContent>
    </Card>
  )
}

function CameraFeedCard({ camera }: { camera: StationCamera }) {
  const online = camera.status === 'online'

  return (
    <Card size="sm">
      <div className="relative aspect-video overflow-hidden bg-muted">
        <img
          className={cn('size-full object-cover', !online && 'opacity-40 grayscale')}
          src={camera.snapshot}
          alt={`${camera.name}监控画面`}
          loading="lazy"
        />
        {!online ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <VideoOffIcon className="size-8" aria-hidden="true" />
            <span className="text-sm font-medium">画面已断开</span>
          </div>
        ) : null}
      </div>
      <CardHeader>
        <CardTitle>{camera.name}</CardTitle>
        <CardDescription>{camera.code}</CardDescription>
        <CardAction>
          <Badge variant={online ? 'default' : 'destructive'}>{online ? '在线' : '离线'}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPinIcon className="size-4 shrink-0" aria-hidden="true" />
            <dt className="sr-only">安装位置</dt>
            <dd>{camera.location}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Clock3Icon className="size-4 shrink-0" aria-hidden="true" />
            <dt className="sr-only">最近画面时间</dt>
            <dd>{camera.lastSeen}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
