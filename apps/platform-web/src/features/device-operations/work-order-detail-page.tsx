import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon, CheckCircle2Icon, WrenchIcon } from '@/components/ui/icons'

import { Button, buttonVariants } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

import { WorkOrderStatusBadge } from './device-operations-badges'
import {
  OperationDefinitionItem,
  OperationInformationCard,
  OperationSummaryCard,
} from './device-operations-detail-components'
import {
  formatOperationDateTime,
  formatRepairCost,
  getWorkOrderStatusLabel,
  type WorkOrder,
} from './device-operations-data'
import { AcceptWorkOrderDialog, CompleteWorkOrderDialog } from './device-operations-dialogs'
import { useDeviceOperations } from './device-operations-store'

export function WorkOrderDetailPage({ workOrderId }: { workOrderId: string }) {
  const { workOrders } = useDeviceOperations()
  const order = workOrders.find((candidate) => candidate.id === workOrderId)
  const [completingOrder, setCompletingOrder] = useState<WorkOrder>()
  const [acceptingOrder, setAcceptingOrder] = useState<WorkOrder>()

  if (!order) {
    return (
      <Empty className="min-h-96 border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><WrenchIcon /></EmptyMedia>
          <EmptyTitle>未找到该运维工单</EmptyTitle>
          <EmptyDescription>当前链接中的运维工单不存在。</EmptyDescription>
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
              <h1 className="text-2xl font-semibold tracking-tight">{order.code}</h1>
              <WorkOrderStatusBadge status={order.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {order.alertTitle} · {order.stationName}
            </p>
          </div>
          {order.status === 'processing' ? (
            <Button onClick={() => setCompletingOrder(order)}><WrenchIcon data-icon="inline-start" />提交维修结果</Button>
          ) : null}
          {order.status === 'pending-acceptance' ? (
            <Button onClick={() => setAcceptingOrder(order)}><CheckCircle2Icon data-icon="inline-start" />验收</Button>
          ) : null}
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <OperationSummaryCard title="工单状态" value={getWorkOrderStatusLabel(order.status)} description={order.alertTitle} />
        <OperationSummaryCard title="维修人员" value={order.assignee} description={`时限 ${formatOperationDateTime(order.deadline)}`} />
        <OperationSummaryCard title="维修费用" value={formatRepairCost(order.cost ?? 0)} description={order.replacedParts ?? '尚未提交维修结果'} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <OperationInformationCard title="工单信息" description="运维工单的派发要求和处理状态。">
          <OperationDefinitionItem label="工单编号" value={order.code} />
          <OperationDefinitionItem label="工单状态" value={<WorkOrderStatusBadge status={order.status} />} />
          <OperationDefinitionItem label="派发时间" value={formatOperationDateTime(order.dispatchedAt)} />
          <OperationDefinitionItem label="完成时限" value={formatOperationDateTime(order.deadline)} />
          <OperationDefinitionItem className="sm:col-span-2" label="处理要求" value={order.requirement} />
        </OperationInformationCard>

        <OperationInformationCard title="故障与设备" description="工单关联的告警、场站和设备。">
          <OperationDefinitionItem label="关联告警" value={order.alertTitle} />
          <OperationDefinitionItem label="所属场站" value={order.stationName} />
          <OperationDefinitionItem label="设备编号" value={order.deviceCode} />
          <OperationDefinitionItem label="维修人员" value={order.assignee} />
        </OperationInformationCard>

        <OperationInformationCard title="维修结果" description="维修人员提交的处理结果和费用信息。">
          <OperationDefinitionItem label="完成时间" value={formatOperationDateTime(order.completedAt)} />
          <OperationDefinitionItem label="维修费用" value={order.cost === undefined ? '—' : formatRepairCost(order.cost)} />
          <OperationDefinitionItem className="sm:col-span-2" label="维修结果" value={order.resolution ?? '尚未提交'} />
          <OperationDefinitionItem className="sm:col-span-2" label="更换配件" value={order.replacedParts ?? '—'} />
        </OperationInformationCard>
      </div>

      <CompleteWorkOrderDialog item={completingOrder} onOpenChange={(open) => { if (!open) setCompletingOrder(undefined) }} />
      <AcceptWorkOrderDialog item={acceptingOrder} onOpenChange={(open) => { if (!open) setAcceptingOrder(undefined) }} />
    </section>
  )
}
