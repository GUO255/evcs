import { createFileRoute } from '@tanstack/react-router'

import { OrderDetailPage } from '@/features/charging-orders/order-detail-page'

export const Route = createFileRoute('/orders_/$orderId')({
  component: OrderDetailRoute,
})

function OrderDetailRoute() {
  const { orderId } = Route.useParams()
  return <OrderDetailPage orderId={orderId} />
}
