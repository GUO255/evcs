import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { EyeIcon, MoreHorizontalIcon, ShoppingBasketIcon } from '@/components/ui/icons'

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
  formatMallCurrency,
  formatMallDateTime,
  initialMallOrders,
  mallOrderStatusFilterOptions,
  mallOrderStatusLabels,
  mallPaymentMethodLabels,
} from '../mall/mall-data'
import type { MallOrder, MallOrderStatus } from '../mall/mall-types'

type MallOrderStatusFilter = MallOrderStatus | 'all'

export function MallOrderPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<MallOrderStatusFilter>('all')
  const filteredOrders = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('zh-CN')
    return initialMallOrders.filter((order) => {
      const matchesKeyword = !keyword || [
        order.orderNo,
        order.buyerName,
        order.maskedMobile,
        order.productName,
        order.sku,
      ].some((value) => value.toLocaleLowerCase('zh-CN').includes(keyword))
      return matchesKeyword && (status === 'all' || order.status === status)
    })
  }, [query, status])
  const pagination = useTablePagination(filteredOrders, `${query}\u0000${status}`)

  function openOrder(order: MallOrder) {
    void navigate({ to: '/mall-orders/$orderId', params: { orderId: order.id } })
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">商城购买订单</h1>
        <p className="text-sm text-muted-foreground">查看用户商城商品购买、支付和履约记录。</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>商城购买订单</CardTitle>
          <CardDescription>共 {initialMallOrders.length} 笔订单，当前显示 {filteredOrders.length} 笔。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ListFilters>
            <ListFilterRow label="订单状态">
              <ListFilterOptionGroup
                ariaLabel="按商城订单状态筛选"
                options={mallOrderStatusFilterOptions.map((option) => (
                  option.value === 'all' ? { ...option, label: '全部' } : option
                ))}
                counts={countListFilterValues(initialMallOrders, (order) => order.status)}
                hideAllCount
                value={status}
                onValueChange={setStatus}
              />
            </ListFilterRow>
            <ListFilterRow label="搜索">
              <ListSearchField
                value={query}
                onValueChange={setQuery}
                placeholder="搜索订单号、用户、手机号、商品或 SKU"
                ariaLabel="搜索商城购买订单"
              />
            </ListFilterRow>
          </ListFilters>

          {filteredOrders.length ? (
            <Table containerClassName="rounded-lg border" className="min-w-max">
              <TableHeader><TableRow>
                <TableHead>订单信息</TableHead>
                <TableHead>购买用户</TableHead>
                <TableHead>商品</TableHead>
                <TableHead>数量</TableHead>
                <TableHead>实付金额</TableHead>
                <TableHead>支付方式</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right"><span className="sr-only">操作</span></TableHead>
              </TableRow></TableHeader>
              <TableBody>{pagination.pageItems.map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  tabIndex={0}
                  onClick={() => openOrder(order)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') openOrder(order)
                  }}
                >
                  <TableCell><div className="flex min-w-44 flex-col gap-1"><span className="font-medium">{order.orderNo}</span><span className="text-xs text-muted-foreground">{formatMallDateTime(order.createdAt)}</span></div></TableCell>
                  <TableCell><div className="flex min-w-32 flex-col gap-1"><span>{order.buyerName}</span><span className="text-xs text-muted-foreground">{order.maskedMobile}</span></div></TableCell>
                  <TableCell><div className="flex min-w-56 flex-col gap-1"><span className="font-medium">{order.productName}</span><span className="text-xs text-muted-foreground">{order.sku}</span></div></TableCell>
                  <TableCell className="tabular-nums">{order.quantity}</TableCell>
                  <TableCell className="font-medium tabular-nums">{formatMallPaidAmount(order)}</TableCell>
                  <TableCell>{mallPaymentMethodLabels[order.paymentMethod]}</TableCell>
                  <TableCell><MallOrderStatusBadge status={order.status} /></TableCell>
                  <TableCell
                    className="text-right"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`打开订单${order.orderNo}操作菜单`} />}>
                        <MoreHorizontalIcon />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => openOrder(order)}><EyeIcon />查看详情</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          ) : (
            <Empty className="min-h-48 border">
              <EmptyHeader>
                <EmptyMedia variant="icon"><ShoppingBasketIcon /></EmptyMedia>
                <EmptyTitle>没有匹配的商城购买订单</EmptyTitle>
                <EmptyDescription>请调整搜索关键词或状态筛选。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          <TablePagination total={filteredOrders.length} unit="笔订单" pageIndex={pagination.pageIndex} pageCount={pagination.pageCount} onPageChange={pagination.changePage} />
        </CardContent>
      </Card>
    </section>
  )
}

export function MallOrderStatusBadge({ status }: { status: MallOrderStatus }) {
  const variant = status === 'cancelled'
    ? 'destructive'
    : status === 'completed'
      ? 'default'
      : status === 'paid' || status === 'shipped'
        ? 'secondary'
        : 'outline'
  return <Badge variant={variant}>{mallOrderStatusLabels[status]}</Badge>
}

function formatMallPaidAmount(order: MallOrder): string {
  return order.status === 'pending-payment' || order.status === 'cancelled'
    ? '—'
    : formatMallCurrency(order.totalAmountCents)
}
