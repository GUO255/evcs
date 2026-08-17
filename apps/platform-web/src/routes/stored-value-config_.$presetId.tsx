import { createFileRoute } from '@tanstack/react-router'

import { StoredValuePresetDetailPage } from '@/features/stored-value-config/stored-value-preset-detail-page'

export const Route = createFileRoute('/stored-value-config_/$presetId')({
  component: StoredValuePresetDetailRoute,
})

function StoredValuePresetDetailRoute() {
  const { presetId } = Route.useParams()
  return <StoredValuePresetDetailPage presetId={presetId} />
}
