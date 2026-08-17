import { createFileRoute } from '@tanstack/react-router'

import { WorkOrderDetailPage } from '@/features/device-operations/work-order-detail-page'

export const Route = createFileRoute('/device-operations/work-orders/$workOrderId')({
  component: WorkOrderDetailRoute,
})

function WorkOrderDetailRoute() {
  const { workOrderId } = Route.useParams()
  return <WorkOrderDetailPage workOrderId={workOrderId} />
}
