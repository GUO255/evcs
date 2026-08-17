import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon, ReceiptTextIcon } from '@/components/ui/icons'

import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { cn } from '@/lib/utils'

import {
  formatMallCurrency,
  formatMallDateTime,
  initialMallOrders,
  mallPaymentMethodLabels,
} from '../mall/mall-data'
import { MallOrderStatusBadge } from './mall-order-page'

export function MallOrderDetailPage({ orderId }: { orderId: string }) {
  const order = initialMallOrders.find((candidate) => candidate.id === orderId)

  if (!order) {
    return (
      <Empty className="min-h-96 border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><ReceiptTextIcon /></EmptyMedia>
          <EmptyTitle>未找到该商城购买订单</EmptyTitle>
          <EmptyDescription>当前链接中的订单 ID 无效。</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><Link to="/mall-orders" className={buttonVariants()}>返回商城购买订单</Link></EmptyContent>
      </Empty>
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link to="/mall-orders" className={buttonVariants({ variant: 'ghost', className: 'w-fit' })}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回商城购买订单
        </Link>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{order.orderNo}</h1>
            <MallOrderStatusBadge status={order.status} />
          </div>
          <p className="text-sm text-muted-foreground">{order.productName} · {formatMallDateTime(order.createdAt)}</p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard title="订单金额" value={formatMallCurrency(order.totalAmountCents)} description={mallPaymentMethodLabels[order.paymentMethod]} />
        <SummaryCard title="商品数量" value={`${order.quantity} 件`} description={order.sku} />
        <SummaryCard title="购买用户" value={order.buyerName} description={order.maskedMobile} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <InformationCard title="订单信息" description="商城订单的创建与当前处理状态。">
          <DefinitionItem label="订单号" value={order.orderNo} />
          <DefinitionItem label="创建时间" value={formatMallDateTime(order.createdAt)} />
          <DefinitionItem label="订单状态" value={<MallOrderStatusBadge status={order.status} />} />
          <DefinitionItem label="支付方式" value={mallPaymentMethodLabels[order.paymentMethod]} />
        </InformationCard>

        <InformationCard title="商品与金额" description="本次商城购买的商品及支付金额。">
          <DefinitionItem label="商品名称" value={order.productName} />
          <DefinitionItem label="商品 SKU" value={order.sku} />
          <DefinitionItem label="购买数量" value={`${order.quantity} 件`} />
          <DefinitionItem label="订单金额" value={formatMallCurrency(order.totalAmountCents)} />
          <DefinitionItem label="实付金额" value={order.status === 'pending-payment' || order.status === 'cancelled' ? '—' : formatMallCurrency(order.totalAmountCents)} />
        </InformationCard>

        <InformationCard title="购买用户" description="提交商城订单的用户信息。">
          <DefinitionItem label="用户名称" value={order.buyerName} />
          <DefinitionItem label="手机号" value={order.maskedMobile} />
        </InformationCard>

        <InformationCard title="收货或权益发放" description="实物商品展示收货与物流，虚拟商品由系统发放权益。">
          {order.receiver ? (
            <>
              <DefinitionItem label="收货人" value={order.receiver.name} />
              <DefinitionItem label="收货手机号" value={order.receiver.maskedMobile} />
              <DefinitionItem className="sm:col-span-2" label="收货地址" value={order.receiver.address} />
              <DefinitionItem label="物流公司" value={order.tracking?.company ?? '尚未发货'} />
              <DefinitionItem label="物流单号" value={order.tracking?.trackingNo ?? '—'} />
            </>
          ) : (
            <>
              <DefinitionItem label="发放方式" value="自动发放至用户账户" />
              <DefinitionItem label="发放状态" value={order.status === 'completed' ? '已发放' : '待发放'} />
            </>
          )}
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
