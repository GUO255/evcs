import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format, isValid } from 'date-fns'
import {
  BotIcon,
  ChartNoAxesCombinedIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  FileTextIcon,
  GitCompareArrowsIcon,
  HistoryIcon,
  MapIcon,
  MessageSquareTextIcon,
  NetworkIcon,
  TriangleAlertIcon,
} from '@/components/ui/icons'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from '@/components/ui/attachment'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { listAllDailySiteExplorationSites, siteExplorationErrorMessage } from '@/features/site-planning/site-exploration-api'
import type { SiteExplorationDailyListItem } from '@/features/site-planning/site-exploration-daily'
import type { SiteSelectionRecommendation } from '@/features/site-planning/site-exploration-data'
import { getSiteSelectionRecommendationBand, siteSelectionRecommendationBands } from '@/features/site-planning/site-selection-recommendation-config'
import { cn } from '@/lib/utils'

import { agentTeamByWorkspace } from './agent-team-data'
import { AgentAnalysisSummary, type AgentAnalysisSummaryProps } from './agent-analysis-summary'
import { AgentTeamCard } from './agent-team-card'
import { AgentWorkflowStep } from './agent-workflow-step'
import { getAgentWorkspace } from './agent-workspace-data'
import { AgentWorkspaceSplitLayout } from './agent-workspace-split-layout'
import {
  askAnalysisTask,
  getAnalysisDashboard,
  getAnalysisTask,
  getAnalysisWorkRecords,
  SiteAnalysisApiError,
  siteAnalysisErrorMessage,
  type AnalysisDashboard,
  type AnalysisDimensionCode,
  type AnalysisReport,
  type AnalysisStep,
  type AnalysisTask,
  type AnalysisWorkRecord,
} from './site-selection-analysis-api'
import {
  mockAnalysisConversation,
  mockAnalysisDashboard,
  mockAnalysisTask,
  mockAnalysisWorkRecords,
} from './site-selection-analysis-mock'
import { usesSiteSelectionAnalysisApi } from './site-selection-analysis-source'
import { formatSiteSelectionChartDate } from './site-selection-daily-data'
import { SiteSelectionCalendar } from './site-selection-calendar'
import { SiteSelectionDateFilter } from './site-selection-date-filter'
import {
  isSiteSelectionContentTab,
  isSiteSelectionModeTab,
  readSiteSelectionContentTab,
  readSiteSelectionModeTab,
  writeSiteSelectionContentTab,
  writeSiteSelectionModeTab,
} from './site-selection-content-tab-storage'
import { SiteSelectionMapCard } from './site-selection-map-card'
import { SiteAnalysisMarkdown, SiteSelectionReportDialog } from './site-selection-report-dialog'
import { SiteSelectionSiteDetailDialog } from './site-selection-site-detail-dialog'

const siteSelectionAgent = getAgentWorkspace('site-selection')
const siteSelectionTeam = agentTeamByWorkspace['site-selection']
const analysisUsesApi = usesSiteSelectionAnalysisApi('analysis')
const teamUsesApi = usesSiteSelectionAnalysisApi('team')
const workRecordsUseApi = usesSiteSelectionAnalysisApi('workRecords')
const logsUseApi = usesSiteSelectionAnalysisApi('logs')
const conversationUsesApi = usesSiteSelectionAnalysisApi('conversation')
const needsTaskApi = analysisUsesApi || teamUsesApi || conversationUsesApi
const dimensionAgentIds: Record<AnalysisDimensionCode, (typeof siteSelectionTeam)[number]['id']> = {
  geography_environment: 'geo-environment',
  power_access: 'power-access',
  site_conditions: 'site-condition',
  ownership_compliance: 'ownership-compliance',
  fleet_cooperation: 'fleet-cooperation',
}

