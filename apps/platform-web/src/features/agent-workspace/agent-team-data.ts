import type { AgentWorkspaceTab } from './agent-workspace-permissions'

export interface AgentTeamMemberData {
  id: string
  name: string
  avatarSrc: string
  fallback: string
  responsibility: string
  emphasis?: boolean
}

export interface AgentActivitySummary {
  runCount: number
  workRecordCount: number
  status: '运行中' | '待命'
}

export const agentActivityByMemberId: Record<string, AgentActivitySummary> = {
  'station-inspection': { runCount: 328, workRecordCount: 96, status: '运行中' },
  'fault-diagnosis': { runCount: 186, workRecordCount: 54, status: '运行中' },
  'work-order-dispatch': { runCount: 142, workRecordCount: 73, status: '待命' },
  'operations-strategy': { runCount: 214, workRecordCount: 68, status: '运行中' },
  'customer-service': { runCount: 487, workRecordCount: 126, status: '运行中' },
  'retention-analysis': { runCount: 169, workRecordCount: 42, status: '待命' },
  'data-standardization': { runCount: 128, workRecordCount: 36, status: '待命' },
  'data-quality': { runCount: 146, workRecordCount: 41, status: '待命' },
  'geo-environment': { runCount: 208, workRecordCount: 57, status: '运行中' },
  'power-access': { runCount: 187, workRecordCount: 52, status: '运行中' },
  'site-condition': { runCount: 173, workRecordCount: 49, status: '运行中' },
  'ownership-compliance': { runCount: 154, workRecordCount: 44, status: '运行中' },
  'fleet-cooperation': { runCount: 139, workRecordCount: 38, status: '运行中' },
  'evaluation-summary': { runCount: 121, workRecordCount: 35, status: '待命' },
  'risk-assessment': { runCount: 116, workRecordCount: 31, status: '待命' },
  'decision-recommendation': { runCount: 108, workRecordCount: 29, status: '待命' },
  'report-writing': { runCount: 96, workRecordCount: 27, status: '待命' },
  'load-forecast': { runCount: 202, workRecordCount: 61, status: '运行中' },
  'power-price-analysis': { runCount: 176, workRecordCount: 53, status: '待命' },
  'rate-optimization': { runCount: 149, workRecordCount: 45, status: '待命' },
  'business-metrics': { runCount: 264, workRecordCount: 79, status: '运行中' },
  'revenue-analysis': { runCount: 198, workRecordCount: 63, status: '待命' },
  'business-insight': { runCount: 172, workRecordCount: 51, status: '待命' },
  'campaign-planning': { runCount: 158, workRecordCount: 46, status: '待命' },
  'audience-strategy': { runCount: 193, workRecordCount: 58, status: '运行中' },
  'campaign-evaluation': { runCount: 147, workRecordCount: 43, status: '待命' },
}

export function getAgentActivitySummary(memberId: string): AgentActivitySummary {
  const activity = agentActivityByMemberId[memberId]

  if (!activity) {
    throw new Error(`缺少智能体 ${memberId} 的运行统计`)
  }

  return activity
}

