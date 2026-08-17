import { createFileRoute } from '@tanstack/react-router'

import { MembershipOrderDetailPage } from '@/features/membership-orders/membership-order-detail-page'

export const Route = createFileRoute('/membership-orders_/$orderId')({
  component: MembershipOrderDetailRoute,
})

function MembershipOrderDetailRoute() {
  const { orderId } = Route.useParams()
  return <MembershipOrderDetailPage orderId={orderId} />
}
