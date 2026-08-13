DELETE FROM `site_analysis_step_attempt`;
DELETE FROM `site_analysis_step`;
DELETE FROM `site_analysis_task`;

UPDATE `site_exploration_site`
SET `latest_analysis_task_id` = 0,
    `overall_score` = 0,
    `selection_recommendation` = 0,
    `analysis_updated_at` = 0;

ALTER TABLE `site_analysis_step`
  MODIFY COLUMN `score` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '兼容字段，当前Agent不直接输出分数',
  MODIFY COLUMN `risks_json` MEDIUMTEXT NOT NULL DEFAULT ('[]') COMMENT '步骤结构化分析结果JSON，待执行时为空数组';
