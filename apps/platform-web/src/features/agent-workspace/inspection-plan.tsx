import {
  CalendarClockIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  HistoryIcon,
  LoaderCircleIcon,
  WrenchIcon,
} from '@/components/ui/icons'

import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

import { AgentAnalysisSummary, type AgentAnalysisSummaryProps } from './agent-analysis-summary'
import { getAgentWorkspace } from './agent-workspace-data'
import { deviceFaults } from './device-fault-analysis'
import type { InspectionRecord } from './inspection-calendar'

type PlanState = 'completed' | 'current' | 'pending'

export const inspectionPlan = Array.from({ length: 24 }, (_, index) => {
  const hour = index
  const state: PlanState = hour < 13 ? 'completed' : hour === 13 ? 'current' : 'pending'

  return {
    time: `${String(hour).padStart(2, '0')}:00`,
    title: `第 ${index + 1} 轮场站巡检`,
    state,
    anomalyCount: hour === 5 ? 2 : 0,
  }
})

export type InspectionPlanItem = (typeof inspectionPlan)[number]

const inspectionAgent = getAgentWorkspace('inspection')
export function InspectionPlan({
  analysis,
  onOpenHourlyHistory,
}: {
  analysis: AgentAnalysisSummaryProps
  onOpenHourlyHistory: (plan: InspectionPlanItem) => void
}) {
  return (
    <Card className="border ring-0">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarClockIcon className="size-4 text-primary" aria-hidden="true" />
          <CardTitle>今日巡检</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ol className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-2">
          {inspectionPlan.map((plan) => (
            <li key={plan.time}>
              <Button
                variant={
                  plan.anomalyCount > 0
                    ? 'ghost'
                    : plan.state === 'completed'
                      ? 'default'
                      : plan.state === 'current'
                        ? 'secondary'
                        : 'outline'
                }
                className={cn(
                  'h-auto min-h-16 w-full flex-col items-start justify-between px-2 py-2 text-left disabled:opacity-100',
                  plan.anomalyCount > 0 && 'bg-destructive text-destructive-foreground hover:bg-destructive/80 hover:text-destructive-foreground',
                )}
                type="button"
                disabled={plan.state === 'pending'}
                aria-label={`查看 ${plan.time} 巡检报告`}
                onClick={() => onOpenHourlyHistory(plan)}
              >
                <time className="text-sm font-medium tabular-nums">{plan.time}</time>
                <span className="flex items-center gap-1 text-xs">
                  {plan.anomalyCount > 0 ? <CircleAlertIcon data-icon="inline-start" aria-hidden="true" /> : null}
                  {plan.state === 'completed' && plan.anomalyCount === 0 ? (
                    <CircleCheckIcon data-icon="inline-start" aria-hidden="true" />
                  ) : null}
                  {plan.state === 'current' ? (
                    <LoaderCircleIcon data-icon="inline-start" className="animate-spin" aria-hidden="true" />
                  ) : null}
                  {plan.anomalyCount > 0
                    ? `异常 · ${plan.anomalyCount}`
                    : plan.state === 'completed'
                      ? '正常'
                      : plan.state === 'current'
                        ? '巡检中'
                        : '待巡检'}
                </span>
              </Button>
            </li>
          ))}
        </ol>
        <AgentAnalysisSummary {...analysis} />
      </CardContent>
    </Card>
  )
}

export function HourlyInspectionHistoryDialog({
  plan,
  onClose,
}: {
  plan: InspectionPlanItem
  onClose: () => void
}) {
  const report = getHourlyReport(plan)
  const faults = plan.anomalyCount > 0 ? deviceFaults.slice(0, plan.anomalyCount) : []
  const status = plan.anomalyCount > 0
    ? `异常 · ${plan.anomalyCount}`
    : plan.state === 'completed'
      ? '正常'
      : plan.state === 'current'
        ? '巡检中'
        : '待巡检'

  return (
    <InspectionHistoryDialog
      title="小时历史巡检记录"
      description={`${plan.time} 时段的巡检状态和故障设备记录。`}
      recordLabel={plan.time}
      status={status}
      statusVariant={plan.anomalyCount > 0 ? 'destructive' : plan.state === 'completed' ? 'default' : 'secondary'}
      summary={report.summary}
      faults={faults}
      faultDescription={`该时段发现 ${faults.length} 个设备故障。`}
      onClose={onClose}
    />
  )
}

export function DailyInspectionHistoryDialog({
  record,
  onClose,
}: {
  record: InspectionRecord
  onClose: () => void
}) {
  const hasAnomaly = record.anomalyCount > 0
  const faults = hasAnomaly ? deviceFaults.slice(0, record.anomalyCount) : []
  const summary = hasAnomaly
    ? `全天巡检已覆盖 ${record.stationCount} 个场站，发现 ${record.anomalyCount} 台异常设备，故障信息已记录并进入排障分析。`
    : `全天巡检已覆盖 ${record.stationCount} 个场站，场站设备在线状态正常，未发现异常设备。`

  return (
    <InspectionHistoryDialog
      title="全天巡检记录"
      description={`${record.date} 全天的巡检状态和故障设备记录。`}
      recordLabel={record.date}
      status={hasAnomaly ? `异常 · ${record.anomalyCount}` : '正常'}
      statusVariant={hasAnomaly ? 'destructive' : 'default'}
      summary={summary}
      faults={faults}
      faultDescription={`全天巡检发现 ${faults.length} 个设备故障。`}
      onClose={onClose}
    />
  )
}

type HistoryStatusVariant = 'default' | 'secondary' | 'destructive'
type DeviceFault = (typeof deviceFaults)[number]

