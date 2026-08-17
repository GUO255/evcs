import { useState } from 'react'
import { zhCN } from 'date-fns/locale'
import {
  ChartNoAxesCombinedIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  Clock3Icon,
  FileTextIcon,
  HistoryIcon,
  ListFilterIcon,
  MessageSquareReplyIcon,
  MessageSquareTextIcon,
  TrendingUpIcon,
  UserRoundCheckIcon,
} from '@/components/ui/icons'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EChartsChart, type EChartsThemeTokens } from '@/components/ui/echarts-chart'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { initialFeedbackRecords, type FeedbackRecord } from '@/features/feedback/feedback-data'
import { FeedbackReplyDialog } from '@/features/feedback/feedback-reply-dialog'
import { cn } from '@/lib/utils'

import { AgentAnalysisSummary } from './agent-analysis-summary'
import { agentTeamByWorkspace } from './agent-team-data'
import { AgentTeamCard } from './agent-team-card'
import { AgentWorkflowStatusCard } from './agent-workflow-status-card'
import { getAgentWorkspace } from './agent-workspace-data'
import { AgentWorkspaceSplitLayout } from './agent-workspace-split-layout'

const userOperationsAgent = getAgentWorkspace('user-operations')

const analysisSteps = [
  {
    order: 1,
    title: '数据汇总',
    description: '已完成',
    progress: 100,
    time: '23:58',
    reply: '已完成用户注册、充电订单、场站访问、支付及活动数据汇总。\n\n本轮数据覆盖近 6 周、18 个充电站，数据质量校验通过，已形成可用于用户分层的统一分析样本。',
  },
  {
    order: 2,
    title: '用户分层',
    description: '实时',
    progress: 65,
    time: '24:00',
    reply: '正在按首次充电场站、充电频次、常用时段、充电电量和活动响应进行用户分层。\n\n当前已识别夜间高频用户、首次充电后 7 日未复购用户及高价值流失风险用户，正在计算各分层规模与运营优先级。',
  },
  {
    order: 3,
    title: '行为洞察',
    description: '等待分析',
    progress: 0,
    time: '00:05',
    reply: '当前步骤等待用户分层完成。\n\n届时将分析各用户群的首充转化、留存变化、场站偏好、时段偏好与价格敏感度，定位影响复购和活跃度的关键因素。',
  },
  {
    order: 4,
    title: '策略生成',
    description: '等待输出',
    progress: 0,
    time: '00:10',
    reply: '当前步骤等待行为洞察完成。\n\n分析完成后将生成新用户复购、高价值用户召回、谷时充电套餐及场站服务触达建议，并标注适用人群与执行优先级。',
  },
] as const

const completedOperationRecords = [
  {
    time: '22:30',
    title: '问题反馈归类',
    reply: '已汇总当日新增问题反馈，完成问题类型、关联场站及影响用户的自动归类。\n\n当前识别 4 条待回复记录，并根据问题内容生成预回复，等待工作人员确认后发送。',
  },
  {
    time: '20:00',
    title: '晚高峰运营分析',
    reply: '已完成 18:00—20:00 晚高峰用户行为分析。新用户首充订单环比增长 9.8%，部分热门场站出现短时排队。\n\n已将空闲充电枪与错峰充电提醒纳入本轮运营建议。',
  },
  {
    time: '16:00',
    title: '新用户留存监测',
    reply: '已更新近 6 周新用户留存数据。最新成熟批次的 7 日复购率为 70.6%，环比提升 2.4 个百分点。\n\n同时识别首次充电后 7 日未复购用户，已进入待触达用户分层。',
  },
  {
    time: '12:00',
    title: '日间转化监测',
    reply: '已完成 00:00—12:00 用户注册、找站、首充和支付转化监测。首充转化率为 67.8%，较前一日同期提升 4.6%。\n\n未发现大范围充电失败或支付异常，用户转化链路运行正常。',
  },
] as const

