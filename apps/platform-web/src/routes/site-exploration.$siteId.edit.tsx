import { createFileRoute } from '@tanstack/react-router'

import { SiteExplorationEditPage } from '@/features/site-planning/site-exploration-edit-page'

export const Route = createFileRoute('/site-exploration/$siteId/edit')({
  component: () => <SiteExplorationEditPage siteId={Route.useParams().siteId} />,
})
