import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon, ReceiptTextIcon } from '@/components/ui/icons'

import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { cn } from '@/lib/utils'

import {
  formatPoints,
  formatPointsOrderDateTime,
  getPointsOrder,
  pointsProductTypeLabels,
} from './points-order-data'
import { PointsOrderStatusBadge } from './points-order-page'

export function PointsOrderDetailPage({ orderId }: { orderId: string }) {
  const order = getPointsOrder(orderId)
  if (!order) {
    return (
      <Empty className="min-h-96 border">
        <EmptyHeader><EmptyMedia variant="icon"><ReceiptTextIcon /></EmptyMedia><EmptyTitle>未找到该积分兑换订单</EmptyTitle><EmptyDescription>当前链接中的订单 ID 无效。</EmptyDescription></EmptyHeader>
        <EmptyContent><Link to="/points-orders" className={buttonVariants()}>返回积分兑换订单</Link></EmptyContent>
      </Empty>
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link to="/points-orders" className={buttonVariants({ variant: 'ghost', className: 'w-fit' })}><ArrowLeftIcon data-icon="inline-start" />返回积分兑换订单</Link>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold tracking-tight">{order.orderCode}</h1><PointsOrderStatusBadge status={order.status} /></div>
          <p className="text-sm text-muted-foreground">{order.productName} · {formatPointsOrderDateTime(order.createdAt)}</p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard title="消耗积分" value={formatPoints(order.pointsCost)} description={`${order.quantity} 件商品`} />
        <SummaryCard title="兑换用户" value={order.userName} description={order.maskedMobile} />
        <SummaryCard title="履约方式" value={order.fulfillmentMethod} description={formatPointsOrderDateTime(order.fulfilledAt)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <InformationCard title="兑换单信息" description="积分兑换单的创建与处理状态。">
          <DefinitionItem label="兑换单号" value={order.orderCode} />
          <DefinitionItem label="兑换时间" value={formatPointsOrderDateTime(order.createdAt)} />
          <DefinitionItem label="兑换状态" value={<PointsOrderStatusBadge status={order.status} />} />
          <DefinitionItem label="处理完成时间" value={formatPointsOrderDateTime(order.fulfilledAt)} />
        </InformationCard>
        <InformationCard title="商品与积分" description="兑换商品及积分扣减信息。">
          <DefinitionItem label="商品名称" value={order.productName} />
          <DefinitionItem label="商品类型" value={<Badge variant="outline">{pointsProductTypeLabels[order.productType]}</Badge>} />
          <DefinitionItem label="兑换数量" value={`${order.quantity} 件`} />
          <DefinitionItem label="扣减积分" value={formatPoints(order.pointsCost)} />
        </InformationCard>
        <InformationCard title="兑换用户" description="提交积分兑换的用户信息。">
          <DefinitionItem label="用户名称" value={order.userName} />
          <DefinitionItem label="手机号" value={order.maskedMobile} />
        </InformationCard>
        <InformationCard title="履约信息" description="实物配送或虚拟权益发放信息。">
          <DefinitionItem label="履约方式" value={order.fulfillmentMethod} />
          <DefinitionItem label="履约时间" value={formatPointsOrderDateTime(order.fulfilledAt)} />
          {order.recipient ? (
            <>
              <DefinitionItem label="收货人" value={order.recipient} />
              <DefinitionItem label="收货手机号" value={order.recipientMobile ?? '—'} />
              <DefinitionItem className="sm:col-span-2" label="收货地址" value={order.address ?? '—'} />
            </>
          ) : null}
          <DefinitionItem className="sm:col-span-2" label="处理备注" value={order.remark} />
        </InformationCard>
      </div>
    </section>
  )
}

function SummaryCard({ title, value, description }: { title: string; value: string; description: string }) {
  return <Card><CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{value}</p><CardDescription>{description}</CardDescription></CardContent></Card>
}

function InformationCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent><dl className="grid gap-4 sm:grid-cols-2">{children}</dl></CardContent></Card>
}

function DefinitionItem({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-1', className)}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words font-medium">{value}</dd></div>
}
