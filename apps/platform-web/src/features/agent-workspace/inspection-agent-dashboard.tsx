import { useState } from 'react'
import { zhCN } from 'date-fns/locale'
import {
  ActivityIcon,
  BatteryChargingIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  FileTextIcon,
  HistoryIcon,
  MessageSquareTextIcon,
  PlugIcon,
  TrendingUpIcon,
  TriangleAlertIcon,
  ZapIcon,
} from '@/components/ui/icons'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EChartsChart, type EChartsThemeTokens } from '@/components/ui/echarts-chart'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

import { AgentAnalysisSummary } from './agent-analysis-summary'
import { agentTeamByWorkspace } from './agent-team-data'
import { AgentTeamCard } from './agent-team-card'
import { AgentWorkflowStatusCard } from './agent-workflow-status-card'
import { getAgentWorkspace } from './agent-workspace-data'
import { AgentWorkspaceSplitLayout } from './agent-workspace-split-layout'
import { deviceFaults } from './device-fault-analysis'
import { InspectionCalendar, type InspectionRecord } from './inspection-calendar'
import {
  DailyInspectionHistoryDialog,
  HourlyInspectionHistoryDialog,
  InspectionPlan,
  type InspectionPlanItem,
} from './inspection-plan'

const inspectionAgent = getAgentWorkspace('inspection')

const inspectionMetrics = [
  {
    label: '充电桩数量',
    value: 426,
    unit: '台',
    icon: ZapIcon,
    tone: 'text-primary bg-primary/10',
  },
  {
    label: '充电枪数量',
    value: 859,
    unit: '把',
    icon: PlugIcon,
    tone: 'text-primary bg-primary/10',
  },
  {
    label: '充电中的数量',
    value: 327,
    unit: '把',
    icon: BatteryChargingIcon,
    tone: 'text-emerald-600 bg-emerald-500/10',
  },
  {
    label: '异常设备数量',
    value: deviceFaults.length,
    unit: '台',
    icon: CircleAlertIcon,
    tone: 'text-destructive bg-destructive/10',
  },
] as const

const workflowSteps = [
  {
    order: 1,
    title: '任务领取',
    description: '已完成',
    progress: 100,
    time: '12:58',
    reply: '巡检任务已成功领取，已加载本轮巡检策略、场站清单和 24 个小时级执行时段。\n\n已完成场站基础信息、设备台账、告警规则和视频监控通道的执行前校验；本轮计划覆盖 18 个场站，重点检查充电设备在线状态、通信链路、实时告警及视频连接情况。\n\n任务参数校验通过，当前已进入站点巡检阶段。',
  },
  {
    order: 2,
    title: '站点巡检',
    description: '实时',
    progress: 65,
    time: '13:00',
    reply: '正在执行第 14 轮场站巡检，已完成 18 个场站的设备在线状态、充电枪状态、通信链路和视频监控通道核查。\n\n当前发现 3 台异常设备，问题分别涉及充电桩离线、充电枪绝缘检测失败和视频监控画面中断；其余场站运行正常，未发现新增高等级告警。\n\n正在汇总设备遥测、告警日志与通信状态，巡检完成后将自动进入告警分析步骤。',
  },
  {
    order: 3,
    title: '告警分析',
    description: '等待执行',
    progress: 0,
    time: '13:10',
    reply: '当前步骤等待站点巡检完成。\n\n收到完整巡检结果后，将关联设备实时状态、历史告警、通信日志和站点运维记录，对异常设备进行故障归因与影响范围评估。\n\n分析完成后将输出告警等级、可能原因、建议排障动作以及是否需要派发人工工单。',
  },
  {
    order: 4,
    title: '报告汇总',
    description: '等待执行',
    progress: 0,
    time: '13:15',
    reply: '当前步骤等待告警分析完成。\n\n报告将汇总本轮覆盖场站、正常设备、异常设备、告警分析结果和人工介入建议，并保留每个小时级任务的执行记录。\n\n生成后可用于当日巡检复盘、异常追踪和后续运维工单处理。',
  },
] as const

