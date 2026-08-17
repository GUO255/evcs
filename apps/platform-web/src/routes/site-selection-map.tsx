import { createFileRoute } from '@tanstack/react-router'

import { SiteSelectionMapPage } from '@/features/site-planning/site-selection-map-page'

export const Route = createFileRoute('/site-selection-map')({
  component: SiteSelectionMapPage,
})
