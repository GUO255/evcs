import { createFileRoute } from '@tanstack/react-router'

import { ExplorationTeamDetailPage } from '@/features/site-planning/exploration-team-detail-page'

export const Route = createFileRoute('/exploration-teams_/$teamId')({
  component: () => <ExplorationTeamDetailPage teamId={Route.useParams().teamId} />,
})
