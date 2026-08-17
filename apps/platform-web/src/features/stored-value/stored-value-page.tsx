import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { CoinsIcon, EyeIcon, MoreHorizontalIcon } from '@/components/ui/icons'

import { countListFilterValues, ListFilterOptionGroup, ListFilterRow, ListFilters, ListSearchField } from '@/components/list-filters'
import { TablePagination, useTablePagination } from '@/components/table-pagination'
import { Badge } from '@/components/ui/badge'
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
  formatStoredValueCurrency,
  formatStoredValueDateTime,
  getStoredValueRecords,
  getStoredValueSubjectTypeLabel,
  getStoredValueTransactionTypeLabel,
  storedValueStatusOptions,
  storedValueSubjectTypeOptions,
  storedValueTransactionTypeOptions,
  type StoredValueSubjectType,
  type StoredValueTransactionStatus,
  type StoredValueTransactionType,
  type StoredValueRecord,
} from './stored-value-data'
import { StoredValueStatusBadge } from './stored-value-status-badge'

export function StoredValuePage() {
  const navigate = useNavigate()
  const records = getStoredValueRecords()
  const [query, setQuery] = useState('')
  const [subjectType, setSubjectType] = useState<StoredValueSubjectType | 'all'>('all')
  const [transactionType, setTransactionType] = useState<StoredValueTransactionType | 'all'>('all')
  const [status, setStatus] = useState<StoredValueTransactionStatus | 'all'>('all')
  const filteredRecords = useMemo(() => records.filter((record) => {
    const keyword = query.trim().toLocaleLowerCase('zh-CN')
    const matchesKeyword = !keyword || [
      record.transactionCode,
      record.subjectCode,
      record.subjectName,
      record.contact,
      record.relatedCode ?? '',
    ].some((value) => value.toLocaleLowerCase('zh-CN').includes(keyword))
    return matchesKeyword
      && (subjectType === 'all' || record.subjectType === subjectType)
      && (transactionType === 'all' || record.transactionType === transactionType)
      && (status === 'all' || record.status === status)
  }), [query, records, status, subjectType, transactionType])
  const pagination = useTablePagination(
    filteredRecords,
    `${query}\u0000${subjectType}\u0000${transactionType}\u0000${status}`,
  )

  function openRecord(record: StoredValueRecord) {
    void navigate({ to: '/stored-value/$recordId', params: { recordId: record.id } })
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">储值订单</h1>
        <p className="text-sm text-muted-foreground">查看用户及签约客户的储值流水与余额变动。</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>储值记录</CardTitle>
          <CardDescription>共 {records.length} 条记录，当前显示 {filteredRecords.length} 条。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ListFilters>
            <ListFilterRow label="主体类型">
              <ListFilterOptionGroup ariaLabel="按主体类型筛选" options={[{ value: 'all', label: '全部' }, ...storedValueSubjectTypeOptions]} counts={countListFilterValues(records, (record) => record.subjectType)} hideAllCount value={subjectType} onValueChange={setSubjectType} />
            </ListFilterRow>
            <ListFilterRow label="交易类型">
              <ListFilterOptionGroup ariaLabel="按交易类型筛选" options={[{ value: 'all', label: '全部' }, ...storedValueTransactionTypeOptions]} counts={countListFilterValues(records, (record) => record.transactionType)} hideAllCount value={transactionType} onValueChange={setTransactionType} />
            </ListFilterRow>
            <ListFilterRow label="订单状态">
              <ListFilterOptionGroup ariaLabel="按储值订单状态筛选" options={[{ value: 'all', label: '全部' }, ...storedValueStatusOptions]} counts={countListFilterValues(records, (record) => record.status)} hideAllCount value={status} onValueChange={setStatus} />
            </ListFilterRow>
            <ListFilterRow label="搜索">
              <ListSearchField
                value={query}
                onValueChange={setQuery}
                placeholder="搜索流水号、主体、联系方式或关联单号"
                ariaLabel="搜索储值记录"
              />
            </ListFilterRow>
          </ListFilters>

          {filteredRecords.length ? (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>流水信息</TableHead>
                  <TableHead>主体信息</TableHead>
                  <TableHead>交易类型</TableHead>
                  <TableHead>变动金额</TableHead>
                  <TableHead>余额变动</TableHead>
                  <TableHead>渠道 / 关联单号</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead className="text-right"><span className="sr-only">操作</span></TableHead>
                </TableRow></TableHeader>
                <TableBody>{pagination.pageItems.map((record) => (
                  <TableRow
                    key={record.id}
                    className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    tabIndex={0}
                    onClick={() => openRecord(record)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') openRecord(record)
                    }}
                  >
                    <TableCell><div className="flex min-w-40 flex-col gap-1"><span className="font-medium">{record.transactionCode}</span><span className="text-xs text-muted-foreground">{formatStoredValueDateTime(record.occurredAt)}</span></div></TableCell>
                    <TableCell><div className="flex min-w-48 flex-col items-start gap-1"><div className="flex items-center gap-2"><Badge variant={record.subjectType === 'user' ? 'secondary' : 'outline'}>{getStoredValueSubjectTypeLabel(record.subjectType)}</Badge><span className="font-medium">{record.subjectName}</span></div><span className="text-xs text-muted-foreground">{record.subjectCode} · {record.contact}</span></div></TableCell>
                    <TableCell><Badge variant="outline">{getStoredValueTransactionTypeLabel(record.transactionType)}</Badge></TableCell>
                    <TableCell className="font-medium tabular-nums">{record.amount > 0 ? '+' : ''}{formatStoredValueCurrency(record.amount)}</TableCell>
                    <TableCell><div className="flex min-w-48 items-center gap-2 whitespace-nowrap tabular-nums"><span>{formatStoredValueCurrency(record.balanceBefore)}</span><span className="text-muted-foreground">→</span><span className="font-medium">{formatStoredValueCurrency(record.balanceAfter)}</span></div></TableCell>
                    <TableCell><div className="flex min-w-40 flex-col gap-1"><span>{record.channel}</span><span className="text-xs text-muted-foreground">{record.relatedCode ?? '无关联单号'}</span></div></TableCell>
                    <TableCell><StoredValueStatusBadge status={record.status} /></TableCell>
                    <TableCell><span className="block min-w-40 text-sm text-muted-foreground">{record.remark}</span></TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`打开储值订单${record.transactionCode}操作菜单`} />}>
                          <MoreHorizontalIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={() => openRecord(record)}><EyeIcon />查看详情</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>
          ) : (
            <Empty className="min-h-64 border">
              <EmptyHeader>
                <EmptyMedia variant="icon"><CoinsIcon /></EmptyMedia>
                <EmptyTitle>没有匹配的储值记录</EmptyTitle>
                <EmptyDescription>请调整搜索关键词或筛选条件。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          <TablePagination total={filteredRecords.length} unit="条记录" pageIndex={pagination.pageIndex} pageCount={pagination.pageCount} onPageChange={pagination.changePage} />
        </CardContent>
      </Card>
    </section>
  )
}
