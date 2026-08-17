import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon, ReceiptTextIcon } from '@/components/ui/icons'

import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

import {
  formatInvoiceCurrency,
  formatInvoiceDateTime,
  getInvoiceRecord,
  getInvoiceSubjectTypeLabel,
  getInvoiceTypeLabel,
} from './invoice-data'
import { InvoiceStatusBadge } from './invoice-status-badge'

export function InvoiceDetailPage({ invoiceId }: { invoiceId: string }) {
  const invoice = getInvoiceRecord(invoiceId)

  if (!invoice) {
    return (
      <Empty className="min-h-96 border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><ReceiptTextIcon /></EmptyMedia>
          <EmptyTitle>未找到该发票申请</EmptyTitle>
          <EmptyDescription>当前链接中的发票申请不存在。</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><Link to="/invoices" className={buttonVariants()}>返回发票申请</Link></EmptyContent>
      </Empty>
    )
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link to="/invoices" className={buttonVariants({ variant: 'ghost', className: 'w-fit' })}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回发票申请
        </Link>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{invoice.applicationCode}</h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {invoice.subjectName} · {formatInvoiceDateTime(invoice.appliedAt)}
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard title="开票金额" value={formatInvoiceCurrency(invoice.amount)} description={`${invoice.orderCount} 笔关联订单`} />
        <SummaryCard title="开票主体" value={invoice.subjectName} description={getInvoiceSubjectTypeLabel(invoice.subjectType)} />
        <SummaryCard title="发票类型" value={getInvoiceTypeLabel(invoice.invoiceType)} description={invoice.invoiceNumber ?? '尚未生成发票号码'} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <InformationCard title="申请信息" description="发票申请的提交时间、金额和处理状态。">
          <DefinitionItem label="申请单号" value={invoice.applicationCode} />
          <DefinitionItem label="申请时间" value={formatInvoiceDateTime(invoice.appliedAt)} />
          <DefinitionItem label="申请状态" value={<InvoiceStatusBadge status={invoice.status} />} />
          <DefinitionItem label="开票金额" value={formatInvoiceCurrency(invoice.amount)} />
          <DefinitionItem label="关联订单" value={`${invoice.orderCount} 笔`} />
          <DefinitionItem label="申请备注" value={invoice.remark} />
        </InformationCard>

        <InformationCard title="开票主体" description="提交开票申请的用户、客户或商户信息。">
          <DefinitionItem label="主体类型" value={getInvoiceSubjectTypeLabel(invoice.subjectType)} />
          <DefinitionItem label="主体名称" value={invoice.subjectName} />
          <DefinitionItem label="主体编号" value={invoice.subjectCode} />
          <DefinitionItem label="联系方式" value={invoice.contact} />
        </InformationCard>

        <InformationCard title="发票抬头" description="发票类型、抬头和纳税人识别信息。">
          <DefinitionItem label="发票类型" value={getInvoiceTypeLabel(invoice.invoiceType)} />
          <DefinitionItem label="发票抬头" value={invoice.invoiceTitle} />
          <DefinitionItem className="sm:col-span-2" label="纳税人识别号" value={invoice.taxNumber ?? '个人抬头，无税号'} />
        </InformationCard>

        <InformationCard title="开票与交付" description="发票生成时间、发票号码和接收方式。">
          <DefinitionItem label="发票号码" value={invoice.invoiceNumber ?? '—'} />
          <DefinitionItem label="开票时间" value={formatInvoiceDateTime(invoice.issuedAt)} />
          <DefinitionItem className="sm:col-span-2" label="接收目标" value={invoice.deliveryTarget} />
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