const completedInspectionRecords = [
  {
    time: '12:00',
    title: '第 13 轮巡检完成',
    reply: '已完成 12:00 小时级巡检，覆盖 18 个场站的设备在线状态、充电枪状态、通信链路和实时告警。\n\n本轮未发现新增异常设备，巡检结果已归档并同步到当日巡检日历。',
  },
  {
    time: '11:30',
    title: '异常设备状态复核',
    reply: '已复核上一轮记录的异常设备状态，离线充电桩仍未恢复通信，绝缘检测异常与视频通道中断问题保持不变。\n\n智能体已更新故障持续时间和影响范围，等待工作人员确认工单派发。',
  },
  {
    time: '11:00',
    title: '视频监控通道检查',
    reply: '已完成全部场站视频监控通道连通性检查，发现禹州市产业集聚区站点一路视频画面中断。\n\n摄像机供电状态正常，初步判断问题位于交换机端口或摄像机编码服务。',
  },
  {
    time: '10:00',
    title: '设备运行状态汇总',
    reply: '已汇总 10:00 前各轮巡检数据，场站整体运行稳定，充电设备在线率和通信链路状态无明显波动。\n\n已将重复告警合并，并保留设备状态变化和异常处理记录供后续分析。',
  },
] as const

const inspectionTeam = agentTeamByWorkspace.inspection

