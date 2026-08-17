import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon, BellRingIcon, SendIcon } from '@/components/ui/icons'

import { Button, buttonVariants } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

import { AlertLevelBadge, AlertStatusBadge } from './device-operations-badges'
import {
  OperationDefinitionItem,
  OperationInformationCard,
  OperationSummaryCard,
} from './device-operations-detail-components'
import { formatOperationDateTime, getAlertLevelLabel, type DeviceAlert } from './device-operations-data'
import { DispatchWorkOrderDialog } from './device-operations-dialogs'
import { useDeviceOperations } from './device-operations-store'

export function DeviceAlertDetailPage({ alertId }: { alertId: string }) {
  const { alerts } = useDeviceOperations()
  const alert = alerts.find((candidate) => candidate.id === alertId)
  const [dispatchingAlert, setDispatchingAlert] = useState<DeviceAlert>()

  if (!alert) {
    return (
      <Empty className="min-h-96 border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><BellRingIcon /></EmptyMedia>
          <EmptyTitle>未找到该设备告警</EmptyTitle>
          <EmptyDescription>当前链接中的设备告警不存在。</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><Link to="/device-operations" className={buttonVariants()}>返回设备运维</Link></EmptyContent>
      </Empty>
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link to="/device-operations" className={buttonVariants({ variant: 'ghost', className: 'w-fit' })}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回设备运维
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{alert.code}</h1>
              <AlertLevelBadge level={alert.level} />
              <AlertStatusBadge status={alert.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {alert.title} · {formatOperationDateTime(alert.occurredAt)}
            </p>
          </div>
          {alert.status === 'pending' ? (
            <Button onClick={() => setDispatchingAlert(alert)}><SendIcon data-icon="inline-start" />派发工单</Button>
          ) : null}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <OperationSummaryCard title="告警级别" value={getAlertLevelLabel(alert.level)} description={alert.title} />
        <OperationSummaryCard title="所属场站" value={alert.stationName} description={alert.deviceCode} />
        <OperationSummaryCard title="发生时间" value={formatOperationDateTime(alert.occurredAt)} description="设备上报时间" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <OperationInformationCard title="告警信息" description="告警的级别、状态与具体描述。">
          <OperationDefinitionItem label="告警编号" value={alert.code} />
          <OperationDefinitionItem label="告警标题" value={alert.title} />
          <OperationDefinitionItem label="告警级别" value={<AlertLevelBadge level={alert.level} />} />
          <OperationDefinitionItem label="处理状态" value={<AlertStatusBadge status={alert.status} />} />
          <OperationDefinitionItem className="sm:col-span-2" label="告警描述" value={alert.description} />
        </OperationInformationCard>

        <OperationInformationCard title="设备信息" description="发生告警的场站和设备。">
          <OperationDefinitionItem label="所属场站" value={alert.stationName} />
          <OperationDefinitionItem label="设备编号" value={alert.deviceCode} />
          <OperationDefinitionItem className="sm:col-span-2" label="发生时间" value={formatOperationDateTime(alert.occurredAt)} />
        </OperationInformationCard>
      </div>

      <DispatchWorkOrderDialog item={dispatchingAlert} onOpenChange={(open) => { if (!open) setDispatchingAlert(undefined) }} />
    </section>
  )
}
