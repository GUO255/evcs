import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ClipboardListIcon, MapPinnedIcon } from '@/components/ui/icons'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  getSiteExplorationSite,
  siteExplorationErrorMessage,
  type SiteExplorationRecord,
} from '@/features/site-planning/site-exploration-api'
import { SiteExplorationRecordSummary } from '@/features/site-planning/site-exploration-record-summary'
import { SiteExplorationStatusBadge } from '@/features/site-planning/site-exploration-status-badge'
import { cn } from '@/lib/utils'

import type { AnalysisReport } from './site-selection-analysis-api'
import { SiteSelectionSiteAnalysis } from './site-selection-site-analysis'

export type SiteSelectionSiteDetailTab = 'site' | 'analysis'

type SiteSelectionSiteDetailTabsProps = {
  value: SiteSelectionSiteDetailTab
  onValueChange: (value: SiteSelectionSiteDetailTab) => void
  record: SiteExplorationRecord | null
  isRecordLoading: boolean
  recordError: unknown
  onRetryRecord: () => void
  siteId: string | null
  latestAnalysisTaskId: string | null
  providedReport?: AnalysisReport | null
  analysisEnabled?: boolean
  className?: string
}

export function SiteSelectionSiteDetailTabs({
  value,
  onValueChange,
  record,
  isRecordLoading,
  recordError,
  onRetryRecord,
  siteId,
  latestAnalysisTaskId,
  providedReport,
  analysisEnabled = true,
  className,
}: SiteSelectionSiteDetailTabsProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(nextValue) => onValueChange(nextValue as SiteSelectionSiteDetailTab)}
      className={cn('@container/site-detail min-h-0 flex-1 gap-0', className)}
    >
      <TabsList
        variant="line"
        className="grid !h-10 w-full shrink-0 grid-cols-2 border-b px-4 py-1 @2xl/site-detail:px-5"
      >
        <TabsTrigger value="site">
          <MapPinnedIcon data-icon="inline-start" aria-hidden="true" />
          场站信息
        </TabsTrigger>
        <TabsTrigger value="analysis">
          <ClipboardListIcon data-icon="inline-start" aria-hidden="true" />
          AI站址分析
        </TabsTrigger>
      </TabsList>
      <TabsContent value="site" className="flex min-h-0 flex-col overflow-hidden">
        <div className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent min-h-0 flex-1 overflow-y-auto p-4 @2xl/site-detail:p-5">
          {isRecordLoading ? (
            <SiteDetailSkeleton />
          ) : recordError ? (
            <LoadError
              message={siteExplorationErrorMessage(recordError)
                ?? '勘探站点详情加载失败，请稍后重试。'}
              onRetry={onRetryRecord}
            />
          ) : record ? (
            <SiteExplorationRecordSummary record={record} />
          ) : null}
        </div>
      </TabsContent>
      <TabsContent value="analysis" className="flex min-h-0 flex-col overflow-hidden">
        <SiteSelectionSiteAnalysis
          siteId={siteId}
          latestAnalysisTaskId={latestAnalysisTaskId}
          enabled={analysisEnabled && value === 'analysis'}
          providedReport={providedReport}
          isContextLoading={isRecordLoading}
          contextError={recordError}
          onRetryContext={onRetryRecord}
          className="flex-1 p-4 @2xl/site-detail:p-5"
        />
      </TabsContent>
    </Tabs>
  )
}

export function SiteSelectionSiteDetailDialog({
  open,
  siteId,
  report: providedReport,
  defaultTab = 'site',
  onClose,
}: {
  open: boolean
  siteId: string | null
  report?: AnalysisReport | null
  defaultTab?: SiteSelectionSiteDetailTab
  onClose: () => void
}) {
  const [activeTab, setActiveTab] = useState<SiteSelectionSiteDetailTab>(defaultTab)

  useEffect(() => {
    if (open) setActiveTab(defaultTab)
  }, [defaultTab, open, siteId])

  const siteDetail = useQuery({
    queryKey: ['site-exploration', 'detail', siteId],
    queryFn: () => {
      if (!siteId) throw new Error('site_exploration_record_unavailable')
      return getSiteExplorationSite(siteId)
    },
    enabled: open && Boolean(siteId),
    staleTime: 60_000,
    retry: false,
  })
  const latestAnalysisTaskId = siteDetail.data?.latestAnalysisTaskId ?? null
  const title = siteDetail.data?.projectName
    ?? providedReport?.site.projectName
    ?? '场站详情'
  const description = siteDetail.data
    ? `${siteDetail.data.provinceCity}${siteDetail.data.countyDistrict} · ${siteDetail.data.locationAddress}`
    : providedReport
      ? `${providedReport.site.provinceCity}${providedReport.site.countyDistrict} · ${providedReport.site.locationAddress}`
      : '查看场站信息与最新分析报告。'

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="flex max-h-[84dvh] min-h-0 flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 bg-muted/20 p-6">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <DialogTitle className="text-xl">{title}</DialogTitle>
              {siteDetail.data ? <SiteExplorationStatusBadge status={siteDetail.data.status} /> : null}
            </div>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <SiteSelectionSiteDetailTabs
          value={activeTab}
          onValueChange={setActiveTab}
          record={siteDetail.data ?? null}
          isRecordLoading={siteDetail.isPending}
          recordError={siteDetail.error}
          onRetryRecord={() => void siteDetail.refetch()}
          siteId={siteId}
          latestAnalysisTaskId={latestAnalysisTaskId}
          providedReport={providedReport}
          analysisEnabled={open}
        />
      </DialogContent>
    </Dialog>
  )
}

function SiteDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="正在加载场站信息">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ))}
    </div>
  )
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm text-destructive">{message}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        重新加载
      </Button>
    </div>
  )
}
