import { createFileRoute } from '@tanstack/react-router'

import { PointsProductDetailPage } from '@/features/points-center/points-product-detail-page'

export const Route = createFileRoute('/points-center_/$productId')({
  component: PointsProductDetailRoute,
})

function PointsProductDetailRoute() {
  const { productId } = Route.useParams()
  return <PointsProductDetailPage productId={productId} />
}
