import { useCallback, useState } from 'react'
import { PlusIcon } from '@/components/ui/icons'

import { Button } from '@/components/ui/button'

import { CampaignActionDialog, type CampaignAction } from './campaign-action-dialog'
import type { Campaign } from './campaign-data'
import { CampaignDataTable } from './campaign-data-table'
import { CampaignFormDialog } from './campaign-form-dialog'
import { useCampaigns } from './campaign-store'

export function CampaignListPage() {
  const { campaigns, deleteCampaign, publishCampaign, takeCampaignOffline } = useCampaigns()
  const [formOpen, setFormOpen] = useState(false)
  const [actionRequest, setActionRequest] = useState<{ campaign: Campaign; action: CampaignAction }>()

  const requestAction = useCallback((campaign: Campaign, action: CampaignAction) => {
    setActionRequest({ campaign, action })
  }, [])

  function changeFormOpen(open: boolean) {
    setFormOpen(open)
  }

  function confirmAction() {
    if (!actionRequest) return
    const { campaign, action } = actionRequest
    if (action === 'publish') publishCampaign(campaign.id)
    if (action === 'offline') takeCampaignOffline(campaign.id)
    if (action === 'delete') deleteCampaign(campaign.id)
    setActionRequest(undefined)
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">活动运营</h1>
          <p className="text-sm text-muted-foreground">管理储值与优惠券活动，控制活动上架和下架。</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <PlusIcon data-icon="inline-start" />
          新增活动
        </Button>
      </header>

      <CampaignDataTable campaigns={campaigns} onAction={requestAction} />

      <CampaignFormDialog open={formOpen} type="stored-value" onOpenChange={changeFormOpen} />
      <CampaignActionDialog
        action={actionRequest?.action}
        campaign={actionRequest?.campaign}
        onOpenChange={(open) => {
          if (!open) setActionRequest(undefined)
        }}
        onConfirm={confirmAction}
      />
    </section>
  )
}