const inspectionTaskRecords = [
  {
    date: '2026-07-14',
    time: '13:00',
    agentId: 'station-inspection',
    category: '巡检任务',
    status: '巡检中',
    title: '第 14 轮小时级巡检',
    content: '正在核查 18 个场站的设备在线状态、充电枪状态、通信链路、实时告警和视频监控通道；已完成全部场站基础检查，正在汇总 3 台异常设备的遥测与日志。',
  },
  {
    date: '2026-07-14',
    time: '12:58',
    agentId: 'station-inspection',
    category: '巡检任务',
    status: '已完成',
    title: '领取 13:00 巡检任务',
    content: '已加载本轮巡检策略、18 个场站清单和设备台账，完成告警规则、视频通道及任务参数校验，未发现执行前阻塞项。',
  },
  {
    date: '2026-07-14',
    time: '12:20',
    agentId: 'fault-diagnosis',
    category: '故障分析',
    status: '需要处理',
    title: '3 台异常设备持续状态复核',
    content: '离线充电桩仍未恢复通信，充电枪绝缘检测连续两次异常，视频监控通道仍无画面。已更新故障持续时间、影响范围和现场排查建议，等待工单派发。',
  },
  {
    date: '2026-07-14',
    time: '12:00',
    agentId: 'station-inspection',
    category: '写报告',
    status: '已完成',
    title: '第 13 轮巡检报告',
    content: '本轮巡检覆盖 18 个场站，完成设备在线状态、充电枪状态、通信链路、实时告警及视频通道核查。未发现新增异常设备，3 台存量异常设备状态未发生变化，相关故障持续时间和处置建议已同步更新。',
  },
  {
    date: '2026-07-14',
    time: '11:35',
    agentId: 'work-order-dispatch',
    category: '工单派发',
    status: '已完成',
    title: '离线充电桩现场复核工单',
    content: '已根据场站距离、工作人员技能和当前任务负载，将 S327 国道禹州美之源站 3 号充电桩现场复核任务派发给禹州运维一组，要求 14:30 前到场。',
  },
  {
    date: '2026-07-14',
    time: '11:00',
    agentId: 'fault-diagnosis',
    category: '故障分析',
    status: '已完成',
    title: '视频监控通道中断分析',
    content: '摄像机供电及站点网络正常，但视频流拉取失败。初步判断问题位于交换机端口或摄像机编码服务，已生成端口状态、编码进程和码流配置核查步骤。',
  },
  {
    date: '2026-07-14',
    time: '10:30',
    agentId: 'fault-diagnosis',
    category: '写报告',
    status: '已完成',
    title: '设备健康度分析报告',
    content: '已汇总 18 个场站、859 台设备的在线率、通信成功率、告警频次和近 30 日故障记录。识别 12 台设备健康度下降，其中 3 台建议本周安排预防性检修，其余设备纳入重点观察清单。',
  },
  {
    date: '2026-07-14',
    time: '09:45',
    agentId: 'work-order-dispatch',
    category: '工单派发',
    status: '已完成',
    title: '视频通道恢复工单',
    content: '已将禹州市产业集聚区站点视频监控恢复任务派发给禹州弱电维护组，要求现场检查交换机端口、摄像机编码服务和码流配置，并在处理后回传测试画面。',
  },
  {
    date: '2026-07-14',
    time: '09:00',
    agentId: 'station-inspection',
    category: '写报告',
    status: '已完成',
    title: '早间设备运行简报',
    content: '06:00—09:00 共完成 3 轮小时级巡检，覆盖 18 个场站。设备在线率保持在 99.5% 以上，发现 1 路视频通道中断，未出现大范围充电桩离线或订单启动异常。',
  },
  {
    date: '2026-07-14',
    time: '08:20',
    agentId: 'work-order-dispatch',
    category: '工单派发',
    status: '已完成',
    title: '充电枪绝缘检测复核工单',
    content: '已将许昌市东环路充电站 2 号充电枪绝缘检测复核任务派发给许昌运维二组，要求检查枪线破损、绝缘检测回路和车辆端连接状态后重新测试。',
  },
  {
    date: '2026-07-13',
    time: '24:00',
    agentId: 'station-inspection',
    category: '写报告',
    status: '已完成',
    title: '7 月 13 日全天巡检报告',
    content: '全天完成 24 轮小时级巡检，累计核查 432 场站次。发现 2 台异常设备，均已完成故障分析并生成工单；其余设备在线率、通信成功率和视频通道可用率保持稳定。',
  },
  {
    date: '2026-07-13',
    time: '22:40',
    agentId: 'work-order-dispatch',
    category: '工单派发',
    status: '已完成',
    title: '夜间异常设备工单调度',
    content: '已将绝缘检测异常和视频画面中断两项任务分别派发给许昌运维二组与禹州弱电维护组，并同步夜间进站方式、设备位置和排障建议。',
  },
  {
    date: '2026-07-13',
    time: '20:00',
    agentId: 'station-inspection',
    category: '写报告',
    status: '已完成',
    title: '晚高峰设备运行简报',
    content: '18:00—20:00 共核查 18 个场站，充电设备在线率为 99.4%，通信成功率为 99.1%。热门场站负载上升但未出现大范围设备离线或订单启动失败。',
  },
  {
    date: '2026-07-13',
    time: '18:15',
    agentId: 'fault-diagnosis',
    category: '故障分析',
    status: '已完成',
    title: '重复告警合并分析',
    content: '已将同一设备在短时间内产生的 17 条重复通信告警合并为 3 个故障事件，保留首次发生时间、持续时长和状态变化，降低重复派单风险。',
  },
  {
    date: '2026-07-13',
    time: '16:00',
    agentId: 'station-inspection',
    category: '写报告',
    status: '已完成',
    title: '下午巡检汇总报告',
    content: '12:00—16:00 完成 5 轮巡检，累计核查 90 场站次。设备在线率为 99.6%，发现 1 台充电桩间歇性通信异常，告警已完成归并并进入持续观察。',
  },
  {
    date: '2026-07-13',
    time: '14:10',
    agentId: 'work-order-dispatch',
    category: '工单派发',
    status: '已完成',
    title: '通信异常复测工单',
    content: '已向禹州运维一组派发间歇性通信异常复测任务，要求核查 SIM 卡信号、通信模块供电和平台心跳记录，并连续观察 30 分钟确认是否恢复稳定。',
  },
  {
    date: '2026-07-13',
    time: '12:00',
    agentId: 'station-inspection',
    category: '写报告',
    status: '已完成',
    title: '午间巡检报告',
    content: '08:00—12:00 完成 4 轮巡检，18 个场站整体运行平稳。充电设备在线率为 99.7%，通信成功率为 99.5%，未发现新增高等级告警，2 条瞬时告警已自动恢复。',
  },
] as const