const userOperationsTaskRecords = [
  {
    date: '2026-07-14',
    time: '10:25',
    agentId: 'customer-service',
    category: '回复问题反馈',
    result: '需要决策',
    title: '充电枪无法正常结束订单',
    feedback: getFeedbackRecord('feedback-001'),
    agentReply: '您好，已收到您反馈的订单持续计费与无法拔枪问题。我们已关联 S327 国道禹州美之源站 2 号直流桩及对应订单。由于本次处理涉及异常计费修正和费用承诺，需要工作人员核验订单流水、桩端日志及实际计费后确认，核实完成后我们会第一时间向您同步处理结果。',
  },
  {
    date: '2026-07-14',
    time: '09:10',
    agentId: 'customer-service',
    category: '回复问题反馈',
    result: '已处理',
    title: '车队月度充电账单导出建议',
    feedback: getFeedbackRecord('feedback-102'),
    agentReply: '感谢您的建议。当前可在订单管理中按时间筛选并导出充电明细，我们已将按车辆、司机和场站维度汇总月度账单的需求整理后提交产品需求池，后续版本规划确定后会同步进展。',
  },
  {
    date: '2026-07-14',
    time: '08:45',
    agentId: 'customer-service',
    category: '回复问题反馈',
    result: '已处理',
    title: '建议增加充电完成提醒',
    feedback: getFeedbackRecord('feedback-101'),
    agentReply: '感谢您的建议。我们已记录充电完成短信提醒需求，并同步产品团队评估消息授权、发送时效和服务成本。当前订单结束后仍会通过小程序发送提醒，请保持消息通知开启。',
  },
  {
    date: '2026-07-14',
    time: '08:10',
    agentId: 'operations-strategy',
    category: '写报告',
    result: '已处理',
    title: '晨间新用户转化简报',
    content: '已完成 00:00—08:00 新用户注册、找站、发起充电和首充成功数据分析。晨间新增注册 684 人，首充转化率为 66.8%，较昨日同期提升 3.1 个百分点；未发现集中支付失败或充电启动异常。',
  },
  {
    date: '2026-07-14',
    time: '07:30',
    agentId: 'customer-service',
    category: '回复问题反馈',
    result: '已处理',
    title: '建议展示充电站实时排队情况',
    feedback: getFeedbackRecord('feedback-103'),
    agentReply: '感谢您的建议。平台已支持查看部分场站的空闲充电枪数量，预计等待时间功能正在结合实时订单和车辆排队数据评估。我们已将该需求归入节假日高峰找站体验优化事项。',
  },
  {
    date: '2026-07-13',
    time: '24:00',
    agentId: 'operations-strategy',
    category: '写报告',
    result: '已处理',
    title: '全天用户运营分析报告',
    content: '已汇总全天新增注册、首充转化、7 日复购、活跃时段及投诉建议数据，生成用户运营日报，并输出未复购用户触达、晚高峰找站提醒和谷时套餐三项运营建议。',
  },
  {
    date: '2026-07-13',
    time: '22:35',
    agentId: 'customer-service',
    category: '回复问题反馈',
    result: '需要决策',
    title: '退款到账时间过长',
    feedback: getFeedbackRecord('feedback-003'),
    agentReply: '您好，订单 C202607090028 的退款申请已进入支付渠道处理流程。由于预计到账时间需要财务与支付渠道进一步确认，我们暂未向您承诺具体日期。工作人员核实当前处理节点后，会通过小程序消息向您同步准确进度。',
  },
  {
    date: '2026-07-13',
    time: '20:05',
    agentId: 'operations-strategy',
    category: '写报告',
    result: '已处理',
    title: '晚高峰用户运营快报',
    content: '已完成 18:00—20:00 新用户首充、场站排队和充电成功率分析，识别热门场站短时排队情况，并自动生成空闲充电枪提醒与错峰充电触达建议。',
  },
  {
    date: '2026-07-13',
    time: '18:40',
    agentId: 'retention-analysis',
    category: '写报告',
    result: '已处理',
    title: '高价值用户流失预警报告',
    content: '已完成高价值用户活跃度扫描，识别 186 位历史高频用户连续 30 日未充电，其中 62 位用户常用场站近期服务时段发生变化。已按流失原因和历史贡献分层，形成短信召回与小程序定向触达名单。',
  },
  {
    date: '2026-07-13',
    time: '16:00',
    agentId: 'retention-analysis',
    category: '写报告',
    result: '已处理',
    title: '新用户留存率分析报告',
    content: '已完成近 6 周新用户 Cohort 分析。最新成熟批次 7 日复购率为 70.6%，环比提升 2.4 个百分点；识别出首次充电后 7 日未复购用户及连续 30 日未活跃的高价值用户，并形成分层召回建议。',
  },
  {
    date: '2026-07-13',
    time: '14:20',
    agentId: 'customer-service',
    category: '回复问题反馈',
    result: '已处理',
    title: '夜间充电车位被燃油车占用',
    feedback: getFeedbackRecord('feedback-002'),
    agentReply: '您好，您反馈的夜间燃油车占用快充车位问题已同步许昌东环路超级充电站。场站将增加夜间巡查频次，并在入口和快充区域补充专用车位提示，我们会持续跟踪占位改善情况。',
  },
  {
    date: '2026-07-13',
    time: '11:00',
    agentId: 'operations-strategy',
    category: '写报告',
    result: '已处理',
    title: '午间用户运营快报',
    content: '已完成 08:00—11:00 用户运营数据汇总。新增注册用户 1,126 人，完成首充 758 人；商圈及交通枢纽场站访问量较昨日同期增长 8.4%，已生成午间空闲充电枪推荐和首次充电引导策略。',
  },
] as const

