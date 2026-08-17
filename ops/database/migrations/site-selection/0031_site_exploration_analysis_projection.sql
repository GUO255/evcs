ALTER TABLE `site_exploration_site`
  ADD COLUMN `latest_analysis_task_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '最新完成分析任务主键，0表示暂无分析' AFTER `selection_recommendation`,
  ADD COLUMN `analysis_updated_at` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '分析投影更新时间（Unix 时间戳），0表示暂无分析' AFTER `latest_analysis_task_id`,
  DROP INDEX `idx_site_exploration_team_site_updated`,
  DROP INDEX `idx_site_exploration_project`;
