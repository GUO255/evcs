import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { LoaderCircleIcon, RefreshCwIcon } from '@/components/ui/icons'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { SiteSelectionSiteAnalysis } from '@/features/agent-workspace/site-selection-site-analysis'

import {
  getSiteExplorationSite,
  deleteSiteExplorationSite,
  siteExplorationErrorMessage,
  siteExplorationRecordToInput,
  reanalyzeSiteExplorationSite,
  updateSiteExplorationSite,
  updateSiteExplorationStatus,
  type SiteExplorationInput,
  type SiteExplorationRecord,
} from './site-exploration-api'
import {
  SiteExplorationForm,
  type SiteExplorationAutoSaveState,
} from './site-exploration-form'
import type { SiteExplorationRecordMutation } from './site-exploration-images'
import { SiteExplorationContractForm } from './site-exploration-contract-form'
import { SiteExplorationConstructionForm } from './site-exploration-construction-form'
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

export function SiteExplorationEditDialog({
  siteId,
  open,
  onOpenChange,
  onMarkedExplored,
}: {
  siteId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onMarkedExplored: (record: SiteExplorationRecord) => void
}) {
  const queryClient = useQueryClient()
  const site = useQuery({
    queryKey: ['site-exploration', 'detail', siteId],
    queryFn: () => getSiteExplorationSite(siteId),
    enabled: open,
    retry: false,
  })
  const [latestRecord, setLatestRecord] = useState<SiteExplorationRecord | null>(null)
  const latestRecordRef = useRef<SiteExplorationRecord | null>(null)
  const mutationQueueRef = useRef<Promise<void>>(Promise.resolve())
  const [pendingOperationCount, setPendingOperationCount] = useState(0)
  const [autoSaveState, setAutoSaveState] = useState<SiteExplorationAutoSaveState>('idle')
  const closedRef = useRef(false)
  const deletion = useMutation({ mutationFn: () => deleteSiteExplorationSite(siteId) })
  const statusMutation = useMutation({
    mutationFn: ({ status, updatedAt }: {
      status: 'draft' | 'completed'
      updatedAt: number
    }) => updateSiteExplorationStatus(siteId, status, updatedAt),
  })
  const reanalysisMutation = useMutation({
    mutationFn: () => reanalyzeSiteExplorationSite(siteId),
  })
  const record = latestRecord ?? site.data ?? null
  const stageState = record ? createSiteExplorationStageState(record) : null
  const savePending = pendingOperationCount > 0
    || autoSaveState === 'scheduled'
    || autoSaveState === 'saving'

  useEffect(() => {
    if (!site.data || latestRecordRef.current) return
    latestRecordRef.current = site.data
    setLatestRecord(site.data)
  }, [site.data])

  useEffect(() => {
    if (open) closedRef.current = false
  }, [open])

  function finishClose() {
    closedRef.current = true
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ['site-exploration', 'map'] }),
      queryClient.invalidateQueries({ queryKey: ['site-exploration', 'list'] }),
    ])
    onOpenChange(false)
  }

  const mutateRecord: SiteExplorationRecordMutation = (operation) => {
    setPendingOperationCount((count) => count + 1)
    const result = mutationQueueRef.current.then(async () => {
      const currentRecord = latestRecordRef.current
      if (!currentRecord) throw new Error('site_exploration_record_unavailable')
      const updated = await operation(currentRecord)
      latestRecordRef.current = updated
      setLatestRecord(updated)
      queryClient.setQueryData(['site-exploration', 'detail', siteId], updated)
      if (closedRef.current) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['site-exploration', 'map'] }),
          queryClient.invalidateQueries({ queryKey: ['site-exploration', 'list'] }),
        ])
      }
      return updated
    })
    mutationQueueRef.current = result.then(() => undefined, () => undefined)
    return result.then(
      (updated) => {
        setPendingOperationCount((count) => count - 1)
        return updated
      },
      (error: unknown) => {
        setPendingOperationCount((count) => count - 1)
        throw error
      },
    )
  }

  async function submit(input: SiteExplorationInput): Promise<void> {
    try {
      await mutateRecord((currentRecord) => updateSiteExplorationSite(
        siteId,
        input,
        currentRecord.updatedAt,
      ))
    } catch (error) {
      toast.error(siteExplorationErrorMessage(error) ?? '勘探站点保存失败，请稍后重试。')
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
      onOpenChange(false)
    } catch (error) {
      toast.error(siteExplorationErrorMessage(error) ?? '勘探站点删除失败，请稍后重试。')
    }
  }

  async function setStatus(status: 'draft' | 'completed') {
    try {
      const updated = await mutateRecord((currentRecord) => statusMutation.mutateAsync({
        status,
        updatedAt: currentRecord.updatedAt,
      }))
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['site-exploration', 'list'] }),
        queryClient.invalidateQueries({ queryKey: ['site-exploration', 'map'] }),
      ])
      toast.success(status === 'draft' ? '已设置为草稿' : '已设置为已勘探')
      if (status === 'completed') onMarkedExplored(updated)
    } catch (error) {
      toast.error(siteExplorationErrorMessage(error) ?? '状态设置失败，请稍后重试。')
    }
  }

  async function reanalyze() {
    if (!record) return
    try {
      await reanalysisMutation.mutateAsync()
      await queryClient.invalidateQueries({ queryKey: ['site-analysis'] })
      toast.success('已提交重新分析')
      onMarkedExplored(record)
    } catch (error) {
      toast.error(siteExplorationErrorMessage(error) ?? '重新分析失败，请稍后重试。')
    }
  }

  function requestOpenChange(nextOpen: boolean) {
    if (nextOpen) return
    finishClose()
  }

  return (
    <Dialog open={open} onOpenChange={requestOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[99vh] max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl"
      >
        <DialogHeader className="shrink-0 border-b px-5 pb-4 pt-5">
          {record ? (
            <SiteExplorationRecordHeader
              record={record}
              heading={DialogTitle}
              actions={(
                <>
                  {record.status !== 'draft' ? (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={savePending
                        || deletion.isPending
                        || statusMutation.isPending
                        || reanalysisMutation.isPending}
                      onClick={() => void reanalyze()}
                    >
                      {reanalysisMutation.isPending
                        ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" />
                        : <RefreshCwIcon data-icon="inline-start" />}
                      {reanalysisMutation.isPending ? '正在提交…' : '重新分析'}
                    </Button>
                  ) : null}
                  {record.status === 'draft' ? (
                    <SiteExplorationStatusAction
                      targetStatus="completed"
                      pending={statusMutation.isPending}
                      disabled={savePending || deletion.isPending || reanalysisMutation.isPending}
                      onClick={() => void setStatus('completed')}
                    />
                  ) : null}
                  <SiteExplorationMoreActions
                    showSetDraft={record.status === 'completed'}
                    statusPending={statusMutation.isPending}
                    deletionPending={deletion.isPending}
                    disabled={savePending || reanalysisMutation.isPending}
                    onSetDraft={() => void setStatus('draft')}
                    onDelete={() => void remove()}
                  />
                </>
              )}
            />
          ) : (
            <DialogTitle>编辑场站信息</DialogTitle>
          )}
          <DialogDescription className="sr-only">修改场站信息，变更内容将自动保存。</DialogDescription>
        </DialogHeader>

        {site.isPending ? (
          <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 p-4 sm:p-5" aria-busy="true">
            <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
              <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
              正在加载场站信息…
            </div>
          </div>
        ) : site.isError || !record || !stageState ? (
          <div className="min-h-0 flex-1 overflow-y-auto bg-muted/20 p-4 sm:p-5">
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-destructive">
                {siteExplorationErrorMessage(site.error) ?? '勘探站点加载失败，请稍后重试。'}
              </p>
              <Button type="button" variant="outline" onClick={() => void site.refetch()}>
                重新加载
              </Button>
            </div>
          </div>
        ) : (
          <Tabs
            defaultValue="exploration"
            className="min-h-0 flex-1 gap-0"
          >
            <div
              className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent min-h-0 flex-1 overflow-y-auto bg-muted/20"
              aria-busy={savePending}
            >
              <div className="px-4 pt-4 sm:px-5 sm:pt-5">
                <SiteExplorationStageBar
                  currentStage={stageState.currentStage}
                  currentStageHighlighted={stageState.currentStageHighlighted}
                  explorationCompletionItems={stageState.explorationCompletionItems}
                  analysisRecommendation={stageState.analysisRecommendation}
                  contractCompletionItems={stageState.contractCompletionItems}
                  constructionCompletionItems={stageState.constructionCompletionItems}
                />
              </div>
              <div className="p-4 sm:p-5">
                <TabsContent value="exploration">
                  <SiteExplorationForm
                    key={record.id}
                    initialValue={siteExplorationRecordToInput(record)}
                    record={record}
                    submitLabel="保存修改"
                    pending={pendingOperationCount > 0}
                    mutateRecord={mutateRecord}
                    onAutoSaveStateChange={setAutoSaveState}
                    onSubmit={submit}
                  />
                </TabsContent>
                <TabsContent value="analysis">
                  <SiteSelectionSiteAnalysis
                    siteId={record.id}
                    latestAnalysisTaskId={record.latestAnalysisTaskId}
                    enabled={open}
                    className="overflow-visible rounded-xl border bg-card p-6"
                  />
                </TabsContent>
                <TabsContent value="contract">
                  <SiteExplorationContractForm record={record} mutateRecord={mutateRecord} />
                </TabsContent>
                <TabsContent value="construction">
                  <SiteExplorationConstructionForm
                    record={record}
                    mutateRecord={mutateRecord}
                    onAutoSaveStateChange={setAutoSaveState}
                  />
                </TabsContent>
                <TabsContent value="operation">
                  <SiteExplorationStagePlaceholder title="运营信息" description="维护项目运营阶段的填报内容。" />
                </TabsContent>
              </div>
            </div>
          </Tabs>
        )}

        <DialogFooter className="mx-0 mb-0 shrink-0 rounded-none border-t px-5 py-4">
          <Button
            type="button"
            variant="secondary"
            onClick={() => requestOpenChange(false)}
          >
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