export function SiteSelectionAgentDashboard() {
  const queryClient = useQueryClient()
  const dashboard = useQuery({
    queryKey: ['site-analysis', 'dashboard'],
    queryFn: getAnalysisDashboard,
    enabled: needsTaskApi,
    retry: false,
    staleTime: 5_000,
    refetchInterval: ({ state }) => state.data?.activeTaskCount ? 5_000 : 15_000,
  })
  const [currentTaskId, setCurrentTaskId] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    if (!dashboard.data) return
    const nextTaskId = dashboard.data.currentTaskId
    if (nextTaskId !== currentTaskId) setCurrentTaskId(nextTaskId)
  }, [currentTaskId, dashboard.data, dashboard.dataUpdatedAt])

  const task = useQuery({
    queryKey: ['site-analysis', 'task', currentTaskId],
    queryFn: () => getAnalysisTask(currentTaskId!),
    enabled: needsTaskApi && Boolean(currentTaskId),
    retry: false,
    refetchInterval: ({ state }) => state.data?.status === 'queued' || state.data?.status === 'running' ? 5_000 : false,
  })
  const workRecords = useQuery({
    queryKey: ['site-analysis', 'work-records'],
    queryFn: () => getAnalysisWorkRecords(50),
    enabled: workRecordsUseApi || logsUseApi,
    retry: false,
    refetchInterval: 15_000,
  })

  useEffect(() => {
    if (!needsTaskApi) return
    if (!(task.error instanceof SiteAnalysisApiError) || task.error.status !== 404) return
    const missingTaskId = currentTaskId
    setCurrentTaskId(null)
    void dashboard.refetch().then(({ data }) => {
      const nextTaskId = data?.currentTaskId ?? null
      if (nextTaskId !== missingTaskId) setCurrentTaskId(nextTaskId)
    })
  }, [task.error, currentTaskId, dashboard.refetch])

  useEffect(() => {
    if (!analysisUsesApi || (task.data?.status !== 'completed' && task.data?.status !== 'failed')) return
    if (task.data.status === 'completed') {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ['site-exploration', 'map'] }),
        queryClient.invalidateQueries({ queryKey: ['site-exploration', 'list'] }),
        queryClient.invalidateQueries({ queryKey: ['site-exploration', 'detail', task.data.siteId] }),
      ])
    }
    void dashboard.refetch().then(({ data }) => {
      if (data?.activeTaskCount && data.currentTaskId !== currentTaskId) setCurrentTaskId(data.currentTaskId)
    })
  }, [task.data?.status, task.data?.siteId, currentTaskId, dashboard.refetch, queryClient])

  const displayedDashboard = analysisUsesApi ? dashboard.data : mockAnalysisDashboard
  const displayedTask = analysisUsesApi ? task.data : mockAnalysisTask
  const teamTaskCandidate = teamUsesApi ? task.data : mockAnalysisTask
  const teamTask = teamTaskCandidate
  const displayedReportRecords = workRecordsUseApi ? workRecords.data : [...mockAnalysisWorkRecords]
  const displayedLogRecords = logsUseApi ? workRecords.data : [...mockAnalysisWorkRecords]

  const team = useMemo(() => siteSelectionTeam.map((agent) => {
    const code = Object.entries(dimensionAgentIds).find(([, id]) => id === agent.id)?.[0] as AnalysisDimensionCode | undefined
    const step = teamTask?.steps.find((item) => item.code === code)
    return { ...agent, status: step ? stepStatusLabel(step.status) : '等待任务', emphasis: step?.status === 'running' }
  }), [teamTask])

  const retryPrimary = () => {
    if (!analysisUsesApi) return
    void dashboard.refetch()
    if (currentTaskId) void task.refetch()
  }

  const conversation = conversationUsesApi
    ? {
        agentName: siteSelectionAgent.name,
        agentAvatarSrc: siteSelectionAgent.avatarSrc,
        agentFallback: '址',
        conversationId: task.data?.id ?? 'no-task',
        initialMessage: task.data
          ? `你好，我可以基于“${task.data.siteName}”当前分析任务的五维结果和决策报告回答问题。本页问答不会保存。`
          : '当前没有可供问答的分析任务。任务创建后，可在这里查询五维结果、风险和选址建议。',
        placeholder: task.data ? '询问当前站址的分析结果' : '暂无可问答任务',
        disabled: !task.data,
        onSendMessage: task.data ? (message: string) => askAnalysisTask(task.data!.id, message) : undefined,
      }
    : {
        ...mockAnalysisConversation,
        agentName: siteSelectionAgent.name,
        agentAvatarSrc: siteSelectionAgent.avatarSrc,
        agentFallback: '址',
        conversationId: 'site-selection-mock',
        disabled: false,
      }

  return (
    <AgentWorkspaceSplitLayout
      fillPrimary
      primary={<SiteSelectionContent
        dashboard={displayedDashboard}
        task={displayedTask}
        loading={analysisUsesApi && (dashboard.isLoading || (Boolean(currentTaskId) && task.isLoading))}
        error={analysisUsesApi ? dashboard.error ?? task.error : null}
        onRetry={retryPrimary}
      />}
      secondary={(
        <AgentTeamCard
          agents={team}
          conversation={conversation}
          workRecords={<ReportRecordsCard records={displayedReportRecords} loading={workRecordsUseApi && workRecords.isLoading} error={workRecordsUseApi ? workRecords.error : null} onRetry={() => { if (workRecordsUseApi) void workRecords.refetch() }} />}
          agentLogs={<WorkRecordLogsCard records={displayedLogRecords} loading={logsUseApi && workRecords.isLoading} error={logsUseApi ? workRecords.error : null} onRetry={() => { if (logsUseApi) void workRecords.refetch() }} />}
          unreadWorkRecordCount={workRecordsUseApi ? 0 : siteSelectionAgent.unreadCount}
        />
      )}
    />
  )
}

