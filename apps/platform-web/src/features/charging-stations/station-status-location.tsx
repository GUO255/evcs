import { useEffect, useMemo, useState } from 'react'
import { MapPinIcon, PencilIcon } from '@/components/ui/icons'

import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { StationStatusBadge } from './station-data-table'
import { stationStatusOptions, type ChargingStation, type StationStatus } from './station-data'

export function StationOperatingStatus({ station, onStatusChange }: { station: ChargingStation; onStatusChange: (status: StationStatus) => void }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<StationStatus>(station.status)

  useEffect(() => {
    if (open) setStatus(station.status)
  }, [open, station.status])

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>运营状态</CardTitle>
          <CardDescription>查看并维护当前充电站的运营状态。</CardDescription>
          <CardAction>
            <Button variant="outline" onClick={() => setOpen(true)}><PencilIcon data-icon="inline-start" />修改状态</Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <DetailItem label="当前状态" value={<StationStatusBadge status={station.status} />} />
            <DetailItem label="场站名称" value={station.name} />
            <DetailItem label="场站编号" value={station.code} />
            <DetailItem label="运营主体" value={station.operatorName} />
          </dl>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>修改运营状态</DialogTitle>
            <DialogDescription>选择当前充电站的最新运营状态并保存。</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="station-operating-status">运营状态</FieldLabel>
            <Select items={stationStatusOptions} value={status} onValueChange={(value) => setStatus(value as StationStatus)}>
              <SelectTrigger id="station-operating-status" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup>{stationStatusOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectGroup></SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>取消</Button>
            <Button onClick={() => {
              onStatusChange(status)
              setOpen(false)
            }}>保存修改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function StationLocation({ station }: { station: ChargingStation }) {
  const mapUrl = useMemo(() => buildOpenStreetMapEmbedUrl(station.latitude, station.longitude), [station.latitude, station.longitude])
  const address = `${station.province}${station.city}${station.district}${station.address}`

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MapPinIcon className="size-5 text-primary" aria-hidden="true" />
          <CardTitle>场站位置</CardTitle>
        </div>
        <CardDescription>{address}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <iframe
          className="h-[28rem] w-full rounded-lg border"
          src={mapUrl}
          title={`${station.name}地图位置`}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
        <dl className="grid gap-4 sm:grid-cols-3">
          <DetailItem label="详细地址" value={address} />
          <DetailItem label="经度" value={station.longitude} />
          <DetailItem label="纬度" value={station.latitude} />
        </dl>
      </CardContent>
    </Card>
  )
}

function buildOpenStreetMapEmbedUrl(latitude: number, longitude: number): string {
  const longitudeSpan = 0.012
  const latitudeSpan = 0.007
  const bbox = [longitude - longitudeSpan, latitude - latitudeSpan, longitude + longitudeSpan, latitude + latitudeSpan].join(',')
  const parameters = new URLSearchParams({ bbox, layer: 'mapnik', marker: `${latitude},${longitude}` })
  return `https://www.openstreetmap.org/export/embed.html?${parameters.toString()}`
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex flex-col gap-1"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-medium">{value}</dd></div>
}
