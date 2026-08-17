import { authenticatedFetch, siteSelectionGatewayBase } from '@/auth/browser-auth-client'

export type AnalysisDimensionCode = 'geography_environment' | 'power_access' | 'site_conditions' | 'ownership_compliance' | 'fleet_cooperation'
export type AnalysisTaskStatus = 'queued' | 'running' | 'completed' | 'failed'
export type AnalysisStepStatus = 'pending' | 'running' | 'completed' | 'failed'
export type AnalysisRecommendation = 'needs-review' | 'priority' | 'recommended' | 'cautious' | 'paused'
export type AnalysisError = { code: string; message: string } | null

export type AnalysisStep = {
  code: AnalysisDimensionCode
  name: string
  order: number
  status: AnalysisStepStatus
  score: number | null
  summary: string
  risks: string[]
  error: AnalysisError
  startedAt: number | null
  completedAt: number | null
  updatedAt: number
}

export type AnalysisReport = {
  version: 'current'
  title: string
  site: { siteId: string; projectName: string; provinceCity: string; countyDistrict: string; locationAddress: string; explorationDate: string }
  conclusion: { overallScore: number; dynamicScore: number | null; coverageRate: number; admissionStatus: 'passed' | 'pending' | 'failed'; decision: 'eliminated' | 'pending_verification' | 'eligible_for_ranking'; rankable: boolean; recommendation: AnalysisRecommendation; overallSummary: string }
  admission: { status: 'passed' | 'pending' | 'failed'; gates: Array<{ code: string; status: 'pass' | 'pending' | 'fail'; reason: string }> }
  rankingItems: Array<{ code: string; status: 'scored' | 'missing' | 'invalid'; score: number | null; maxScore: number; reason: string }>
  missingItems: Array<{ code: string; priority: 'P0' | 'P1' | 'P2'; kind: 'gate' | 'score'; recommendation: string }>
  traffic: { newEnergyShare: number | null; conversionPotentialTraffic: number | null }
  chapters: Array<{ code: AnalysisDimensionCode; name: string; score: null; summary: string; risks: string[] }>
}

export type AnalysisTask = {
  id: string
  siteId: string
  siteName: string
  status: AnalysisTaskStatus
  currentStep: AnalysisDimensionCode | null
  workflowVersion: string
  createdAt: number
  startedAt: number | null
  completedAt: number | null
  updatedAt: number
  overallScore: number | null
  recommendation: AnalysisRecommendation | null
  summary: string
  error: AnalysisError
  steps: AnalysisStep[]
  report: AnalysisReport | null
}

export type AnalysisDashboard = {
  activeTaskCount: number
  analyzedSiteCount: number
  currentTaskId: string | null
  todayStats: {
    createdTaskCount: number
    completedTaskCount: number
    pendingSiteCount: number
    reviewRequiredCount: number
    averageScore: number | null
    averageDurationSeconds: number | null
  }
  scoreRanges: { priority: number; recommended: number; cautious: number; paused: number }
  trend: Array<{ date: string; analyzedCount: number; averageScore: number | null; priority: number; recommended: number; cautious: number; paused: number }>
  calendar: Array<{ date: string; analyzedCount: number }>
  latestCompleted: { taskId: string; siteId: string; siteName: string; overallScore: number; recommendation: AnalysisRecommendation; summary: string; completedAt: number } | null
}

export type AnalysisWorkRecord = {
  id: string
  type: 'step_completed' | 'step_failed' | 'task_completed' | 'task_status'
  taskId: string
  siteId: string
  siteName: string
  stepCode: AnalysisDimensionCode | null
  stepName: string | null
  status: AnalysisTaskStatus | 'completed' | 'failed'
  score: number | null
  summary: string
  error: AnalysisError
  occurredAt: number
  report: AnalysisReport | null
}

export type AnalysisAttempt = {
  id: string
  stepCode: AnalysisDimensionCode
  stepName: string
  attemptNumber: number
  provider: string
  model: string
  promptVersion: string
  tokens: { input: number; output: number; total: number }
  durationMs: number
  status: 'running' | 'completed' | 'failed'
  error: AnalysisError
  startedAt: number | null
  completedAt: number | null
  createdAt: number
  updatedAt: number
}

