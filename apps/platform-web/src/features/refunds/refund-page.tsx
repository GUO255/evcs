import { useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { RefundRecords } from './refund-records'
import { RefundStatistics, RefundMetrics } from './refund-statistics'
import { useRefunds } from './refund-store'

export function RefundPage() {
  const navigate = useNavigate()
  const { refunds } = useRefunds()
  const pendingRefunds = useMemo(() => refunds.filter((refund) => refund.status === 'pending'), [refunds])

  function openRefund(refundId: string) {
    void navigate({ to: '/refunds/$refundId', params: { refundId } })
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">退款申请</h1>
        <p className="text-sm text-muted-foreground">处理充电订单退款申请、审核流程和退款统计。</p>
      </header>

      <RefundMetrics refunds={refunds} />

      <Tabs defaultValue="records" className="gap-4">
        <TabsList variant="line" className="!h-auto flex-wrap justify-start">
          <TabsTrigger value="records">退款记录</TabsTrigger>
          <TabsTrigger value="reviews">待审核（{pendingRefunds.length}）</TabsTrigger>
          <TabsTrigger value="statistics">退款统计</TabsTrigger>
        </TabsList>
        <TabsContent value="records">
          <RefundRecords refunds={refunds} title="退款记录" description={`共 ${refunds.length} 笔退款申请。`} onOpenRefund={openRefund} />
        </TabsContent>
        <TabsContent value="reviews">
          <RefundRecords refunds={pendingRefunds} title="待审核申请" description="审核通过后将按原支付渠道退款；驳回后保留审核记录。" showStatusFilter={false} onOpenRefund={openRefund} />
        </TabsContent>
        <TabsContent value="statistics"><RefundStatistics refunds={refunds} /></TabsContent>
      </Tabs>
    </section>
  )
}
