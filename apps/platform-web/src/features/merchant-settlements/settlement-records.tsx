import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { EyeIcon, FileTextIcon, MoreHorizontalIcon } from '@/components/ui/icons'

import { countListFilterValues, ListFilterOptionGroup, ListFilterRow, ListFilters, ListSearchField } from '@/components/list-filters'
import { TablePagination, useTablePagination } from '@/components/table-pagination'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import {
  formatSettlementCurrency,
  formatSettlementDateTime,
  settlementStatusOptions,
  type MerchantSettlementRecord,
  type SettlementStatus,
} from './settlement-data'
import { SettlementStatusBadge } from './settlement-status-badge'

export function SettlementRecords({ records }: { records: readonly MerchantSettlementRecord[] }) {
  const navigate = useNavigate()
  const periods = useMemo(() => [...new Set(records.map((record) => record.period))].sort().reverse(), [records])
  const [query, setQuery] = useState('')
  const [period, setPeriod] = useState('all')
  const [status, setStatus] = useState<SettlementStatus | 'all'>('all')
  const filteredRecords = useMemo(() => records.filter((record) => {
    const keyword = query.trim().toLocaleLowerCase('zh-CN')
    const matchesKeyword = !keyword || [record.settlementCode, record.merchantCode, record.merchantName, record.paymentReference ?? '']
      .some((value) => value.toLocaleLowerCase('zh-CN').includes(keyword))
    return matchesKeyword && (period === 'all' || record.period === period) && (status === 'all' || record.status === status)
  }), [period, query, records, status])
  const pagination = useTablePagination(filteredRecords, `${query}\u0000${period}\u0000${status}`)

  function openSettlement(record: MerchantSettlementRecord) {
    void navigate({ to: '/merchant-settlements/$settlementId', params: { settlementId: record.id } })
  }

  return (
    <Card>
      <CardHeader><CardTitle>商户结算记录</CardTitle><CardDescription>共 {records.length} 条记录，当前显示 {filteredRecords.length} 条。</CardDescription></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ListFilters>
          <ListFilterRow label="结算周期">
            <ListFilterOptionGroup ariaLabel="按结算周期筛选" options={[{ value: 'all', label: '全部' }, ...periods.map((value) => ({ value, label: value }))]} counts={countListFilterValues(records, (record) => record.period)} hideAllCount value={period} onValueChange={setPeriod} />
          </ListFilterRow>
          <ListFilterRow label="结算状态">
            <ListFilterOptionGroup ariaLabel="按结算状态筛选" options={[{ value: 'all', label: '全部' }, ...settlementStatusOptions]} counts={countListFilterValues(records, (record) => record.status)} hideAllCount value={status} onValueChange={setStatus} />
          </ListFilterRow>
          <ListFilterRow label="搜索">
            <ListSearchField value={query} onValueChange={setQuery} placeholder="搜索结算单号、商户或付款流水" ariaLabel="搜索商户结算记录" />
          </ListFilterRow>
        </ListFilters>

        {filteredRecords.length ? (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader><TableRow><TableHead>结算单</TableHead><TableHead>商户信息</TableHead><TableHead>结算周期</TableHead><TableHead>交易总额</TableHead><TableHead>费用调整</TableHead><TableHead>应结金额</TableHead><TableHead>状态 / 付款信息</TableHead><TableHead className="text-right"><span className="sr-only">操作</span></TableHead></TableRow></TableHeader>
              <TableBody>{pagination.pageItems.map((record) => (
                <TableRow
                  key={record.id}
                  className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  tabIndex={0}
                  onClick={() => openSettlement(record)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') openSettlement(record)
                  }}
                >
                  <TableCell><div className="flex min-w-40 flex-col gap-1"><span className="font-medium">{record.settlementCode}</span><span className="text-xs text-muted-foreground">创建：{formatSettlementDateTime(record.createdAt)}</span></div></TableCell>
                  <TableCell><div className="flex min-w-52 flex-col gap-1"><span className="font-medium">{record.merchantName}</span><span className="text-xs text-muted-foreground">{record.merchantCode} · {record.contact}</span></div></TableCell>
                  <TableCell><div className="flex min-w-28 flex-col gap-1"><span>{record.period}</span><span className="text-xs text-muted-foreground">{record.orderCount} 笔订单</span></div></TableCell>
                  <TableCell className="tabular-nums">{formatSettlementCurrency(record.transactionAmount)}</TableCell>
                  <TableCell><div className="flex min-w-36 flex-col gap-1 tabular-nums"><span>服务费：-{formatSettlementCurrency(record.serviceFee)}</span><span className="text-xs text-muted-foreground">调整：{record.adjustmentAmount > 0 ? '+' : ''}{formatSettlementCurrency(record.adjustmentAmount)}</span></div></TableCell>
                  <TableCell className="font-medium tabular-nums">{formatSettlementCurrency(record.settlementAmount)}</TableCell>
                  <TableCell><div className="flex min-w-44 flex-col items-start gap-1"><SettlementStatusBadge status={record.status} /><span className="text-xs text-muted-foreground">{record.paymentReference ?? record.remark}</span>{record.settledAt ? <span className="text-xs text-muted-foreground">到账：{formatSettlementDateTime(record.settledAt)}</span> : null}</div></TableCell>
                  <TableCell
                    className="text-right"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`打开商户结算${record.settlementCode}操作菜单`} />}>
                        <MoreHorizontalIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => openSettlement(record)}><EyeIcon />查看详情</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </div>
        ) : (
          <Empty className="min-h-64 border"><EmptyHeader><EmptyMedia variant="icon"><FileTextIcon /></EmptyMedia><EmptyTitle>没有匹配的结算记录</EmptyTitle><EmptyDescription>请调整搜索关键词或筛选条件。</EmptyDescription></EmptyHeader></Empty>
        )}
        <TablePagination total={filteredRecords.length} unit="条记录" pageIndex={pagination.pageIndex} pageCount={pagination.pageCount} onPageChange={pagination.changePage} />
      </CardContent>
    </Card>
  )
}
