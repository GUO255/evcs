import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { EyeIcon, MoreHorizontalIcon, ReceiptTextIcon } from '@/components/ui/icons'

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
  formatInvoiceCurrency,
  formatInvoiceDateTime,
  getInvoiceSubjectTypeLabel,
  getInvoiceTypeLabel,
  invoiceStatusOptions,
  invoiceSubjectTypeOptions,
  invoiceTypeOptions,
  type InvoiceRecord,
  type InvoiceStatus,
  type InvoiceSubjectType,
  type InvoiceType,
} from './invoice-data'
import { InvoiceStatusBadge } from './invoice-status-badge'

export function InvoiceRecords({ records }: { records: readonly InvoiceRecord[] }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [subjectType, setSubjectType] = useState<InvoiceSubjectType | 'all'>('all')
  const [invoiceType, setInvoiceType] = useState<InvoiceType | 'all'>('all')
  const [status, setStatus] = useState<InvoiceStatus | 'all'>('all')
  const filteredRecords = useMemo(() => records.filter((record) => {
    const keyword = query.trim().toLocaleLowerCase('zh-CN')
    const matchesKeyword = !keyword || [
      record.applicationCode,
      record.invoiceNumber ?? '',
      record.subjectCode,
      record.subjectName,
      record.invoiceTitle,
      record.taxNumber ?? '',
    ].some((value) => value.toLocaleLowerCase('zh-CN').includes(keyword))
    return matchesKeyword
      && (subjectType === 'all' || record.subjectType === subjectType)
      && (invoiceType === 'all' || record.invoiceType === invoiceType)
      && (status === 'all' || record.status === status)
  }), [invoiceType, query, records, status, subjectType])
  const pagination = useTablePagination(
    filteredRecords,
    `${query}\u0000${subjectType}\u0000${invoiceType}\u0000${status}`,
  )

  function openInvoice(record: InvoiceRecord) {
    void navigate({ to: '/invoices/$invoiceId', params: { invoiceId: record.id } })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>开票记录</CardTitle>
        <CardDescription>共 {records.length} 条记录，当前显示 {filteredRecords.length} 条。</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ListFilters>
          <ListFilterRow label="主体类型">
            <ListFilterOptionGroup ariaLabel="按开票主体筛选" options={[{ value: 'all', label: '全部' }, ...invoiceSubjectTypeOptions]} counts={countListFilterValues(records, (record) => record.subjectType)} hideAllCount value={subjectType} onValueChange={setSubjectType} />
          </ListFilterRow>
          <ListFilterRow label="发票类型">
            <ListFilterOptionGroup ariaLabel="按发票类型筛选" options={[{ value: 'all', label: '全部' }, ...invoiceTypeOptions]} counts={countListFilterValues(records, (record) => record.invoiceType)} hideAllCount value={invoiceType} onValueChange={setInvoiceType} />
          </ListFilterRow>
          <ListFilterRow label="申请状态">
            <ListFilterOptionGroup ariaLabel="按发票申请状态筛选" options={[{ value: 'all', label: '全部' }, ...invoiceStatusOptions]} counts={countListFilterValues(records, (record) => record.status)} hideAllCount value={status} onValueChange={setStatus} />
          </ListFilterRow>
          <ListFilterRow label="搜索">
            <ListSearchField value={query} onValueChange={setQuery} placeholder="搜索申请单号、发票号码、主体或税号" ariaLabel="搜索开票记录" />
          </ListFilterRow>
        </ListFilters>

        {filteredRecords.length ? (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader><TableRow>
                <TableHead>申请信息</TableHead><TableHead>开票主体</TableHead><TableHead>发票抬头</TableHead><TableHead>开票金额</TableHead><TableHead>关联订单</TableHead><TableHead>发票信息</TableHead><TableHead>状态</TableHead><TableHead className="text-right"><span className="sr-only">操作</span></TableHead>
              </TableRow></TableHeader>
              <TableBody>{pagination.pageItems.map((record) => (
                <TableRow
                  key={record.id}
                  className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  tabIndex={0}
                  onClick={() => openInvoice(record)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') openInvoice(record)
                  }}
                >
                  <TableCell><div className="flex min-w-40 flex-col gap-1"><span className="font-medium">{record.applicationCode}</span><span className="text-xs text-muted-foreground">申请：{formatInvoiceDateTime(record.appliedAt)}</span></div></TableCell>
                  <TableCell><div className="flex min-w-48 flex-col items-start gap-1"><div className="flex items-center gap-2"><Badge variant="outline">{getInvoiceSubjectTypeLabel(record.subjectType)}</Badge><span className="font-medium">{record.subjectName}</span></div><span className="text-xs text-muted-foreground">{record.subjectCode} · {record.contact}</span></div></TableCell>
                  <TableCell><div className="flex min-w-52 flex-col gap-1"><span>{record.invoiceTitle}</span><span className="text-xs text-muted-foreground">{record.taxNumber ?? '个人抬头，无税号'}</span></div></TableCell>
                  <TableCell className="font-medium tabular-nums">{formatInvoiceCurrency(record.amount)}</TableCell>
                  <TableCell>{record.orderCount} 笔</TableCell>
                  <TableCell><div className="flex min-w-48 flex-col gap-1"><span>{getInvoiceTypeLabel(record.invoiceType)}</span><span className="text-xs text-muted-foreground">{record.invoiceNumber ?? '尚未生成发票号码'}</span>{record.issuedAt ? <span className="text-xs text-muted-foreground">开票：{formatInvoiceDateTime(record.issuedAt)}</span> : null}</div></TableCell>
                  <TableCell><InvoiceStatusBadge status={record.status} /></TableCell>
                  <TableCell
                    className="text-right"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`打开发票申请${record.applicationCode}操作菜单`} />}>
                        <MoreHorizontalIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => openInvoice(record)}><EyeIcon />查看详情</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </div>
        ) : (
          <Empty className="min-h-64 border"><EmptyHeader><EmptyMedia variant="icon"><ReceiptTextIcon /></EmptyMedia><EmptyTitle>没有匹配的开票记录</EmptyTitle><EmptyDescription>请调整搜索关键词或筛选条件。</EmptyDescription></EmptyHeader></Empty>
        )}
        <TablePagination total={filteredRecords.length} unit="条记录" pageIndex={pagination.pageIndex} pageCount={pagination.pageCount} onPageChange={pagination.changePage} />
      </CardContent>
    </Card>
  )
}
