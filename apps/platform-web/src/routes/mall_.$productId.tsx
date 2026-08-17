import { createFileRoute } from '@tanstack/react-router'

import { MallProductDetailPage } from '@/features/mall/mall-product-detail-page'

export const Route = createFileRoute('/mall_/$productId')({
  component: MallProductDetailRoute,
})

function MallProductDetailRoute() {
  const { productId } = Route.useParams()
  return <MallProductDetailPage productId={productId} />
}
