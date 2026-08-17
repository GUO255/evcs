import { createFileRoute, useNavigate } from '@tanstack/react-router'

import { OrderListPage } from '@/features/charging-orders/order-list-page'

export const Route = createFileRoute('/orders')({
  component: OrderListRoute,
})

function OrderListRoute() {
  const navigate = useNavigate()
  return <OrderListPage onViewOrder={(order) => void navigate({ to: '/orders/$orderId', params: { orderId: order.id } })} />
}
