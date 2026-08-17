import { useMemo, useState } from 'react'
import { ClipboardCheckIcon, EyeIcon, MoreHorizontalIcon, SearchIcon } from '@/components/ui/icons'

import { countListFilterValues, ListFilterOptionGroup, ListFilterRow, ListFilters, ListSearchField } from '@/components/list-filters'
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
import { TablePagination, useTablePagination } from '@/components/table-pagination'

import {
  formatRefundCurrency,
  formatRefundDateTime,
  getRefundReasonLabel,
  getRefundStatusLabel,
  refundStatusOptions,
  type RefundRecord,
  type RefundStatus,
} from './refund-data'

export function RefundRecords({
  refunds,
  title,
  description,
  showStatusFilter = true,
  onOpenRefund,
}: {
  refunds: readonly RefundRecord[]
  title: string
  description: string
  showStatusFilter?: boolean
  onOpenRefund: (refundId: string) => void
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<RefundStatus | 'all'>('all')
  const filteredRefunds = useMemo(() => refunds.filter((refund) => {
    const keyword = query.trim().toLocaleLowerCase('zh-CN')
    const matchesKeyword = !keyword || [refund.refundCode, refund.orderCode, refund.userName, refund.userMobile, refund.stationName]
      .some((value) => value.toLocaleLowerCase('zh-CN').includes(keyword))
    return matchesKeyword && (!showStatusFilter || status === 'all' || refund.status === status)
  }), [query, refunds, showStatusFilter, status])
  const pagination = useTablePagination(filteredRefunds, `${query}\u0000${showStatusFilter ? status : 'fixed'}`)

  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ListFilters>
          {showStatusFilter ? (
            <ListFilterRow label="退款状态">
              <ListFilterOptionGroup
                ariaLabel="按退款状态筛选"
                options={[{ value: 'all', label: '全部' }, ...refundStatusOptions]}
                counts={countListFilterValues(refunds, (refund) => refund.status)}
                hideAllCount
                value={status}
                onValueChange={setStatus}
              />
            </ListFilterRow>
          ) : null}
          <ListFilterRow label="搜索">
            <ListSearchField value={query} onValueChange={setQuery} placeholder="搜索退款单号、订单号、用户或场站" ariaLabel="搜索退款记录" />
          </ListFilterRow>
        </ListFilters>

        {filteredRefunds.length ? (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader><TableRow>
                <TableHead>退款申请</TableHead><TableHead>关联订单</TableHead><TableHead>用户 / 场站</TableHead>
                <TableHead>退款原因</TableHead><TableHead>退款金额</TableHead><TableHead>状态</TableHead><TableHead>审核信息</TableHead><TableHead><span className="sr-only">操作</span></TableHead>
              </TableRow></TableHeader>
              <TableBody>{pagination.pageItems.map((refund) => (
                <TableRow
                  key={refund.id}
                  className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  tabIndex={0}
                  onClick={() => onOpenRefund(refund.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') onOpenRefund(refund.id)
                  }}
                >
                  <TableCell><div className="flex min-w-40 flex-col gap-1"><span className="font-medium">{refund.refundCode}</span><span className="text-xs text-muted-foreground">{formatRefundDateTime(refund.appliedAt)}</span></div></TableCell>
                  <TableCell>{refund.orderCode}</TableCell>
                  <TableCell><div className="flex min-w-40 flex-col gap-1"><span>{refund.userName} · {refund.userMobile}</span><span className="text-xs text-muted-foreground">{refund.stationName}</span></div></TableCell>
                  <TableCell><div className="flex min-w-44 flex-col gap-1"><span>{getRefundReasonLabel(refund.reason)}</span><span className="text-xs text-muted-foreground">{refund.reasonDescription}</span></div></TableCell>
                  <TableCell><div className="flex min-w-28 flex-col gap-1"><span className="font-medium tabular-nums">{formatRefundCurrency(refund.refundAmount)}</span><span className="text-xs text-muted-foreground">{refund.refundChannel}</span></div></TableCell>
                  <TableCell><RefundStatusBadge status={refund.status} /></TableCell>
                  <TableCell><div className="flex min-w-36 flex-col gap-1"><span>{refund.reviewer ?? '—'}</span><span className="text-xs text-muted-foreground">{formatRefundDateTime(refund.reviewedAt)}</span></div></TableCell>
                  <TableCell
                    className="text-right"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`打开退款申请${refund.refundCode}操作菜单`} />}>
                        <MoreHorizontalIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => onOpenRefund(refund.id)}>
                          {refund.status === 'pending' ? <ClipboardCheckIcon /> : <EyeIcon />}
                          {refund.status === 'pending' ? '审核处理' : '查看详情'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          </div>
        ) : (
          <Empty className="min-h-56 border"><EmptyHeader><EmptyMedia variant="icon"><SearchIcon /></EmptyMedia><EmptyTitle>没有匹配记录</EmptyTitle><EmptyDescription>请调整搜索关键词或筛选条件。</EmptyDescription></EmptyHeader></Empty>
        )}
        <TablePagination total={filteredRefunds.length} unit="笔退款" pageIndex={pagination.pageIndex} pageCount={pagination.pageCount} onPageChange={pagination.changePage} />
      </CardContent>
    </Card>
  )
}

export function RefundStatusBadge({ status }: { status: RefundStatus }) {
  const variant = status === 'pending' ? 'secondary' : status === 'approved' ? 'default' : 'destructive'
  return <Badge variant={variant}>{getRefundStatusLabel(status)}</Badge>
}
