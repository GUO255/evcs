import { createFileRoute } from '@tanstack/react-router'

import { CustomerListPage } from '@/features/contracted-customers/customer-list-page'

export const Route = createFileRoute('/fleet-customers')({
  component: CustomerListPage,
})