function SiteSelectionContent({ dashboard, task, loading, error, onRetry }: { dashboard?: AnalysisDashboard; task?: AnalysisTask; loading: boolean; error: unknown; onRetry: () => void }) {
  const [contentTab, setContentTab] = useState(() => readSiteSelectionContentTab(window.sessionStorage))
  const [modeTab, setModeTab] = useState(() => readSiteSelectionModeTab(window.sessionStorage))
  const hasTask = Boolean(task)
  return (
    <Card className="h-[calc(100dvh-8rem)] min-h-[42rem] w-full min-w-0 max-w-full max-h-[58rem] border ring-0 xl:h-full xl:min-h-0 xl:max-h-none xl:[--card-spacing:--spacing(3)] 2xl:[--card-spacing:--spacing(4)]">
      <Tabs
        value={contentTab}
        onValueChange={(value) => {
          if (!isSiteSelectionContentTab(value)) {
            throw new Error(`Unknown site selection content tab: ${value}`)
          }
          setContentTab(value)
          writeSiteSelectionContentTab(window.sessionStorage, value)
        }}
        className="min-h-0 min-w-0 flex-1 gap-3 2xl:gap-4"
      >
        <CardHeader className="grid-cols-[1fr_auto_1fr] items-center gap-3 2xl:gap-4">
          <TabsList variant="line" className="col-start-2 row-start-1 !h-auto" aria-label="智能选址内容">
            <TabsTrigger value="map"><MapIcon data-icon="inline-start" aria-hidden="true" />选址地图</TabsTrigger>
            <TabsTrigger value="agent-site-selection"><BotIcon data-icon="inline-start" aria-hidden="true" />智能体选址</TabsTrigger>
          </TabsList>
        </CardHeader>
        <CardContent className="min-h-0 min-w-0 flex-1 overflow-hidden pt-0">
          <TabsContent value="map" className="h-full"><EmbeddedSiteSelectionContent fill><SiteSelectionMapCard /></EmbeddedSiteSelectionContent></TabsContent>
          <TabsContent value="agent-site-selection" className="h-full">
            <ScrollArea className="h-full min-w-0 pr-5 [&>[data-slot=scroll-area-viewport]]:!overflow-x-hidden [&_[data-slot=scroll-area-content]]:!min-w-0">
              <EmbeddedSiteSelectionContent>
                {loading ? <AnalysisDashboardSkeleton /> : error ? <AnalysisEmpty title="分析数据加载失败" description={siteAnalysisErrorMessage(error) ?? '请重新登录后重试。'} onRetry={onRetry} /> : !dashboard ? null : (
                  <Tabs
                    value={modeTab}
                    onValueChange={(value) => {
                      if (!isSiteSelectionModeTab(value)) {
                        throw new Error(`Unknown site selection mode tab: ${value}`)
                      }
                      setModeTab(value)
                      writeSiteSelectionModeTab(window.sessionStorage, value)
                    }}
                    className="gap-4"
                  >
                    <TabsList className="sticky top-0 z-10 grid w-full shrink-0 grid-cols-3" aria-label="智能体选址模式">
                      <TabsTrigger value="single-site-score"><FileTextIcon data-icon="inline-start" aria-hidden="true" />单站选址评分</TabsTrigger>
                      <TabsTrigger value="multi-site-comparison"><GitCompareArrowsIcon data-icon="inline-start" aria-hidden="true" />多站选址评比</TabsTrigger>
                      <TabsTrigger value="network-layout-optimization"><NetworkIcon data-icon="inline-start" aria-hidden="true" />网络布局优化</TabsTrigger>
                    </TabsList>
                    <TabsContent value="single-site-score" className="flex flex-col gap-4">
                      {hasTask
                        ? <TaskStatusCard task={task} />
                        : <TodayWorkOverviewCard dashboard={dashboard} task={task} onOpenMap={() => {
                          setContentTab('map')
                          writeSiteSelectionContentTab(window.sessionStorage, 'map')
                        }} />}
                      <SiteSelectionDailyOverview dashboard={dashboard} />
                    </TabsContent>
                    <TabsContent value="multi-site-comparison">
                      <SiteSelectionModeEmpty
                        title="暂无多站选址评比内容"
                        description="多站选址评比内容将在这里展示。"
                      />
                    </TabsContent>
                    <TabsContent value="network-layout-optimization">
                      <SiteSelectionModeEmpty
                        title="暂无网络布局优化内容"
                        description="网络布局优化内容将在这里展示。"
                      />
                    </TabsContent>
                  </Tabs>
                )}
              </EmbeddedSiteSelectionContent>
            </ScrollArea>
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  )
}

