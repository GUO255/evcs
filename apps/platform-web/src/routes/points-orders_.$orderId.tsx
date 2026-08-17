import { createFileRoute } from '@tanstack/react-router'

import { PointsOrderDetailPage } from '@/features/points-orders/points-order-detail-page'

export const Route = createFileRoute('/points-orders_/$orderId')({
  component: PointsOrderDetailRoute,
})

function PointsOrderDetailRoute() {
  const { orderId } = Route.useParams()
  return <PointsOrderDetailPage orderId={orderId} />
}
