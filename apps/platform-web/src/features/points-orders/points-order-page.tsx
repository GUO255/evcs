import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { EyeIcon, GiftIcon, MoreHorizontalIcon } from '@/components/ui/icons'

import { countListFilterValues, ListFilterOptionGroup, ListFilterRow, ListFilters, ListSearchField } from '@/components/list-filters'
import { TablePagination, useTablePagination } from '@/components/table-pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import {
  formatPoints,
  formatPointsOrderDateTime,
  getPointsOrders,
  getPointsOrderStatusLabel,
  pointsOrderStatusOptions,
  pointsProductTypeLabels,
  type PointsOrder,
  type PointsOrderStatus,
} from './points-order-data'

export function PointsOrderPage() {
  const navigate = useNavigate()
  const orders = getPointsOrders()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<PointsOrderStatus | 'all'>('all')
  const filteredOrders = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('zh-CN')
    return orders.filter((order) => {
      const matchesKeyword = !keyword || [
        order.orderCode,
        order.userName,
        order.maskedMobile,
        order.productName,
      ].some((value) => value.toLocaleLowerCase('zh-CN').includes(keyword))
      return matchesKeyword && (status === 'all' || order.status === status)
    })
  }, [orders, query, status])
  const pagination = useTablePagination(filteredOrders, `${query}\u0000${status}`)

  function openOrder(order: PointsOrder) {
    void navigate({ to: '/points-orders/$orderId', params: { orderId: order.id } })
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">积分兑换订单</h1>
        <p className="text-sm text-muted-foreground">查看用户积分商品兑换、扣减和履约记录。</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>积分兑换订单</CardTitle>
          <CardDescription>共 {orders.length} 笔订单，当前显示 {filteredOrders.length} 笔。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ListFilters>
            <ListFilterRow label="兑换状态">
              <ListFilterOptionGroup
                ariaLabel="按积分兑换状态筛选"
                options={[{ value: 'all', label: '全部' }, ...pointsOrderStatusOptions]}
                counts={countListFilterValues(orders, (order) => order.status)}
                hideAllCount
                value={status}
                onValueChange={setStatus}
              />
            </ListFilterRow>
            <ListFilterRow label="搜索">
              <ListSearchField value={query} onValueChange={setQuery} placeholder="搜索兑换单号、用户、手机号或商品" ariaLabel="搜索积分兑换订单" />
            </ListFilterRow>
          </ListFilters>

          {filteredOrders.length ? (
            <Table containerClassName="rounded-lg border" className="min-w-max">
              <TableHeader><TableRow>
                <TableHead>兑换单信息</TableHead>
                <TableHead>兑换用户</TableHead>
                <TableHead>兑换商品</TableHead>
                <TableHead>数量</TableHead>
                <TableHead>消耗积分</TableHead>
                <TableHead>履约方式</TableHead>
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
                  <TableCell><div className="flex min-w-44 flex-col gap-1"><span className="font-medium">{order.orderCode}</span><span className="text-xs text-muted-foreground">{formatPointsOrderDateTime(order.createdAt)}</span></div></TableCell>
                  <TableCell><div className="flex min-w-32 flex-col gap-1"><span>{order.userName}</span><span className="text-xs text-muted-foreground">{order.maskedMobile}</span></div></TableCell>
                  <TableCell><div className="flex min-w-48 flex-col items-start gap-1"><span className="font-medium">{order.productName}</span><Badge variant="outline">{pointsProductTypeLabels[order.productType]}</Badge></div></TableCell>
                  <TableCell className="tabular-nums">{order.quantity}</TableCell>
                  <TableCell className="font-medium tabular-nums">{formatPoints(order.pointsCost)}</TableCell>
                  <TableCell>{order.fulfillmentMethod}</TableCell>
                  <TableCell><PointsOrderStatusBadge status={order.status} /></TableCell>
                  <TableCell className="text-right" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`打开兑换单${order.orderCode}操作菜单`} />}><MoreHorizontalIcon /></DropdownMenuTrigger>
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
              <EmptyHeader><EmptyMedia variant="icon"><GiftIcon /></EmptyMedia><EmptyTitle>没有匹配的积分兑换订单</EmptyTitle><EmptyDescription>请调整搜索关键词或状态筛选。</EmptyDescription></EmptyHeader>
            </Empty>
          )}
          <TablePagination total={filteredOrders.length} unit="笔订单" pageIndex={pagination.pageIndex} pageCount={pagination.pageCount} onPageChange={pagination.changePage} />
        </CardContent>
      </Card>
    </section>
  )
}

export function PointsOrderStatusBadge({ status }: { status: PointsOrderStatus }) {
  const variant = status === 'completed' ? 'default' : status === 'cancelled' || status === 'failed' ? 'destructive' : 'secondary'
  return <Badge variant={variant}>{getPointsOrderStatusLabel(status)}</Badge>
}
