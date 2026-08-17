import { createFileRoute } from '@tanstack/react-router'

import { StationListPage } from '@/features/charging-stations/station-list-page'

export const Route = createFileRoute('/stations')({
  component: StationListPage,
})
