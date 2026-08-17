import { createFileRoute } from '@tanstack/react-router'

import { PointsOrderPage } from '@/features/points-orders/points-order-page'

export const Route = createFileRoute('/points-orders')({
  component: PointsOrderPage,
})
