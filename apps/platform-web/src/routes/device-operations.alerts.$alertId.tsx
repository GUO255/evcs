import { createFileRoute } from '@tanstack/react-router'

import { DeviceAlertDetailPage } from '@/features/device-operations/device-alert-detail-page'

export const Route = createFileRoute('/device-operations/alerts/$alertId')({
  component: DeviceAlertDetailRoute,
})

function DeviceAlertDetailRoute() {
  const { alertId } = Route.useParams()
  return <DeviceAlertDetailPage alertId={alertId} />
}
