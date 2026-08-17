import { createFileRoute } from '@tanstack/react-router'

import { RateTemplateDetailPage } from '@/features/rates/rate-template-detail-page'

export const Route = createFileRoute('/rates_/$templateId')({
  component: RateTemplateDetailRoute,
})

function RateTemplateDetailRoute() {
  const { templateId } = Route.useParams()
  return <RateTemplateDetailPage templateId={templateId} />
}