function SiteSelectionModeEmpty({ title, description }: { title: string; description: string }) {
  return (
    <Empty className="border py-16">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function TodayWorkOverviewCard({ dashboard, task, onOpenMap }: { dashboard: AnalysisDashboard; task?: AnalysisTask; onOpenMap: () => void }) {
  const [selectedReport, setSelectedReport] = useState<AnalysisReport | null>(null)
  const stats = dashboard.todayStats
  const metrics = [
    { label: '今日生成任务', value: stats.createdTaskCount, icon: FileTextIcon, tone: 'text-primary bg-primary/10' },
    { label: '今日完成分析', value: stats.completedTaskCount, icon: ChartNoAxesCombinedIcon, tone: 'text-primary bg-primary/10' },
    { label: '待分析站点', value: stats.pendingSiteCount, icon: MapIcon, tone: 'text-primary bg-primary/10' },
    { label: '需人工复核', value: stats.reviewRequiredCount, icon: CircleAlertIcon, tone: 'text-amber-500 bg-amber-500/10' },
  ]
  const latest = dashboard.latestCompleted
  const latestReport = latest && task?.id === latest.taskId ? task.report : null
  return (
    <>
      <Card className="border bg-muted/20 ring-0">
        <CardHeader>
          <div className="flex min-w-0 items-center gap-3">
            <Avatar size="lg"><AvatarImage src={siteSelectionAgent.avatarSrc} alt={siteSelectionAgent.name} /><AvatarFallback>址</AvatarFallback></Avatar>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2"><CardTitle>{siteSelectionAgent.name}</CardTitle><Badge variant="secondary">待命中</Badge></div>
              <CardDescription>当前没有进行中的分析任务</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="rounded-xl border p-4 @3xl/workspace:p-5">
            <div className="flex items-start gap-3">
              <ChartNoAxesCombinedIcon className="mt-0.5 size-5 text-primary" aria-hidden="true" />
              <div><h3 className="font-semibold">今日工作概览</h3><p className="mt-1 text-sm text-muted-foreground">团队已完成今日阶段性分析，等待新的站点任务。</p></div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 @3xl/workspace:grid-cols-4">
              {metrics.map(({ label, value, icon: Icon, tone }) => (
                <div key={label} className="flex min-w-0 items-center gap-3 rounded-lg border bg-muted/20 p-3">
                  <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full', tone)}><Icon className="size-5" aria-hidden="true" /></span>
                  <div className="min-w-0"><dt className="truncate text-xs text-muted-foreground">{label}</dt><dd className="mt-1 flex items-baseline gap-1"><span className="text-2xl font-semibold tabular-nums">{value}</span><span className="text-xs text-muted-foreground">个</span></dd></div>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <p className="text-muted-foreground">今日平均得分 <strong className="ml-2 text-lg font-semibold tabular-nums text-foreground">{stats.averageScore ?? '—'}</strong></p>
              <p className="text-muted-foreground">平均分析耗时 <strong className="ml-2 text-base font-semibold tabular-nums text-foreground">{formatDuration(stats.averageDurationSeconds)}</strong></p>
            </div>
            <div className="mt-4 flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 @2xl/workspace:flex-row @2xl/workspace:items-center">
              <div className="min-w-0 flex-1"><p className="truncate text-sm text-muted-foreground">{latest ? <>最近完成：<span className="font-medium text-foreground">{latest.siteName}</span> · <span className="font-semibold text-emerald-500">{latest.overallScore} 分</span></> : '今日暂无已完成的分析任务'}</p></div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {latestReport ? <Button variant="ghost" type="button" onClick={() => setSelectedReport(latestReport)}>查看报告<ChevronRightIcon data-icon="inline-end" aria-hidden="true" /></Button> : null}
                <Button type="button" onClick={onOpenMap}><MapIcon data-icon="inline-start" aria-hidden="true" />前往选址地图</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <SiteSelectionReportDialog
        open={selectedReport !== null}
        report={selectedReport}
        isLoading={false}
        onClose={() => setSelectedReport(null)}
      />
    </>
  )
}

function EmbeddedSiteSelectionContent({ children, fill = false }: { children: ReactNode; fill?: boolean }) {
  return <div className={cn('flex w-full min-w-0 flex-col gap-4 [&>[data-slot=card]]:min-w-0 [&>[data-slot=card]]:shrink-0 [&>[data-slot=card]]:overflow-visible [&>[data-slot=card]]:rounded-none [&>[data-slot=card]]:border-0 [&>[data-slot=card]]:bg-transparent [&>[data-slot=card]]:py-0 [&>[data-slot=card]]:ring-0 [&>[data-slot=card]>[data-slot=card-content]]:px-0 [&>[data-slot=card]>[data-slot=card-header]]:px-0', fill && 'h-full [&>[data-slot=card]]:min-h-0 [&>[data-slot=card]]:flex-1')}>{children}</div>
}

function TaskStatusCard({ task }: { task?: AnalysisTask }) {
  const [selectedStepOrder, setSelectedStepOrder] = useState(1)
  useEffect(() => {
    if (!task) return
    const steps = workflowSteps(task)
    const current = steps.find((step) => step.progress > 0 && step.progress < 100) ?? [...steps].reverse().find((step) => step.progress === 100) ?? steps[0]!
    setSelectedStepOrder(current.order)
  }, [task?.id, task?.status, task?.currentStep])
  if (!task) return <AnalysisEmpty title="暂无分析任务" description="页面会在下次打开时读取最新任务；任务需由后台管理脚本创建。" />
  const steps = workflowSteps(task)
  const selected = steps.find((step) => step.order === selectedStepOrder) ?? steps[0]!
  return (
    <Card className="border bg-muted/20 ring-0">
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <Avatar size="lg"><AvatarImage src={siteSelectionAgent.avatarSrc} alt={siteSelectionAgent.name} /><AvatarFallback>址</AvatarFallback></Avatar>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2"><CardTitle>{siteSelectionAgent.name}</CardTitle><Badge variant={task.status === 'failed' ? 'destructive' : 'secondary'}>{taskStatusLabel(task.status)}</Badge></div>
            <CardDescription>{task.siteName} · {task.status === 'failed' ? task.error?.message || '任务执行失败' : `智能选址五阶段工作流${task.status === 'completed' ? '已完成' : '正在执行'}`}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <ol className="flex flex-col gap-4 md:flex-row md:items-center md:gap-0">
          {steps.map((step, index) => <AgentWorkflowStep key={step.order} {...step} connect={index < steps.length - 1} selected={selected.order === step.order} onSelect={() => setSelectedStepOrder(step.order)} />)}
        </ol>
        <div className="mt-4 rounded-lg bg-muted px-4 py-3 text-sm">
          <SiteAnalysisMarkdown content={selected.reply} />
        </div>
      </CardContent>
    </Card>
  )
}

function workflowSteps(task: AnalysisTask) {
  const completedDimensions = task.steps.filter(({ status }) => status === 'completed').length
  const dimensionProgress = Math.round(completedDimensions / 5 * 100)
  const completed = task.status === 'completed'
  return [
    { order: 1, title: '数据准备', description: '已固化快照', progress: 100, reply: `已为“${task.siteName}”固化任务输入快照，分析过程中不会读取继续变化的站址数据。` },
    { order: 2, title: '多维评估', description: `${completedDimensions}/5 已完成`, progress: completed ? 100 : Math.max(dimensionProgress, task.status === 'running' ? 1 : 0), reply: currentDimensionReply(task) },
    { order: 3, title: '综合评分', description: completed ? `${task.overallScore ?? 0} 分` : '等待五维结果', progress: completed ? 100 : 0, reply: completed ? `五维结果已按确定性权重计算，综合得分为 ${task.overallScore ?? 0} 分。` : '五个专业维度全部完成后，由确定性代码计算综合得分。' },
    { order: 4, title: '风险与建议', description: completed ? getSiteSelectionRecommendationBand(task.overallScore ?? 0).label : '等待评分', progress: completed ? 100 : 0, reply: completed ? task.summary : '综合评分完成后，根据硬性条件、数据充分程度和主要风险生成建议。' },
    { order: 5, title: '决策报告', description: task.report ? '已生成' : '等待输出', progress: task.report ? 100 : 0, reply: task.report ? `${task.report.title}已按 v1 规则确定性组装。` : '等待任务完成后按工作流版本组装决策报告。' },
  ]
}

function currentDimensionReply(task: AnalysisTask): string {
  if (task.status === 'failed') return task.error?.message || '任务执行失败，请查看右侧日志。'
  const running = task.steps.find(({ status }) => status === 'running')
  if (running) return `${running.name}智能体正在分析。已完成 ${task.steps.filter(({ status }) => status === 'completed').length} 个专业维度。`
  if (task.status === 'queued') return '任务正在队列中等待 Worker 领取。'
  return task.status === 'completed' ? '五个专业维度均已完成。' : '等待下一专业维度开始。'
}

function SiteSelectionDailyOverview({ dashboard }: { dashboard: AnalysisDashboard }) {
  const availableDates = useMemo(() => {
    const dates = new Set([
      ...dashboard.calendar.map(({ date }) => date),
      ...dashboard.trend.map(({ date }) => date),
      getShanghaiDate(new Date()),
    ])
    if (dashboard.latestCompleted) dates.add(getShanghaiDate(new Date(dashboard.latestCompleted.completedAt)))
    return [...dates].sort()
  }, [dashboard.calendar, dashboard.latestCompleted, dashboard.trend])
  const [selectedDate, setSelectedDate] = useState(() => availableDates.at(-1)!)

  useEffect(() => {
    if (!availableDates.includes(selectedDate)) setSelectedDate(availableDates.at(-1)!)
  }, [availableDates, selectedDate])

  return (
    <>
      <SiteSelectionBriefCard
        dashboard={dashboard}
        availableDates={availableDates}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />
      <SiteSelectionCalendar
        records={toCalendarRecords(dashboard)}
        analysis={createCalendarAnalysis(dashboard)}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
      />
    </>
  )
}

function SiteSelectionBriefCard({
  dashboard,
  availableDates,
  selectedDate,
  onDateChange,
}: {
  dashboard: AnalysisDashboard
  availableDates: string[]
  selectedDate: string
  onDateChange: (date: string) => void
}) {
  const isToday = selectedDate === getShanghaiDate(new Date())
  const title = isToday ? '今日选址报告' : '当日选址报告'

  return (
    <Card className="border bg-muted/20 ring-0">
      <CardHeader>
        <div className="flex items-center gap-2"><MessageSquareTextIcon className="size-4 text-primary" aria-hidden="true" /><CardTitle>{title}</CardTitle></div>
        <CardAction>
          <SiteSelectionDateFilter
            availableDates={availableDates}
            selectedDate={selectedDate}
            onDateChange={(date) => {
              if (!date) throw new Error('Daily site selection report requires a date')
              onDateChange(date)
            }}
            label={title}
            showAll={false}
          />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        <DailySiteSelectionAttachments date={selectedDate} />
        <AgentAnalysisSummary {...createBriefAnalysis(dashboard, selectedDate)} />
      </CardContent>
    </Card>
  )
}

const dailySiteGroups: ReadonlyArray<{
  key: string
  label: string
  badgeClassName?: string
  includes: (recommendation: SiteSelectionRecommendation) => boolean
}> = [
  { key: 'pending', label: '待分析', includes: (value) => value === '' || value === 'needs-review' },
  ...siteSelectionRecommendationBands.map((band) => ({
    key: band.key,
    label: band.label,
    badgeClassName: band.badgeClassName,
    includes: (value: SiteSelectionRecommendation) => value === band.key,
  })),
]

function DailySiteSelectionAttachments({ date }: { date: string }) {
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)
  const sites = useQuery({
    queryKey: ['site-exploration', 'daily-attachments', 'site', date],
    queryFn: () => listAllDailySiteExplorationSites(date, 'site'),
    retry: false,
    staleTime: 60_000,
  })

  return (
    <>
      <section className="flex min-w-0 flex-col gap-3" aria-label={`${date}站点`}>
        {sites.isPending ? <DailySiteAttachmentsSkeleton /> : null}
        {sites.isError ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2 text-sm text-destructive">
              <TriangleAlertIcon className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{siteExplorationErrorMessage(sites.error) ?? '登录状态已失效，正在重新认证。'}</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => void sites.refetch()}>重试</Button>
          </div>
        ) : null}
        {sites.data?.length === 0 ? (
          <Empty className="border py-5">
            <EmptyHeader>
              <EmptyTitle>当日暂无勘探站点</EmptyTitle>
              <EmptyDescription>当天创建的勘探站点会显示在这里。</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}
        {sites.data && sites.data.length > 0 ? (
          <div className="flex min-w-0 flex-col gap-4">
            {dailySiteGroups.map((group) => {
              const groupSites = sites.data.filter((site) => group.includes(site.selectionRecommendation))
              if (groupSites.length === 0) return null
              return (
                <section key={group.key} className="flex min-w-0 flex-col gap-2" aria-labelledby={`daily-sites-${group.key}`}>
                  <div className="flex items-center gap-2">
                    <h3 id={`daily-sites-${group.key}`} className="text-xs font-medium text-muted-foreground">{group.label}</h3>
                    <span className="text-xs tabular-nums text-muted-foreground">{groupSites.length}</span>
                  </div>
                  <AttachmentGroup>
                    {groupSites.map((site) => (
                      <DailySiteAttachment
                        key={site.id}
                        site={site}
                        onOpen={() => setSelectedSiteId(site.id)}
                      />
                    ))}
                  </AttachmentGroup>
                </section>
              )
            })}
          </div>
        ) : null}
      </section>
      <SiteSelectionSiteDetailDialog
        open={selectedSiteId !== null}
        siteId={selectedSiteId}
        defaultTab="site"
        onClose={() => setSelectedSiteId(null)}
      />
    </>
  )
}

function DailySiteAttachment({
  site,
  onOpen,
}: {
  site: SiteExplorationDailyListItem
  onOpen: () => void
}) {
  const image = site.siteBoundarySnapshot ?? site.locationSnapshot
  const imageName = site.siteBoundarySnapshot ? '场站勘探测绘图' : '站点定位图'
  const group = getDailySiteGroup(site.selectionRecommendation)

  return (
    <Attachment orientation="vertical" className="w-48 has-data-[slot=attachment-content]:w-48">
      {image ? (
        <AttachmentMedia variant="image">
          <img src={image.url} alt={`${site.projectName}${imageName}`} loading="lazy" />
        </AttachmentMedia>
      ) : null}
      <AttachmentContent>
        <AttachmentTitle title={site.projectName}>{site.projectName}</AttachmentTitle>
        <AttachmentDescription title={`${site.provinceCity} · ${site.countyDistrict}`}>
          {site.provinceCity} · {site.countyDistrict}
        </AttachmentDescription>
        <Badge variant="outline" className={cn('mt-2 w-fit', group.badgeClassName)}>
          {group.label}
        </Badge>
      </AttachmentContent>
      <AttachmentTrigger
        onClick={onOpen}
        aria-label={`查看${site.projectName}`}
      />
    </Attachment>
  )
}

function getDailySiteGroup(recommendation: SiteSelectionRecommendation) {
  const group = dailySiteGroups.find((item) => item.includes(recommendation))
  if (!group) throw new Error(`Unknown site selection recommendation: ${recommendation}`)
  return group
}

function DailySiteAttachmentsSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="正在加载今日站点">
      {[0, 1].map((group) => (
        <div key={group} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-20" />
          <div className="flex gap-3">
            {[0, 1, 2].map((item) => <Skeleton key={item} className="h-36 w-30 rounded-xl" />)}
          </div>
        </div>
      ))}
    </div>
  )
}

function getShanghaiDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  if (!values.year || !values.month || !values.day) throw new Error('Unable to format Shanghai date')
  return `${values.year}-${values.month}-${values.day}`
}

