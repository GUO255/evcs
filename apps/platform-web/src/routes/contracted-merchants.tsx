import { createFileRoute } from '@tanstack/react-router'

import { MerchantListPage } from '@/features/contracted-merchants/merchant-list-page'

export const Route = createFileRoute('/contracted-merchants')({
  component: MerchantListPage,
})
