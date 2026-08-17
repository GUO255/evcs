import { createFileRoute } from '@tanstack/react-router'

import { SiteExplorationPage } from '@/features/site-planning/site-exploration-page'

export const Route = createFileRoute('/site-exploration/')({
  component: SiteExplorationPage,
})
