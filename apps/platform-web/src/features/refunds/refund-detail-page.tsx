import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon, ReceiptTextIcon } from '@/components/ui/icons'
import { toast } from 'sonner'

import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

import {
  formatRefundCurrency,
  formatRefundDateTime,
  getRefundReasonLabel,
} from './refund-data'
import { RefundStatusBadge } from './refund-records'
import { useRefunds } from './refund-store'

const reviewDecisionOptions = [
  { value: 'approved', label: '审核通过并退款' },
  { value: 'rejected', label: '驳回申请' },
] as const

export function RefundDetailPage({ refundId }: { refundId: string }) {
  const { refunds, reviewRefund } = useRefunds()
  const refund = refunds.find((candidate) => candidate.id === refundId)
  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved')
  const [reviewer, setReviewer] = useState('')
  const [remark, setRemark] = useState('')
  const [submitted, setSubmitted] = useState(false)

  if (!refund) {
    return (
      <Empty className="min-h-96 border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><ReceiptTextIcon /></EmptyMedia>
          <EmptyTitle>未找到该退款申请</EmptyTitle>
          <EmptyDescription>当前链接中的退款申请不存在。</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><Link to="/refunds" className={buttonVariants()}>返回退款申请</Link></EmptyContent>
      </Empty>
    )
  }

  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    if (!refund || !reviewer.trim() || !remark.trim() || refund.status !== 'pending') return

    reviewRefund(refund.id, {
      decision,
      reviewer: reviewer.trim(),
      remark: remark.trim(),
    })
    setSubmitted(false)
    toast.success(decision === 'approved' ? '退款申请已通过' : '退款申请已驳回')
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link to="/refunds" className={buttonVariants({ variant: 'ghost', className: 'w-fit' })}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回退款申请
        </Link>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{refund.refundCode}</h1>
            <RefundStatusBadge status={refund.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {refund.orderCode} · {formatRefundDateTime(refund.appliedAt)}
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          title="申请退款"
          value={formatRefundCurrency(refund.refundAmount)}
          description={`原实付 ${formatRefundCurrency(refund.originalPaidAmount)}`}
        />
        <SummaryCard title="申请用户" value={refund.userName} description={refund.userMobile} />
        <SummaryCard title="退款渠道" value={refund.refundChannel} description={refund.stationName} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <InformationCard title="申请信息" description="退款申请的关联订单和提交信息。">
          <DefinitionItem label="退款申请单号" value={refund.refundCode} />
          <DefinitionItem label="关联充电订单" value={refund.orderCode} />
          <DefinitionItem label="申请时间" value={formatRefundDateTime(refund.appliedAt)} />
          <DefinitionItem label="申请状态" value={<RefundStatusBadge status={refund.status} />} />
        </InformationCard>

        <InformationCard title="用户与场站" description="退款申请对应的用户和充电场站。">
          <DefinitionItem label="用户名称" value={refund.userName} />
          <DefinitionItem label="手机号" value={refund.userMobile} />
          <DefinitionItem className="sm:col-span-2" label="充电场站" value={refund.stationName} />
        </InformationCard>

        <InformationCard title="退款原因与金额" description="申请退款的原因、金额和退回渠道。">
          <DefinitionItem label="退款原因" value={getRefundReasonLabel(refund.reason)} />
          <DefinitionItem label="退款渠道" value={refund.refundChannel} />
          <DefinitionItem label="原实付金额" value={formatRefundCurrency(refund.originalPaidAmount)} />
          <DefinitionItem label="申请退款金额" value={formatRefundCurrency(refund.refundAmount)} />
          <DefinitionItem className="sm:col-span-2" label="申请说明" value={refund.reasonDescription} />
        </InformationCard>

        <InformationCard title="审核信息" description="退款申请的审核结论和处理记录。">
          <DefinitionItem label="审核人" value={refund.reviewer ?? '—'} />
          <DefinitionItem label="审核时间" value={formatRefundDateTime(refund.reviewedAt)} />
          <DefinitionItem className="sm:col-span-2" label="审核意见" value={refund.reviewRemark ?? '待审核'} />
        </InformationCard>
      </div>

      {refund.status === 'pending' ? (
        <Card>
          <CardHeader>
            <CardTitle>审核处理</CardTitle>
            <CardDescription>核对订单与退款依据后填写审核结论，提交后不可再次处理。</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-5" onSubmit={submitReview} noValidate>
              <FieldGroup className="grid gap-5 lg:grid-cols-2">
                <Field>
                  <FieldLabel>审核结论 *</FieldLabel>
                  <Select
                    items={reviewDecisionOptions}
                    value={decision}
                    onValueChange={(value) => setDecision(value as 'approved' | 'rejected')}
                  >
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectGroup>
                      {reviewDecisionOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectGroup></SelectContent>
                  </Select>
                </Field>
                <Field data-invalid={submitted && !reviewer.trim()}>
                  <FieldLabel htmlFor="refund-detail-reviewer">审核人 *</FieldLabel>
                  <Input
                    id="refund-detail-reviewer"
                    value={reviewer}
                    onChange={(event) => setReviewer(event.target.value)}
                    aria-invalid={submitted && !reviewer.trim()}
                  />
                  {submitted && !reviewer.trim() ? <FieldError>请输入审核人</FieldError> : null}
                </Field>
                <Field className="lg:col-span-2" data-invalid={submitted && !remark.trim()}>
                  <FieldLabel htmlFor="refund-detail-review-remark">审核意见 *</FieldLabel>
                  <Textarea
                    id="refund-detail-review-remark"
                    rows={4}
                    value={remark}
                    onChange={(event) => setRemark(event.target.value)}
                    aria-invalid={submitted && !remark.trim()}
                    placeholder={decision === 'approved' ? '填写审核依据和退款说明' : '填写驳回原因'}
                  />
                  {submitted && !remark.trim() ? <FieldError>请输入审核意见</FieldError> : null}
                </Field>
              </FieldGroup>
              <div className="flex justify-end border-t border-border pt-4">
                <Button type="submit" variant={decision === 'rejected' ? 'destructive' : 'default'}>
                  {decision === 'approved' ? '通过并退款' : '确认驳回'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
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
