import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon, ArchiveIcon } from '@/components/ui/icons'

import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

import {
  OperationDefinitionItem,
  OperationInformationCard,
  OperationSummaryCard,
} from './device-operations-detail-components'
import { formatOperationDateTime, formatRepairCost } from './device-operations-data'
import { useDeviceOperations } from './device-operations-store'

export function RepairArchiveDetailPage({ archiveId }: { archiveId: string }) {
  const { archives } = useDeviceOperations()
  const archive = archives.find((candidate) => candidate.id === archiveId)

  if (!archive) {
    return (
      <Empty className="min-h-96 border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><ArchiveIcon /></EmptyMedia>
          <EmptyTitle>未找到该维修档案</EmptyTitle>
          <EmptyDescription>当前链接中的维修档案不存在。</EmptyDescription>
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
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{archive.workOrderCode}</h1>
            <Badge>已归档</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {archive.fault} · {formatOperationDateTime(archive.acceptedAt)}
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <OperationSummaryCard title="维修费用" value={formatRepairCost(archive.cost)} description={archive.replacedParts} />
        <OperationSummaryCard title="维修人员" value={archive.repairer} description={archive.stationName} />
        <OperationSummaryCard title="验收人员" value={archive.acceptedBy} description={formatOperationDateTime(archive.acceptedAt)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <OperationInformationCard title="设备与故障" description="维修档案对应的场站、设备和故障信息。">
          <OperationDefinitionItem label="工单编号" value={archive.workOrderCode} />
          <OperationDefinitionItem label="所属场站" value={archive.stationName} />
          <OperationDefinitionItem label="设备编号" value={archive.deviceCode} />
          <OperationDefinitionItem label="故障内容" value={archive.fault} />
        </OperationInformationCard>

        <OperationInformationCard title="维修结果" description="维修措施、配件和费用记录。">
          <OperationDefinitionItem label="维修人员" value={archive.repairer} />
          <OperationDefinitionItem label="维修费用" value={formatRepairCost(archive.cost)} />
          <OperationDefinitionItem className="sm:col-span-2" label="维修结果" value={archive.resolution} />
          <OperationDefinitionItem className="sm:col-span-2" label="更换配件" value={archive.replacedParts} />
        </OperationInformationCard>

        <OperationInformationCard title="验收信息" description="维修结果的验收人与验收结论。">
          <OperationDefinitionItem label="验收人员" value={archive.acceptedBy} />
          <OperationDefinitionItem label="验收时间" value={formatOperationDateTime(archive.acceptedAt)} />
          <OperationDefinitionItem className="sm:col-span-2" label="验收说明" value={archive.acceptanceRemark} />
        </OperationInformationCard>
      </div>
    </section>
  )
}
