import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon, ReceiptTextIcon } from '@/components/ui/icons'

import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { cn } from '@/lib/utils'

import {
  formatChargingDuration,
  formatOrderCurrency,
  formatOrderDateTime,
  getChargingOrder,
  type ChargingOrder,
} from './order-data'
import { ChargingOrderStatusBadge, PaymentStatusBadge } from './order-status-badges'

export function OrderDetailPage({ orderId }: { orderId: string }) {
  const order = getChargingOrder(orderId)

  if (!order) {
    return (
      <Empty className="min-h-96 border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><ReceiptTextIcon /></EmptyMedia>
          <EmptyTitle>未找到该订单</EmptyTitle>
          <EmptyDescription>当前链接中的订单 ID 无效。</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><Link to="/orders" className={buttonVariants()}>返回订单列表</Link></EmptyContent>
      </Empty>
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link to="/orders" className={buttonVariants({ variant: 'ghost', className: 'w-fit' })}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回订单列表
        </Link>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{order.orderCode}</h1>
            <ChargingOrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </div>
          <p className="text-sm text-muted-foreground">{order.stationName} · {formatOrderDateTime(order.startTime)}</p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard title="充电电量" value={`${order.energy.toFixed(2)} kWh`} description={`SOC ${order.startSoc}% → ${order.endSoc ?? '充电中'}${order.endSoc === undefined ? '' : '%'}`} />
        <SummaryCard title="充电时长" value={formatChargingDuration(order.durationMinutes)} description={order.endTime ? `结束于 ${formatOrderDateTime(order.endTime)}` : '当前仍在充电'} />
        <SummaryCard title="应付金额" value={formatOrderCurrency(order.payableAmount)} description={`实付 ${formatOrderCurrency(order.paidAmount)}`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <InformationCard title="充电信息" description="订单的充电过程和计量数据。">
          <DefinitionItem label="开始时间" value={formatOrderDateTime(order.startTime)} />
          <DefinitionItem label="结束时间" value={formatOrderDateTime(order.endTime)} />
          <DefinitionItem label="充电时长" value={formatChargingDuration(order.durationMinutes)} />
          <DefinitionItem label="充电电量" value={`${order.energy.toFixed(2)} kWh`} />
          <DefinitionItem label="开始 SOC" value={`${order.startSoc}%`} />
          <DefinitionItem label="结束 SOC" value={order.endSoc === undefined ? '—' : `${order.endSoc}%`} />
          <DefinitionItem label="起始电表读数" value={`${order.startMeterReading.toFixed(2)} kWh`} />
          <DefinitionItem label="结束电表读数" value={order.endMeterReading === undefined ? '—' : `${order.endMeterReading.toFixed(2)} kWh`} />
          <DefinitionItem className="sm:col-span-2" label="结束原因" value={order.stopReason ?? '—'} />
        </InformationCard>

        <InformationCard title="场站与设备" description="订单对应的充电站、充电桩和枪口。">
          <DefinitionItem label="场站名称" value={order.stationName} />
          <DefinitionItem label="场站编号" value={order.stationCode} />
          <DefinitionItem label="设备编号" value={order.deviceCode} />
          <DefinitionItem label="充电枪" value={order.connectorCode} />
        </InformationCard>

        <InformationCard title="用户与车辆" description="发起该订单的用户和车辆信息。">
          <DefinitionItem label="用户名称" value={order.userName} />
          <DefinitionItem label="手机号" value={order.userMobile} />
          <DefinitionItem label="车牌号" value={order.vehiclePlate} />
        </InformationCard>

        <InformationCard title="费用明细" description="本次充电费用的计算组成。">
          <DefinitionItem label="电费" value={formatOrderCurrency(order.electricityFee)} />
          <DefinitionItem label="服务费" value={formatOrderCurrency(order.serviceFee)} />
          <DefinitionItem label="停车费" value={formatOrderCurrency(order.parkingFee)} />
          <DefinitionItem label="优惠金额" value={`-${formatOrderCurrency(order.discountAmount)}`} />
          <DefinitionItem label="优惠名称" value={order.couponName ?? '无'} />
          <DefinitionItem label="应付金额" value={formatOrderCurrency(order.payableAmount)} />
        </InformationCard>

        <InformationCard className="xl:col-span-2" title="支付信息" description="订单支付流水及退款信息。">
          <DefinitionItem label="支付状态" value={<PaymentStatusBadge status={order.paymentStatus} />} />
          <DefinitionItem label="支付方式" value={order.paymentMethod ?? '—'} />
          <DefinitionItem label="支付流水号" value={order.paymentTransactionNo ?? '—'} />
          <DefinitionItem label="支付时间" value={formatOrderDateTime(order.paidAt)} />
          <DefinitionItem label="实付金额" value={formatOrderCurrency(order.paidAmount)} />
          <DefinitionItem label="退款时间" value={formatOrderDateTime(order.refundedAt)} />
          <DefinitionItem className="sm:col-span-2" label="退款原因" value={order.refundReason ?? '—'} />
        </InformationCard>
      </div>
    </section>
  )
}

function SummaryCard({ title, value, description }: { title: string, value: string, description: string }) {
  return <Card><CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{value}</p><CardDescription>{description}</CardDescription></CardContent></Card>
}

function InformationCard({ title, description, className, children }: { title: string, description: string, className?: string, children: ReactNode }) {
  return <Card className={className}><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent><dl className="grid gap-4 sm:grid-cols-2">{children}</dl></CardContent></Card>
}

function DefinitionItem({ label, value, className }: { label: string, value: ReactNode, className?: string }) {
  return <div className={cn('flex flex-col gap-1', className)}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words font-medium">{value}</dd></div>
}