export type AnalysisMapSite = {
  siteId: string
  siteName: string
  locationAddress: string
  longitude: number
  latitude: number
  task: {
    taskId: string
    status: AnalysisTaskStatus
    createdAt: number
    startedAt: number | null
    completedAt: number | null
    updatedAt: number
    currentStep: { code: AnalysisDimensionCode; name: string; status: AnalysisStepStatus; updatedAt: number } | null
    progress: { completedStepCount: number; totalStepCount: number; percent: number }
    displayText: string
    result: { overallScore: number; recommendation: AnalysisRecommendation; summary: string; reportAvailable: true } | null
    error: AnalysisError
  }
}

export type AnalysisMapSites = {
  date: string
  generatedAt: number
  refreshAfterMs: 5_000 | 30_000
  summary: { siteCount: number; activeSiteCount: number; completedSiteCount: number; failedSiteCount: number }
  sites: AnalysisMapSite[]
}

const basePath = '/api/intelligent-site-selection/analysis'

export class SiteAnalysisApiError extends Error {
  constructor(readonly status: number, readonly code?: string) {
    super(code ?? 'site_analysis_request_failed')
    this.name = 'SiteAnalysisApiError'
  }
}

export function siteAnalysisErrorMessage(error: unknown): string | null {
  if (error instanceof SiteAnalysisApiError) {
    if (error.status === 404) return '当前分析任务已不存在。'
    if (error.code === 'chat_unavailable') return '智能问答服务暂时不可用，请稍后再试。'
    return '智能选址分析服务请求失败，请稍后重试。'
  }
  return error instanceof TypeError ? '网络连接失败，请稍后重试。' : '智能选址数据格式异常，请刷新后重试。'
}

export async function getAnalysisDashboard(): Promise<AnalysisDashboard> {
  return parseDashboard(await jsonRequest('/dashboard'))
}

export async function getAnalysisMapSites(dateValue: string): Promise<AnalysisMapSites> {
  return parseMapSites(await jsonRequest(`/map-sites?date=${encodeURIComponent(dateValue)}`))
}

export async function getAnalysisTask(taskId: string): Promise<AnalysisTask> {
  return parseTask(await jsonRequest(`/tasks/${encodeURIComponent(taskId)}`))
}

export async function getLatestSiteAnalysisTask(siteId: string): Promise<AnalysisTask | null> {
  const value = await jsonRequest(`/sites/${encodeURIComponent(siteId)}/latest-task`)
  return value === null ? null : parseTask(value)
}

export async function getAnalysisWorkRecords(limit = 50): Promise<AnalysisWorkRecord[]> {
  const value = await jsonRequest(`/work-records?limit=${limit}`)
  if (!Array.isArray(value)) throw malformed()
  return value.map(parseWorkRecord)
}

export async function getAnalysisAttempts(taskId: string, limit = 100): Promise<AnalysisAttempt[]> {
  const value = await jsonRequest(`/tasks/${encodeURIComponent(taskId)}/attempts?limit=${limit}`)
  if (!Array.isArray(value)) throw malformed()
  return value.map(parseAttempt)
}

export async function askAnalysisTask(taskId: string, message: string): Promise<string> {
  const value = record(await jsonRequest(`/tasks/${encodeURIComponent(taskId)}/chat`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message }),
  }))
  exact(value, ['reply'])
  return text(value.reply)
}

async function jsonRequest(path: string, init?: RequestInit): Promise<unknown> {
  const response = await authenticatedFetch(`${siteSelectionGatewayBase}${basePath}${path}`, { cache: 'no-store', ...init })
  if (!response.ok) {
    let code: string | undefined
    try {
      const body = record(await response.json())
      if (Object.keys(body).length === 1 && typeof body.error === 'string') code = body.error
    } catch { /* Hide non-contract response bodies. */ }
    throw new SiteAnalysisApiError(response.status, code)
  }
  return response.json()
}

