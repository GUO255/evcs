import type {
  AnalysisAttempt,
  AnalysisDashboard,
  AnalysisReport,
  AnalysisTask,
  AnalysisWorkRecord,
} from './site-selection-analysis-api'

const unix = (value: string) => Math.floor(Date.parse(value) / 1_000)

function createMockReport(siteId: string, projectName: string, locationAddress: string, overallScore: number): AnalysisReport {
  const chapterNames = ['地理环境', '电力接入', '场地条件', '权属合规', '车队合作'] as const
  const chapterCodes = ['geography_environment', 'power_access', 'site_conditions', 'ownership_compliance', 'fleet_cooperation'] as const
  return {
    version: 'current',
    title: `${projectName}选址评估报告`,
    site: { siteId, projectName, provinceCity: '河南省', countyDistrict: '重点区域', locationAddress, explorationDate: '2026-07-16' },
    conclusion: { overallScore, dynamicScore: overallScore, coverageRate: 100, admissionStatus: 'passed', decision: 'eligible_for_ranking', rankable: true, recommendation: overallScore >= 90 ? 'priority' : 'recommended', overallSummary: `该站址动态标准分 ${overallScore} 分，交通、电力、场地、权属与车队需求已完成评估。` },
    admission: { status: 'passed', gates: [] },
    rankingItems: [],
    missingItems: [],
    traffic: { newEnergyShare: null, conversionPotentialTraffic: null },
    chapters: chapterCodes.map((code, index) => ({ code, name: chapterNames[index]!, score: null, summary: `${chapterNames[index]}条件已完成核验，整体满足当前阶段选址要求。`, risks: [] })),
  }
}

const zhengyangReport = createMockReport('1', '驻马店市正阳县重卡充电站', '驻马店市正阳县物流通道沿线', 91)
const yubeiReport = createMockReport('3', '豫北区域站点空间布局', '安阳市与新乡市重点物流走廊', 88)
const powerAccessReport = createMockReport('4', '重点站点电力接入可行性', '河南省重点勘探站点', 86)

export const mockAnalysisTask: AnalysisTask = {
  id: '9001',
  siteId: '2',
  siteName: '全省重点勘探站点',
  status: 'running',
  currentStep: 'site_conditions',
  workflowVersion: 'mock-v1',
  createdAt: unix('2026-07-16T01:12:00+08:00'),
  startedAt: unix('2026-07-16T01:13:00+08:00'),
  completedAt: null,
  updatedAt: unix('2026-07-16T01:26:00+08:00'),
  overallScore: null,
  recommendation: null,
  summary: '已完成地理环境和电力接入评估，正在核查场地建设条件。',
  error: null,
  steps: [
    {
      code: 'geography_environment', name: '地理环境', order: 1, status: 'completed', score: 92,
      summary: '道路通达性良好，距主要物流通道近，场站服务半径覆盖合理。', risks: ['雨季需关注局部排水能力'], error: null,
      startedAt: unix('2026-07-16T01:13:00+08:00'), completedAt: unix('2026-07-16T01:16:00+08:00'), updatedAt: unix('2026-07-16T01:16:00+08:00'),
    },
    {
      code: 'power_access', name: '电力接入', order: 2, status: 'completed', score: 86,
      summary: '周边具备可用接入点，初步容量可满足一期建设需求。', risks: ['正式容量仍需供电方案确认'], error: null,
      startedAt: unix('2026-07-16T01:16:00+08:00'), completedAt: unix('2026-07-16T01:21:00+08:00'), updatedAt: unix('2026-07-16T01:21:00+08:00'),
    },
    {
      code: 'site_conditions', name: '场地条件', order: 3, status: 'running', score: null,
      summary: '正在核查可建设面积、车辆回转空间、硬化条件和附属设施。', risks: [], error: null,
      startedAt: unix('2026-07-16T01:21:00+08:00'), completedAt: null, updatedAt: unix('2026-07-16T01:26:00+08:00'),
    },
    {
      code: 'ownership_compliance', name: '权属合规', order: 4, status: 'pending', score: null,
      summary: '等待场地条件分析完成。', risks: [], error: null, startedAt: null, completedAt: null, updatedAt: unix('2026-07-16T01:26:00+08:00'),
    },
    {
      code: 'fleet_cooperation', name: '车队合作', order: 5, status: 'pending', score: null,
      summary: '等待权属合规分析完成。', risks: [], error: null, startedAt: null, completedAt: null, updatedAt: unix('2026-07-16T01:26:00+08:00'),
    },
  ],
  report: null,
}

