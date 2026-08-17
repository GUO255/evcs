import { createContext, useCallback, useContext, useMemo, useState } from 'react'

import {
  canDeleteCampaign,
  canEditCampaign,
  canPublishCampaign,
  canTakeCampaignOffline,
  createInitialCampaigns,
  generateCampaignCode,
  type Campaign,
  type CampaignInput,
} from './campaign-data'

interface CampaignStore {
  campaigns: readonly Campaign[]
  getCampaign: (campaignId: string) => Campaign | undefined
  createCampaign: (input: CampaignInput) => void
  updateCampaign: (campaignId: string, input: CampaignInput) => void
  deleteCampaign: (campaignId: string) => void
  publishCampaign: (campaignId: string) => void
  takeCampaignOffline: (campaignId: string) => void
}

const CampaignContext = createContext<CampaignStore | null>(null)

export function CampaignProvider({ children }: { children: React.ReactNode }) {
  const [campaigns, setCampaigns] = useState(createInitialCampaigns)

  const getCampaign = useCallback(
    (campaignId: string) => campaigns.find((campaign) => campaign.id === campaignId),
    [campaigns],
  )

  const createCampaign = useCallback((input: CampaignInput) => {
    setCampaigns((currentCampaigns) => {
      const timestamp = new Date().toISOString()
      const campaign: Campaign = {
        ...input,
        budget: Number(input.budget),
        id: crypto.randomUUID(),
        campaignCode: generateCampaignCode(currentCampaigns),
        participantCount: 0,
        status: 'draft',
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      return [campaign, ...currentCampaigns]
    })
  }, [])

  const updateCampaign = useCallback((campaignId: string, input: CampaignInput) => {
    setCampaigns((currentCampaigns) => currentCampaigns.map((campaign) => {
      if (campaign.id !== campaignId || !canEditCampaign(campaign)) return campaign
      return {
        ...campaign,
        ...input,
        budget: Number(input.budget),
        updatedAt: new Date().toISOString(),
      }
    }))
  }, [])

  const deleteCampaign = useCallback((campaignId: string) => {
    setCampaigns((currentCampaigns) => currentCampaigns.filter((campaign) => (
      campaign.id !== campaignId || !canDeleteCampaign(campaign)
    )))
  }, [])

  const publishCampaign = useCallback((campaignId: string) => {
    setCampaigns((currentCampaigns) => currentCampaigns.map((campaign) => (
      campaign.id === campaignId && canPublishCampaign(campaign)
        ? { ...campaign, status: 'published', updatedAt: new Date().toISOString() }
        : campaign
    )))
  }, [])

  const takeCampaignOffline = useCallback((campaignId: string) => {
    setCampaigns((currentCampaigns) => currentCampaigns.map((campaign) => (
      campaign.id === campaignId && canTakeCampaignOffline(campaign)
        ? { ...campaign, status: 'offline', updatedAt: new Date().toISOString() }
        : campaign
    )))
  }, [])

  const value = useMemo<CampaignStore>(() => ({
    campaigns,
    getCampaign,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    publishCampaign,
    takeCampaignOffline,
  }), [campaigns, createCampaign, deleteCampaign, getCampaign, publishCampaign, takeCampaignOffline, updateCampaign])

  return <CampaignContext value={value}>{children}</CampaignContext>
}

export function useCampaigns(): CampaignStore {
  const store = useContext(CampaignContext)
  if (!store) throw new Error('useCampaigns must be used within CampaignProvider')
  return store
}
