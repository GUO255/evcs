import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeftIcon } from '@/components/ui/icons'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { SiteSelectionSiteAnalysis } from '@/features/agent-workspace/site-selection-site-analysis'

import {
  createSiteExplorationSite,
  deleteSiteExplorationSite,
  getSiteExplorationSite,
  siteExplorationErrorMessage,
  siteExplorationRecordToInput,
  updateSiteExplorationSite,
  updateSiteExplorationStatus,
  type SiteExplorationInput,
  type SiteExplorationRecord,
} from './site-exploration-api'
import { createEmptySiteExplorationInput } from './site-exploration-fields'
import { SiteExplorationForm } from './site-exploration-form'
import { SiteExplorationContractForm } from './site-exploration-contract-form'
import { SiteExplorationConstructionForm } from './site-exploration-construction-form'
import { SiteExplorationWordDownloadButton } from './site-exploration-word-download-button'
import { SiteExplorationSourceAttachments } from './site-exploration-source-attachments'
import { type SiteExplorationRecordMutation } from './site-exploration-images'
import {
  SiteExplorationMoreActions,
  SiteExplorationStatusAction,
  SiteExplorationRecordHeader,
} from './site-exploration-record-header'
import {
  createSiteExplorationStageState,
  SiteExplorationStageBar,
  SiteExplorationStagePlaceholder,
} from './site-exploration-stages'

export function SiteExplorationNewPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const mutation = useMutation({ mutationFn: createSiteExplorationSite })

  async function submit(input: SiteExplorationInput) {
    try {
      const record = await mutation.mutateAsync(input)
      await queryClient.invalidateQueries({ queryKey: ['site-exploration', 'map'] })
      toast.success('勘探站点已创建，请继续完善勘探信息。')
      await navigate({ to: '/site-exploration/$siteId/edit', params: { siteId: record.id } })
    } catch (error) {
      toast.error(siteExplorationErrorMessage(error) ?? '登录状态已失效，正在重新认证。')
    }
  }

  return <PageFrame title="新建勘探站点" description="填写勘探站点信息，创建后进入编辑页面继续完善。"><SiteExplorationForm initialValue={createEmptySiteExplorationInput()} submitLabel="创建站点" pending={mutation.isPending} onSubmit={submit} /></PageFrame>
}

export function SiteExplorationEditPage({ siteId }: { siteId: string }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const site = useQuery({ queryKey: ['site-exploration', 'detail', siteId], queryFn: () => getSiteExplorationSite(siteId), retry: false })
  const [latestRecord, setLatestRecord] = useState<SiteExplorationRecord | null>(null)
  const mutation = useMutation({
    mutationFn: ({ input, updatedAt }: { input: SiteExplorationInput; updatedAt: number }) => updateSiteExplorationSite(siteId, input, updatedAt),
  })
  const deletion = useMutation({ mutationFn: () => deleteSiteExplorationSite(siteId) })
  const statusMutation = useMutation({
    mutationFn: ({ status, updatedAt }: {
      status: 'draft' | 'completed'
      updatedAt: number
    }) => updateSiteExplorationStatus(siteId, status, updatedAt),
  })
  const record = latestRecord ?? site.data
  const latestRecordRef = useRef<SiteExplorationRecord | null>(record ?? null)
  const recordMutationQueueRef = useRef<Promise<void>>(Promise.resolve())
  latestRecordRef.current = record ?? null

  const mutateRecord: SiteExplorationRecordMutation = (operation) => {
    const mutationResult = recordMutationQueueRef.current.then(async () => {
      const currentRecord = latestRecordRef.current
      if (!currentRecord) throw new Error('site_exploration_record_unavailable')

      const updated = await operation(currentRecord)
      latestRecordRef.current = updated
      setLatestRecord(updated)
      queryClient.setQueryData(['site-exploration', 'detail', siteId], updated)
      void queryClient.invalidateQueries({ queryKey: ['site-exploration', 'list'], refetchType: 'none' })
      void queryClient.invalidateQueries({ queryKey: ['site-exploration', 'map'], refetchType: 'none' })
      return updated
    })

    recordMutationQueueRef.current = mutationResult.then(() => undefined, () => undefined)
    return mutationResult
  }

  async function submit(input: SiteExplorationInput): Promise<void> {
    try {
      await mutateRecord((currentRecord) => mutation.mutateAsync({
        input,
        updatedAt: currentRecord.updatedAt,
      }))
    } catch (error) {
      toast.error(siteExplorationErrorMessage(error) ?? '登录状态已失效，正在重新认证。')
      throw error
    }
  }

  async function remove() {
    try {
      await deletion.mutateAsync()
      queryClient.removeQueries({ queryKey: ['site-exploration', 'detail', siteId] })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['site-exploration', 'list'] }),
        queryClient.invalidateQueries({ queryKey: ['site-exploration', 'map'] }),
      ])
      toast.success('勘探站点已删除')
      await navigate({ to: '/site-exploration' })
    } catch (error) {
      toast.error(siteExplorationErrorMessage(error) ?? '登录状态已失效，正在重新认证。')
    }
  }

  async function setStatus(status: 'draft' | 'completed') {
    try {
      await mutateRecord((currentRecord) => statusMutation.mutateAsync({
        status,
        updatedAt: currentRecord.updatedAt,
      }))
      toast.success(status === 'draft' ? '已设置为草稿' : '已设置为已勘探')
    } catch (error) {
      toast.error(siteExplorationErrorMessage(error) ?? '状态设置失败，请稍后重试。')
    }
  }

  if (site.isPending) return <SiteExplorationDetailSkeleton />
  if (site.isError || !record) return <ErrorCard error={site.error} onRetry={() => void site.refetch()} />

  const {
    currentStage,
    currentStageHighlighted,
    explorationCompletionItems,
    analysisRecommendation,
    contractCompletionItems,
    constructionCompletionItems,
  } = createSiteExplorationStageState(record)

  return (
    <Tabs defaultValue="exploration" className="gap-0">
      <PageFrame
        header={(
          <SiteExplorationRecordHeader
            record={record}
            actions={(
              <>
                {record.status === 'draft' ? (
                  <SiteExplorationStatusAction
                    targetStatus="completed"
                    pending={statusMutation.isPending}
                    disabled={mutation.isPending || deletion.isPending}
                    onClick={() => void setStatus('completed')}
                  />
                ) : null}
                <SiteExplorationWordDownloadButton siteId={record.id} />
                <SiteExplorationMoreActions
                  showSetDraft={record.status === 'completed'}
                  statusPending={statusMutation.isPending}
                  deletionPending={deletion.isPending}
                  disabled={mutation.isPending}
                  onSetDraft={() => void setStatus('draft')}
                  onDelete={() => void remove()}
                />
              </>
            )}
          />
        )}
        headerContent={(
          <SiteExplorationStageBar
            currentStage={currentStage}
            currentStageHighlighted={currentStageHighlighted}
            explorationCompletionItems={explorationCompletionItems}
            analysisRecommendation={analysisRecommendation}
            contractCompletionItems={contractCompletionItems}
            constructionCompletionItems={constructionCompletionItems}
          />
        )}
      >
        <TabsContent value="exploration">
          <div className="flex flex-col gap-6">
            <SiteExplorationForm key={record.id} initialValue={siteExplorationRecordToInput(record)} record={record} submitLabel="保存修改" pending={mutation.isPending} mutateRecord={mutateRecord} onSubmit={submit} />
            <SiteExplorationSourceAttachments record={record} />
          </div>
        </TabsContent>
        <TabsContent value="analysis">
          <SiteSelectionSiteAnalysis
            siteId={record.id}
            latestAnalysisTaskId={record.latestAnalysisTaskId}
            className="overflow-visible rounded-xl border bg-card p-6"
          />
        </TabsContent>
        <TabsContent value="contract"><SiteExplorationContractForm record={record} mutateRecord={mutateRecord} /></TabsContent>
        <TabsContent value="construction"><SiteExplorationConstructionForm record={record} mutateRecord={mutateRecord} /></TabsContent>
        <TabsContent value="operation"><SiteExplorationStagePlaceholder title="运营信息" description="维护项目运营阶段的填报内容。" /></TabsContent>
      </PageFrame>
    </Tabs>
  )
}

