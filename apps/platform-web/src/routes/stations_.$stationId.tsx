import { createFileRoute } from '@tanstack/react-router'

import { StationDetailPage } from '@/features/charging-stations/station-detail-page'
import {
  defaultStationDetailTab,
  validateStationDetailSearch,
} from '@/features/charging-stations/station-detail-navigation'

export const Route = createFileRoute('/stations_/$stationId')({
  validateSearch: validateStationDetailSearch,
  component: StationDetailRoute,
})

function StationDetailRoute() {
  const { stationId } = Route.useParams()
  const { tab = defaultStationDetailTab } = Route.useSearch()
  return <StationDetailPage stationId={stationId} tab={tab} />
}
