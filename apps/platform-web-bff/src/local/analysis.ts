import type { Pool, RowDataPacket } from "mysql2/promise";
import { analysisDimensions, workflowVersion } from "./constants";
import { queryOne, queryRows, nowSeconds } from "./database";
import { jsonResponse, notFound, readJsonBody, validId } from "./respond";

interface TaskRow extends RowDataPacket {
  id: string;
  exploration_site_id: string;
  status: number;
  current_step_code: string;
  workflow_version: string;
  overall_score: number;
  overall_score_available: number;
  selection_recommendation: number;
  overall_summary: string;
  error_code: string;
  redacted_error_message: string;
  created_at: number;
  started_at: number;
  completed_at: number;
  updated_at: number;
}

interface StepRow extends RowDataPacket {
  id: string;
  task_id: string;
  step_code: string;
  step_order: number;
  status: number;
  score: number;
  score_available: number;
  summary: string;
  risks_json: string;
  error_code: string;
  redacted_error_message: string;
  started_at: number;
  completed_at: number;
  created_at: number;
  updated_at: number;
}

interface SiteRow extends RowDataPacket {
  id: string;
  project_name: string;
  province_city: string;
  county_district: string;
  location_address: string;
  longitude: string;
  latitude: string;
  exploration_date: string;
}

const taskStatusName = (value: number): "queued" | "running" | "completed" | "failed" => (
  value === 2 ? "running" : value === 3 ? "completed" : value === 4 ? "failed" : "queued"
);
const stepStatusName = (value: number): "pending" | "running" | "completed" | "failed" => (
  value === 2 ? "running" : value === 3 ? "completed" : value === 4 ? "failed" : "pending"
);
const recommendationByScore = (score: number): "priority" | "recommended" | "cautious" | "paused" => {
  if (score >= 85) return "priority";
  if (score >= 75) return "recommended";
  if (score >= 60) return "cautious";
  return "paused";
};

function hashOf(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return Math.abs(hash);
}

function stepScoreFor(siteId: string, dimensionIndex: number): number {
  const base = 55 + (hashOf(`${siteId}-${dimensionIndex}`) % 40);
  return Math.min(100, base);
}

function stepSummaryFor(dimensionIndex: number): string {
  const summaries = [
    "区位条件良好，邻近高速出入口与干线通道，具备稳定重卡流量基础。",
    "电源接入方案可行，10kV 线路距离在合理范围内，扩容条件满足需求。",
    "场地平整开阔，进出动线顺畅，具备充电设备布置与重卡转弯条件。",
    "土地权属清晰，租赁与合规手续材料齐备，未发现明显合规风险。",
    "周边车队与物流企业合作意愿较强，具备初期车流导入与运营保障条件。",
  ];
  return summaries[dimensionIndex] ?? "维度分析完成。";
}

function stepRisksFor(dimensionIndex: number): string[] {
  const risks = [
    ["高峰期高速口拥堵可能影响车辆到达效率"],
    ["需与供电部门确认专线报装周期"],
    ["雨季排水需重点关注硬化与坡度"],
    ["租赁合同续签条款需提前锁定"],
    ["初期车队导入依赖合作方节奏"],
  ];
  return risks[dimensionIndex] ?? [];
}

async function loadSite(pool: Pool, siteId: string): Promise<SiteRow | null> {
  return queryOne<SiteRow>(
    pool,
    `SELECT id, project_name, province_city, county_district, location_address, longitude, latitude, exploration_date
       FROM site_exploration_site WHERE id = ? LIMIT 1`,
    [siteId],
  );
}