const trend: AnalysisDashboard['trend'] = [
  { date: '2026-07-10', analyzedCount: 8, averageScore: 76, priority: 1, recommended: 2, cautious: 4, paused: 1 },
  { date: '2026-07-11', analyzedCount: 10, averageScore: 78, priority: 1, recommended: 4, cautious: 4, paused: 1 },
  { date: '2026-07-12', analyzedCount: 11, averageScore: 79, priority: 2, recommended: 3, cautious: 5, paused: 1 },
  { date: '2026-07-13', analyzedCount: 12, averageScore: 81, priority: 2, recommended: 4, cautious: 5, paused: 1 },
  { date: '2026-07-14', analyzedCount: 14, averageScore: 82, priority: 2, recommended: 5, cautious: 6, paused: 1 },
  { date: '2026-07-15', analyzedCount: 15, averageScore: 83, priority: 3, recommended: 5, cautious: 6, paused: 1 },
  { date: '2026-07-16', analyzedCount: 18, averageScore: 84, priority: 3, recommended: 6, cautious: 8, paused: 1 },
]

export const mockAnalysisDashboard: AnalysisDashboard = {
  activeTaskCount: 128,
  analyzedSiteCount: 88,
  currentTaskId: mockAnalysisTask.id,
  todayStats: { createdTaskCount: 12, completedTaskCount: 9, pendingSiteCount: 3,
    reviewRequiredCount: 1, averageScore: 82.6, averageDurationSeconds: 258 },
  scoreRanges: { priority: 13, recommended: 30, cautious: 38, paused: 7 },
  trend,
  calendar: trend.map(({ date, analyzedCount }) => ({ date, analyzedCount })),
  latestCompleted: {
    taskId: '8998', siteId: '1', siteName: '驻马店市正阳县重卡充电站', overallScore: 91, recommendation: 'priority',
    summary: '站址邻近重卡主要通行线路，场地与电力接入条件较好，建议优先推进供电方案确认和商务谈判。',
    completedAt: unix('2026-07-16T00:45:00+08:00'),
  },
}

export const mockAnalysisWorkRecords: readonly AnalysisWorkRecord[] = [
  { id: 'record-8', type: 'task_completed', taskId: '8998', siteId: '1', siteName: '驻马店市正阳县重卡充电站', stepCode: null, stepName: null, status: 'completed', score: 91, summary: '选址综合报告已生成，建议优先推进。', error: null, occurredAt: unix('2026-07-16T08:40:00+08:00'), report: zhengyangReport },
  { id: 'record-7', type: 'task_completed', taskId: '8997', siteId: '3', siteName: '豫北区域站点空间布局', stepCode: null, stepName: null, status: 'completed', score: 88, summary: '豫北区域站点空间布局报告已生成。', error: null, occurredAt: unix('2026-07-16T06:20:00+08:00'), report: yubeiReport },
  { id: 'record-report-power', type: 'task_completed', taskId: '8996', siteId: '4', siteName: '重点站点电力接入可行性', stepCode: null, stepName: null, status: 'completed', score: 86, summary: '重点站点电力接入可行性报告已生成。', error: null, occurredAt: unix('2026-07-16T03:05:00+08:00'), report: powerAccessReport },
  { id: 'record-6', type: 'task_status', taskId: '9001', siteId: '2', siteName: '全省重点勘探站点', stepCode: 'site_conditions', stepName: '场地条件', status: 'running', score: null, summary: '场地条件智能体开始核查建设条件。', error: null, occurredAt: unix('2026-07-16T01:21:00+08:00'), report: null },
  { id: 'record-5', type: 'step_completed', taskId: '9001', siteId: '2', siteName: '全省重点勘探站点', stepCode: 'power_access', stepName: '电力接入', status: 'completed', score: 86, summary: '已完成周边电源点、接入距离和容量条件分析。', error: null, occurredAt: unix('2026-07-16T01:21:00+08:00'), report: null },
  { id: 'record-4', type: 'step_completed', taskId: '9001', siteId: '2', siteName: '全省重点勘探站点', stepCode: 'geography_environment', stepName: '地理环境', status: 'completed', score: 92, summary: '已完成经纬度、路网距离、服务半径和场站边界分析。', error: null, occurredAt: unix('2026-07-16T01:16:00+08:00'), report: null },
  { id: 'record-3', type: 'task_completed', taskId: '8998', siteId: '1', siteName: '驻马店市正阳县重卡充电站', stepCode: null, stepName: null, status: 'completed', score: 91, summary: '选址综合报告已生成，建议优先推进。', error: null, occurredAt: unix('2026-07-16T00:45:00+08:00'), report: null },
  { id: 'record-2', type: 'step_completed', taskId: '8998', siteId: '1', siteName: '驻马店市正阳县重卡充电站', stepCode: 'fleet_cooperation', stepName: '车队合作', status: 'completed', score: 88, summary: '周边车队补能需求稳定，合作意愿较强。', error: null, occurredAt: unix('2026-07-16T00:40:00+08:00'), report: null },
  { id: 'record-1', type: 'step_completed', taskId: '8998', siteId: '1', siteName: '驻马店市正阳县重卡充电站', stepCode: 'ownership_compliance', stepName: '权属合规', status: 'completed', score: 90, summary: '权属材料齐备，未发现明显合规障碍。', error: null, occurredAt: unix('2026-07-16T00:34:00+08:00'), report: null },
]

