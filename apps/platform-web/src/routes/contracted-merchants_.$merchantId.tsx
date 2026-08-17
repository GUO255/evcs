import { createFileRoute } from '@tanstack/react-router'

import { MerchantDetailPage } from '@/features/contracted-merchants/merchant-detail-page'

export const Route = createFileRoute('/contracted-merchants_/$merchantId')({
  component: MerchantDetailRoute,
})

function MerchantDetailRoute() {
  const { merchantId } = Route.useParams()
  return <MerchantDetailPage merchantId={merchantId} />
}
