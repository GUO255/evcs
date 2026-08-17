import { useMemo, useState } from 'react'
import { BanknoteIcon, CheckCircle2Icon, Clock3Icon, FileTextIcon } from '@/components/ui/icons'

import { ListFilterRow, ListFilters, ListSearchField } from '@/components/list-filters'
import { TablePagination, useTablePagination } from '@/components/table-pagination'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import {
  formatSettlementCurrency,
  formatSettlementDateTime,
  summarizeMerchantSettlements,
  summarizeSettlementsByMerchant,
  type MerchantSettlementRecord,
} from './settlement-data'

export function SettlementMetrics({ records }: { records: readonly MerchantSettlementRecord[] }) {
  const summary = summarizeMerchantSettlements(records)
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard icon={FileTextIcon} title="结算单" value={`${summary.totalCount}`} description="累计生成数量" />
      <MetricCard icon={CheckCircle2Icon} title="已结算" value={`${summary.settledCount}`} description="已完成打款" />
      <MetricCard icon={BanknoteIcon} title="实结金额" value={formatSettlementCurrency(summary.settledAmount)} description="仅统计已结算记录" />
      <MetricCard icon={Clock3Icon} title="待结算金额" value={formatSettlementCurrency(summary.pendingAmount)} description={`${summary.pendingCount} 条待处理`} />
    </div>
  )
}

export function SettlementStatistics({ records }: { records: readonly MerchantSettlementRecord[] }) {
  const [query, setQuery] = useState('')
  const statistics = useMemo(() => summarizeSettlementsByMerchant(records), [records])
  const filteredStatistics = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('zh-CN')
    return !keyword ? statistics : statistics.filter((statistic) => [statistic.merchantCode, statistic.merchantName]
      .some((value) => value.toLocaleLowerCase('zh-CN').includes(keyword)))
  }, [query, statistics])
  const pagination = useTablePagination(filteredStatistics, query)

  return (
    <Card>
      <CardHeader><CardTitle>商户结算统计</CardTitle><CardDescription>按商户汇总交易金额、应结金额和实际结算情况。</CardDescription></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ListFilters>
          <ListFilterRow label="搜索">
            <ListSearchField value={query} onValueChange={setQuery} placeholder="搜索商户名称或编号" ariaLabel="搜索商户结算统计" />
          </ListFilterRow>
        </ListFilters>
        {filteredStatistics.length ? (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader><TableRow><TableHead>商户编号</TableHead><TableHead>商户名称</TableHead><TableHead>结算单</TableHead><TableHead>结算完成率</TableHead><TableHead>交易总额</TableHead><TableHead>应结金额</TableHead><TableHead>实结金额</TableHead><TableHead>最近结算单</TableHead></TableRow></TableHeader>
              <TableBody>{pagination.pageItems.map((statistic) => (
                <TableRow key={statistic.merchantCode}>
                  <TableCell className="font-medium">{statistic.merchantCode}</TableCell>
                  <TableCell>{statistic.merchantName}</TableCell>
                  <TableCell>{statistic.settlementCount} 条</TableCell>
                  <TableCell className="tabular-nums">{(statistic.settledCount / statistic.settlementCount * 100).toFixed(1)}%</TableCell>
                  <TableCell className="tabular-nums">{formatSettlementCurrency(statistic.transactionAmount)}</TableCell>
                  <TableCell className="tabular-nums">{formatSettlementCurrency(statistic.settlementAmount)}</TableCell>
                  <TableCell className="font-medium tabular-nums">{formatSettlementCurrency(statistic.settledAmount)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatSettlementDateTime(statistic.latestCreatedAt)}</TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </div>
        ) : (
          <Empty className="min-h-64 border"><EmptyHeader><EmptyMedia variant="icon"><FileTextIcon /></EmptyMedia><EmptyTitle>没有匹配的统计数据</EmptyTitle><EmptyDescription>请调整搜索关键词。</EmptyDescription></EmptyHeader></Empty>
        )}
        <TablePagination total={filteredStatistics.length} unit="个商户" pageIndex={pagination.pageIndex} pageCount={pagination.pageCount} onPageChange={pagination.changePage} />
      </CardContent>
    </Card>
  )
}

function MetricCard({ icon: Icon, title, value, description }: { icon: typeof FileTextIcon, title: string, value: string, description: string }) {
  return <Card><CardHeader><CardTitle className="flex items-center gap-2 text-sm font-medium"><Icon className="size-4 text-muted-foreground" /><span>{title}</span></CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{value}</p><CardDescription>{description}</CardDescription></CardContent></Card>
}