export const agentTeamByWorkspace = {
  inspection: [
    {
      id: 'station-inspection',
      name: '场站巡检智能体',
      avatarSrc: '/agent-avatars/robot/station-inspection.webp',
      fallback: '巡',
      responsibility: '按小时检查场站、充电设备、通信链路和视频通道状态，记录异常并形成巡检结果。',
    },
    {
      id: 'fault-diagnosis',
      name: '故障诊断智能体',
      avatarSrc: '/agent-avatars/robot/fault-diagnosis.webp',
      fallback: '诊',
      responsibility: '关联设备遥测、告警日志和历史工单，对异常设备进行故障归因、影响评估与排障分析。',
    },
    {
      id: 'work-order-dispatch',
      name: '工单调度智能体',
      avatarSrc: '/agent-avatars/robot/work-order-dispatch.webp',
      fallback: '调',
      responsibility: '根据故障等级、场站位置和人员能力生成工单，匹配工作人员并持续跟踪处理进度。',
    },
  ],
  'user-operations': [
    {
      id: 'operations-strategy',
      name: '运营策略分析智能体',
      avatarSrc: '/agent-avatars/robot/operations-strategy.webp',
      fallback: '策',
      responsibility: '汇总用户增长、首充转化和活跃时段数据，生成运营报告与可执行的用户触达策略。',
    },
    {
      id: 'customer-service',
      name: '客服智能体',
      avatarSrc: '/agent-avatars/robot/customer-service.webp',
      fallback: '服',
      responsibility: '识别问题反馈，自动回复低风险问题；涉及计费、退款或责任认定时请求工作人员决策。',
    },
    {
      id: 'retention-analysis',
      name: '用户留存率分析智能体',
      avatarSrc: '/agent-avatars/robot/retention-analysis.webp',
      fallback: '留',
      responsibility: '分析新用户 Cohort、7 日复购和流失风险，定位留存变化并提出分层召回建议。',
    },
  ],
  'site-selection': [
    { id: 'geo-environment', name: '地理环境智能体', avatarSrc: '/agent-avatars/robot/geo-environment.webp', fallback: '地', responsibility: '分析经纬度、道路距离和场站边界，形成地理环境评分、结论与风险。' },
    { id: 'power-access', name: '电力接入智能体', avatarSrc: '/agent-avatars/robot/power-access.webp', fallback: '电', responsibility: '基于电力容量说明评估接入条件，形成电力接入评分、结论与风险。' },
    { id: 'site-condition', name: '场地条件智能体', avatarSrc: '/agent-avatars/robot/site-condition.webp', fallback: '场', responsibility: '核查面积、出入便利、硬化、地势与附属物等场地建设条件。' },
    { id: 'ownership-compliance', name: '权属合规智能体', avatarSrc: '/agent-avatars/robot/ownership-compliance.webp', fallback: '权', responsibility: '复核土地性质、证明材料和租赁协议，识别权属合规风险。' },
    { id: 'fleet-cooperation', name: '合作车队智能体', avatarSrc: '/agent-avatars/robot/fleet-cooperation.webp', fallback: '车', responsibility: '评估运力说明、周边竞品、合作模式、合作条件和场站成熟度。' },
  ],
  'rate-strategy': [
    { id: 'load-forecast', name: '负荷预测智能体', avatarSrc: '/agent-avatars/robot/load-forecast.webp', fallback: '荷', responsibility: '预测不同时段和场站的充电需求、负荷变化与供需压力。' },
    { id: 'power-price-analysis', name: '电价分析智能体', avatarSrc: '/agent-avatars/robot/power-price-analysis.webp', fallback: '价', responsibility: '分析分时电价、购电成本和峰谷价差对经营收益的影响。' },
    { id: 'rate-optimization', name: '费率优化智能体', avatarSrc: '/agent-avatars/robot/rate-optimization.webp', fallback: '优', responsibility: '综合成本、需求和经营目标，生成并评估费率策略方案。' },
  ],
  'business-analysis': [
    { id: 'business-metrics', name: '经营指标智能体', avatarSrc: '/agent-avatars/robot/business-metrics.webp', fallback: '指', responsibility: '汇总收入、订单、用户和场站运营指标，形成统一经营视图。' },
    { id: 'revenue-analysis', name: '收益分析智能体', avatarSrc: '/agent-avatars/robot/revenue-analysis.webp', fallback: '收', responsibility: '分析收入结构、成本变化和场站收益表现，定位经营差异。' },
    { id: 'business-insight', name: '经营洞察智能体', avatarSrc: '/agent-avatars/robot/business-insight.webp', fallback: '洞', responsibility: '识别指标趋势、异常波动和潜在机会，输出经营改进建议。' },
  ],
  'campaign-operations': [
    { id: 'campaign-planning', name: '活动策划智能体', avatarSrc: '/agent-avatars/robot/campaign-planning.webp', fallback: '划', responsibility: '结合运营目标和业务场景设计活动主题、权益与执行方案。' },
    { id: 'audience-strategy', name: '人群策略智能体', avatarSrc: '/agent-avatars/robot/audience-strategy.webp', fallback: '群', responsibility: '识别目标用户分层，制定活动触达范围、渠道和频次策略。' },
    { id: 'campaign-evaluation', name: '活动评估智能体', avatarSrc: '/agent-avatars/robot/campaign-evaluation.webp', fallback: '评', responsibility: '跟踪活动参与、转化和成本效果，形成复盘与优化建议。' },
  ],
} as const satisfies Record<AgentWorkspaceTab, readonly AgentTeamMemberData[]>