const userOperationsRecordDates: string[] = [...new Set(
  userOperationsTaskRecords.map((record) => record.date),
)].sort()
const earliestUserOperationsRecordDate = getEarliestRecordDate(userOperationsRecordDates)
const latestUserOperationsRecordDate = getLatestRecordDate(userOperationsRecordDates)

function getEarliestRecordDate(recordDates: readonly string[]): string {
  const earliestDate = recordDates[0]

  if (!earliestDate) {
    throw new Error('User operations work records require at least one date')
  }

  return earliestDate
}

function getLatestRecordDate(recordDates: readonly string[]): string {
  const latestDate = recordDates.at(-1)

  if (!latestDate) {
    throw new Error('User operations work records require at least one date')
  }

  return latestDate
}

function formatRecordDateLabel(date: string): string {
  const [year, month, day] = date.split('-')

  if (!year || !month || !day) return '选择日期'

  return `${year}年${Number(month)}月${Number(day)}日`
}

function parseRecordDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)

  if (!year || !month || !day) {
    throw new Error(`Invalid work record date: ${date}`)
  }

  return new Date(year, month - 1, day)
}

function formatRecordDateValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

const userOperationsTeam = agentTeamByWorkspace['user-operations']

function getUserOperationsTeamMember(agentId: string): (typeof userOperationsTeam)[number] {
  const agent = userOperationsTeam.find((member) => member.id === agentId)

  if (!agent) {
    throw new Error(`Unknown user operations team member: ${agentId}`)
  }

  return agent
}

const retentionCohorts = [
  { label: '6月2日–6月8日', users: 1842, rates: [100, 68.4, 54.2, 46.8, 38.1, 31.5, 26.4] },
  { label: '6月9日–6月15日', users: 2165, rates: [100, 65.7, 51.6, 43.9, 35.2, 29.8, null] },
  { label: '6月16日–6月22日', users: 2388, rates: [100, 67.1, 53.8, 45.4, 36.7, null, null] },
  { label: '6月23日–6月29日', users: 2046, rates: [100, 63.9, 49.7, 41.8, null, null, null] },
  { label: '6月30日–7月6日', users: 2572, rates: [100, 69.3, 55.1, null, null, null, null] },
  { label: '7月7日–7月13日', users: 2816, rates: [100, 70.6, null, null, null, null, null] },
] as const

const newUserMetrics = [
  { label: '新增注册用户', value: '25,784', change: '+17%' },
  { label: '首充订单', value: '31,960', change: '+11%' },
  { label: '平均首充电量', value: '42.6 kWh', change: '+8%' },
  { label: '首充转化率', value: '68.9%', change: '+6%' },
  { label: '7 日复购率', value: '70.6%', change: '+2.4%' },
  { label: '充电成功率', value: '96.8%', change: '+1.4%' },
  { label: '平均找站时长', value: '4.2 分钟', change: '改善 8%' },
  { label: '覆盖充电站', value: '18', change: '+2' },
  { label: '30 日留存率', value: '38.1%', change: '+2.0%' },
] as const

const newUserTopIssues = [
  { label: '充电费用咨询', share: '15%', count: '1,815' },
  { label: '充电枪连接失败', share: '13%', count: '1,599' },
  { label: '充电车位占用', share: '12%', count: '1,390' },
  { label: '订单退款进度', share: '12%', count: '1,388' },
  { label: '场站配套设施', share: '11%', count: '1,301' },
  { label: '发票开具', share: '11%', count: '1,282' },
] as const

const userGrowthTrend = [
  { date: '7月7日', registered: 3180, firstCharge: 2070 },
  { date: '7月8日', registered: 3295, firstCharge: 2165 },
  { date: '7月9日', registered: 3440, firstCharge: 2312 },
  { date: '7月10日', registered: 3518, firstCharge: 2396 },
  { date: '7月11日', registered: 3672, firstCharge: 2488 },
  { date: '7月12日', registered: 3894, firstCharge: 2635 },
  { date: '7月13日', registered: 4286, firstCharge: 2953 },
] as const

const firstChargeFunnel = [
  { label: '新增注册', value: 4286, rate: 100 },
  { label: '浏览场站', value: 3812, rate: 88.9 },
  { label: '发起充电', value: 3124, rate: 72.9 },
  { label: '首充成功', value: 2953, rate: 68.9 },
] as const

