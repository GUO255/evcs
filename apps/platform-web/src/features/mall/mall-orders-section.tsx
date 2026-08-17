import { useMemo, useState } from 'react'
import { countListFilterValues, ListFilterOptionGroup, ListFilterRow, ListFilters, ListSearchField } from '@/components/list-filters'
import { TablePagination, useTablePagination } from '@/components/table-pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import {
  formatMallCurrency,
  formatMallDateTime,
  mallOrderStatusFilterOptions,
  mallOrderStatusLabels,
  mallPaymentMethodLabels,
} from './mall-data'
import type { MallOrder, MallOrderStatus } from './mall-types'

type OrderStatusFilter = MallOrderStatus | 'all'
type BadgeVariant = 'secondary' | 'destructive' | 'outline'

interface MallOrdersSectionProps {
  orders: readonly MallOrder[]
}

function getOrderStatusBadgeVariant(status: MallOrderStatus): BadgeVariant {
  if (status === 'cancelled') {
    return 'destructive'
  }

  if (status === 'paid' || status === 'shipped' || status === 'completed') {
    return 'secondary'
  }

  return 'outline'
}

function DetailItem({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  )
}

export function MallOrdersSection({ orders }: MallOrdersSectionProps) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] =
    useState<OrderStatusFilter>('all')
  const [selectedOrder, setSelectedOrder] = useState<MallOrder>()

  const filteredOrders = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('zh-CN')

    return orders.filter((order) => {
      const matchesKeyword = !keyword
        || [
          order.orderNo,
          order.buyerName,
          order.maskedMobile,
          order.productName,
          order.sku,
        ].some((value) =>
          value.trim().toLocaleLowerCase('zh-CN').includes(keyword),
        )
      const matchesStatus =
        statusFilter === 'all' || order.status === statusFilter

      return matchesKeyword && matchesStatus
    })
  }, [orders, query, statusFilter])
  const pagination = useTablePagination(filteredOrders, `${query}\u0000${statusFilter}`)

  return (
    <Card>
      <CardHeader>
        <CardTitle>商城订单</CardTitle>
        <CardDescription>
          共 {orders.length} 笔订单，只读 MOCK 数据。
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <ListFilters>
          <ListFilterRow label="订单状态">
            <ListFilterOptionGroup
              ariaLabel="按订单状态筛选"
              options={mallOrderStatusFilterOptions.map((option) => option.value === 'all' ? { ...option, label: '全部' } : option)}
              counts={countListFilterValues(orders, (order) => order.status)}
              hideAllCount
              value={statusFilter}
              onValueChange={setStatusFilter}
            />
          </ListFilterRow>
          <ListFilterRow label="搜索">
            <ListSearchField value={query} onValueChange={setQuery} placeholder="搜索订单号、用户、手机号、商品或 SKU" ariaLabel="搜索商城订单" />
          </ListFilterRow>
        </ListFilters>

        <Table containerClassName="rounded-lg border" className="min-w-max">
          <TableHeader>
            <TableRow>
              <TableHead>订单号/时间</TableHead>
              <TableHead>用户信息</TableHead>
              <TableHead>商品</TableHead>
              <TableHead>数量</TableHead>
              <TableHead>实付金额</TableHead>
              <TableHead>支付方式</TableHead>
              <TableHead>状态</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-muted-foreground"
                >
                  暂无符合条件的商城订单
                </TableCell>
              </TableRow>
            ) : pagination.pageItems.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-mono font-medium">
                      {order.orderNo}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatMallDateTime(order.createdAt)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{order.buyerName}</span>
                    <span className="text-xs text-muted-foreground">
                      {order.maskedMobile}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex min-w-56 max-w-72 flex-col gap-1">
                    <span className="font-medium">{order.productName}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {order.sku}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="tabular-nums">
                  {order.quantity}
                </TableCell>
                <TableCell className="tabular-nums font-medium">
                  {formatMallCurrency(order.totalAmountCents)}
                </TableCell>
                <TableCell>
                  {mallPaymentMethodLabels[order.paymentMethod]}
                </TableCell>
                <TableCell>
                  <Badge variant={getOrderStatusBadgeVariant(order.status)}>
                    {mallOrderStatusLabels[order.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedOrder(order)}
                  >
                    查看详情
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination total={filteredOrders.length} unit="笔订单" pageIndex={pagination.pageIndex} pageCount={pagination.pageCount} onPageChange={pagination.changePage} />
      </CardContent>

      <Sheet
        open={Boolean(selectedOrder)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOrder(undefined)
          }
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>订单详情</SheetTitle>
            <SheetDescription>
              {selectedOrder
                ? `查看订单 ${selectedOrder.orderNo} 的完整只读信息。`
                : '查看商城订单的完整只读信息。'}
            </SheetDescription>
          </SheetHeader>

          {selectedOrder ? (
            <div className="flex flex-col gap-4 px-4 pb-4">
              <Card size="sm">
                <CardHeader>
                  <CardTitle>订单信息</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <DetailItem label="订单状态">
                      <Badge
                        variant={getOrderStatusBadgeVariant(
                          selectedOrder.status,
                        )}
                      >
                        {mallOrderStatusLabels[selectedOrder.status]}
                      </Badge>
                    </DetailItem>
                    <DetailItem label="订单号">
                      <span className="font-mono">{selectedOrder.orderNo}</span>
                    </DetailItem>
                    <DetailItem label="创建时间">
                      {formatMallDateTime(selectedOrder.createdAt)}
                    </DetailItem>
                    <DetailItem label="支付方式">
                      {mallPaymentMethodLabels[selectedOrder.paymentMethod]}
                    </DetailItem>
                  </dl>
                </CardContent>
              </Card>

              <Card size="sm">
                <CardHeader>
                  <CardTitle>商品与金额</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <DetailItem label="商品名称">
                      {selectedOrder.productName}
                    </DetailItem>
                    <DetailItem label="商品 SKU">
                      <span className="font-mono">{selectedOrder.sku}</span>
                    </DetailItem>
                    <DetailItem label="数量">
                      {selectedOrder.quantity}
                    </DetailItem>
                    <DetailItem label="实付金额">
                      <span className="tabular-nums">
                        {formatMallCurrency(selectedOrder.totalAmountCents)}
                      </span>
                    </DetailItem>
                  </dl>
                </CardContent>
              </Card>

              <Card size="sm">
                <CardHeader>
                  <CardTitle>用户与收货信息</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <dl className="grid gap-4 sm:grid-cols-2">
                    <DetailItem label="购买用户">
                      {selectedOrder.buyerName}
                    </DetailItem>
                    <DetailItem label="用户手机号">
                      {selectedOrder.maskedMobile}
                    </DetailItem>
                  </dl>
                  <Separator />
                  {selectedOrder.receiver ? (
                    <dl className="grid gap-4 sm:grid-cols-2">
                      <DetailItem label="收货人">
                        {selectedOrder.receiver.name}
                      </DetailItem>
                      <DetailItem label="收货手机号">
                        {selectedOrder.receiver.maskedMobile}
                      </DetailItem>
                      <div className="sm:col-span-2">
                        <DetailItem label="收货地址">
                          {selectedOrder.receiver.address}
                        </DetailItem>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      无需收货信息
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card size="sm">
                <CardHeader>
                  <CardTitle>物流信息</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedOrder.tracking ? (
                    <dl className="grid gap-4 sm:grid-cols-2">
                      <DetailItem label="物流公司">
                        {selectedOrder.tracking.company}
                      </DetailItem>
                      <DetailItem label="物流单号">
                        <span className="font-mono">
                          {selectedOrder.tracking.trackingNo}
                        </span>
                      </DetailItem>
                    </dl>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      暂无物流信息
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </Card>
  )
}
