import { createFileRoute } from '@tanstack/react-router'

import { ExplorationTeamPage } from '@/features/site-planning/exploration-team-page'

export const Route = createFileRoute('/exploration-teams')({
  component: ExplorationTeamPage,
})