const activeTimeDistribution = [
  { period: '00–04', share: 10.2 },
  { period: '04–08', share: 7.4 },
  { period: '08–12', share: 13.8 },
  { period: '12–16', share: 18.6 },
  { period: '16–20', share: 28.7 },
  { period: '20–24', share: 21.3 },
] as const

const userOperationsCardAnalyses = {
  metrics: {
    agent: getUserOperationsTeamMember('operations-strategy'),
    title: '新用户指标分析',
    content: '新用户增长、首充转化和留存指标整体向好：新增注册用户增长 17%，首充转化率达到 68.9%，7 日复购率达到 70.6%。建议继续优化首次充电引导，并针对未复购用户开展分层触达。',
  },
  issues: {
    agent: getUserOperationsTeamMember('customer-service'),
    title: '新用户高频问题分析',
    content: '新用户问题主要集中在充电费用咨询、充电枪连接失败和充电车位占用，三类问题合计占 40%。建议优先完善费用说明、连接失败自助排障和场站车位占用提醒。',
  },
  growth: {
    agent: getUserOperationsTeamMember('operations-strategy'),
    title: '新增与首充趋势分析',
    content: '近 7 日新增注册用户由 3,180 人增长至 4,286 人，首充用户由 2,070 人增长至 2,953 人，首充增长快于注册增长。用户增长趋势稳定，建议继续放大高转化场站的引流策略。',
  },
  funnel: {
    agent: getUserOperationsTeamMember('operations-strategy'),
    title: '首充转化漏斗分析',
    content: '新增注册到首充成功的整体转化率为 68.9%，最大流失发生在浏览场站到发起充电阶段，共流失 688 人。建议重点优化场站信息、空闲设备展示和首次充电操作指引。',
  },
  activeTime: {
    agent: getUserOperationsTeamMember('operations-strategy'),
    title: '全天活跃时段分析',
    content: '用户活跃主要集中在 16:00—24:00，合计占全天活跃量的 50%，其中 16:00—20:00 达到峰值 28.7%。建议将找站提醒、优惠触达和客服资源向晚高峰倾斜。',
  },
  retention: {
    agent: getUserOperationsTeamMember('retention-analysis'),
    title: '新用户留存分析',
    content: '最新批次第 1 周留存率达到 70.6%，较前一批次继续提升，但长期留存仍随时间明显下降。建议针对首次充电后 7 日未复购用户和连续 30 日未活跃用户实施分层召回。',
  },
} as const

export function UserOperationsAgentDashboard() {
  return (
    <AgentWorkspaceSplitLayout
      primary={(
        <>
          <UserOperationsAnalysisCard />
          <UserOperationsMessagesCard />
          <NewUserCohortAnalytics />
          <UserOperationsCharts />
          <UserRetentionCard />
        </>
      )}
      secondary={(
        <AgentTeamCard
          agents={userOperationsTeam}
          conversation={{
            agentName: userOperationsAgent.name,
            agentAvatarSrc: userOperationsAgent.avatarSrc,
            agentFallback: '营',
            initialMessage: '你好，我们是用户运营团队。你可以询问新用户转化、用户留存、运营建议或待回复的问题反馈。',
            reply: '7 月 13 日全天新增注册用户 4,286 人，首充转化率为 68.9%，成熟新用户批次的 7 日复购率为 70.6%。当前还有 4 条问题反馈等待确认回复。',
            placeholder: '输入你想了解的用户运营问题',
          }}
          workRecords={<UserOperationsTaskRecordsCard />}
          agentLogs={<UserOperationsWorkRecords />}
          unreadWorkRecordCount={userOperationsAgent.unreadCount}
        />
      )}
    />
  )
}

