import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon, ReceiptTextIcon } from '@/components/ui/icons'

import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

import {
  formatStoredValueCurrency,
  formatStoredValueDateTime,
  getStoredValueRecord,
  getStoredValueSubjectTypeLabel,
  getStoredValueTransactionTypeLabel,
} from './stored-value-data'
import { StoredValueStatusBadge } from './stored-value-status-badge'

export function StoredValueDetailPage({ recordId }: { recordId: string }) {
  const record = getStoredValueRecord(recordId)

  if (!record) {
    return (
      <Empty className="min-h-96 border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><ReceiptTextIcon /></EmptyMedia>
          <EmptyTitle>未找到该储值订单</EmptyTitle>
          <EmptyDescription>当前链接中的储值订单不存在。</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><Link to="/stored-value" className={buttonVariants()}>返回储值订单</Link></EmptyContent>
      </Empty>
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link to="/stored-value" className={buttonVariants({ variant: 'ghost', className: 'w-fit' })}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回储值订单
        </Link>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{record.transactionCode}</h1>
            <StoredValueStatusBadge status={record.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {record.subjectName} · {formatStoredValueDateTime(record.occurredAt)}
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          title="变动金额"
          value={`${record.amount > 0 ? '+' : ''}${formatStoredValueCurrency(record.amount)}`}
          description={getStoredValueTransactionTypeLabel(record.transactionType)}
        />
        <SummaryCard
          title="变动后余额"
          value={formatStoredValueCurrency(record.balanceAfter)}
          description={`变动前 ${formatStoredValueCurrency(record.balanceBefore)}`}
        />
        <SummaryCard
          title="储值主体"
          value={record.subjectName}
          description={getStoredValueSubjectTypeLabel(record.subjectType)}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <InformationCard title="订单信息" description="储值订单的交易类型、时间和处理状态。">
          <DefinitionItem label="储值单号" value={record.transactionCode} />
          <DefinitionItem label="发生时间" value={formatStoredValueDateTime(record.occurredAt)} />
          <DefinitionItem label="交易类型" value={getStoredValueTransactionTypeLabel(record.transactionType)} />
          <DefinitionItem label="处理状态" value={<StoredValueStatusBadge status={record.status} />} />
        </InformationCard>

        <InformationCard title="主体信息" description="本次余额变动对应的用户或签约客户。">
          <DefinitionItem label="主体类型" value={getStoredValueSubjectTypeLabel(record.subjectType)} />
          <DefinitionItem label="主体名称" value={record.subjectName} />
          <DefinitionItem label="主体编号" value={record.subjectCode} />
          <DefinitionItem label="联系方式" value={record.contact} />
        </InformationCard>

        <InformationCard title="金额与余额" description="本次交易金额及余额变化。">
          <DefinitionItem label="变动金额" value={`${record.amount > 0 ? '+' : ''}${formatStoredValueCurrency(record.amount)}`} />
          <DefinitionItem label="变动前余额" value={formatStoredValueCurrency(record.balanceBefore)} />
          <DefinitionItem label="变动后余额" value={formatStoredValueCurrency(record.balanceAfter)} />
        </InformationCard>

        <InformationCard title="渠道与关联信息" description="储值订单的来源渠道和业务关联。">
          <DefinitionItem label="交易渠道" value={record.channel} />
          <DefinitionItem label="关联单号" value={record.relatedCode ?? '—'} />
          <DefinitionItem className="sm:col-span-2" label="备注" value={record.remark} />
        </InformationCard>
      </div>
    </section>
  )
}

function SummaryCard({ title, value, description }: { title: string; value: string; description: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  )
}

function InformationCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
      <CardContent><dl className="grid gap-4 sm:grid-cols-2">{children}</dl></CardContent>
    </Card>
  )
}

function DefinitionItem({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-words font-medium">{value}</dd>
    </div>
  )
}
