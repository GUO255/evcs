import ReactMarkdown from 'react-markdown'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { getSiteSelectionRecommendationBand } from '@/features/site-planning/site-selection-recommendation-config'
import { cn } from '@/lib/utils'
import { getAgentWorkspace } from './agent-workspace-data'
import type { AnalysisReport } from './site-selection-analysis-api'

const siteSelectionAgent = getAgentWorkspace('site-selection')

export function SiteSelectionReportDialog({
  open,
  report,
  isLoading,
  onClose,
}: {
  open: boolean
  report: AnalysisReport | null
  isLoading: boolean
  onClose: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="@container/site-detail max-h-[85vh] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{report?.title ?? '选址报告'}</DialogTitle>
          <DialogDescription>
            {report ? `${report.site.provinceCity}${report.site.countyDistrict} · ${report.site.locationAddress}` : '查看确定性选址报告。'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh] pr-4">
          <SiteSelectionReportContent report={report} isLoading={isLoading} />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

export function SiteSelectionReportContent({
  report,
  isLoading,
}: {
  report: AnalysisReport | null
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-label="正在加载任务报告">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-36 w-full" />
      </div>
    )
  }

  if (!report) {
    return <p className="text-sm text-muted-foreground">任务报告暂不可用，请稍后重试。</p>
  }
  const recommendationBand = getSiteSelectionRecommendationBand(report.conclusion.overallScore)
  const admissionLabel = report.conclusion.admissionStatus === 'failed'
    ? '准入不通过'
    : report.conclusion.admissionStatus === 'pending' ? '准入待核验' : '准入通过'

  return (
    <div className="flex flex-col gap-5">
      <Card size="sm" className="bg-muted/20">
        <CardHeader className="border-b pb-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <CardTitle className="text-base font-semibold">AI选址建议：</CardTitle>
            <Badge
              variant="outline"
              className={cn('w-fit gap-1 pl-1 pr-2.5 text-sm font-semibold', recommendationBand.badgeClassName)}
            >
              <Avatar className="size-4">
                <AvatarImage src={siteSelectionAgent.avatarSrc} alt={siteSelectionAgent.name} />
                <AvatarFallback className="text-[9px]">址</AvatarFallback>
              </Avatar>
              {admissionLabel}
            </Badge>
          </div>
          <CardAction>
            <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 font-normal">
              <span className="text-xs text-muted-foreground">动态标准分</span>
              <span className="text-sm font-medium tabular-nums text-foreground">
              {report.conclusion.dynamicScore ?? '—'}
              </span>
              <span className="text-xs text-muted-foreground">覆盖率 {report.conclusion.coverageRate}%</span>
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <SiteAnalysisMarkdown
            content={report.conclusion.overallSummary}
            className="text-sm font-normal"
          />
        </CardContent>
      </Card>
      {report.missingItems.length ? (
        <Card size="sm">
          <CardHeader><CardTitle>下一步待补充数据</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {report.missingItems.map((item) => (
                <li key={`${item.kind}-${item.code}`} className="flex items-start gap-2">
                  <Badge variant="outline">{item.priority}</Badge>
                  <span>{item.recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
      <div className="grid items-start gap-4">
        {report.chapters.map((chapter) => (
          <Card key={chapter.code} size="sm">
            <CardHeader>
              <CardTitle>{chapter.name}</CardTitle>
              <CardAction><Badge variant="secondary">专业分析</Badge></CardAction>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="whitespace-pre-line break-words leading-6">{chapter.summary}</p>
              {chapter.risks.length ? (
                <div className="flex flex-col gap-2 rounded-lg bg-muted/40 p-3">
                  <p className="text-xs font-medium text-muted-foreground">主要风险</p>
                  <ul className="list-disc pl-5 text-sm leading-6 text-muted-foreground">
                    {chapter.risks.map((risk) => <li key={risk}>{risk}</li>)}
                  </ul>
                </div>
              ) : <p className="text-muted-foreground">未识别到主要风险</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function SiteAnalysisMarkdown({
  content,
  className,
}: {
  content: string
  className?: string
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-2 break-words font-normal', className)}>
      <ReactMarkdown
        skipHtml
        components={{
          h3: ({ children }) => <h3 className="text-sm font-semibold">{children}</h3>,
          p: ({ children }) => <p className="font-normal leading-6">{children}</p>,
          strong: ({ children }) => <strong className="font-medium">{children}</strong>,
          ul: ({ children }) => <ul className="list-disc pl-5 font-normal">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 font-normal">{children}</ol>,
          li: ({ children }) => <li className="font-normal leading-6">{children}</li>,
        }}
      >
        {stripConclusionHeadings(content)}
      </ReactMarkdown>
    </div>
  )
}

function stripConclusionHeadings(content: string): string {
  return content
    .replace(/^\s*(?:#{1,6}\s*)?(?:\*\*|__)?(?:综合结论|总体结论)(?:\*\*|__)?\s*$/gmu, '')
    .replace(/^\s+/, '')
}
