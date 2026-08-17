import { useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeftIcon,
  ActivityIcon,
  Building2Icon,
  CameraIcon,
  ImageIcon,
  MapPinnedIcon,
  StoreIcon,
  UsersIcon,
  ZapIcon,
} from '@/components/ui/icons'

import { buttonVariants } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { StationBasicInformation } from './station-basic-information'
import { StationEquipment } from './station-equipment'
import { StationFacilities } from './station-facilities'
import { StationMerchantBindings } from './station-merchant-binding'
import { StationStaffList } from './station-staff'
import { StationLocation, StationOperatingStatus } from './station-status-location'
import { StationStatusBadge } from './station-data-table'
import type { ChargingStation } from './station-data'
import type { StationDetailTab } from './station-detail-navigation'
import { useStations } from './station-store'
import { StationVideoMonitoring } from './station-video-monitoring'

export function StationDetailPage({ stationId, tab }: { stationId: string; tab: StationDetailTab }) {
  const { getStation } = useStations()
  const station = getStation(stationId)

  if (!station) {
    return (
      <Empty className="min-h-96 border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><ZapIcon /></EmptyMedia>
          <EmptyTitle>未找到该充电站</EmptyTitle>
          <EmptyDescription>当前链接中的充电站 ID 无效。</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link to="/stations" className={buttonVariants()}>返回充电站列表</Link>
        </EmptyContent>
      </Empty>
    )
  }

  return <StationDetailContent initialStation={station} tab={tab} />
}

function StationDetailContent({ initialStation, tab }: {
  initialStation: ChargingStation
  tab: StationDetailTab
}) {
  const [station, setStation] = useState(initialStation)
  const navigate = useNavigate()

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link to="/stations" className={buttonVariants({ variant: 'ghost', className: 'w-fit' })}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回充电站列表
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{station.name}</h1>
          <StationStatusBadge status={station.status} />
        </div>
        <p className="text-sm text-muted-foreground">{station.code} · {station.city}{station.district} · {station.address}</p>
      </header>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          void navigate({
            to: '/stations/$stationId',
            params: { stationId: station.id },
            search: { tab: value as StationDetailTab },
          })
        }}
      >
        <TabsList variant="line" className="h-auto max-w-full flex-wrap justify-start">
          <TabsTrigger value="basic-information"><ImageIcon data-icon="inline-start" />基本信息</TabsTrigger>
          <TabsTrigger value="operating-status"><ActivityIcon data-icon="inline-start" />运营状态</TabsTrigger>
          <TabsTrigger value="location"><MapPinnedIcon data-icon="inline-start" />位置</TabsTrigger>
          <TabsTrigger value="equipment"><ZapIcon data-icon="inline-start" />设备管理</TabsTrigger>
          <TabsTrigger value="facilities"><StoreIcon data-icon="inline-start" />配套设施</TabsTrigger>
          <TabsTrigger value="video-monitoring"><CameraIcon data-icon="inline-start" />视频监控</TabsTrigger>
          <TabsTrigger value="staff"><UsersIcon data-icon="inline-start" />工作人员</TabsTrigger>
          <TabsTrigger value="merchants"><Building2Icon data-icon="inline-start" />商户</TabsTrigger>
        </TabsList>
        <TabsContent value="basic-information" className="pt-4"><StationBasicInformation station={station} onSave={setStation} /></TabsContent>
        <TabsContent value="operating-status" className="pt-4">
          <StationOperatingStatus station={station} onStatusChange={(status) => setStation((current) => ({ ...current, status }))} />
        </TabsContent>
        <TabsContent value="location" className="pt-4"><StationLocation station={station} /></TabsContent>
        <TabsContent value="equipment" className="pt-4">
          <StationEquipment
            station={station}
            onDevicesChange={(devices) => setStation((current) => ({ ...current, devices }))}
          />
        </TabsContent>
        <TabsContent value="facilities" className="pt-4">
          <StationFacilities
            station={station}
            onFacilitiesChange={(facilities) => setStation((current) => ({ ...current, facilities }))}
          />
        </TabsContent>
        <TabsContent value="video-monitoring" className="pt-4">
          <StationVideoMonitoring station={station} />
        </TabsContent>
        <TabsContent value="staff" className="pt-4">
          <StationStaffList
            station={station}
            onStaffChange={(staff) => setStation((current) => ({ ...current, staff }))}
          />
        </TabsContent>
        <TabsContent value="merchants" className="pt-4">
          <StationMerchantBindings
            station={station}
            onBindingsChange={(merchantBindings) => setStation((current) => ({ ...current, merchantBindings }))}
          />
        </TabsContent>
      </Tabs>
    </section>
  )
}