function parseDashboard(value: unknown): AnalysisDashboard {
  const item = record(value)
  exact(item, ['activeTaskCount', 'analyzedSiteCount', 'currentTaskId', 'todayStats', 'scoreRanges', 'trend', 'calendar', 'latestCompleted'])
  const ranges = parseRanges(item.scoreRanges)
  const today = record(item.todayStats)
  exact(today, ['createdTaskCount', 'completedTaskCount', 'pendingSiteCount', 'reviewRequiredCount', 'averageScore', 'averageDurationSeconds'])
  if (!Array.isArray(item.trend) || !Array.isArray(item.calendar)) throw malformed()
  const latest = item.latestCompleted === null ? null : parseLatest(item.latestCompleted)
  return { activeTaskCount: count(item.activeTaskCount), analyzedSiteCount: count(item.analyzedSiteCount), currentTaskId: nullableId(item.currentTaskId),
    todayStats: { createdTaskCount: count(today.createdTaskCount), completedTaskCount: count(today.completedTaskCount),
      pendingSiteCount: count(today.pendingSiteCount), reviewRequiredCount: count(today.reviewRequiredCount),
      averageScore: nullableScore(today.averageScore), averageDurationSeconds: nullableCount(today.averageDurationSeconds) }, scoreRanges: ranges,
    trend: item.trend.map(parseTrend), calendar: item.calendar.map(parseCalendar), latestCompleted: latest }
}

function parseMapSites(value: unknown): AnalysisMapSites {
  const item = record(value)
  exact(item, ['date', 'generatedAt', 'refreshAfterMs', 'summary', 'sites'])
  const summary = record(item.summary)
  exact(summary, ['siteCount', 'activeSiteCount', 'completedSiteCount', 'failedSiteCount'])
  if (!Array.isArray(item.sites)) throw malformed()
  if (item.refreshAfterMs !== 5_000 && item.refreshAfterMs !== 30_000) throw malformed()
  const refreshAfterMs = item.refreshAfterMs
  const sites = item.sites.map(parseMapSite)
  if (new Set(sites.map(({ siteId }) => siteId)).size !== sites.length) throw malformed()
  return { date: date(item.date), generatedAt: timestamp(item.generatedAt), refreshAfterMs,
    summary: { siteCount: count(summary.siteCount), activeSiteCount: count(summary.activeSiteCount),
      completedSiteCount: count(summary.completedSiteCount), failedSiteCount: count(summary.failedSiteCount) }, sites }
}

function parseMapSite(value: unknown): AnalysisMapSite {
  const item = record(value)
  exact(item, ['siteId', 'siteName', 'locationAddress', 'longitude', 'latitude', 'task'])
  const task = record(item.task)
  exact(task, ['taskId', 'status', 'createdAt', 'startedAt', 'completedAt', 'updatedAt', 'currentStep', 'progress', 'displayText', 'result', 'error'])
  const progress = record(task.progress)
  exact(progress, ['completedStepCount', 'totalStepCount', 'percent'])
  const currentStep = task.currentStep === null ? null : parseMapCurrentStep(task.currentStep)
  const result = task.result === null ? null : parseMapResult(task.result)
  return { siteId: id(item.siteId), siteName: text(item.siteName), locationAddress: text(item.locationAddress),
    longitude: coordinate(item.longitude, -180, 180), latitude: coordinate(item.latitude, -90, 90),
    task: { taskId: id(task.taskId), status: oneOf(task.status, taskStatuses), createdAt: timestamp(task.createdAt),
      startedAt: nullableTimestamp(task.startedAt), completedAt: nullableTimestamp(task.completedAt), updatedAt: timestamp(task.updatedAt),
      currentStep, progress: { completedStepCount: count(progress.completedStepCount), totalStepCount: positive(progress.totalStepCount),
        percent: percentage(progress.percent) }, displayText: text(task.displayText), result, error: parseError(task.error) } }
}

function parseMapCurrentStep(value: unknown): NonNullable<AnalysisMapSite['task']['currentStep']> {
  const item = record(value); exact(item, ['code', 'name', 'status', 'updatedAt'])
  return { code: dimension(item.code), name: text(item.name), status: oneOf(item.status, stepStatuses), updatedAt: timestamp(item.updatedAt) }
}