export async function startLocalAnalysisTask(pool: Pool, siteId: string): Promise<{ taskId: string } | null> {
  const site = await loadSite(pool, siteId);
  if (!site) return null;
  const now = nowSeconds();
  const creationRequestId = `local-${now}-${siteId}`;
  const result = await pool.query(
    `INSERT INTO site_analysis_task
       (exploration_site_id, creation_request_id, created_by_member_id, input_snapshot_json, workflow_version,
        status, current_step_code, overall_score, overall_score_available, selection_recommendation, overall_summary,
        error_code, redacted_error_message, created_at, started_at, completed_at, updated_at)
     VALUES (?, ?, 1, '{}', ?, 3, '', 0, 0, 0, '', '', '', ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
    [siteId, creationRequestId, workflowVersion, now, now, now, now],
  );
  const taskId = String((result[0] as { insertId: number }).insertId);
  const stepRows: StepRow[] = [];
  const stepScores: number[] = [];
  for (const dimension of analysisDimensions) {
    const score = stepScoreFor(siteId, dimension.order - 1);
    stepScores.push(score);
    const risks = stepRisksFor(dimension.order - 1);
    const stepResult = await pool.query(
      `INSERT INTO site_analysis_step
         (task_id, step_code, step_order, status, score, score_available, summary, risks_json,
          error_code, redacted_error_message, started_at, completed_at, created_at, updated_at)
       VALUES (?, ?, ?, 3, ?, 1, ?, ?, '', '', ?, ?, ?, ?)`,
      [taskId, dimension.code, dimension.order, score, stepSummaryFor(dimension.order - 1),
        JSON.stringify(risks), now, now, now, now],
    );
    const stepId = String((stepResult[0] as { insertId: number }).insertId);
    await pool.query(
      `INSERT INTO site_analysis_step_attempt
         (step_id, attempt_number, provider, model, prompt_version, input_checksum, input_tokens, output_tokens,
          total_tokens, duration_ms, status, error_code, redacted_error_message, started_at, completed_at, created_at, updated_at)
       VALUES (?, 1, 'local-agent', 'local-deterministic-v1', 'local-v1', '', 0, 0, 0, 80, 2, '', '', ?, ?, ?, ?)`,
      [stepId, now, now, now, now],
    );
    stepRows.push({
      id: stepId, task_id: taskId, step_code: dimension.code, step_order: dimension.order,
      status: 3, score, score_available: 1, summary: stepSummaryFor(dimension.order - 1),
      risks_json: JSON.stringify(risks), error_code: "", redacted_error_message: "",
      started_at: now, completed_at: now, created_at: now, updated_at: now,
    } as unknown as StepRow);
  }
  const overallScore = Math.round(stepScores.reduce((sum, score) => sum + score, 0) / stepScores.length);
  const recommendation = recommendationByScore(overallScore);
  const overallSummary = `本地规则引擎完成五维评估：${analysisDimensions.map((dimension, index) => (
    `${dimension.name} ${stepScores[index]}分`
  )).join("，")}。综合得分 ${overallScore} 分。`;
  await pool.query(
    `UPDATE site_analysis_task
        SET status = 3, current_step_code = '', overall_score = ?, overall_score_available = 1,
            selection_recommendation = ?, overall_summary = ?, completed_at = ?, updated_at = ?
      WHERE id = ?`,
    [overallScore, recommendationValue(recommendation), overallSummary, now, now, taskId],
  );
  await pool.query(
    `UPDATE site_exploration_site
        SET overall_score = ?, overall_score_available = 1, selection_recommendation = ?,
            latest_analysis_task_id = ?, analysis_updated_at = ?, analysis_snapshot_updated_at = ?, updated_at = ?
      WHERE id = ?`,
    [overallScore, recommendationValue(recommendation), taskId, now, now, now, siteId],
  );
  return { taskId };
}

function recommendationValue(recommendation: string): number {
  if (recommendation === "priority") return 2;
  if (recommendation === "recommended") return 3;
  if (recommendation === "cautious") return 4;
  return 5;
}

async function taskSteps(pool: Pool, taskId: string): Promise<StepRow[]> {
  return queryRows<StepRow>(
    pool,
    "SELECT * FROM site_analysis_step WHERE task_id = ? ORDER BY step_order ASC",
    [taskId],
  );
}

function stepPayload(row: StepRow): Record<string, unknown> {
  const score = Number(row.score_available) === 1 ? Number(row.score) : null;
  const error = row.error_code
    ? { code: row.error_code, message: row.redacted_error_message }
    : null;
  return {
    code: row.step_code,
    name: analysisDimensions.find((dimension) => dimension.code === row.step_code)?.name ?? row.step_code,
    order: Number(row.step_order),
    status: stepStatusName(Number(row.status)),
    score,
    summary: row.summary,
    risks: JSON.parse(row.risks_json || "[]") as string[],
    error,
    startedAt: Number(row.started_at) === 0 ? null : Number(row.started_at),
    completedAt: Number(row.completed_at) === 0 ? null : Number(row.completed_at),
    updatedAt: Number(row.updated_at),
  };
}

function recommendationName(value: number): "needs-review" | "priority" | "recommended" | "cautious" | "paused" {
  if (value === 1) return "needs-review";
  if (value === 2) return "priority";
  if (value === 3) return "recommended";
  if (value === 4) return "cautious";
  return "paused";
}

async function taskPayload(pool: Pool, task: TaskRow): Promise<Record<string, unknown> | null> {
  const site = await loadSite(pool, task.exploration_site_id);
  if (!site) return null;
  const steps = await taskSteps(pool, task.id);
  const completed = Number(task.status) === 3;
  return {
    id: task.id,
    siteId: site.id,
    siteName: site.project_name || site.location_address || `勘探站点${site.id}`,
    status: taskStatusName(Number(task.status)),
    currentStep: task.current_step_code === "" ? null : task.current_step_code,
    workflowVersion: task.workflow_version || workflowVersion,
    createdAt: Number(task.created_at),
    startedAt: Number(task.started_at) === 0 ? null : Number(task.started_at),
    completedAt: Number(task.completed_at) === 0 ? null : Number(task.completed_at),
    updatedAt: Number(task.updated_at),
    overallScore: completed && Number(task.overall_score_available) === 1 ? Number(task.overall_score) : null,
    recommendation: completed ? recommendationName(Number(task.selection_recommendation)) : null,
    summary: task.overall_summary,
    error: task.error_code ? { code: task.error_code, message: task.redacted_error_message } : null,
    steps: steps.map(stepPayload),
    report: completed ? buildReport(pool, task, site, steps) : null,
  };
}

function buildReport(pool: Pool, task: TaskRow, site: SiteRow, steps: StepRow[]): Record<string, unknown> {
  const overallScore = Number(task.overall_score);
  const recommendation = recommendationName(Number(task.selection_recommendation));
  return {
    version: "current",
    title: `${site.project_name || site.location_address} 智能选址分析报告`,
    site: {
      siteId: site.id,
      projectName: site.project_name,
      provinceCity: site.province_city,
      countyDistrict: site.county_district,
      locationAddress: site.location_address,
      explorationDate: site.exploration_date,
    },
    conclusion: {
      overallScore,
      dynamicScore: null,
      coverageRate: 100,
      admissionStatus: "passed",
      decision: overallScore >= 60 ? "eligible_for_ranking" : "eliminated",
      rankable: overallScore >= 60,
      recommendation,
      overallSummary: task.overall_summary,
    },
    admission: {
      status: "passed",
      gates: [
        { code: "coordinates", status: "pass", reason: "站点坐标完整，位于河南省内。" },
        { code: "core_fields", status: "pass", reason: "核心勘探字段齐全。" },
      ],
    },
    rankingItems: steps.map((step, index) => ({
      code: step.step_code,
      status: "scored",
      score: Number(step.score),
      maxScore: 100,
      reason: analysisDimensions[index]?.name ?? step.step_code,
    })),
    missingItems: [],
    traffic: { newEnergyShare: null, conversionPotentialTraffic: null },
    chapters: steps.map((step) => ({
      code: step.step_code,
      name: analysisDimensions.find((dimension) => dimension.code === step.step_code)?.name ?? step.step_code,
      score: null,
      summary: step.summary,
      risks: JSON.parse(step.risks_json || "[]") as string[],
    })),
  };
}

export async function handleAnalysis(pool: Pool, request: Request, suffix: string): Promise<Response> {
  const dashboard = /^\/dashboard$/u.exec(suffix);
  if (dashboard && request.method === "GET") return analysisDashboard(pool);

  const mapSites = /^\/map-sites$/u.exec(suffix);
  if (mapSites && request.method === "GET") return analysisMapSites(pool, request);

  const workRecords = /^\/work-records$/u.exec(suffix);
  if (workRecords && request.method === "GET") return analysisWorkRecords(pool, request);

  const task = /^\/tasks\/(\d+)$/u.exec(suffix);
  if (task && request.method === "GET") return getTask(pool, task[1]!);

  const attempts = /^\/tasks\/(\d+)\/attempts$/u.exec(suffix);
  if (attempts && request.method === "GET") return getAttempts(pool, attempts[1]!, request);

  const chat = /^\/tasks\/(\d+)\/chat$/u.exec(suffix);
  if (chat && request.method === "POST") return chatReply(pool, chat[1]!, request);

  const latest = /^\/sites\/(\d+)\/latest-task$/u.exec(suffix);
  if (latest && request.method === "GET") return getLatestTask(pool, latest[1]!);

  return notFound();
}

async function getTask(pool: Pool, taskId: string): Promise<Response> {
  const task = await queryOne<TaskRow>(pool, "SELECT * FROM site_analysis_task WHERE id = ?", [taskId]);
  if (!task) return jsonResponse({ error: "task_not_found" }, 404);
  const payload = await taskPayload(pool, task);
  if (!payload) return jsonResponse({ error: "task_not_found" }, 404);
  return jsonResponse(payload);
}

async function getLatestTask(pool: Pool, siteId: string): Promise<Response> {
  const task = await queryOne<TaskRow>(
    pool,
    "SELECT * FROM site_analysis_task WHERE exploration_site_id = ? ORDER BY id DESC LIMIT 1",
    [siteId],
  );
  if (!task) return jsonResponse(null);
  const payload = await taskPayload(pool, task);
  return jsonResponse(payload ?? null);
}

async function analysisMapSites(pool: Pool, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? "";
  const rows = await queryRows<TaskRow & { project_name: string; location_address: string; longitude: string; latitude: string }>(
    pool,
    `SELECT t.*, s.project_name, s.location_address, s.longitude, s.latitude
       FROM site_analysis_task t
       JOIN site_exploration_site s ON s.id = t.exploration_site_id
      WHERE t.id = (SELECT MAX(t2.id) FROM site_analysis_task t2 WHERE t2.exploration_site_id = t.exploration_site_id)
      ORDER BY t.id DESC
      LIMIT 500`,
  );
  const sites = [];
  let completed = 0;
  let failed = 0;
  for (const row of rows) {
    const longitude = Number(row.longitude);
    const latitude = Number(row.latitude);
    if (longitude === 0 || latitude === 0) continue;
    const status = taskStatusName(Number(row.status));
    if (status === "completed") completed += 1;
    if (status === "failed") failed += 1;
    const stepRows = await taskSteps(pool, row.id);
    const currentStep = row.current_step_code === ""
      ? null
      : stepRows.find((step) => step.step_code === row.current_step_code);
    const completedSteps = stepRows.filter((step) => Number(step.status) === 3).length;
    sites.push({
      siteId: row.exploration_site_id,
      siteName: row.project_name || row.location_address || `勘探站点${row.exploration_site_id}`,
      locationAddress: row.location_address,
      longitude,
      latitude,
      task: {
        taskId: row.id,
        status,
        createdAt: Number(row.created_at),
        startedAt: Number(row.started_at) === 0 ? null : Number(row.started_at),
        completedAt: Number(row.completed_at) === 0 ? null : Number(row.completed_at),
        updatedAt: Number(row.updated_at),
        currentStep: currentStep
          ? {
              code: currentStep.step_code,
              name: analysisDimensions.find((dimension) => dimension.code === currentStep.step_code)?.name ?? currentStep.step_code,
              status: stepStatusName(Number(currentStep.status)),
              updatedAt: Number(currentStep.updated_at),
            }
          : null,
        progress: {
          completedStepCount: completedSteps,
          totalStepCount: stepRows.length,
          percent: stepRows.length > 0 ? Math.round((completedSteps / stepRows.length) * 100) : 0,
        },
        displayText: status === "completed"
          ? `综合得分 ${row.overall_score}，${recommendationName(Number(row.selection_recommendation))}`
          : "分析进行中",
        result: status === "completed" && Number(row.overall_score_available) === 1
          ? {
              overallScore: Number(row.overall_score),
              recommendation: recommendationName(Number(row.selection_recommendation)),
              summary: row.overall_summary,
              reportAvailable: true,
            }
          : null,
        error: row.error_code ? { code: row.error_code, message: row.redacted_error_message } : null,
      },
    });
  }
  return jsonResponse({
    date,
    generatedAt: nowSeconds(),
    refreshAfterMs: 30_000,
    summary: {
      siteCount: sites.length,
      activeSiteCount: rows.length - completed - failed,
      completedSiteCount: completed,
      failedSiteCount: failed,
    },
    sites,
  });
}

async function analysisDashboard(pool: Pool): Promise<Response> {
  const tasks = await queryRows<TaskRow>(pool, "SELECT * FROM site_analysis_task ORDER BY id DESC LIMIT 1000");
  const completedTasks = tasks.filter((task) => Number(task.status) === 3);
  const analyzedSiteCount = new Set(completedTasks.map((task) => task.exploration_site_id)).size;
  const siteCount = await queryOne<RowDataPacket>(pool, "SELECT COUNT(*) AS count_ FROM site_exploration_site");
  const today = new Date().toISOString().slice(0, 10);
  const todayTasks = tasks.filter((task) => formatDate(Number(task.created_at)) === today);
  const todayCompleted = todayTasks.filter((task) => Number(task.status) === 3);
  const latestCompleted = completedTasks[0] ?? null;
  const pendingSiteCount = Math.max(Number(siteCount?.count_ ?? 0) - analyzedSiteCount, 0);

  const days = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(Date.now() - (13 - index) * 86_400_000).toISOString().slice(0, 10);
    const dayTasks = tasks.filter((task) => formatDate(Number(task.created_at)) === date);
    const dayCompleted = dayTasks.filter((task) => Number(task.status) === 3);
    return {
      date,
      analyzedCount: dayCompleted.length,
      averageScore: dayCompleted.length > 0
        ? Math.round(dayCompleted.reduce((sum, task) => sum + Number(task.overall_score), 0) / dayCompleted.length)
        : null,
      priority: dayCompleted.filter((task) => Number(task.selection_recommendation) === 2).length,
      recommended: dayCompleted.filter((task) => Number(task.selection_recommendation) === 3).length,
      cautious: dayCompleted.filter((task) => Number(task.selection_recommendation) === 4).length,
      paused: dayCompleted.filter((task) => Number(task.selection_recommendation) === 5).length,
    };
  });
  const calendar = days.map(({ date, analyzedCount }) => ({ date, analyzedCount }));

  const latestPayload = latestCompleted ? {
    taskId: latestCompleted.id,
    siteId: latestCompleted.exploration_site_id,
    siteName: (await loadSite(pool, latestCompleted.exploration_site_id))?.project_name ?? "",
    overallScore: Number(latestCompleted.overall_score),
    recommendation: recommendationName(Number(latestCompleted.selection_recommendation)),
    summary: latestCompleted.overall_summary,
    completedAt: Number(latestCompleted.completed_at),
  } : null;

  return jsonResponse({
    activeTaskCount: tasks.filter((task) => Number(task.status) === 1 || Number(task.status) === 2).length,
    analyzedSiteCount,
    currentTaskId: null,
    todayStats: {
      createdTaskCount: todayTasks.length,
      completedTaskCount: todayCompleted.length,
      pendingSiteCount,
      reviewRequiredCount: completedTasks.filter((task) => Number(task.selection_recommendation) === 1).length,
      averageScore: todayCompleted.length > 0
        ? Math.round(todayCompleted.reduce((sum, task) => sum + Number(task.overall_score), 0) / todayCompleted.length)
        : null,
      averageDurationSeconds: todayCompleted.length > 0
        ? Math.round(todayCompleted.reduce((sum, task) => (
          sum + Math.max(Number(task.completed_at) - Number(task.started_at), 0)
        ), 0) / todayCompleted.length)
        : null,
    },
    scoreRanges: {
      priority: completedTasks.filter((task) => Number(task.selection_recommendation) === 2).length,
      recommended: completedTasks.filter((task) => Number(task.selection_recommendation) === 3).length,
      cautious: completedTasks.filter((task) => Number(task.selection_recommendation) === 4).length,
      paused: completedTasks.filter((task) => Number(task.selection_recommendation) === 5).length,
    },
    trend: days,
    calendar,
    latestCompleted: latestPayload,
  });
}

async function analysisWorkRecords(pool: Pool, request: Request): Promise<Response> {
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "50"), 1), 200);
  const tasks = await queryRows<TaskRow>(pool, "SELECT * FROM site_analysis_task ORDER BY id DESC LIMIT 100");
  const records: Record<string, unknown>[] = [];
  for (const task of tasks) {
    const site = await loadSite(pool, task.exploration_site_id);
    const siteName = site?.project_name ?? site?.location_address ?? "";
    const steps = await taskSteps(pool, task.id);
    for (const step of steps) {
      records.push({
        id: `wr-${task.id}-${step.id}`,
        type: Number(step.status) === 4 ? "step_failed" : "step_completed",
        taskId: task.id,
        siteId: task.exploration_site_id,
        siteName,
        stepCode: step.step_code,
        stepName: analysisDimensions.find((dimension) => dimension.code === step.step_code)?.name ?? step.step_code,
        status: Number(step.status) === 4 ? "failed" : "completed",
        score: Number(step.score_available) === 1 ? Number(step.score) : null,
        summary: step.summary,
        error: step.error_code ? { code: step.error_code, message: step.redacted_error_message } : null,
        occurredAt: Number(step.completed_at) === 0 ? Number(step.updated_at) : Number(step.completed_at),
        report: null,
      });
    }
    records.push({
      id: `wr-${task.id}`,
      type: Number(task.status) === 4 ? "task_status" : "task_completed",
      taskId: task.id,
      siteId: task.exploration_site_id,
      siteName,
      stepCode: null,
      stepName: null,
      status: taskStatusName(Number(task.status)),
      score: Number(task.overall_score_available) === 1 ? Number(task.overall_score) : null,
      summary: task.overall_summary,
      error: task.error_code ? { code: task.error_code, message: task.redacted_error_message } : null,
      occurredAt: Number(task.updated_at),
      report: null,
    });
  }
  records.sort((left, right) => Number(right.occurredAt) - Number(left.occurredAt));
  return jsonResponse(records.slice(0, limit));
}

async function getAttempts(pool: Pool, taskId: string, request: Request): Promise<Response> {
  const task = await queryOne<TaskRow>(pool, "SELECT id FROM site_analysis_task WHERE id = ?", [taskId]);
  if (!task) return jsonResponse({ error: "task_not_found" }, 404);
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "100"), 1), 200);
  const rows = await queryRows<RowDataPacket>(
    pool,
    `SELECT a.*, s.step_code, s.step_order
       FROM site_analysis_step_attempt a
       JOIN site_analysis_step s ON s.id = a.step_id
      WHERE s.task_id = ?
      ORDER BY a.id ASC LIMIT ?`,
    [taskId, limit],
  );
  return jsonResponse(rows.map((row) => ({
    id: String(row.id),
    stepCode: row.step_code,
    stepName: analysisDimensions.find((dimension) => dimension.code === row.step_code)?.name ?? String(row.step_code),
    attemptNumber: Number(row.attempt_number),
    provider: row.provider,
    model: row.model,
    promptVersion: row.prompt_version,
    tokens: { input: Number(row.input_tokens), output: Number(row.output_tokens), total: Number(row.total_tokens) },
    durationMs: Number(row.duration_ms),
    status: Number(row.status) === 2 ? "completed" : Number(row.status) === 3 ? "failed" : "running",
    error: row.error_code ? { code: row.error_code, message: row.redacted_error_message } : null,
    startedAt: Number(row.started_at) === 0 ? null : Number(row.started_at),
    completedAt: Number(row.completed_at) === 0 ? null : Number(row.completed_at),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  })));
}

async function chatReply(pool: Pool, taskId: string, request: Request): Promise<Response> {
  const task = await queryOne<TaskRow>(pool, "SELECT * FROM site_analysis_task WHERE id = ?", [taskId]);
  if (!task) return jsonResponse({ error: "task_not_found" }, 404);
  const body = await readJsonBody(request);
  if (!body || typeof (body as Record<string, unknown>).message !== "string") {
    return jsonResponse({ error: "invalid_request" }, 400);
  }
  return jsonResponse({
    reply: `本地分析引擎已基于数据库中的勘探数据完成评估：综合得分 ${task.overall_score} 分，结论为「${recommendationName(Number(task.selection_recommendation))}」。当前开发环境使用本地规则引擎，不依赖云端大模型。`,
  });
}

function formatDate(seconds: number): string {
  return new Date(seconds * 1000).toISOString().slice(0, 10);
}