export const mockAnalysisAttempts: readonly AnalysisAttempt[] = [
  { id: 'attempt-5', stepCode: 'site_conditions', stepName: '场地条件', attemptNumber: 1, provider: 'OpenAI', model: 'gpt-5', promptVersion: 'site-v1', tokens: { input: 3260, output: 0, total: 3260 }, durationMs: 12600, status: 'running', error: null, startedAt: unix('2026-07-16T01:21:00+08:00'), completedAt: null, createdAt: unix('2026-07-16T01:21:00+08:00'), updatedAt: unix('2026-07-16T01:26:00+08:00') },
  { id: 'attempt-4', stepCode: 'power_access', stepName: '电力接入', attemptNumber: 1, provider: 'OpenAI', model: 'gpt-5', promptVersion: 'power-v1', tokens: { input: 2840, output: 956, total: 3796 }, durationMs: 18320, status: 'completed', error: null, startedAt: unix('2026-07-16T01:16:00+08:00'), completedAt: unix('2026-07-16T01:21:00+08:00'), createdAt: unix('2026-07-16T01:16:00+08:00'), updatedAt: unix('2026-07-16T01:21:00+08:00') },
  { id: 'attempt-3', stepCode: 'geography_environment', stepName: '地理环境', attemptNumber: 1, provider: 'OpenAI', model: 'gpt-5', promptVersion: 'geo-v1', tokens: { input: 3120, output: 1084, total: 4204 }, durationMs: 15480, status: 'completed', error: null, startedAt: unix('2026-07-16T01:13:00+08:00'), completedAt: unix('2026-07-16T01:16:00+08:00'), createdAt: unix('2026-07-16T01:13:00+08:00'), updatedAt: unix('2026-07-16T01:16:00+08:00') },
  { id: 'attempt-2', stepCode: 'ownership_compliance', stepName: '权属合规', attemptNumber: 1, provider: 'OpenAI', model: 'gpt-5', promptVersion: 'ownership-v1', tokens: { input: 0, output: 0, total: 0 }, durationMs: 0, status: 'running', error: null, startedAt: null, completedAt: null, createdAt: unix('2026-07-16T01:12:00+08:00'), updatedAt: unix('2026-07-16T01:12:00+08:00') },
  { id: 'attempt-1', stepCode: 'fleet_cooperation', stepName: '车队合作', attemptNumber: 1, provider: 'OpenAI', model: 'gpt-5', promptVersion: 'fleet-v1', tokens: { input: 0, output: 0, total: 0 }, durationMs: 0, status: 'running', error: null, startedAt: null, completedAt: null, createdAt: unix('2026-07-16T01:12:00+08:00'), updatedAt: unix('2026-07-16T01:12:00+08:00') },
]

export const mockAnalysisConversation = {
  initialMessage: '你好，我正在汇总全省重点勘探站点的选址分析。你可以询问当前进度、评分分布、主要风险或优先推进建议。',
  reply: '当前 128 个站点处于分析流程中，近 7 天已完成 88 个站点评估。高分站点主要集中在干线物流节点，建议优先核实电力容量与土地权属材料。',
  placeholder: '询问智能选址分析结果',
} as const