function parseMapResult(value: unknown): NonNullable<AnalysisMapSite['task']['result']> {
  const item = record(value); exact(item, ['overallScore', 'recommendation', 'summary', 'reportAvailable'])
  if (item.reportAvailable !== true) throw malformed()
  return { overallScore: score(item.overallScore), recommendation: recommendation(item.recommendation),
    summary: text(item.summary), reportAvailable: true }
}

function parseTask(value: unknown): AnalysisTask {
  const item = record(value)
  exact(item, ['id', 'siteId', 'siteName', 'status', 'currentStep', 'workflowVersion', 'createdAt', 'startedAt', 'completedAt', 'updatedAt', 'overallScore', 'recommendation', 'summary', 'error', 'steps', 'report'])
  if (!Array.isArray(item.steps) || item.steps.length !== 5) throw malformed()
  const steps = item.steps.map(parseStep)
  if (new Set(steps.map(({ code }) => code)).size !== 5) throw malformed()
  return { id: id(item.id), siteId: id(item.siteId), siteName: text(item.siteName), status: oneOf(item.status, taskStatuses), currentStep: nullableDimension(item.currentStep), workflowVersion: text(item.workflowVersion),
    createdAt: timestamp(item.createdAt), startedAt: nullableTimestamp(item.startedAt), completedAt: nullableTimestamp(item.completedAt), updatedAt: timestamp(item.updatedAt), overallScore: nullableScore(item.overallScore),
    recommendation: nullableRecommendation(item.recommendation), summary: text(item.summary), error: parseError(item.error), steps, report: item.report === null ? null : parseReport(item.report) }
}

function parseStep(value: unknown): AnalysisStep {
  const item = record(value)
  exact(item, ['code', 'name', 'order', 'status', 'score', 'summary', 'risks', 'error', 'startedAt', 'completedAt', 'updatedAt'])
  if (!Array.isArray(item.risks)) throw malformed()
  return { code: dimension(item.code), name: text(item.name), order: positive(item.order), status: oneOf(item.status, stepStatuses), score: nullableScore(item.score), summary: text(item.summary), risks: item.risks.map(text), error: parseError(item.error), startedAt: nullableTimestamp(item.startedAt), completedAt: nullableTimestamp(item.completedAt), updatedAt: timestamp(item.updatedAt) }
}

function parseWorkRecord(value: unknown): AnalysisWorkRecord {
  const item = record(value)
  exact(item, ['id', 'type', 'taskId', 'siteId', 'siteName', 'stepCode', 'stepName', 'status', 'score', 'summary', 'error', 'occurredAt', 'report'])
  return { id: text(item.id), type: oneOf(item.type, workTypes), taskId: id(item.taskId), siteId: id(item.siteId), siteName: text(item.siteName), stepCode: nullableDimension(item.stepCode), stepName: item.stepName === null ? null : text(item.stepName), status: oneOf(item.status, taskStatuses), score: nullableScore(item.score), summary: text(item.summary), error: parseError(item.error), occurredAt: timestamp(item.occurredAt), report: item.report === null ? null : parseReport(item.report) }
}

function parseAttempt(value: unknown): AnalysisAttempt {
  const item = record(value)
  exact(item, ['id', 'stepCode', 'stepName', 'attemptNumber', 'provider', 'model', 'promptVersion', 'tokens', 'durationMs', 'status', 'error', 'startedAt', 'completedAt', 'createdAt', 'updatedAt'])
  const tokens = record(item.tokens); exact(tokens, ['input', 'output', 'total'])
  return { id: id(item.id), stepCode: dimension(item.stepCode), stepName: text(item.stepName), attemptNumber: positive(item.attemptNumber), provider: text(item.provider), model: text(item.model), promptVersion: text(item.promptVersion), tokens: { input: count(tokens.input), output: count(tokens.output), total: count(tokens.total) }, durationMs: count(item.durationMs), status: oneOf(item.status, attemptStatuses), error: parseError(item.error), startedAt: nullableTimestamp(item.startedAt), completedAt: nullableTimestamp(item.completedAt), createdAt: timestamp(item.createdAt), updatedAt: timestamp(item.updatedAt) }
}

