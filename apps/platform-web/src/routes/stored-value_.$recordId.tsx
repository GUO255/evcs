import { createFileRoute } from '@tanstack/react-router'

import { StoredValueDetailPage } from '@/features/stored-value/stored-value-detail-page'

export const Route = createFileRoute('/stored-value_/$recordId')({
  component: StoredValueDetailRoute,
})

function StoredValueDetailRoute() {
  const { recordId } = Route.useParams()
  return <StoredValueDetailPage recordId={recordId} />
}