function PageFrame({ title, description, header, headerContent, children }: { title?: React.ReactNode; description?: React.ReactNode; header?: React.ReactNode; headerContent?: React.ReactNode; children: React.ReactNode }) {
  return <section className="mx-auto flex w-full max-w-6xl flex-col gap-6"><header className="flex flex-col gap-3"><Link to="/site-exploration" className={buttonVariants({ variant: 'ghost', className: 'w-fit' })}><ArrowLeftIcon data-icon="inline-start" />返回勘探站点</Link>{header ?? <div><h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">{title}</h1><div className="mt-1 text-sm text-muted-foreground">{description}</div></div>}{headerContent}</header>{children}</section>
}

export function SiteExplorationDetailSkeleton() {
  return (
    <section
      className="mx-auto flex w-full max-w-6xl flex-col gap-6"
      aria-label="正在加载勘探站点"
      aria-busy="true"
    >
      <header className="flex flex-col gap-3">
        <Skeleton className="h-9 w-36" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-64 max-w-[70%]" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full max-w-2xl" />
          </div>
          <div className="flex shrink-0 gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-16" />
          </div>
        </div>
        <div className="grid grid-cols-5 gap-4 rounded-xl border bg-card px-3 py-4 sm:px-6">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="flex flex-col items-center gap-2">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          ))}
        </div>
      </header>
      <div className="flex flex-col gap-6">
        <DetailFormCardSkeleton rowCount={1} />
        <DetailFormCardSkeleton rowCount={3} />
        <DetailFormCardSkeleton rowCount={2} />
      </div>
    </section>
  )
}

function DetailFormCardSkeleton({ rowCount }: { rowCount: number }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4 border-b px-6 py-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-56 max-w-[60vw]" />
        </div>
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <CardContent className="px-6 py-0">
        {Array.from({ length: rowCount }, (_, index) => (
          <div key={index} className="flex flex-col gap-3 border-b py-5 last:border-b-0">
            <Skeleton className="h-5 w-48 max-w-[70%]" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function ErrorCard({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return <Card><CardContent className="flex flex-col items-center gap-3 py-16 text-center"><p className="text-sm text-destructive">{siteExplorationErrorMessage(error) ?? '登录状态已失效，正在重新认证。'}</p><Button variant="outline" onClick={onRetry}>重新加载</Button></CardContent></Card>
}
export function toInput(record: SiteExplorationRecord): SiteExplorationInput {
  const { id: _id, status: _status, explorerName: _explorerName, explorationTeamId: _teamId, explorationTeam: _teamSnapshot, explorationDate: _explorationDate, overallScore: _overallScore, selectionRecommendation: _selectionRecommendation, hasAnalysis: _hasAnalysis, satelliteImages: _satellite, accessConvenienceImages: _access, landSceneImages: _land, otherStructureImages: _structures, landOwnershipDocuments: _ownershipDocuments, leaseAgreementDocuments: _leaseDocuments, surveyDeterminationReports: _surveyReports, createdByMemberId: _createdBy, createdByMemberName: _createdByName, updatedByMemberId: _updatedBy, updatedByMemberName: _updatedByName, createdAt: _createdAt, updatedAt: _updatedAt, ...input } = record
  return input
}