const inspectionTrend = [
  { date: '7月8日', stationChecks: 16, anomalies: 1 },
  { date: '7月9日', stationChecks: 20, anomalies: 0 },
  { date: '7月10日', stationChecks: 19, anomalies: 0 },
  { date: '7月11日', stationChecks: 20, anomalies: 0 },
  { date: '7月12日', stationChecks: 21, anomalies: 0 },
  { date: '7月13日', stationChecks: 24, anomalies: 2 },
  { date: '7月14日', stationChecks: 18, anomalies: 3 },
] as const

const deviceAvailabilityTrend = [
  { time: '07:00', rate: 99.6 },
  { time: '08:00', rate: 99.7 },
  { time: '09:00', rate: 99.5 },
  { time: '10:00', rate: 99.5 },
  { time: '11:00', rate: 99.4 },
  { time: '12:00', rate: 99.4 },
  { time: '13:00', rate: 99.2 },
] as const

const anomalyTypeDistribution = [
  { type: '通信离线', count: 4 },
  { type: '绝缘检测', count: 2 },
  { type: '视频中断', count: 2 },
  { type: '枪口锁止', count: 1 },
] as const

const inspectionWorkRecords = inspectionTaskRecords.filter(
  (record) => record.category === '写报告' || record.category === '工单派发',
)
const inspectionRecordDates: string[] = [...new Set(
  inspectionWorkRecords.map((record) => record.date),
)].sort()
const earliestInspectionRecordDate = getRequiredInspectionRecordDate(inspectionRecordDates, 'earliest')
const latestInspectionRecordDate = getRequiredInspectionRecordDate(inspectionRecordDates, 'latest')

function getRequiredInspectionRecordDate(
  recordDates: readonly string[],
  position: 'earliest' | 'latest',
): string {
  const date = position === 'earliest' ? recordDates[0] : recordDates.at(-1)

  if (!date) throw new Error('Inspection work records require at least one date')

  return date
}

function getInspectionTeamMember(agentId: string): (typeof inspectionTeam)[number] {
  const member = inspectionTeam.find((agent) => agent.id === agentId)

  if (!member) throw new Error(`Unknown inspection team member: ${agentId}`)

  return member
}

const inspectionChartAnalyses = {
  trend: {
    agent: getInspectionTeamMember('station-inspection'),
    title: '巡检覆盖与异常趋势分析',
    content: '近 7 日巡检覆盖整体稳定，7 月 13 日达到 24 个场站；7 月 14 日巡检尚未结束但异常设备升至 3 台，建议优先跟进新增异常并核查是否存在重复告警。',
  },
  availability: {
    agent: getInspectionTeamMember('fault-diagnosis'),
    title: '设备在线率分析',
    content: '设备在线率从 08:00 的 99.7% 持续回落至 13:00 的 99.2%，降幅虽小但趋势明确，建议重点排查午间新增离线设备及通信链路波动。',
  },
  anomalyTypes: {
    agent: getInspectionTeamMember('fault-diagnosis'),
    title: '异常类型分布分析',
    content: '近 7 日异常以通信离线为主，共 4 起，占全部异常的 44%；绝缘检测与视频中断各 2 起，建议优先处理通信离线并同步复核绝缘检测问题。',
  },
  today: {
    agent: getInspectionTeamMember('station-inspection'),
    title: '今日巡检分析',
    content: '截至 13:00，已完成 13 轮小时级巡检并开始第 14 轮；05:00 发现 2 台异常设备，其余已完成时段状态正常。后续 10 个时段待执行，建议持续跟踪异常设备处理结果。',
  },
  calendar: {
    agent: getInspectionTeamMember('station-inspection'),
    title: '巡检日历分析',
    content: '7 月已记录 13 个巡检日，累计发现 3 台异常设备，分别集中在 8 日和 13 日；其余 11 个已记录日期均正常。异常呈间歇分布，建议重点复盘通信离线与绝缘检测问题。',
  },
} as const

function formatInspectionRecordDateLabel(date: string): string {
  const [year, month, day] = date.split('-')

  if (!year || !month || !day) throw new Error(`Invalid inspection record date: ${date}`)

  return `${year}年${Number(month)}月${Number(day)}日`
}

function parseInspectionRecordDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)

  if (!year || !month || !day) throw new Error(`Invalid inspection record date: ${date}`)

  return new Date(year, month - 1, day)
}

function formatInspectionRecordDateValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function InspectionAgentDashboard() {
  const [dailyHistory, setDailyHistory] = useState<InspectionRecord | null>(null)
  const [hourlyHistory, setHourlyHistory] = useState<InspectionPlanItem | null>(null)

  return (
    <>
      <AgentWorkspaceSplitLayout
        primary={(
          <>
            <TaskStatusCard />
            <RecentInspectionBrief />
            <InspectionMetrics />
            <InspectionCharts />
            <InspectionPlan
              analysis={inspectionChartAnalyses.today}
              onOpenHourlyHistory={setHourlyHistory}
            />
            <InspectionCalendar
              analysis={inspectionChartAnalyses.calendar}
              onOpenDailyHistory={setDailyHistory}
            />
          </>
        )}
        secondary={(
          <AgentTeamCard
            agents={inspectionTeam}
            conversation={{
              agentName: inspectionAgent.name,
              agentAvatarSrc: inspectionAgent.avatarSrc,
              agentFallback: '巡',
              initialMessage: '你好，我们是运维巡检团队。你可以询问当前巡检进度、异常设备、告警分析或排障建议。',
              reply: '当前 13:00 巡检任务正在执行，已覆盖 18 个场站并发现 3 台异常设备。你可以继续查看具体故障设备和排障分析。',
              placeholder: '输入你想了解的巡检问题',
            }}
            workRecords={<InspectionTaskRecords />}
            agentLogs={<WorkRecords />}
            unreadWorkRecordCount={inspectionAgent.unreadCount}
          />
        )}
      />
      {hourlyHistory ? (
        <HourlyInspectionHistoryDialog plan={hourlyHistory} onClose={() => setHourlyHistory(null)} />
      ) : null}
      {dailyHistory ? (
        <DailyInspectionHistoryDialog record={dailyHistory} onClose={() => setDailyHistory(null)} />
      ) : null}
    </>
  )
}

