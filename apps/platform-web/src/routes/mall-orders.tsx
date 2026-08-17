import { createFileRoute } from '@tanstack/react-router'

import { MallOrderPage } from '@/features/finance-mall-orders/mall-order-page'

export const Route = createFileRoute('/mall-orders')({
  component: MallOrderPage,
})
