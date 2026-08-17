import { createFileRoute } from '@tanstack/react-router'

import { MembershipOrderPage } from '@/features/membership-orders/membership-order-page'

export const Route = createFileRoute('/membership-orders')({
  component: MembershipOrderPage,
})
