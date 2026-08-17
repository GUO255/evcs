import { createFileRoute } from '@tanstack/react-router'

import { RefundDetailPage } from '@/features/refunds/refund-detail-page'

export const Route = createFileRoute('/refunds/$refundId')({
  component: RefundDetailRoute,
})

function RefundDetailRoute() {
  const { refundId } = Route.useParams()
  return <RefundDetailPage refundId={refundId} />
}
