import { useEffect, useRef, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { CircleCheckIcon, ClipboardListIcon, LoaderCircleIcon } from '@/components/ui/icons'
import { Skeleton } from '@/components/ui/skeleton'
import { siteExplorationErrorMessage } from '@/features/site-planning/site-exploration-api'
import { getSiteSelectionRecommendationBand } from '@/features/site-planning/site-selection-recommendation-config'
import { cn } from '@/lib/utils'

import {
  getAnalysisTask,
  getLatestSiteAnalysisTask,
  type AnalysisReport,
  type AnalysisTask,
} from './site-selection-analysis-api'
import { SiteAnalysisMarkdown, SiteSelectionReportContent } from './site-selection-report-dialog'

export function SiteSelectionSiteAnalysis({
  siteId,
  latestAnalysisTaskId,
  enabled = true,
  providedReport,
  isContextLoading = false,
  contextError,
  onRetryContext,
  className,
}: {
  siteId?: string | null
  latestAnalysisTaskId: string | null
  enabled?: boolean
  providedReport?: AnalysisReport | null
  isContextLoading?: boolean
  contextError?: unknown
  onRetryContext?: () => void
  className?: string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const shouldLoadTask = enabled
    && providedReport === undefined
    && Boolean(siteId || latestAnalysisTaskId)
  const analysisTask = useQuery({
    queryKey: siteId
      ? ['site-analysis', 'site-latest-task', siteId]
      : ['site-analysis', 'task', latestAnalysisTaskId],
    queryFn: () => {
      if (siteId) return getLatestSiteAnalysisTask(siteId)
      if (!latestAnalysisTaskId) throw new Error('site_analysis_task_unavailable')
      return getAnalysisTask(latestAnalysisTaskId)
    },
    enabled: shouldLoadTask,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'queued' || status === 'running' ? 1_000 : 5_000
    },
    retry: false,
  })
  const report = providedReport === undefined
    ? analysisTask.data?.report ?? null
    : providedReport
  const hasAnalysisReference = Boolean(siteId || latestAnalysisTaskId || providedReport)

  useEffect(() => {
    if (analysisTask.data?.status !== 'completed') return
    const frame = window.requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [analysisTask.data?.id, analysisTask.data?.status])

  return (
    <div
      ref={scrollRef}
      data-site-analysis-scroll
      className={cn(
        'scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent min-h-0 min-w-0 overflow-y-auto',
        className,
      )}
    >
      {isContextLoading && !hasAnalysisReference ? (
        <SiteSelectionReportContent report={null} isLoading />
      ) : contextError && !hasAnalysisReference ? (
        <AnalysisLoadError
          message={siteExplorationErrorMessage(contextError)
            ?? '勘探站点详情加载失败，请稍后重试。'}
          onRetry={onRetryContext}
        />
      ) : analysisTask.error ? (
        <AnalysisLoadError message="站点最新分析任务加载失败，请稍后重试。" onRetry={() => void analysisTask.refetch()} />
      ) : analysisTask.isLoading && !analysisTask.data ? (
        <SiteAnalysisProcess task={null} report={report} isLoading />
      ) : !analysisTask.data && !report ? (
        <Empty className="min-h-48 border p-4">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardListIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>暂无分析报告</EmptyTitle>
            <EmptyDescription>该场站还没有智能体分析任务或分析结果。</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : analysisTask.data && analysisTask.data.status !== 'completed' ? (
        <SiteAnalysisProcess task={analysisTask.data} report={report} isLoading={false} />
      ) : (
        <SiteSelectionReportContent report={report} isLoading={false} />
      )}
    </div>
  )
}

type AnalysisProcessStageStatus = 'completed' | 'running' | 'pending' | 'failed'

function SiteAnalysisProcess({
  task,
  report,
  isLoading,
}: {
  task: AnalysisTask | null
  report: AnalysisReport | null
  isLoading: boolean
}) {
  const processRef = useRef<HTMLDivElement>(null)
  const latestUpdateAt = task
    ? Math.max(task.updatedAt, ...task.steps.map((step) => step.updatedAt))
    : 0

  useEffect(() => {
    if (!task || (task.status !== 'queued' && task.status !== 'running')) return
    const process = processRef.current
    const scrollContainer = processRef.current?.closest<HTMLElement>('[data-site-analysis-scroll]')
    if (!process || !scrollContainer) return

    const scrollToBottom = () => {
      scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' })
    }
    const frame = window.requestAnimationFrame(scrollToBottom)
    const observer = new ResizeObserver(scrollToBottom)
    observer.observe(process)
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [task?.id, task?.status])

  useEffect(() => {
    if (!task || (task.status !== 'queued' && task.status !== 'running')) return
    const frame = window.requestAnimationFrame(() => {
      const scrollContainer = processRef.current?.closest<HTMLElement>('[data-site-analysis-scroll]')
      scrollContainer?.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [latestUpdateAt, task?.status])

  if (isLoading && !task) {
    return (
      <div className="flex flex-col gap-4" aria-label="正在加载站址分析流程">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex flex-col gap-2 py-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!task) return <p className="text-sm text-muted-foreground">分析任务暂不可用，请稍后重试。</p>

  const taskCompleted = task.status === 'completed'
  const evaluationStatus: AnalysisProcessStageStatus = task.status === 'failed'
    ? 'failed'
    : taskCompleted
      ? 'completed'
      : 'running'
  const laterStatus: AnalysisProcessStageStatus = taskCompleted ? 'completed' : 'pending'
  const completedDimensions = task.steps.filter((step) => step.status === 'completed').length
  const completedRecommendationBand = taskCompleted
    ? getSiteSelectionRecommendationBand(task.overallScore ?? 0)
    : null
  const stages: Array<{
    title: string
    description: string
    status: AnalysisProcessStageStatus
    content: ReactNode
  }> = [
    {
      title: '数据准备',
      description: '已固化站址分析快照',
      status: 'completed',
      content: <p className="text-xs leading-5 text-muted-foreground">任务输入已固定，后续分析均基于本次踏勘数据。</p>,
    },
    {
      title: '多维评估',
      description: `${completedDimensions}/5 已完成`,
      status: evaluationStatus,
      content: (
        <div className="flex flex-col gap-3">
          {task.steps.map((step) => (
            <div key={step.code} className="rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{step.name}</p>
                <Badge
                  variant={step.status === 'failed' ? 'destructive' : 'outline'}
                  className={cn(step.status === 'running' && 'border-primary/40 bg-primary/10 text-primary')}
                >
                  {step.status === 'running' ? (
                    <LoaderCircleIcon data-icon="inline-start" className="animate-spin" aria-hidden="true" />
                  ) : null}
                  {analysisStepStatusLabel(step.status)}
                  {step.status === 'completed' && step.score !== null ? ` · ${step.score}分` : ''}
                </Badge>
              </div>
              {step.status === 'running' ? <p className="mt-2 text-xs text-primary">智能体正在分析该维度…</p> : null}
              {step.status === 'completed' && step.summary ? (
                <SiteAnalysisMarkdown content={step.summary} className="mt-2 text-xs text-muted-foreground" />
              ) : null}
              {step.status === 'completed' && step.risks.length ? (
                <ul className="mt-2 list-disc pl-5 text-xs leading-5 text-muted-foreground">
                  {step.risks.map((risk) => <li key={risk}>{risk}</li>)}
                </ul>
              ) : null}
              {step.status === 'failed' ? (
                <p className="mt-2 text-xs text-destructive">{step.error?.message || '该维度分析失败'}</p>
              ) : null}
            </div>
          ))}
        </div>
      ),
    },
    {
      title: '综合评分',
      description: taskCompleted ? `${task.overallScore ?? 0} 分` : '等待多维评估完成',
      status: laterStatus,
      content: taskCompleted ? (
        <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
          综合评分：<span className="font-semibold tabular-nums">{task.overallScore ?? 0} 分</span>
        </div>
      ) : null,
    },
    {
      title: '风险与建议',
      description: completedRecommendationBand?.label ?? '等待综合评分',
      status: laterStatus,
      content: completedRecommendationBand ? (
        <div className="flex flex-col items-start gap-2 rounded-lg bg-muted/40 p-3">
          <Badge variant="outline" className={completedRecommendationBand.badgeClassName}>{completedRecommendationBand.label}</Badge>
          {task.summary ? <SiteAnalysisMarkdown content={task.summary} className="text-sm" /> : null}
        </div>
      ) : null,
    },
    {
      title: '决策报告',
      description: report ? '已生成' : '等待分析完成',
      status: report ? 'completed' : 'pending',
      content: report ? (
        <div className="rounded-lg border bg-muted/20 p-3">
          <p className="text-sm font-medium">{report.title}</p>
          <SiteAnalysisMarkdown content={report.conclusion.overallSummary} className="mt-2 text-sm text-muted-foreground" />
        </div>
      ) : null,
    },
  ]

  return (
    <div ref={processRef} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-semibold">站址分析流程</p>
        <Badge variant={task.status === 'failed' ? 'destructive' : 'secondary'}>
          {analysisTaskStatusLabel(task.status)}
        </Badge>
      </div>
      <ol className="flex flex-col gap-4">
        {stages.map((stage, index) => (
          <li key={stage.title} className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
            {index < stages.length - 1 ? (
              <span className="absolute bottom-[-1rem] left-4 top-8 w-px -translate-x-1/2 bg-border" aria-hidden="true" />
            ) : null}
            <span
              className={cn(
                'relative flex size-8 items-center justify-center rounded-full border text-xs font-semibold',
                stage.status === 'completed' && 'border-primary bg-primary text-primary-foreground',
                stage.status === 'running' && 'border-primary bg-primary/10 text-primary',
                stage.status === 'pending' && 'border-border bg-muted text-muted-foreground',
                stage.status === 'failed' && 'border-destructive bg-destructive text-destructive-foreground',
              )}
            >
              {stage.status === 'completed' ? (
                <CircleCheckIcon className="size-4" aria-hidden="true" />
              ) : stage.status === 'running' ? (
                <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
              ) : index + 1}
            </span>
            <div className="min-w-0 pb-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">{stage.title}</p>
                <span className="text-xs text-muted-foreground">{stage.description}</span>
              </div>
              {stage.content ? <div className="mt-2">{stage.content}</div> : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

function AnalysisLoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-sm text-destructive">{message}</p>
      {onRetry ? <Button type="button" variant="outline" size="sm" onClick={onRetry}>重新加载</Button> : null}
    </div>
  )
}

function analysisTaskStatusLabel(status: AnalysisTask['status']) {
  return { queued: '排队中', running: '分析中', completed: '已完成', failed: '失败' }[status]
}

function analysisStepStatusLabel(status: AnalysisTask['steps'][number]['status']) {
  return { pending: '等待中', running: '分析中', completed: '已完成', failed: '失败' }[status]
}
