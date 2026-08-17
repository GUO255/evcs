import { createFileRoute, Outlet } from '@tanstack/react-router'

import { RefundProvider } from '@/features/refunds/refund-store'

export const Route = createFileRoute('/refunds')({
  component: RefundLayout,
})

function RefundLayout() {
  return <RefundProvider><Outlet /></RefundProvider>
}