function InspectionMetrics() {
  return (
    <section
      className="grid gap-4 @lg/workspace:grid-cols-2 @6xl/workspace:grid-cols-4"
      aria-label="充电设备运行指标"
    >
      {inspectionMetrics.map((metric) => {
        const Icon = metric.icon

        return (
          <Card key={metric.label} size="sm" className="border ring-0">
            <CardContent className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-semibold tabular-nums tracking-tight">{metric.value}</span>
                  <span className="text-xs text-muted-foreground">{metric.unit}</span>
                </p>
              </div>
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${metric.tone}`}>
                <Icon className="size-5" aria-hidden="true" />
              </span>
            </CardContent>
          </Card>
        )
      })}
    </section>
  )
}

function TaskStatusCard() {
  return (
    <AgentWorkflowStatusCard
      agentName={inspectionAgent.name}
      agentAvatarSrc={inspectionAgent.avatarSrc}
      agentFallback="巡"
      summary="巡检工作流正在执行：正在执行第 14 轮场站巡检。"
      steps={workflowSteps}
    />
  )
}

function InspectionCharts() {
  return (
    <div className="grid items-stretch gap-4 @6xl/workspace:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
      <Card className="h-full border ring-0">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUpIcon className="size-4 text-primary" aria-hidden="true" />
            <CardTitle>巡检覆盖与异常趋势</CardTitle>
          </div>
          <CardAction><Badge variant="secondary">近 7 日</Badge></CardAction>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col pt-0">
          <EChartsChart
            className="h-[22rem]"
            option={createInspectionTrendOption}
            ariaLabel="近 7 日巡检覆盖场站数与异常设备数趋势图"
          />
          <AgentAnalysisSummary {...inspectionChartAnalyses.trend} />
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <Card className="h-full border ring-0">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ActivityIcon className="size-4 text-primary" aria-hidden="true" />
              <CardTitle>设备在线率</CardTitle>
            </div>
            <CardAction><Badge variant="secondary">近 7 小时</Badge></CardAction>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col pt-0">
            <EChartsChart
              className="h-48"
              option={createDeviceAvailabilityOption}
              ariaLabel="近 7 小时充电设备在线率趋势图"
            />
            <AgentAnalysisSummary {...inspectionChartAnalyses.availability} />
          </CardContent>
        </Card>

        <Card className="h-full border ring-0">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TriangleAlertIcon className="size-4 text-primary" aria-hidden="true" />
              <CardTitle>异常类型分布</CardTitle>
            </div>
            <CardAction><Badge variant="secondary">近 7 日</Badge></CardAction>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col pt-0">
            <EChartsChart
              className="h-48"
              option={createAnomalyTypeDistributionOption}
              ariaLabel="近 7 日设备异常类型数量分布柱状图"
            />
            <AgentAnalysisSummary {...inspectionChartAnalyses.anomalyTypes} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function createInspectionTrendOption(theme: EChartsThemeTokens) {
  return {
    animationDuration: 500,
    color: [theme.chart4, theme.chart1],
    textStyle: { color: theme.foreground },
    tooltip: { trigger: 'axis' },
    legend: {
      top: 0,
      right: 8,
      textStyle: { color: theme.mutedForeground },
      data: ['巡检场站', '异常设备'],
    },
    grid: { top: 44, right: 54, bottom: 36, left: 48 },
    xAxis: {
      type: 'category',
      data: inspectionTrend.map((item) => item.date),
      axisLine: { lineStyle: { color: theme.border } },
      axisTick: { show: false },
      axisLabel: { color: theme.mutedForeground },
    },
    yAxis: [
      {
        type: 'value',
        min: 0,
        max: 30,
        interval: 5,
        axisLabel: { color: theme.mutedForeground },
        splitLine: { lineStyle: { color: theme.border, type: 'dashed' } },
      },
      {
        type: 'value',
        min: 0,
        max: 5,
        interval: 1,
        axisLabel: { color: theme.mutedForeground },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '巡检场站',
        type: 'line',
        smooth: true,
        symbolSize: 7,
        lineStyle: { width: 3 },
        areaStyle: { opacity: 0.1 },
        data: inspectionTrend.map((item) => item.stationChecks),
      },
      {
        name: '异常设备',
        type: 'bar',
        yAxisIndex: 1,
        barMaxWidth: 22,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        data: inspectionTrend.map((item) => item.anomalies),
      },
    ],
  }
}

function createDeviceAvailabilityOption(theme: EChartsThemeTokens) {
  return {
    animationDuration: 500,
    color: [theme.chart3],
    textStyle: { color: theme.foreground },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value: number) => `${value.toFixed(1)}%`,
    },
    grid: { top: 18, right: 12, bottom: 28, left: 46 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: deviceAvailabilityTrend.map((item) => item.time),
      axisLine: { lineStyle: { color: theme.border } },
      axisTick: { show: false },
      axisLabel: { color: theme.mutedForeground, interval: 1 },
    },
    yAxis: {
      type: 'value',
      min: 98.5,
      max: 100,
      interval: 0.5,
      axisLabel: { color: theme.mutedForeground, formatter: '{value}%' },
      splitLine: { lineStyle: { color: theme.border, type: 'dashed' } },
    },
    series: [
      {
        name: '设备在线率',
        type: 'line',
        smooth: true,
        symbolSize: 5,
        lineStyle: { width: 2 },
        areaStyle: { opacity: 0.12 },
        data: deviceAvailabilityTrend.map((item) => item.rate),
      },
    ],
  }
}

function createAnomalyTypeDistributionOption(theme: EChartsThemeTokens) {
  return {
    animationDuration: 500,
    color: [theme.chart2],
    textStyle: { color: theme.foreground },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { top: 8, right: 20, bottom: 24, left: 72 },
    xAxis: {
      type: 'value',
      min: 0,
      max: 5,
      interval: 1,
      axisLabel: { color: theme.mutedForeground },
      splitLine: { lineStyle: { color: theme.border, type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      data: anomalyTypeDistribution.map((item) => item.type),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: theme.mutedForeground },
    },
    series: [
      {
        name: '异常数量',
        type: 'bar',
        barMaxWidth: 18,
        itemStyle: { borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: 'right', color: theme.foreground },
        data: anomalyTypeDistribution.map((item) => item.count),
      },
    ],
  }
}

function WorkRecords() {
  const records = [
    ...[...workflowSteps].filter((step) => step.progress > 0).reverse(),
    ...completedInspectionRecords,
  ]

  return (
    <Card className="border ring-0">
      <CardHeader>
        <div className="flex items-center gap-2">
          <HistoryIcon className="size-4 text-primary" aria-hidden="true" />
          <CardTitle>日志</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ol>
          {records.map((record, index) => (
            <li key={`${record.time}-${record.title}`} className="grid grid-cols-[3.5rem_1rem_minmax(0,1fr)] gap-3 pb-6 last:pb-0">
              <time className="pt-0.5 text-sm font-medium tabular-nums text-muted-foreground">{record.time}</time>
              <div className="relative flex justify-center">
                {index < records.length - 1 ? (
                  <span className="absolute top-3 bottom-[-1.5rem] w-px bg-border" aria-hidden="true" />
                ) : null}
                <span className="relative mt-1.5 size-2.5 rounded-full bg-primary ring-4 ring-background" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{record.title}</p>
                  <Badge variant="secondary">{inspectionAgent.name}</Badge>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">{record.reply}</p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

function RecentInspectionBrief() {
  const currentRecords = inspectionTaskRecords.filter(
    (record) => record.date === latestInspectionRecordDate,
  )
  const latestRecord = currentRecords[0]

  if (!latestRecord) throw new Error('Recent inspection brief requires at least one work record')

  const reportCount = currentRecords.filter((record) => record.category === '写报告').length
  const completedCount = currentRecords.filter((record) => record.status === '已完成').length
  const pendingCount = currentRecords.filter((record) => record.status === '需要处理').length

  return (
    <Card className="border ring-0">
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquareTextIcon className="size-4 text-primary" aria-hidden="true" />
          <CardTitle>运维简报</CardTitle>
        </div>
        <CardAction>
          <span className="text-sm tabular-nums text-muted-foreground">1小时前</span>
        </CardAction>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
          <Avatar size="sm" className="justify-self-center">
            <AvatarImage src={inspectionAgent.avatarSrc} alt={inspectionAgent.name} />
            <AvatarFallback>巡</AvatarFallback>
          </Avatar>
          <div className="min-w-0 rounded-lg bg-muted px-3 py-2.5">
            <p className="text-sm leading-6 text-foreground">
              截至 {formatInspectionRecordDateLabel(latestInspectionRecordDate)} {latestRecord.time}，智能体团队已执行 {currentRecords.length} 项任务，其中 {completedCount} 项已完成、{pendingCount} 项需要处理，并生成 {reportCount} 份巡检报告。本轮已覆盖 18 个场站，识别 {deviceFaults.length} 台异常设备。
            </p>
            <p className="mt-2 text-sm leading-6 text-foreground">
              当前重点跟踪充电桩离线、充电枪绝缘检测失败和视频监控画面中断，故障诊断已完成，相关现场处置与工单进度正在持续跟踪。
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function InspectionTaskRecords() {
  const [selectedDate, setSelectedDate] = useState(latestInspectionRecordDate)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<{
    date: string
    time: string
    title: string
    content: string
    agentName: string
  } | null>(null)
  const selectedDateIndex = inspectionRecordDates.indexOf(selectedDate)
  const previousDate = inspectionRecordDates[selectedDateIndex - 1]
  const nextDate = inspectionRecordDates[selectedDateIndex + 1]
  const visibleRecords = inspectionWorkRecords.filter((record) => record.date === selectedDate)
  const selectedCalendarDate = parseInspectionRecordDate(selectedDate)

  return (
    <>
      <Card className="border ring-0">
        <CardHeader>
          <div className="flex items-center gap-2">
            <HistoryIcon className="size-4 text-primary" aria-hidden="true" />
            <CardTitle>工作记录</CardTitle>
          </div>
          <CardAction>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                type="button"
                aria-label="查看上一天工作记录"
                disabled={!previousDate}
                onClick={() => {
                  if (previousDate) setSelectedDate(previousDate)
                }}
              >
                <ChevronLeftIcon aria-hidden="true" />
              </Button>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger
                  render={(
                    <Button variant="ghost" size="sm" className="min-w-28 text-sm" type="button" />
                  )}
                >
                  {formatInspectionRecordDateLabel(selectedDate)}
                </PopoverTrigger>
                <PopoverContent align="end" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    locale={zhCN}
                    selected={selectedCalendarDate}
                    defaultMonth={selectedCalendarDate}
                    disabled={{
                      before: parseInspectionRecordDate(earliestInspectionRecordDate),
                      after: parseInspectionRecordDate(latestInspectionRecordDate),
                    }}
                    onSelect={(date) => {
                      if (!date) return
                      setSelectedDate(formatInspectionRecordDateValue(date))
                      setCalendarOpen(false)
                    }}
                  />
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost"
                size="icon-sm"
                type="button"
                aria-label="查看下一天工作记录"
                disabled={!nextDate}
                onClick={() => {
                  if (nextDate) setSelectedDate(nextDate)
                }}
              >
                <ChevronRightIcon aria-hidden="true" />
              </Button>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="pt-0">
          {visibleRecords.length > 0 ? (
            <ol>
              {visibleRecords.map((record, index) => {
                const agent = getInspectionTeamMember(record.agentId)
                const isReport = record.category === '写报告'

                return (
                  <li
                    key={`${record.date}-${record.time}-${record.title}`}
                    className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-3 pb-5 last:pb-0"
                  >
                    {index < visibleRecords.length - 1 ? (
                      <span
                        className="absolute bottom-0 left-4 top-8 w-px -translate-x-1/2 bg-border"
                        aria-hidden="true"
                      />
                    ) : null}
                    <Avatar size="sm" className="relative justify-self-center">
                      <AvatarImage src={agent.avatarSrc} alt={agent.name} />
                      <AvatarFallback>{agent.fallback}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex flex-col items-start gap-1">
                        <time className="text-xs font-medium tabular-nums text-muted-foreground">{record.time}</time>
                        <p className="text-sm font-medium text-primary">
                          {record.category}
                        </p>
                      </div>
                      <div className="mt-2">
                        {isReport ? (
                          <button
                            type="button"
                            className="flex w-full items-center gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            onClick={() => setSelectedReport({
                              date: record.date,
                              time: record.time,
                              title: record.title,
                              content: record.content,
                              agentName: agent.name,
                            })}
                          >
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                              <FileTextIcon className="size-4" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">{record.title}</span>
                              <span className="mt-1 block text-xs text-muted-foreground">巡检报告</span>
                            </span>
                            <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                              <span>查看</span>
                              <ChevronRightIcon className="size-4" aria-hidden="true" />
                            </span>
                          </button>
                        ) : (
                          <div className="rounded-lg border px-3 py-2.5">
                            <p className="text-sm font-medium">{record.title}</p>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">{record.content}</p>
                            <div className="mt-3 flex justify-start">
                              <Badge variant="secondary">
                                <CheckIcon data-icon="inline-start" aria-hidden="true" />
                                已自动派单
                              </Badge>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">所选日期暂无工作记录</p>
          )}
        </CardContent>
      </Card>
      <Dialog
        open={Boolean(selectedReport)}
        onOpenChange={(open) => {
          if (!open) setSelectedReport(null)
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedReport?.title ?? '巡检报告'}</DialogTitle>
            <DialogDescription>
              {selectedReport
                ? `${formatInspectionRecordDateLabel(selectedReport.date)} ${selectedReport.time} · ${selectedReport.agentName}生成`
                : '查看巡检报告内容。'}
            </DialogDescription>
          </DialogHeader>
          {selectedReport ? (
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="whitespace-pre-line text-sm leading-7">{selectedReport.content}</p>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
