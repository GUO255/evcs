import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon, ReceiptTextIcon } from '@/components/ui/icons'

import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

import {
  formatMembershipCurrency,
  formatMembershipOrderDateTime,
  getMembershipOrder,
  membershipPaymentMethodLabels,
} from './membership-order-data'
import { MembershipOrderStatusBadge } from './membership-order-page'

export function MembershipOrderDetailPage({ orderId }: { orderId: string }) {
  const order = getMembershipOrder(orderId)
  if (!order) {
    return (
      <Empty className="min-h-96 border">
        <EmptyHeader><EmptyMedia variant="icon"><ReceiptTextIcon /></EmptyMedia><EmptyTitle>未找到该会员开通订单</EmptyTitle><EmptyDescription>当前链接中的订单 ID 无效。</EmptyDescription></EmptyHeader>
        <EmptyContent><Link to="/membership-orders" className={buttonVariants()}>返回会员开通订单</Link></EmptyContent>
      </Empty>
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link to="/membership-orders" className={buttonVariants({ variant: 'ghost', className: 'w-fit' })}><ArrowLeftIcon data-icon="inline-start" />返回会员开通订单</Link>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-semibold tracking-tight">{order.orderCode}</h1><MembershipOrderStatusBadge status={order.status} /></div>
          <p className="text-sm text-muted-foreground">{order.productName} · {formatMembershipOrderDateTime(order.createdAt)}</p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard title="实付金额" value={order.paidAmountCents ? formatMembershipCurrency(order.paidAmountCents) : '—'} description={membershipPaymentMethodLabels[order.paymentMethod]} />
        <SummaryCard title="会员商品" value={order.productName} description={order.productDescription} />
        <SummaryCard title="开通用户" value={order.userName} description={order.maskedMobile} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <InformationCard title="订单信息" description="会员订单的创建、支付与当前状态。">
          <DefinitionItem label="订单号" value={order.orderCode} />
          <DefinitionItem label="创建时间" value={formatMembershipOrderDateTime(order.createdAt)} />
          <DefinitionItem label="订单状态" value={<MembershipOrderStatusBadge status={order.status} />} />
          <DefinitionItem label="订单金额" value={formatMembershipCurrency(order.amountCents)} />
        </InformationCard>
        <InformationCard title="用户与会员商品" description="开通用户及购买的会员商品。">
          <DefinitionItem label="用户名称" value={order.userName} />
          <DefinitionItem label="手机号" value={order.maskedMobile} />
          <DefinitionItem label="会员商品" value={order.productName} />
          <DefinitionItem label="商品说明" value={order.productDescription} />
        </InformationCard>
        <InformationCard title="支付信息" description="会员订单对应的支付记录。">
          <DefinitionItem label="支付方式" value={membershipPaymentMethodLabels[order.paymentMethod]} />
          <DefinitionItem label="支付时间" value={formatMembershipOrderDateTime(order.paidAt)} />
          <DefinitionItem label="支付流水号" value={order.paymentTransactionNo ?? '—'} />
          <DefinitionItem label="实付金额" value={order.paidAmountCents ? formatMembershipCurrency(order.paidAmountCents) : '—'} />
        </InformationCard>
        <InformationCard title="会员开通信息" description="会员状态变化与权益有效期。">
          <DefinitionItem label="开通前状态" value={order.previousMembershipStatus} />
          <DefinitionItem label="开通后状态" value={order.status === 'activated' ? '会员' : '未生效'} />
          <DefinitionItem label="权益开始时间" value={formatMembershipOrderDateTime(order.membershipStartAt)} />
          <DefinitionItem label="权益结束时间" value={formatMembershipOrderDateTime(order.membershipEndAt)} />
          <DefinitionItem label="生效时间" value={formatMembershipOrderDateTime(order.activatedAt)} />
          <DefinitionItem label="处理备注" value={order.remark} />
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

function DefinitionItem({ label, value }: { label: string; value: ReactNode }) {
  return <div className="flex flex-col gap-1"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words font-medium">{value}</dd></div>
}