function InspectionHistoryDialog({
  title,
  description,
  recordLabel,
  status,
  statusVariant,
  summary,
  faults,
  faultDescription,
  onClose,
}: {
  title: string
  description: string
  recordLabel: string
  status: string
  statusVariant: HistoryStatusVariant
  summary: string
  faults: readonly DeviceFault[]
  faultDescription: string
  onClose: () => void
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-hidden p-0 sm:!max-w-3xl">
        <DialogHeader className="px-6 pt-6 pr-12 pb-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(100dvh-12rem)] border-t">
          <div className="grid gap-4 p-6">
            <Card className="border ring-0">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <HistoryIcon className="size-4 text-primary" aria-hidden="true" />
                  <CardTitle>巡检状态</CardTitle>
                </div>
                <CardAction>
                  <Badge variant={statusVariant}>{status}</Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-start gap-3">
                  <Avatar size="sm">
                    <AvatarImage src={inspectionAgent.avatarSrc} alt={inspectionAgent.name} />
                    <AvatarFallback>巡</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 rounded-lg bg-muted px-3 py-2.5">
                    <p className="text-xs font-medium text-muted-foreground">{recordLabel}</p>
                    <p className="mt-1 text-sm leading-6">{summary}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {faults.length > 0 ? (
              <Card className="border ring-0">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <WrenchIcon className="size-4 text-primary" aria-hidden="true" />
                    <CardTitle>故障设备列表</CardTitle>
                  </div>
                  <CardDescription>{faultDescription}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul>
                    {faults.map((fault, index) => (
                      <li key={`${fault.station}-${fault.fault}`}>
                        <div className="min-w-0 py-3">
                          <p className="text-sm font-medium">{fault.station}</p>
                          <p className="mt-1 text-sm">故障内容：{fault.fault}</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">排障分析：{fault.analysis}</p>
                        </div>
                        {index < faults.length - 1 ? <Separator /> : null}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </ScrollArea>
        <DialogFooter className="mx-0 mb-0 rounded-none border-t px-6 py-4">
          <DialogClose render={<Button variant="outline" />}>关闭</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function DailyInspectionReportDialog({
  date,
  plan,
  onClose,
}: {
  date: string
  plan: InspectionPlanItem
  onClose: () => void
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-hidden p-0 sm:!max-w-4xl">
        <DialogHeader className="px-6 pt-6 pr-12 pb-3">
          <DialogTitle>{date} 全天巡检报告</DialogTitle>
          <DialogDescription>已打开 {plan.time} 时段，按时间线查看全天巡检报告。</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[calc(100dvh-13rem)] border-t">
          <ol className="mx-8 py-5 pr-6">
            {inspectionPlan.map((item, index) => (
              <li key={item.time} className="grid grid-cols-[1rem_6rem_minmax(0,1fr)] gap-4 pb-5 last:pb-0">
                <div className="relative flex justify-center">
                  <span
                    className={cn(
                      'absolute w-px bg-border',
                      index === 0
                        ? 'top-[0.625rem] bottom-0'
                        : index === inspectionPlan.length - 1
                          ? '-top-5 h-[1.875rem]'
                          : '-top-5 bottom-0',
                    )}
                    aria-hidden="true"
                  />
                  <span
                    className="relative mt-1 size-3 rounded-full border-2 border-background bg-muted data-[state=anomaly]:bg-destructive data-[state=completed]:bg-primary data-[state=current]:bg-primary"
                    data-state={item.anomalyCount > 0 ? 'anomaly' : item.state}
                    aria-hidden="true"
                  />
                </div>
                <div>
                  <time className="text-sm font-medium tabular-nums">{item.time}</time>
                  <p className="mt-1 text-xs text-muted-foreground">{item.title}</p>
                </div>
                {item.state !== 'pending' ? <HourlyReportBubble plan={item} /> : null}
              </li>
            ))}
          </ol>
        </ScrollArea>
        <DialogFooter className="mx-0 mb-0 rounded-none px-6 py-4">
          <DialogClose render={<Button variant="outline" />}>关闭</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function HourlyReportBubble({ plan }: { plan: InspectionPlanItem }) {
  const report = getHourlyReport(plan)

  return (
    <div className="flex items-start gap-3">
      <Avatar size="sm">
        <AvatarImage src={inspectionAgent.avatarSrc} alt={inspectionAgent.name} />
      <AvatarFallback>巡</AvatarFallback>
      </Avatar>
      <div className="min-w-0 rounded-lg bg-muted px-3 py-2.5">
        <p className="text-xs font-medium text-muted-foreground">{inspectionAgent.name}</p>
        <p className="mt-1 text-sm leading-6">{report.summary}</p>
      </div>
    </div>
  )
}

function getHourlyReport(plan: InspectionPlanItem) {
  if (plan.state === 'pending') {
    return {
      stationCount: '—',
      normalCount: '—',
      alertCount: '—',
      summary: '该时段尚未开始巡检，报告将在任务完成后生成。',
    }
  }

  if (plan.state === 'current') {
    return {
      stationCount: '18 个',
      normalCount: '16 个',
      alertCount: '1 项',
      summary: '当前正在巡检，已完成大部分场站核查，异常告警正在进一步分析。',
    }
  }

  if (plan.anomalyCount > 0) {
    return {
      stationCount: '18 个',
      normalCount: `${18 - plan.anomalyCount} 个`,
      alertCount: `${plan.anomalyCount} 项`,
      summary: `本时段巡检发现 ${plan.anomalyCount} 台异常设备，故障信息已进入排障分析。`,
    }
  }

  return {
    stationCount: '18 个',
    normalCount: '18 个',
    alertCount: '0 项',
    summary: '本时段巡检已完成，场站设备在线状态正常，未发现新增异常告警。',
  }
}
