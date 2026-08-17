UPDATE site_analysis_step
SET step_name = CASE step_code
  WHEN 1 THEN '数据标准化'
  WHEN 2 THEN '数据质量'
  WHEN 3 THEN '地理环境'
  WHEN 4 THEN '电力接入'
  WHEN 5 THEN '场地条件'
  WHEN 6 THEN '权属合规'
  WHEN 7 THEN '合作车队'
  WHEN 8 THEN '综合评估汇总'
  WHEN 9 THEN '风险评估'
  WHEN 10 THEN '决策建议'
  WHEN 11 THEN '报告撰写'
  ELSE step_name
END,
updated_at = UNIX_TIMESTAMP()
WHERE step_code BETWEEN 1 AND 11;

UPDATE agent_runtime_config
SET agent_code = CASE step_order
  WHEN 1 THEN 'normalization'
  WHEN 2 THEN 'data_quality'
  WHEN 3 THEN 'geography_environment'
  WHEN 4 THEN 'power_access'
  WHEN 5 THEN 'site_conditions'
  WHEN 6 THEN 'ownership_compliance'
  WHEN 7 THEN 'fleet_cooperation'
  WHEN 8 THEN 'assessment_aggregation'
  WHEN 9 THEN 'risk_assessment'
  WHEN 10 THEN 'recommendation'
  WHEN 11 THEN 'report_generation'
  ELSE agent_code
END,
agent_name = CASE step_order
  WHEN 1 THEN '数据标准化'
  WHEN 2 THEN '数据质量'
  WHEN 3 THEN '地理环境'
  WHEN 4 THEN '电力接入'
  WHEN 5 THEN '场地条件'
  WHEN 6 THEN '权属合规'
  WHEN 7 THEN '合作车队'
  WHEN 8 THEN '综合评估汇总'
  WHEN 9 THEN '风险评估'
  WHEN 10 THEN '决策建议'
  WHEN 11 THEN '报告撰写'
  ELSE agent_name
END,
updated_at = UNIX_TIMESTAMP()
WHERE workflow_code = 'site_assessment_mvp'
  AND step_order BETWEEN 1 AND 11;
