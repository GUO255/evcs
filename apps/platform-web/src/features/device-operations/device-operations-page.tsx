import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ArchiveIcon, BellRingIcon, ClipboardCheckIcon, WrenchIcon } from '@/components/ui/icons'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import type { DeviceAlert, WorkOrder } from './device-operations-data'
import {
  AcceptWorkOrderDialog,
  CompleteWorkOrderDialog,
  DispatchWorkOrderDialog,
} from './device-operations-dialogs'
import { useDeviceOperations } from './device-operations-store'
import { AlertTable, RepairArchiveTable, WorkOrderTable } from './device-operations-tables'

export function DeviceOperationsPage() {
  const navigate = useNavigate()
  const { alerts, workOrders, archives } = useDeviceOperations()
  const [dispatchingAlert, setDispatchingAlert] = useState<DeviceAlert>()
  const [completingOrder, setCompletingOrder] = useState<WorkOrder>()
  const [acceptingOrder, setAcceptingOrder] = useState<WorkOrder>()

  const pendingAlertCount = alerts.filter((alert) => alert.status === 'pending').length
  const processingOrderCount = workOrders.filter((order) => order.status === 'processing').length
  const pendingAcceptanceCount = workOrders.filter((order) => order.status === 'pending-acceptance').length

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">设备运维</h1>
        <p className="text-sm text-muted-foreground">统一管理设备告警、维修工单、工单验收和维修档案。</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={BellRingIcon} title="待处理告警" value={pendingAlertCount} description="需要派发维修工单" />
        <MetricCard icon={WrenchIcon} title="处理中工单" value={processingOrderCount} description="维修人员正在处理" />
        <MetricCard icon={ClipboardCheckIcon} title="待验收工单" value={pendingAcceptanceCount} description="等待运维负责人验收" />
        <MetricCard icon={ArchiveIcon} title="维修档案" value={archives.length} description="已验收归档记录" />
      </div>

      <Tabs defaultValue="alerts" className="gap-4">
        <TabsList variant="line" className="!h-auto flex-wrap justify-start">
          <TabsTrigger value="alerts">设备告警</TabsTrigger>
          <TabsTrigger value="work-orders">运维工单</TabsTrigger>
          <TabsTrigger value="archives">维修档案</TabsTrigger>
        </TabsList>
        <TabsContent value="alerts">
          <AlertTable
            alerts={alerts}
            onOpen={(alert) => void navigate({ to: '/device-operations/alerts/$alertId', params: { alertId: alert.id } })}
            onDispatch={setDispatchingAlert}
          />
        </TabsContent>
        <TabsContent value="work-orders">
          <WorkOrderTable
            workOrders={workOrders}
            onOpen={(order) => void navigate({ to: '/device-operations/work-orders/$workOrderId', params: { workOrderId: order.id } })}
            onComplete={setCompletingOrder}
            onAccept={setAcceptingOrder}
          />
        </TabsContent>
        <TabsContent value="archives">
          <RepairArchiveTable
            archives={archives}
            onOpen={(archive) => void navigate({ to: '/device-operations/archives/$archiveId', params: { archiveId: archive.id } })}
          />
        </TabsContent>
      </Tabs>

      <DispatchWorkOrderDialog item={dispatchingAlert} onOpenChange={(open) => { if (!open) setDispatchingAlert(undefined) }} />
      <CompleteWorkOrderDialog item={completingOrder} onOpenChange={(open) => { if (!open) setCompletingOrder(undefined) }} />
      <AcceptWorkOrderDialog item={acceptingOrder} onOpenChange={(open) => { if (!open) setAcceptingOrder(undefined) }} />
    </section>
  )
}

function MetricCard({ icon: Icon, title, value, description }: {
  icon: typeof BellRingIcon
  title: string
  value: number
  description: string
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Icon className="size-4 text-muted-foreground" />
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  )
}
