import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { ChevronRightIcon, ImageIcon, TriangleAlertIcon } from '@/components/ui/icons'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { listAllDailySiteExplorationSites, siteExplorationErrorMessage } from '@/features/site-planning/site-exploration-api'
import type { SiteExplorationDailyListItem } from '@/features/site-planning/site-exploration-daily'
import type { SiteSelectionRecommendation } from '@/features/site-planning/site-exploration-data'
import {
  getSiteSelectionRecommendationBand,
} from '@/features/site-planning/site-selection-recommendation-config'

import { SiteSelectionSiteDetailDialog } from './site-selection-site-detail-dialog'

export function SiteSelectionDailyRecordsDialog({
  date,
  open,
  onClose,
}: {
  date: string | null
  open: boolean
  onClose: () => void
}) {
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)
  const sites = useQuery({
    queryKey: ['site-exploration', 'daily-records', date],
    queryFn: () => {
      if (!date) throw new Error('Daily site selection records require a date')
      return listAllDailySiteExplorationSites(date, 'site')
    },
    enabled: open && Boolean(date),
    retry: false,
    staleTime: 60_000,
  })
  function closeRecords() {
    setSelectedSiteId(null)
    onClose()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && closeRecords()}>
        <DialogContent className="flex max-h-[82dvh] min-h-0 flex-col gap-3 overflow-hidden p-4 sm:max-w-4xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{date ? `${formatDate(date)}踏勘记录` : '当日踏勘记录'}</DialogTitle>
            <DialogDescription>查看当日全部踏勘记录，选择一条记录可打开站点详情。</DialogDescription>
          </DialogHeader>

          <div className="mr-8 flex shrink-0 items-center gap-2 px-1 py-0.5">
            <span className="font-medium text-foreground">{date ? formatDate(date) : '当日踏勘记录'}</span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {sites.isPending ? '加载中…' : `共 ${sites.data?.length ?? 0} 条`}
            </span>
          </div>

          <div className="scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent min-h-0 max-h-[60dvh] overflow-auto rounded-xl border">
            {sites.isPending ? <DailyRecordsTableSkeleton /> : null}
            {sites.isError ? (
              <Empty className="min-h-64 border-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><TriangleAlertIcon aria-hidden="true" /></EmptyMedia>
                  <EmptyTitle>踏勘记录加载失败</EmptyTitle>
                  <EmptyDescription>{siteExplorationErrorMessage(sites.error) ?? '请稍后重新加载。'}</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button variant="outline" size="sm" onClick={() => void sites.refetch()}>重新加载</Button>
                </EmptyContent>
              </Empty>
            ) : null}
            {sites.data?.length === 0 ? (
              <Empty className="min-h-64 border-0">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><ImageIcon aria-hidden="true" /></EmptyMedia>
                  <EmptyTitle>当日暂无踏勘记录</EmptyTitle>
                  <EmptyDescription>当天创建的踏勘站点会显示在这里。</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : null}
            {sites.data && sites.data.length > 0 ? (
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-4">踏勘站点</TableHead>
                    <TableHead>所在区域</TableHead>
                    <TableHead>综合评分</TableHead>
                    <TableHead>推荐结论</TableHead>
                    <TableHead>更新时间</TableHead>
                    <TableHead><span className="sr-only">操作</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sites.data.map((site) => (
                    <DailyRecordRow key={site.id} site={site} onOpen={() => setSelectedSiteId(site.id)} />
                  ))}
                </TableBody>
              </Table>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <SiteSelectionSiteDetailDialog
        open={selectedSiteId !== null}
        siteId={selectedSiteId}
        defaultTab="site"
        onClose={() => setSelectedSiteId(null)}
      />
    </>
  )
}

function DailyRecordRow({ site, onOpen }: { site: SiteExplorationDailyListItem; onOpen: () => void }) {
  const image = site.siteBoundarySnapshot ?? site.locationSnapshot
  const recommendation = getRecommendationAppearance(site.selectionRecommendation, site.overallScore)

  return (
    <TableRow
      className="cursor-pointer focus-visible:bg-muted/50 focus-visible:outline-none"
      tabIndex={0}
      aria-label={`查看${site.projectName}站点详情`}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        onOpen()
      }}
    >
      <TableCell className="pl-4">
        <div className="flex min-w-56 items-center gap-3">
          {image ? (
            <img
              src={image.url}
              alt={`${site.projectName}现场图片`}
              className="size-10 shrink-0 rounded-lg border object-cover"
              loading="lazy"
            />
          ) : (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground" aria-label="暂无现场图片">
              <ImageIcon className="size-4" aria-hidden="true" />
            </span>
          )}
          <span className="min-w-0">
            <span className="block max-w-72 truncate font-medium text-foreground" title={site.projectName}>{site.projectName}</span>
            <span className="mt-0.5 block max-w-72 truncate text-xs text-muted-foreground" title={site.id}>编号：{site.id}</span>
          </span>
        </div>
      </TableCell>
      <TableCell>
        <span className="block text-foreground">{site.provinceCity}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{site.countyDistrict}</span>
      </TableCell>
      <TableCell>
        <span className="text-base font-semibold tabular-nums text-foreground">{site.overallScore}</span>
        <span className="text-xs text-muted-foreground">/100</span>
      </TableCell>
      <TableCell>
        <Badge variant={recommendation.variant} className={recommendation.className}>{recommendation.label}</Badge>
      </TableCell>
      <TableCell className="tabular-nums text-muted-foreground">{formatTime(site.updatedAt)}</TableCell>
      <TableCell className="pr-4 text-right text-muted-foreground"><ChevronRightIcon className="ml-auto size-4" aria-hidden="true" /></TableCell>
    </TableRow>
  )
}

function DailyRecordsTableSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4" aria-busy="true" aria-label="正在加载当日踏勘记录">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-16 w-full" />)}
    </div>
  )
}

function getRecommendationAppearance(recommendation: SiteSelectionRecommendation, score: number) {
  if (recommendation === '') {
    return {
      label: '未评估',
      variant: 'outline' as const,
      className: undefined,
    }
  }
  const band = getSiteSelectionRecommendationBand(score)
  return { label: band.label, variant: 'outline' as const, className: band.badgeClassName }
}

function formatDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return `${year} 年 ${month} 月 ${day} 日`
}

function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(timestamp * 1000))
}
