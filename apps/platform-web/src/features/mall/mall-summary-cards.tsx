import {
  CircleDollarSignIcon,
  PackageCheckIcon,
  TriangleAlertIcon,
  TruckIcon,
} from '@/components/ui/icons'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { formatMallCurrency } from './mall-data'
import type { MallOrder, MallProduct } from './mall-types'

interface MallSummaryCardsProps {
  products: readonly MallProduct[]
  orders: readonly MallOrder[]
}

export function MallSummaryCards({
  products,
  orders,
}: MallSummaryCardsProps) {
  const enabledProductCount = products.filter(
    (product) => product.status === 'enabled',
  ).length
  const lowStockProductCount = products.filter(
    (product) =>
      product.status === 'enabled'
      && product.kind === 'physical'
      && product.stock <= 10,
  ).length
  const toShipOrderCount = orders.filter(
    (order) => order.status === 'to-ship',
  ).length
  const grossMerchandiseValueCents = orders.reduce(
    (total, order) =>
      order.status === 'pending-payment' || order.status === 'cancelled'
        ? total
        : total + order.totalAmountCents,
    0,
  )

  const cards = [
    {
      title: '在售商品',
      value: String(enabledProductCount),
      description: '当前可供小程序用户购买',
      icon: PackageCheckIcon,
    },
    {
      title: '库存预警',
      value: String(lowStockProductCount),
      description: '在售实物商品库存不超过 10',
      icon: TriangleAlertIcon,
    },
    {
      title: '待发货订单',
      value: String(toShipOrderCount),
      description: '等待安排发货或发放权益',
      icon: TruckIcon,
    },
    {
      title: '商城成交额',
      value: formatMallCurrency(grossMerchandiseValueCents),
      description: '不含待支付和已取消订单',
      icon: CircleDollarSignIcon,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ title, value, description, icon: Icon }) => (
        <Card key={title}>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-4">
            <p className="text-3xl font-semibold tabular-nums">{value}</p>
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon className="size-5" aria-hidden="true" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
