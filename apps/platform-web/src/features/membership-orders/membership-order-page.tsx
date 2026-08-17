import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { CrownIcon, EyeIcon, MoreHorizontalIcon } from '@/components/ui/icons'

import { countListFilterValues, ListFilterOptionGroup, ListFilterRow, ListFilters, ListSearchField } from '@/components/list-filters'
import { TablePagination, useTablePagination } from '@/components/table-pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import {
  formatMembershipCurrency,
  formatMembershipOrderDateTime,
  getMembershipOrders,
  getMembershipOrderStatusLabel,
  membershipOrderStatusOptions,
  membershipPaymentMethodLabels,
  type MembershipOrder,
  type MembershipOrderStatus,
} from './membership-order-data'

export function MembershipOrderPage() {
  const navigate = useNavigate()
  const orders = getMembershipOrders()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<MembershipOrderStatus | 'all'>('all')
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

  function openOrder(order: MembershipOrder) {
    void navigate({ to: '/membership-orders/$orderId', params: { orderId: order.id } })
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">会员开通订单</h1>
        <p className="text-sm text-muted-foreground">查看用户会员商品购买、支付和权益生效记录。</p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>会员开通订单</CardTitle>
          <CardDescription>共 {orders.length} 笔订单，当前显示 {filteredOrders.length} 笔。</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ListFilters>
            <ListFilterRow label="订单状态">
              <ListFilterOptionGroup
                ariaLabel="按会员订单状态筛选"
                options={[{ value: 'all', label: '全部' }, ...membershipOrderStatusOptions]}
                counts={countListFilterValues(orders, (order) => order.status)}
                hideAllCount
                value={status}
                onValueChange={setStatus}
              />
            </ListFilterRow>
            <ListFilterRow label="搜索">
              <ListSearchField value={query} onValueChange={setQuery} placeholder="搜索订单号、用户、手机号或会员商品" ariaLabel="搜索会员开通订单" />
            </ListFilterRow>
          </ListFilters>

          {filteredOrders.length ? (
            <Table containerClassName="rounded-lg border" className="min-w-max">
              <TableHeader><TableRow>
                <TableHead>订单信息</TableHead>
                <TableHead>开通用户</TableHead>
                <TableHead>会员商品</TableHead>
                <TableHead>实付金额</TableHead>
                <TableHead>支付方式</TableHead>
                <TableHead>会员有效期</TableHead>
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
                  <TableCell><div className="flex min-w-44 flex-col gap-1"><span className="font-medium">{order.orderCode}</span><span className="text-xs text-muted-foreground">{formatMembershipOrderDateTime(order.createdAt)}</span></div></TableCell>
                  <TableCell><div className="flex min-w-32 flex-col gap-1"><span>{order.userName}</span><span className="text-xs text-muted-foreground">{order.maskedMobile}</span></div></TableCell>
                  <TableCell><div className="flex min-w-44 flex-col gap-1"><span className="font-medium">{order.productName}</span><span className="text-xs text-muted-foreground">{order.productDescription}</span></div></TableCell>
                  <TableCell className="font-medium tabular-nums">{order.paidAmountCents ? formatMembershipCurrency(order.paidAmountCents) : '—'}</TableCell>
                  <TableCell>{membershipPaymentMethodLabels[order.paymentMethod]}</TableCell>
                  <TableCell><div className="flex min-w-40 flex-col gap-1"><span>{formatMembershipOrderDateTime(order.membershipStartAt)}</span><span className="text-xs text-muted-foreground">至 {formatMembershipOrderDateTime(order.membershipEndAt)}</span></div></TableCell>
                  <TableCell><MembershipOrderStatusBadge status={order.status} /></TableCell>
                  <TableCell className="text-right" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`打开会员订单${order.orderCode}操作菜单`} />}><MoreHorizontalIcon /></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36"><DropdownMenuItem onClick={() => openOrder(order)}><EyeIcon />查看详情</DropdownMenuItem></DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}</TableBody>
            </Table>
          ) : (
            <Empty className="min-h-48 border">
              <EmptyHeader><EmptyMedia variant="icon"><CrownIcon /></EmptyMedia><EmptyTitle>没有匹配的会员开通订单</EmptyTitle><EmptyDescription>请调整搜索关键词或状态筛选。</EmptyDescription></EmptyHeader>
            </Empty>
          )}
          <TablePagination total={filteredOrders.length} unit="笔订单" pageIndex={pagination.pageIndex} pageCount={pagination.pageCount} onPageChange={pagination.changePage} />
        </CardContent>
      </Card>
    </section>
  )
}

export function MembershipOrderStatusBadge({ status }: { status: MembershipOrderStatus }) {
  const variant = status === 'activated' ? 'default' : status === 'cancelled' || status === 'refunded' ? 'destructive' : 'secondary'
  return <Badge variant={variant}>{getMembershipOrderStatusLabel(status)}</Badge>
}
