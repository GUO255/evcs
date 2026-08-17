import { createFileRoute } from '@tanstack/react-router'

import { MallOrderDetailPage } from '@/features/finance-mall-orders/mall-order-detail-page'

export const Route = createFileRoute('/mall-orders_/$orderId')({
  component: MallOrderDetailRoute,
})

function MallOrderDetailRoute() {
  const { orderId } = Route.useParams()
  return <MallOrderDetailPage orderId={orderId} />
}
