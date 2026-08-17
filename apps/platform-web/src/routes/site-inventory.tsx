import { createFileRoute } from '@tanstack/react-router'

import { SiteInventoryPage } from '@/features/site-planning/site-inventory-page'

export const Route = createFileRoute('/site-inventory')({
  component: SiteInventoryPage,
})