function createCalendarAnalysis(dashboard: AnalysisDashboard): AgentAnalysisSummaryProps {
  const records = [...dashboard.calendar].sort((left, right) => left.date.localeCompare(right.date))
  if (!records.length) return createAnalysisSummary('选址日历数据分析', '当前日历暂无新建的勘探站点。')
  const first = records[0]!
  const last = records.at(-1)!
  const peak = records.reduce((current, record) => record.analyzedCount > current.analyzedCount ? record : current)
  const analyzedCount = records.reduce((total, record) => total + record.analyzedCount, 0)
  const volumeChange = last.analyzedCount > first.analyzedCount ? '提升至' : last.analyzedCount < first.analyzedCount ? '回落至' : '保持在'
  return createAnalysisSummary(
    '选址日历数据分析',
    `当前日历统计覆盖 ${formatSiteSelectionChartDate(first.date)}至${formatSiteSelectionChartDate(last.date)}，累计新建 ${analyzedCount} 个勘探站点，日勘探站点量由 ${first.analyzedCount} 个${volumeChange}${last.analyzedCount} 个；${formatSiteSelectionChartDate(peak.date)}以 ${peak.analyzedCount} 个达到当前峰值。整体评分中，优先推进站点共 ${dashboard.scoreRanges.priority} 个，建议推进站点共 ${dashboard.scoreRanges.recommended} 个，应优先完成高分站点的人工复核与选址决策。`,
  )
}