function parseReport(value: unknown): AnalysisReport {
  const item = record(value); exact(item, ['version', 'title', 'site', 'conclusion', 'admission', 'rankingItems', 'missingItems', 'traffic', 'chapters'])
  if (item.version !== 'current' || !Array.isArray(item.chapters) || item.chapters.length !== 5
    || !Array.isArray(item.rankingItems) || !Array.isArray(item.missingItems)) throw malformed()
  const site = record(item.site); exact(site, ['siteId', 'projectName', 'provinceCity', 'countyDistrict', 'locationAddress', 'explorationDate'])
  const conclusion = record(item.conclusion); exact(conclusion, ['overallScore', 'dynamicScore', 'coverageRate', 'admissionStatus', 'decision', 'rankable', 'recommendation', 'overallSummary'])
  const admission = record(item.admission); exact(admission, ['status', 'gates'])
  if (!Array.isArray(admission.gates) || typeof conclusion.rankable !== 'boolean') throw malformed()
  const traffic = record(item.traffic); exact(traffic, ['newEnergyShare', 'conversionPotentialTraffic'])
  return { version: 'current', title: text(item.title), site: { siteId: id(site.siteId), projectName: text(site.projectName), provinceCity: text(site.provinceCity), countyDistrict: text(site.countyDistrict), locationAddress: text(site.locationAddress), explorationDate: text(site.explorationDate) },
    conclusion: { overallScore: score(conclusion.overallScore), dynamicScore: nullableScore(conclusion.dynamicScore), coverageRate: percentage(conclusion.coverageRate), admissionStatus: oneOf(conclusion.admissionStatus, ['passed', 'pending', 'failed'] as const), decision: oneOf(conclusion.decision, ['eliminated', 'pending_verification', 'eligible_for_ranking'] as const), rankable: conclusion.rankable, recommendation: recommendation(conclusion.recommendation), overallSummary: text(conclusion.overallSummary) },
    admission: { status: oneOf(admission.status, ['passed', 'pending', 'failed'] as const), gates: admission.gates.map(parseGate) },
    rankingItems: item.rankingItems.map(parseRankingItem), missingItems: item.missingItems.map(parseMissingItem),
    traffic: { newEnergyShare: nullableNonnegativeNumber(traffic.newEnergyShare), conversionPotentialTraffic: nullableNonnegativeNumber(traffic.conversionPotentialTraffic) },
    chapters: item.chapters.map(parseChapter) }
}

function parseChapter(value: unknown): AnalysisReport['chapters'][number] {
  const item = record(value); exact(item, ['code', 'name', 'score', 'summary', 'risks'])
  if (!Array.isArray(item.risks)) throw malformed()
  if (item.score !== null) throw malformed()
  return { code: dimension(item.code), name: text(item.name), score: null, summary: text(item.summary), risks: item.risks.map(text) }
}

function parseGate(value: unknown): AnalysisReport['admission']['gates'][number] {
  const item = record(value); exact(item, ['code', 'status', 'reason'])
  return { code: text(item.code), status: oneOf(item.status, ['pass', 'pending', 'fail'] as const), reason: text(item.reason) }
}

function parseRankingItem(value: unknown): AnalysisReport['rankingItems'][number] {
  const item = record(value); exact(item, ['code', 'status', 'score', 'maxScore', 'reason'])
  return { code: text(item.code), status: oneOf(item.status, ['scored', 'missing', 'invalid'] as const),
    score: nullableScore(item.score), maxScore: score(item.maxScore), reason: text(item.reason) }
}

function parseMissingItem(value: unknown): AnalysisReport['missingItems'][number] {
  const item = record(value); exact(item, ['code', 'priority', 'kind', 'recommendation'])
  return { code: text(item.code), priority: oneOf(item.priority, ['P0', 'P1', 'P2'] as const),
    kind: oneOf(item.kind, ['gate', 'score'] as const), recommendation: text(item.recommendation) }
}

function parseLatest(value: unknown): NonNullable<AnalysisDashboard['latestCompleted']> {
  const item = record(value); exact(item, ['taskId', 'siteId', 'siteName', 'overallScore', 'recommendation', 'summary', 'completedAt'])
  return { taskId: id(item.taskId), siteId: id(item.siteId), siteName: text(item.siteName), overallScore: score(item.overallScore), recommendation: recommendation(item.recommendation), summary: text(item.summary), completedAt: timestamp(item.completedAt) }
}

