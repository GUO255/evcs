import { createFileRoute } from '@tanstack/react-router'

import { SettlementPage } from '@/features/merchant-settlements/settlement-page'

export const Route = createFileRoute('/merchant-settlements')({
  component: SettlementPage,
})
