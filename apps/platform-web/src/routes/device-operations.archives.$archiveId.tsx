import { createFileRoute } from '@tanstack/react-router'

import { RepairArchiveDetailPage } from '@/features/device-operations/repair-archive-detail-page'

export const Route = createFileRoute('/device-operations/archives/$archiveId')({
  component: RepairArchiveDetailRoute,
})

function RepairArchiveDetailRoute() {
  const { archiveId } = Route.useParams()
  return <RepairArchiveDetailPage archiveId={archiveId} />
}
