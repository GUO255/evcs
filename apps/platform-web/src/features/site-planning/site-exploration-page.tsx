import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { LoaderCircleIcon, PlusIcon } from '@/components/ui/icons'

import {
  createSiteExplorationDraft,
  siteExplorationErrorMessage,
} from './site-exploration-api'
import { createEmptySiteExplorationInput } from './site-exploration-fields'
import { SiteExplorationList } from './site-exploration-list'
import {
  applyConfirmedSiteExplorationLocation,
  SiteExplorationLocationPicker,
  type SiteExplorationConfirmedLocation,
} from './site-exploration-location-picker'

export function SiteExplorationPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const draft = useMutation({ mutationFn: createSiteExplorationDraft })
  const [scopeTeamName, setScopeTeamName] = useState<string | null>(null)
  const [teamAssignmentRequired, setTeamAssignmentRequired] = useState(false)
  const title = scopeTeamName ? `勘探站点（${scopeTeamName}）` : '勘探站点'

  async function createDraft(selectedLocation: SiteExplorationConfirmedLocation) {
    if (draft.isPending) return
    try {
      const initialValue = applyConfirmedSiteExplorationLocation(
        createEmptySiteExplorationInput(),
        selectedLocation,
      )
      const record = await draft.mutateAsync(initialValue)
      queryClient.setQueryData(['site-exploration', 'detail', record.id], record)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['site-exploration', 'list'] }),
        queryClient.invalidateQueries({ queryKey: ['site-exploration', 'map'] }),
      ])
      await navigate({
        to: '/site-exploration/$siteId/edit',
        params: { siteId: record.id },
      })
    } catch (error) {
      toast.error(siteExplorationErrorMessage(error) ?? '勘探站点创建失败，请稍后重试。')
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">
            管理独立勘探站点的固定勘探内容、状态和现场图片。
          </p>
        </div>
        {teamAssignmentRequired ? null : (
          <SiteExplorationLocationPicker
            longitude={0}
            latitude={0}
            locationAddress=""
            disabled={draft.isPending}
            successMessage="项目位置已确认，正在创建勘探站点"
            renderTrigger={(openPicker) => (
              <Button disabled={draft.isPending} onClick={openPicker}>
                {draft.isPending
                  ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
                  : <PlusIcon data-icon="inline-start" />}
                {draft.isPending ? '创建中' : '新增勘探站点'}
              </Button>
            )}
            onSelect={(selected) => void createDraft(selected)}
          />
        )}
      </header>
      <SiteExplorationList
        onScopeTeamNameChange={setScopeTeamName}
        onTeamAssignmentRequiredChange={setTeamAssignmentRequired}
      />
    </section>
  )
}