function createBriefAnalysis(dashboard: AnalysisDashboard, date: string): AgentAnalysisSummaryProps {
  const trend = dashboard.trend.find((record) => record.date === date)
  if (!trend || trend.analyzedCount === 0) return createAnalysisSummary('选址简报数据分析', `${formatSiteSelectionChartDate(date)}暂无新建的勘探站点。`)
  const reportedCount = trend.priority + trend.recommended + trend.cautious + trend.paused
  const pendingCount = Math.max(0, trend.analyzedCount - reportedCount)
  return createAnalysisSummary(
    '选址简报数据分析',
    `${formatSiteSelectionChartDate(date)}共新建 ${trend.analyzedCount} 个勘探站点。其中优先推进 ${trend.priority} 个、建议推进 ${trend.recommended} 个、谨慎推进 ${trend.cautious} 个、暂缓推进 ${trend.paused} 个${pendingCount > 0 ? `、待分析 ${pendingCount} 个` : ''}。`,
  )
}

function createAnalysisSummary(title: string, content: string): AgentAnalysisSummaryProps {
  return { agent: { name: siteSelectionAgent.name, avatarSrc: siteSelectionAgent.avatarSrc, fallback: '址' }, title, content }
}

function ReportRecordsCard({ records, loading, error, onRetry }: { records?: AnalysisWorkRecord[]; loading: boolean; error: unknown; onRetry: () => void }) {
  const [selectedRecord, setSelectedRecord] = useState<
    (AnalysisWorkRecord & { report: AnalysisReport }) | null
  >(null)
  if (loading) return <PanelSkeleton />
  if (error) return <AnalysisEmpty title="工作记录加载失败" description={siteAnalysisErrorMessage(error) ?? '请重新登录后重试。'} onRetry={onRetry} />
  const reportRecords = records?.filter((record): record is AnalysisWorkRecord & { report: AnalysisReport } => Boolean(record.report)) ?? []
  if (!reportRecords.length) return <AnalysisEmpty title="暂无选址报告" description="选址任务完成并生成报告后，将在这里按时间展示。" />
  return (
    <>
      <Card className="border ring-0">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileTextIcon className="size-4 text-primary" aria-hidden="true" />
            <CardTitle>工作记录</CardTitle>
          </div>
          <CardDescription>智能体近期生成的选址报告。</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <ol className="flex flex-col gap-5">
            {reportRecords.map((record) => (
              <li key={record.id} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
                <Avatar size="sm">
                  <AvatarImage src={siteSelectionAgent.avatarSrc} alt={siteSelectionAgent.name} />
                  <AvatarFallback>址</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <time className="block text-xs tabular-nums text-muted-foreground">
                    {formatTimestamp(record.occurredAt)}
                  </time>
                  <p className="mt-1 text-sm font-medium text-primary">生成选址报告</p>
                  <Card size="sm" className="mt-2 border ring-0">
                    <CardHeader>
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <FileTextIcon className="size-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <CardTitle className="truncate">{record.report.title}</CardTitle>
                          <CardDescription className="truncate">
                            选址报告 · {record.siteName}
                          </CardDescription>
                        </div>
                      </div>
                      <CardAction>
                        <Button variant="ghost" type="button" onClick={() => setSelectedRecord(record)}>
                          查看
                          <ChevronRightIcon data-icon="inline-end" aria-hidden="true" />
                        </Button>
                      </CardAction>
                    </CardHeader>
                  </Card>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
      <SiteSelectionSiteDetailDialog
        open={selectedRecord !== null}
        siteId={selectedRecord?.siteId ?? null}
        report={selectedRecord?.report}
        defaultTab="analysis"
        onClose={() => setSelectedRecord(null)}
      />
    </>
  )
}

function WorkRecordLogsCard({ records, loading, error, onRetry }: { records?: AnalysisWorkRecord[]; loading: boolean; error: unknown; onRetry: () => void }) {
  if (loading) return <PanelSkeleton />
  if (error) return <AnalysisEmpty title="日志加载失败" description={siteAnalysisErrorMessage(error) ?? '请重新登录后重试。'} onRetry={onRetry} />
  if (!records?.length) return <AnalysisEmpty title="暂无日志" description="任务和步骤产生状态变化后，将在这里按时间展示。" />
  return <Card className="border ring-0"><CardHeader><div className="flex items-center gap-2"><HistoryIcon className="size-4 text-primary" aria-hidden="true" /><CardTitle>日志</CardTitle></div><CardDescription>近期选址任务的执行步骤与结果。</CardDescription></CardHeader><CardContent className="pt-0"><ol className="flex flex-col gap-4">{records.map((record) => { const agent = record.stepCode ? getDimensionAgent(record.stepCode) : null; return <li key={record.id} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3"><Avatar size="sm"><AvatarImage src={agent?.avatarSrc ?? siteSelectionAgent.avatarSrc} alt={agent?.name ?? siteSelectionAgent.name} /><AvatarFallback>{agent?.fallback ?? '址'}</AvatarFallback></Avatar><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{record.siteName}</p><Badge variant={record.status === 'failed' ? 'destructive' : 'outline'}>{workTypeLabel(record)}</Badge></div><time className="mt-1 block text-xs tabular-nums text-muted-foreground">{formatTimestamp(record.occurredAt)}</time><SiteAnalysisMarkdown content={record.error?.message || record.summary || '状态已更新'} className={cn('mt-2 text-sm text-muted-foreground', record.error && 'text-destructive')} /></div></li> })}</ol></CardContent></Card>
}

function AnalysisDashboardSkeleton() { return <div className="flex flex-col gap-6" aria-label="正在加载智能选址分析"><Skeleton className="h-64 w-full" /><Skeleton className="h-40 w-full" /><Skeleton className="h-72 w-full" /><Skeleton className="h-80 w-full" /></div> }
function PanelSkeleton() { return <Card><CardHeader><Skeleton className="h-5 w-28" /><Skeleton className="h-4 w-56" /></CardHeader><CardContent className="flex flex-col gap-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></CardContent></Card> }
function AnalysisEmpty({ title, description, onRetry }: { title: string; description: string; onRetry?: () => void }) { return <Empty><EmptyHeader><EmptyMedia variant="icon"><CircleAlertIcon aria-hidden="true" /></EmptyMedia><EmptyTitle>{title}</EmptyTitle><EmptyDescription>{description}</EmptyDescription></EmptyHeader>{onRetry ? <EmptyContent><Button variant="outline" onClick={onRetry}>重新加载</Button></EmptyContent> : null}</Empty> }

function toCalendarRecords(dashboard: AnalysisDashboard) { return dashboard.trend.map((item) => ({ date: item.date, explorationCount: item.analyzedCount, priority: item.priority, recommended: item.recommended, cautious: item.cautious, paused: item.paused })) }
function getDimensionAgent(code: AnalysisDimensionCode) { const id = dimensionAgentIds[code]; const agent = siteSelectionTeam.find((member) => member.id === id); if (!agent) throw new Error(`Unknown site analysis agent: ${code}`); return agent }
function taskStatusLabel(status: AnalysisTask['status']): string { return { queued: '排队中', running: '运行中', completed: '已完成', failed: '失败' }[status] }
function stepStatusLabel(status: AnalysisStep['status']): string { return { pending: '等待中', running: '分析中', completed: '已完成', failed: '失败' }[status] }
function workTypeLabel(record: AnalysisWorkRecord): string { if (record.type === 'step_completed') return `${record.stepName ?? '专业步骤'}完成`; if (record.type === 'step_failed') return `${record.stepName ?? '专业步骤'}失败`; if (record.type === 'task_completed') return `任务完成 · ${record.score ?? 0} 分`; return `任务${taskStatusLabel(record.status as AnalysisTask['status'])}` }
function formatDuration(seconds: number | null): string { if (seconds === null) return '—'; const minutes = Math.floor(seconds / 60); const remainder = seconds % 60; return minutes > 0 ? `${minutes}分${remainder}秒` : `${remainder}秒` }
function formatTimestamp(timestamp?: number | null): string { if (timestamp === null || timestamp === undefined) return '尚未开始'; const date = new Date(timestamp * 1000); return isValid(date) ? format(date, 'yyyy-MM-dd HH:mm:ss') : '时间未知' }
