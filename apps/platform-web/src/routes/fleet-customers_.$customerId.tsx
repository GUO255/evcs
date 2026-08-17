import { createFileRoute } from '@tanstack/react-router'

import { CustomerDetailPage } from '@/features/contracted-customers/customer-detail-page'

export const Route = createFileRoute('/fleet-customers_/$customerId')({
  component: CustomerDetailRoute,
})

function CustomerDetailRoute() {
  const { customerId } = Route.useParams()
  return <CustomerDetailPage customerId={customerId} />
}
