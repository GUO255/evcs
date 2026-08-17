import { createFileRoute } from '@tanstack/react-router'

import { RefundPage } from '@/features/refunds/refund-page'

export const Route = createFileRoute('/refunds/')({
  component: RefundPage,
})
