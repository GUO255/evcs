import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon, FileTextIcon } from '@/components/ui/icons'

import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

import {
  formatSettlementCurrency,
  formatSettlementDateTime,
  getMerchantSettlementRecord,
} from './settlement-data'
import { SettlementStatusBadge } from './settlement-status-badge'

export function SettlementDetailPage({ settlementId }: { settlementId: string }) {
  const settlement = getMerchantSettlementRecord(settlementId)

  if (!settlement) {
    return (
      <Empty className="min-h-96 border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><FileTextIcon /></EmptyMedia>
          <EmptyTitle>未找到该商户结算记录</EmptyTitle>
          <EmptyDescription>当前链接中的商户结算记录不存在。</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><Link to="/merchant-settlements" className={buttonVariants()}>返回商户结算</Link></EmptyContent>
      </Empty>
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link to="/merchant-settlements" className={buttonVariants({ variant: 'ghost', className: 'w-fit' })}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回商户结算
        </Link>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{settlement.settlementCode}</h1>
            <SettlementStatusBadge status={settlement.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {settlement.merchantName} · {settlement.period}
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard title="应结金额" value={formatSettlementCurrency(settlement.settlementAmount)} description={`${settlement.orderCount} 笔订单`} />
        <SummaryCard title="交易总额" value={formatSettlementCurrency(settlement.transactionAmount)} description={`服务费 ${formatSettlementCurrency(settlement.serviceFee)}`} />
        <SummaryCard title="结算商户" value={settlement.merchantName} description={settlement.merchantCode} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <InformationCard title="结算信息" description="结算记录的周期、状态和处理时间。">
          <DefinitionItem label="结算单号" value={settlement.settlementCode} />
          <DefinitionItem label="结算周期" value={settlement.period} />
          <DefinitionItem label="创建时间" value={formatSettlementDateTime(settlement.createdAt)} />
          <DefinitionItem label="结算状态" value={<SettlementStatusBadge status={settlement.status} />} />
          <DefinitionItem label="到账时间" value={formatSettlementDateTime(settlement.settledAt)} />
          <DefinitionItem label="付款流水" value={settlement.paymentReference ?? '—'} />
        </InformationCard>

        <InformationCard title="商户信息" description="本次结算对应的签约商户。">
          <DefinitionItem label="商户名称" value={settlement.merchantName} />
          <DefinitionItem label="商户编号" value={settlement.merchantCode} />
          <DefinitionItem className="sm:col-span-2" label="联系方式" value={settlement.contact} />
        </InformationCard>

        <InformationCard title="金额明细" description="交易总额、服务费和调整后的应结金额。">
          <DefinitionItem label="交易总额" value={formatSettlementCurrency(settlement.transactionAmount)} />
          <DefinitionItem label="订单数量" value={`${settlement.orderCount} 笔`} />
          <DefinitionItem label="服务费" value={`-${formatSettlementCurrency(settlement.serviceFee)}`} />
          <DefinitionItem
            label="调整金额"
            value={`${settlement.adjustmentAmount > 0 ? '+' : ''}${formatSettlementCurrency(settlement.adjustmentAmount)}`}
          />
          <DefinitionItem className="sm:col-span-2" label="应结金额" value={formatSettlementCurrency(settlement.settlementAmount)} />
        </InformationCard>

        <InformationCard title="结算说明" description="结算记录的业务备注和支付信息。">
          <DefinitionItem label="付款流水" value={settlement.paymentReference ?? '—'} />
          <DefinitionItem label="到账时间" value={formatSettlementDateTime(settlement.settledAt)} />
          <DefinitionItem className="sm:col-span-2" label="备注" value={settlement.remark} />
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