function parseTrend(value: unknown): AnalysisDashboard['trend'][number] {
  const item = record(value); exact(item, ['date', 'analyzedCount', 'averageScore', 'priority', 'recommended', 'cautious', 'paused'])
  const ranges = parseRanges({
    priority: item.priority,
    recommended: item.recommended,
    cautious: item.cautious,
    paused: item.paused,
  })
  return { date: date(item.date), analyzedCount: count(item.analyzedCount), averageScore: item.averageScore === null ? null : score(item.averageScore), ...ranges }
}
function parseCalendar(value: unknown): AnalysisDashboard['calendar'][number] { const item = record(value); exact(item, ['date', 'analyzedCount']); return { date: date(item.date), analyzedCount: count(item.analyzedCount) } }
function parseRanges(value: unknown): AnalysisDashboard['scoreRanges'] { const item = record(value); exact(item, ['priority', 'recommended', 'cautious', 'paused']); return { priority: count(item.priority), recommended: count(item.recommended), cautious: count(item.cautious), paused: count(item.paused) } }
function parseError(value: unknown): AnalysisError { if (value === null) return null; const item = record(value); exact(item, ['code', 'message']); return { code: text(item.code), message: text(item.message) } }

const dimensions = ['geography_environment', 'power_access', 'site_conditions', 'ownership_compliance', 'fleet_cooperation'] as const
const taskStatuses = ['queued', 'running', 'completed', 'failed'] as const
const stepStatuses = ['pending', 'running', 'completed', 'failed'] as const
const attemptStatuses = ['running', 'completed', 'failed'] as const
const workTypes = ['step_completed', 'step_failed', 'task_completed', 'task_status'] as const
const recommendations = ['needs-review', 'priority', 'recommended', 'cautious', 'paused'] as const
function record(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value)) throw malformed(); return value as Record<string, unknown> }
function exact(value: Record<string, unknown>, keys: readonly string[]): void { const actual = Object.keys(value).sort(); const expected = [...keys].sort(); if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) throw malformed() }
function text(value: unknown): string { if (typeof value !== 'string') throw malformed(); return value }
function id(value: unknown): string { const valueText = text(value); if (!/^[1-9]\d{0,19}$/.test(valueText)) throw malformed(); return valueText }
function nullableId(value: unknown): string | null { return value === null ? null : id(value) }
function count(value: unknown): number { if (!Number.isSafeInteger(value) || Number(value) < 0) throw malformed(); return value as number }
function nullableCount(value: unknown): number | null { return value === null ? null : count(value) }
function positive(value: unknown): number { const result = count(value); if (result < 1) throw malformed(); return result }
function timestamp(value: unknown): number { return count(value) }
function nullableTimestamp(value: unknown): number | null { return value === null ? null : timestamp(value) }
function score(value: unknown): number { if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) throw malformed(); return value }
function percentage(value: unknown): number { const result = count(value); if (result > 100) throw malformed(); return result }
function coordinate(value: unknown, min: number, max: number): number { if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || value === 0) throw malformed(); return value }
function nullableScore(value: unknown): number | null { return value === null ? null : score(value) }
function nullableNonnegativeNumber(value: unknown): number | null { if (value === null) return null; if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw malformed(); return value }
function date(value: unknown): string { const result = text(value); if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) throw malformed(); return result }
function oneOf<const T extends string>(value: unknown, options: readonly T[]): T { if (typeof value !== 'string' || !options.includes(value as T)) throw malformed(); return value as T }
function dimension(value: unknown): AnalysisDimensionCode { return oneOf(value, dimensions) }
function nullableDimension(value: unknown): AnalysisDimensionCode | null { return value === null ? null : dimension(value) }
function recommendation(value: unknown): AnalysisRecommendation { return oneOf(value, recommendations) }
function nullableRecommendation(value: unknown): AnalysisRecommendation | null { return value === null ? null : recommendation(value) }
function malformed(): Error { return new Error('site_analysis_malformed_response') }
