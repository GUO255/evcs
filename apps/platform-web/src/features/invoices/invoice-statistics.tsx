import { useMemo, useState } from 'react'
import { BanknoteIcon, Clock3Icon, FileCheck2Icon, FilesIcon, SearchIcon } from '@/components/ui/icons'

import { TablePagination, useTablePagination } from '@/components/table-pagination'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import {
  formatInvoiceCurrency,
  formatInvoiceDateTime,
  getInvoiceSubjectTypeLabel,
  summarizeInvoices,
  summarizeInvoiceSubjects,
  type InvoiceRecord,
  type InvoiceSubjectType,
} from './invoice-data'

export function InvoiceMetrics({ records }: { records: readonly InvoiceRecord[] }) {
  const summary = summarizeInvoices(records)
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard icon={FilesIcon} title="开票申请" value={`${summary.applicationCount}`} description="累计申请数量" />
      <MetricCard icon={FileCheck2Icon} title="已开票" value={`${summary.issuedCount}`} description="已成功开具" />
      <MetricCard icon={BanknoteIcon} title="已开票金额" value={formatInvoiceCurrency(summary.issuedAmount)} description="仅统计已开票记录" />
      <MetricCard icon={Clock3Icon} title="待开票金额" value={formatInvoiceCurrency(summary.pendingAmount)} description={`${summary.pendingCount} 条待处理`} />
    </div>
  )
}

export function InvoiceSubjectStatistics({ records, subjectType }: { records: readonly InvoiceRecord[], subjectType: InvoiceSubjectType }) {
  const [query, setQuery] = useState('')
  const statistics = useMemo(() => summarizeInvoiceSubjects(records, subjectType), [records, subjectType])
  const filteredStatistics = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('zh-CN')
    return !keyword ? statistics : statistics.filter((statistic) => [statistic.subjectCode, statistic.subjectName]
      .some((value) => value.toLocaleLowerCase('zh-CN').includes(keyword)))
  }, [query, statistics])
  const pagination = useTablePagination(filteredStatistics, `${subjectType}\u0000${query}`)
  const label = getInvoiceSubjectTypeLabel(subjectType)

  return (
    <Card>
      <CardHeader><CardTitle>{label}开票统计</CardTitle><CardDescription>按{label}汇总开票申请数量及已开票金额。</CardDescription></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="relative max-w-xl">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`搜索${label}名称或编号`} aria-label={`搜索${label}开票统计`} />
        </div>
        {filteredStatistics.length ? (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader><TableRow><TableHead>{label}编号</TableHead><TableHead>{label}名称</TableHead><TableHead>申请数量</TableHead><TableHead>已开票数量</TableHead><TableHead>开票完成率</TableHead><TableHead>已开票金额</TableHead><TableHead>最近申请时间</TableHead></TableRow></TableHeader>
              <TableBody>{pagination.pageItems.map((statistic) => (
                <TableRow key={statistic.subjectCode}>
                  <TableCell className="font-medium">{statistic.subjectCode}</TableCell>
                  <TableCell>{statistic.subjectName}</TableCell>
                  <TableCell>{statistic.applicationCount} 条</TableCell>
                  <TableCell>{statistic.issuedCount} 条</TableCell>
                  <TableCell className="tabular-nums">{(statistic.issuedCount / statistic.applicationCount * 100).toFixed(1)}%</TableCell>
                  <TableCell className="font-medium tabular-nums">{formatInvoiceCurrency(statistic.issuedAmount)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatInvoiceDateTime(statistic.latestAppliedAt)}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </div>
        ) : (
          <Empty className="min-h-64 border"><EmptyHeader><EmptyMedia variant="icon"><FilesIcon /></EmptyMedia><EmptyTitle>没有匹配的统计数据</EmptyTitle><EmptyDescription>请调整搜索关键词。</EmptyDescription></EmptyHeader></Empty>
        )}
        <TablePagination total={filteredStatistics.length} unit={`个${label}`} pageIndex={pagination.pageIndex} pageCount={pagination.pageCount} onPageChange={pagination.changePage} />
      </CardContent>
    </Card>
  )
}

function MetricCard({ icon: Icon, title, value, description }: { icon: typeof FilesIcon, title: string, value: string, description: string }) {
  return <Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm font-medium"><Icon className="size-4 text-muted-foreground" /><span>{title}</span></CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{value}</p><CardDescription>{description}</CardDescription></CardContent></Card>
}
