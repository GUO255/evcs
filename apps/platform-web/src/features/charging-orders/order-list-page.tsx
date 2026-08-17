import { useMemo, useState } from 'react'
import { EyeIcon, MoreHorizontalIcon, ReceiptTextIcon } from '@/components/ui/icons'

import { countListFilterValues, ListFilterOptionGroup, ListFilterRow, ListFilters, ListSearchField } from '@/components/list-filters'
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
  chargingOrderStatusOptions,
  formatChargingDuration,
  formatOrderCurrency,
  formatOrderDateTime,
  getChargingOrders,
  paymentStatusOptions,
  type ChargingOrder,
  type ChargingOrderStatus,
  type PaymentStatus,
} from './order-data'
import { ChargingOrderStatusBadge, PaymentStatusBadge } from './order-status-badges'

export function OrderListPage({ onViewOrder }: { onViewOrder: (order: ChargingOrder) => void }) {
  const orders = getChargingOrders()
  const [query, setQuery] = useState('')
  const [orderStatus, setOrderStatus] = useState<ChargingOrderStatus | 'all'>('all')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | 'all'>('all')
  const filteredOrders = useMemo(() => orders.filter((order) => {
    const keyword = query.trim().toLocaleLowerCase('zh-CN')
    const matchesKeyword = !keyword || [
      order.orderCode,
      order.userName,
      order.userMobile,
      order.vehiclePlate,
      order.stationName,
      order.deviceCode,
    ].some((value) => value.toLocaleLowerCase('zh-CN').includes(keyword))
    return matchesKeyword
      && (orderStatus === 'all' || order.status === orderStatus)
      && (paymentStatus === 'all' || order.paymentStatus === paymentStatus)
  }), [orderStatus, orders, paymentStatus, query])
  const pagination = useTablePagination(filteredOrders, `${query}\u0000${orderStatus}\u0000${paymentStatus}`)

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">充电订单</h1>
        <p className="text-sm text-muted-foreground">查看充电订单、充电数据、费用和支付状态。</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>充电订单</CardTitle>
          <CardDescription>共 {orders.length} 笔订单，当前显示 {filteredOrders.length} 笔。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ListFilters>
            <ListFilterRow label="订单状态">
              <ListFilterOptionGroup
                ariaLabel="按订单状态筛选"
                options={[{ value: 'all', label: '全部' }, ...chargingOrderStatusOptions]}
                counts={countListFilterValues(orders, (order) => order.status)}
                hideAllCount
                value={orderStatus}
                onValueChange={setOrderStatus}
              />
            </ListFilterRow>
            <ListFilterRow label="支付状态">
              <ListFilterOptionGroup
                ariaLabel="按支付状态筛选"
                options={[{ value: 'all', label: '全部' }, ...paymentStatusOptions]}
                counts={countListFilterValues(orders, (order) => order.paymentStatus)}
                hideAllCount
                value={paymentStatus}
                onValueChange={setPaymentStatus}
              />
            </ListFilterRow>
            <ListFilterRow label="搜索">
              <ListSearchField
                value={query}
                onValueChange={setQuery}
                placeholder="搜索订单号、用户、手机号、车牌、场站或设备"
                ariaLabel="搜索充电订单"
              />
            </ListFilterRow>
          </ListFilters>

          {filteredOrders.length ? (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>订单信息</TableHead>
                  <TableHead>用户 / 车辆</TableHead>
                  <TableHead>场站 / 设备</TableHead>
                  <TableHead>充电数据</TableHead>
                  <TableHead>订单金额</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead><span className="sr-only">操作</span></TableHead>
                </TableRow></TableHeader>
                <TableBody>{pagination.pageItems.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    tabIndex={0}
                    onClick={() => onViewOrder(order)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') onViewOrder(order)
                    }}
                  >
                    <TableCell><div className="flex min-w-44 flex-col gap-1"><span className="font-medium">{order.orderCode}</span><span className="text-xs text-muted-foreground">{formatOrderDateTime(order.startTime)}</span></div></TableCell>
                    <TableCell><div className="flex min-w-36 flex-col gap-1"><span>{order.userName}</span><span className="text-xs text-muted-foreground">{order.vehiclePlate} · {order.userMobile}</span></div></TableCell>
                    <TableCell><div className="flex min-w-44 flex-col gap-1"><span>{order.stationName}</span><span className="text-xs text-muted-foreground">{order.deviceCode} · {order.connectorCode}</span></div></TableCell>
                    <TableCell><div className="flex min-w-32 flex-col gap-1"><span>{order.energy.toFixed(2)} kWh</span><span className="text-xs text-muted-foreground">{formatChargingDuration(order.durationMinutes)}</span></div></TableCell>
                    <TableCell className="font-medium tabular-nums">{formatOrderCurrency(order.payableAmount)}</TableCell>
                    <TableCell><div className="flex min-w-20 flex-col items-start gap-1"><ChargingOrderStatusBadge status={order.status} /><PaymentStatusBadge status={order.paymentStatus} /></div></TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`打开订单${order.orderCode}操作菜单`} />}>
                          <MoreHorizontalIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={() => onViewOrder(order)}><EyeIcon />查看详情</DropdownMenuItem>
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
                <EmptyMedia variant="icon"><ReceiptTextIcon /></EmptyMedia>
                <EmptyTitle>没有匹配订单</EmptyTitle>
                <EmptyDescription>请调整搜索关键词或筛选条件。</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          <TablePagination total={filteredOrders.length} unit="笔订单" pageIndex={pagination.pageIndex} pageCount={pagination.pageCount} onPageChange={pagination.changePage} />
        </CardContent>
      </Card>
    </section>
  )
}
