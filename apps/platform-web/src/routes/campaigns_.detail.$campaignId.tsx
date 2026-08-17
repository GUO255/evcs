import { createFileRoute } from '@tanstack/react-router'

import { CampaignDetailPage } from '@/features/campaigns/campaign-detail-page'

export const Route = createFileRoute('/campaigns_/detail/$campaignId')({
  component: CampaignDetailRoute,
})

function CampaignDetailRoute() {
  const { campaignId } = Route.useParams()
  return <CampaignDetailPage campaignId={campaignId} />
}
