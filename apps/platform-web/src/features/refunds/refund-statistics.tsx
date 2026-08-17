import { BanknoteIcon, CheckCircle2Icon, Clock3Icon, FilesIcon } from '@/components/ui/icons'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { formatRefundCurrency, summarizeRefundReasons, summarizeRefunds, type RefundRecord } from './refund-data'

export function RefundMetrics({ refunds }: { refunds: readonly RefundRecord[] }) {
  const summary = summarizeRefunds(refunds)
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard icon={FilesIcon} title="退款申请" value={`${summary.totalCount}`} description="累计申请数量" />
      <MetricCard icon={Clock3Icon} title="待审核" value={`${summary.pendingCount}`} description="需要人工处理" />
      <MetricCard icon={BanknoteIcon} title="已退款金额" value={formatRefundCurrency(summary.approvedAmount)} description="审核通过并退款" />
      <MetricCard icon={CheckCircle2Icon} title="审核通过率" value={`${(summary.approvalRate * 100).toFixed(1)}%`} description="已审核申请通过比例" />
    </div>
  )
}

export function RefundStatistics({ refunds }: { refunds: readonly RefundRecord[] }) {
  const reasons = summarizeRefundReasons(refunds)
  return (
    <Card>
      <CardHeader><CardTitle>退款原因统计</CardTitle><CardDescription>按退款原因汇总申请数量和实际退款金额。</CardDescription></CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader><TableRow><TableHead>退款原因</TableHead><TableHead>申请数量</TableHead><TableHead>数量占比</TableHead><TableHead>已退款金额</TableHead></TableRow></TableHeader>
            <TableBody>{reasons.map((reason) => (
              <TableRow key={reason.value}>
                <TableCell className="font-medium">{reason.label}</TableCell>
                <TableCell>{reason.count} 笔</TableCell>
                <TableCell className="tabular-nums">{refunds.length ? (reason.count / refunds.length * 100).toFixed(1) : '0.0'}%</TableCell>
                <TableCell className="tabular-nums">{formatRefundCurrency(reason.approvedAmount)}</TableCell>
              </TableRow>
            ))}</TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function MetricCard({ icon: Icon, title, value, description }: { icon: typeof FilesIcon, title: string, value: string, description: string }) {
  return <Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm font-medium"><Icon className="size-4 text-muted-foreground" /><span>{title}</span></CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{value}</p><CardDescription>{description}</CardDescription></CardContent></Card>
}
