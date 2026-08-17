import { createFileRoute } from '@tanstack/react-router'

import { SettlementDetailPage } from '@/features/merchant-settlements/settlement-detail-page'

export const Route = createFileRoute('/merchant-settlements_/$settlementId')({
  component: SettlementDetailRoute,
})

function SettlementDetailRoute() {
  const { settlementId } = Route.useParams()
  return <SettlementDetailPage settlementId={settlementId} />
}