function NewUserCohortAnalytics() {
  return (
    <div className="grid gap-4 @5xl/workspace:grid-cols-[minmax(0,3fr)_minmax(16rem,1fr)]">
      <Card className="h-full border ring-0">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ChartNoAxesCombinedIcon className="size-4 text-primary" aria-hidden="true" />
            <CardTitle>新用户指标</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          <dl className="grid gap-6 @lg/workspace:grid-cols-2 @6xl/workspace:grid-cols-3">
            {newUserMetrics.map((metric) => (
              <div key={metric.label} className="flex min-w-0 flex-col gap-2">
                <dt className="text-sm text-muted-foreground">{metric.label}</dt>
                <dd className="flex flex-wrap items-baseline gap-2">
                  <span className="text-2xl font-semibold tracking-tight tabular-nums">{metric.value}</span>
                  <span className="text-xs font-medium text-primary">{metric.change}</span>
                </dd>
              </div>
            ))}
          </dl>
          <AgentAnalysisSummary {...userOperationsCardAnalyses.metrics} />
        </CardContent>
      </Card>

      <Card className="h-full border ring-0">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CircleAlertIcon className="size-4 text-primary" aria-hidden="true" />
            <CardTitle>新用户高频问题</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          <Table>
            <TableHeader className="sr-only">
              <TableRow>
                <TableHead>排名</TableHead>
                <TableHead>问题</TableHead>
                <TableHead>占比与数量</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {newUserTopIssues.map((issue, index) => (
                <TableRow key={issue.label}>
                  <TableCell className="w-8 px-0 text-muted-foreground">{index + 1}.</TableCell>
                  <TableCell className="px-1 font-medium">{issue.label}</TableCell>
                  <TableCell className="px-0 text-right text-muted-foreground">
                    {issue.share}（{issue.count}）
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <AgentAnalysisSummary {...userOperationsCardAnalyses.issues} />
        </CardContent>
      </Card>
    </div>
  )
}

function UserOperationsCharts() {
  return (
    <div className="grid items-stretch gap-4 @6xl/workspace:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
      <Card className="h-full border ring-0">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUpIcon className="size-4 text-primary" aria-hidden="true" />
            <CardTitle>新增与首充趋势</CardTitle>
          </div>
          <CardAction><Badge variant="secondary">近 7 日</Badge></CardAction>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col pt-0">
          <EChartsChart
            className="min-h-[32rem] flex-1"
            option={createUserGrowthTrendOption}
            ariaLabel="近 7 日新增注册用户与首充用户趋势折线图"
          />
          <AgentAnalysisSummary {...userOperationsCardAnalyses.growth} />
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <Card className="h-full border ring-0">
          <CardHeader>
            <div className="flex items-center gap-2">
              <ListFilterIcon className="size-4 text-primary" aria-hidden="true" />
              <CardTitle>首充转化漏斗</CardTitle>
            </div>
            <CardAction><Badge variant="secondary">7月13日</Badge></CardAction>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col pt-0">
            <EChartsChart
              className="h-48"
              option={createFirstChargeFunnelOption}
              ariaLabel="7 月 13 日新用户首充转化漏斗图"
            />
            <AgentAnalysisSummary {...userOperationsCardAnalyses.funnel} />
          </CardContent>
        </Card>

        <Card className="h-full border ring-0">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock3Icon className="size-4 text-primary" aria-hidden="true" />
              <CardTitle>全天活跃时段</CardTitle>
            </div>
            <CardAction><Badge variant="secondary">全天</Badge></CardAction>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col pt-0">
            <EChartsChart
              className="h-48"
              option={createActiveTimeDistributionOption}
              ariaLabel="7 月 13 日新用户全天活跃时段分布柱状图"
            />
            <AgentAnalysisSummary {...userOperationsCardAnalyses.activeTime} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function createUserGrowthTrendOption(theme: EChartsThemeTokens) {
  return {
    animationDuration: 500,
    color: [theme.chart4, theme.chart1],
    textStyle: { color: theme.foreground },
    tooltip: { trigger: 'axis' },
    legend: {
      top: 0,
      right: 8,
      textStyle: { color: theme.mutedForeground },
      data: ['新增注册用户', '首充用户'],
    },
    grid: { top: 44, right: 20, bottom: 36, left: 54 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: userGrowthTrend.map((item) => item.date),
      axisLine: { lineStyle: { color: theme.border } },
      axisTick: { show: false },
      axisLabel: { color: theme.mutedForeground },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 4500,
      interval: 1000,
      axisLabel: { color: theme.mutedForeground },
      splitLine: { lineStyle: { color: theme.border, type: 'dashed' } },
    },
    series: [
      {
        name: '新增注册用户',
        type: 'line',
        smooth: true,
        symbolSize: 7,
        lineStyle: { width: 3 },
        areaStyle: { opacity: 0.12 },
        data: userGrowthTrend.map((item) => item.registered),
      },
      {
        name: '首充用户',
        type: 'line',
        smooth: true,
        symbolSize: 7,
        lineStyle: { width: 3 },
        data: userGrowthTrend.map((item) => item.firstCharge),
      },
    ],
  }
}

function createFirstChargeFunnelOption(theme: EChartsThemeTokens) {
  return {
    animationDuration: 500,
    color: [theme.chart4, theme.chart3, theme.chart2, theme.chart1],
    textStyle: { color: theme.foreground },
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'funnel',
        top: 4,
        bottom: 4,
        left: '4%',
        width: '92%',
        minSize: '48%',
        maxSize: '100%',
        sort: 'descending',
        gap: 3,
        label: {
          show: true,
          position: 'inside',
          color: theme.foreground,
          formatter: '{b}',
          fontSize: 12,
        },
        labelLine: { show: false },
        itemStyle: { borderColor: theme.border, borderWidth: 1, borderRadius: 4 },
        data: firstChargeFunnel.map((item) => ({
          name: `${item.label}  ${item.rate}% · ${item.value.toLocaleString('zh-CN')}`,
          value: item.value,
        })),
      },
    ],
  }
}

function createActiveTimeDistributionOption(theme: EChartsThemeTokens) {
  return {
    animationDuration: 500,
    color: [theme.chart3],
    textStyle: { color: theme.foreground },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { top: 24, right: 10, bottom: 28, left: 38 },
    xAxis: {
      type: 'category',
      data: activeTimeDistribution.map((item) => item.period),
      axisLine: { lineStyle: { color: theme.border } },
      axisTick: { show: false },
      axisLabel: { color: theme.mutedForeground, fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      max: 35,
      axisLabel: { color: theme.mutedForeground, formatter: '{value}%' },
      splitLine: { lineStyle: { color: theme.border, type: 'dashed' } },
    },
    series: [
      {
        type: 'bar',
        barMaxWidth: 28,
        data: activeTimeDistribution.map((item) => item.share),
        itemStyle: { borderRadius: [5, 5, 0, 0] },
        label: { show: true, position: 'top', color: theme.mutedForeground, formatter: '{c}%', fontSize: 10 },
      },
    ],
  }
}

function UserRetentionCard() {
  return (
    <Card className="border ring-0">
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserRoundCheckIcon className="size-4 text-primary" aria-hidden="true" />
          <CardTitle>新用户留存</CardTitle>
        </div>
        <CardAction><Badge variant="secondary">近 6 周</Badge></CardAction>
      </CardHeader>
      <CardContent className="pt-0">
        <ScrollArea className="w-full pb-3" scrollbars="horizontal">
          <Table
            className="min-w-[52rem] border-separate border-spacing-1"
            containerClassName="overflow-visible"
          >
            <TableHeader>
              <TableRow className="border-0 hover:bg-transparent">
                <TableHead className="w-40 px-2"><span className="sr-only">首充用户批次</span></TableHead>
                {Array.from({ length: 7 }, (_, week) => (
                  <TableHead key={week} className="px-2 text-center">第 {week} 周</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {retentionCohorts.map((cohort) => (
                <TableRow key={cohort.label} className="border-0 hover:bg-transparent">
                  <TableCell className="px-2 py-1">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{cohort.label}</span>
                      <span className="text-xs text-muted-foreground">{cohort.users.toLocaleString('zh-CN')} 位用户</span>
                    </div>
                  </TableCell>
                  {cohort.rates.map((rate, week) => (
                    <TableCell key={week} className="p-0.5">
                      <RetentionCell rate={rate} initialUsers={cohort.users} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
        <AgentAnalysisSummary {...userOperationsCardAnalyses.retention} />
      </CardContent>
    </Card>
  )
}

function RetentionCell({ rate, initialUsers }: {
  rate: number | null
  initialUsers: number
}) {
  if (rate === null) {
    return (
      <div className="flex min-h-14 items-center justify-center rounded-md border border-dashed bg-muted/30 text-muted-foreground">
        —
      </div>
    )
  }

  return (
    <div className={cn('flex min-h-14 flex-col justify-center rounded-md px-2 py-1.5', getRetentionColor(rate))}>
      <span className="font-medium tabular-nums">{rate.toFixed(1)}%</span>
      <span className="text-xs tabular-nums opacity-80">{Math.round(initialUsers * rate / 100).toLocaleString('zh-CN')}</span>
    </div>
  )
}

function getRetentionColor(rate: number): string {
  if (rate >= 80) return 'bg-primary text-primary-foreground'
  if (rate >= 60) return 'bg-primary/75 text-primary-foreground'
  if (rate >= 45) return 'bg-primary/50 text-foreground'
  if (rate >= 30) return 'bg-primary/30 text-foreground'
  return 'bg-primary/15 text-foreground'
}

function UserOperationsAnalysisCard() {
  return (
    <AgentWorkflowStatusCard
      agentName={userOperationsAgent.name}
      agentAvatarSrc={userOperationsAgent.avatarSrc}
      agentFallback="营"
      summary="用户运营分析工作流正在执行：正在进行用户分层。"
      steps={analysisSteps}
    />
  )
}

function UserOperationsWorkRecords() {
  const records = [
    ...[...analysisSteps].filter((step) => step.progress > 0).reverse(),
    ...completedOperationRecords,
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
            <li
              key={`${record.time}-${record.title}`}
              className="grid grid-cols-[3.5rem_1rem_minmax(0,1fr)] gap-3 pb-6 last:pb-0"
            >
              <time className="pt-0.5 text-sm font-medium tabular-nums text-muted-foreground">
                {record.time}
              </time>
              <div className="relative flex justify-center">
                {index < records.length - 1 ? (
                  <span className="absolute top-3 bottom-[-1.5rem] w-px bg-border" aria-hidden="true" />
                ) : null}
                <span
                  className="relative mt-1.5 size-2.5 rounded-full bg-primary ring-4 ring-background"
                  aria-hidden="true"
                />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{record.title}</p>
                  <Badge variant="secondary">{userOperationsAgent.name}</Badge>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
                  {record.reply}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

function UserOperationsMessagesCard() {
  const currentRecords = userOperationsTaskRecords.filter(
    (record) => record.date === latestUserOperationsRecordDate,
  )
  const latestRecord = currentRecords[0]

  if (!latestRecord) {
    throw new Error('Recent operations brief requires at least one work record')
  }

  const reportCount = currentRecords.filter((record) => record.category === '写报告').length
  const feedbackRecords = currentRecords.filter((record) => record.category === '回复问题反馈')
  const automaticReplyCount = feedbackRecords.filter((record) => record.result === '已处理').length
  const decisionRecords = feedbackRecords.filter((record) => record.result === '需要决策')

  return (
    <Card className="border ring-0">
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquareTextIcon className="size-4 text-primary" aria-hidden="true" />
          <CardTitle>运营简报</CardTitle>
        </div>
        <CardAction>
          <span className="text-sm tabular-nums text-muted-foreground">1小时前</span>
        </CardAction>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3">
          <Avatar size="sm" className="justify-self-center">
            <AvatarImage src={userOperationsAgent.avatarSrc} alt={userOperationsAgent.name} />
            <AvatarFallback>营</AvatarFallback>
          </Avatar>
          <div className="min-w-0 rounded-lg bg-muted px-3 py-2.5">
            <p className="text-sm leading-6 text-foreground">
              截至 {formatRecordDateLabel(latestUserOperationsRecordDate)} {latestRecord.time}，智能体团队已处理 {currentRecords.length} 项任务：生成 {reportCount} 份运营报告，处理 {feedbackRecords.length} 条问题反馈，其中 {automaticReplyCount} 条已自动回复，{decisionRecords.length} 条需要工作人员决策。
            </p>
            {decisionRecords.length > 0 ? (
              <p className="mt-2 text-sm leading-6 text-foreground">
                当前需重点关注“{decisionRecords.map((record) => record.title).join('”“')}”，智能体已准备预回复并等待人工确认。
              </p>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function UserOperationsTaskRecordsCard() {
  const [replyingRecord, setReplyingRecord] = useState<FeedbackRecord | null>(null)
  const [submittedReplies, setSubmittedReplies] = useState<ReadonlyMap<string, string>>(() => new Map())
  const [selectedRecordDate, setSelectedRecordDate] = useState(latestUserOperationsRecordDate)
  const [recordCalendarOpen, setRecordCalendarOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<{
    title: string
    time: string
    content: string
    agentName: string
  } | null>(null)
  const selectedDateIndex = userOperationsRecordDates.indexOf(selectedRecordDate)
  const previousRecordDate = userOperationsRecordDates[selectedDateIndex - 1]
  const nextRecordDate = userOperationsRecordDates[selectedDateIndex + 1]
  const visibleTaskRecords = userOperationsTaskRecords.filter((record) => record.date === selectedRecordDate)
  const selectedRecordCalendarDate = parseRecordDate(selectedRecordDate)

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
                disabled={!previousRecordDate}
                onClick={() => {
                  if (previousRecordDate) setSelectedRecordDate(previousRecordDate)
                }}
              >
                <ChevronLeftIcon aria-hidden="true" />
              </Button>
              <Popover open={recordCalendarOpen} onOpenChange={setRecordCalendarOpen}>
                <PopoverTrigger
                  render={(
                    <Button variant="ghost" size="sm" className="min-w-28 text-sm" type="button" />
                  )}
                >
                  {formatRecordDateLabel(selectedRecordDate)}
                </PopoverTrigger>
                <PopoverContent align="end" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    locale={zhCN}
                    selected={selectedRecordCalendarDate}
                    defaultMonth={selectedRecordCalendarDate}
                    disabled={{
                      before: parseRecordDate(earliestUserOperationsRecordDate),
                      after: parseRecordDate(latestUserOperationsRecordDate),
                    }}
                    onSelect={(date) => {
                      if (!date) return
                      setSelectedRecordDate(formatRecordDateValue(date))
                      setRecordCalendarOpen(false)
                    }}
                  />
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost"
                size="icon-sm"
                type="button"
                aria-label="查看下一天工作记录"
                disabled={!nextRecordDate}
                onClick={() => {
                  if (nextRecordDate) setSelectedRecordDate(nextRecordDate)
                }}
              >
                <ChevronRightIcon aria-hidden="true" />
              </Button>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="pt-0">
          {visibleTaskRecords.length > 0 ? (
            <ol>
            {visibleTaskRecords.map((record, index) => {
              const isFeedbackTask = record.category === '回复问题反馈'
              const taskAgent = getUserOperationsTeamMember(record.agentId)
              const submittedReply = isFeedbackTask ? submittedReplies.get(record.feedback.id) : undefined
              const result = submittedReply ? '已处理' : record.result

              return (
                <li
                  key={`${record.time}-${record.title}`}
                  className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-3 pb-5 last:pb-0"
                >
                  {index < visibleTaskRecords.length - 1 ? (
                    <span
                      className="absolute bottom-0 left-4 top-8 w-px -translate-x-1/2 bg-border"
                      aria-hidden="true"
                    />
                  ) : null}
                  <Avatar size="sm" className="relative justify-self-center">
                    <AvatarImage src={taskAgent.avatarSrc} alt={taskAgent.name} />
                    <AvatarFallback>{taskAgent.fallback}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex flex-col items-start gap-1">
                      <time className="text-xs font-medium tabular-nums text-muted-foreground">
                        {record.time}
                      </time>
                      <div
                        className={cn(
                          'text-sm font-medium',
                          isFeedbackTask
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-primary',
                        )}
                      >
                        {record.category}
                      </div>
                    </div>
                    <div className={cn('mt-2', isFeedbackTask && 'rounded-lg border px-3 py-2.5')}>
                      {isFeedbackTask ? (
                        <div className="grid gap-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">
                              问题反馈：{record.feedback.submitterName} ({record.feedback.contact})
                            </p>
                            <p className="mt-1 text-sm leading-6">{record.feedback.content}</p>
                          </div>
                          <div className="border-t pt-3">
                            <p className="text-xs font-medium text-muted-foreground">
                              {result === '需要决策' ? '智能体预回复' : '智能体回复'}
                            </p>
                            <p className="mt-1 text-sm leading-6">{submittedReply ?? record.agentReply}</p>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            {result === '需要决策' ? (
                              <>
                                <Badge variant="destructive">需要决策</Badge>
                                <Button
                                  size="sm"
                                  type="button"
                                  onClick={() => setReplyingRecord({
                                    ...record.feedback,
                                    reply: record.agentReply,
                                  })}
                                >
                                  <MessageSquareReplyIcon data-icon="inline-start" aria-hidden="true" />
                                  回复
                                </Button>
                              </>
                            ) : (
                              <Badge variant="secondary">
                                <CheckIcon data-icon="inline-start" aria-hidden="true" />
                                已自动回复
                              </Badge>
                            )}
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="flex w-full items-center gap-3 rounded-lg border bg-background p-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          onClick={() => setSelectedReport({
                            title: record.title,
                            time: record.time,
                            content: record.content,
                            agentName: taskAgent.name,
                          })}
                        >
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <FileTextIcon className="size-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{record.title}</span>
                            <span className="mt-1 block text-xs text-muted-foreground">运营报告</span>
                          </span>
                          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                            <span>查看</span>
                            <ChevronRightIcon className="size-4" aria-hidden="true" />
                          </span>
                        </button>
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
      <FeedbackReplyDialog
        record={replyingRecord}
        onOpenChange={(open) => {
          if (!open) setReplyingRecord(null)
        }}
        onReply={(reply) => {
          if (!replyingRecord) return
          setSubmittedReplies((current) => new Map(current).set(replyingRecord.id, reply))
          setReplyingRecord(null)
        }}
      />
      <Dialog
        open={Boolean(selectedReport)}
        onOpenChange={(open) => {
          if (!open) setSelectedReport(null)
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedReport?.title ?? '运营报告'}</DialogTitle>
            <DialogDescription>
              {selectedReport ? `${selectedReport.time} · ${selectedReport.agentName}生成` : '查看运营报告内容。'}
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

function getFeedbackRecord(recordId: string): FeedbackRecord {
  const record = initialFeedbackRecords.find((item) => item.id === recordId)

  if (!record) {
    throw new Error(`Unknown feedback record: ${recordId}`)
  }

  return record
}
