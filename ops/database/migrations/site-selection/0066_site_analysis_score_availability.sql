ALTER TABLE `site_analysis_step`
  ADD COLUMN `score_available` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '步骤评分是否可用：0不可用 1可用' AFTER `score`;

ALTER TABLE `site_analysis_task`
  ADD COLUMN `overall_score_available` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '综合评分是否可用：0不可用 1可用' AFTER `overall_score`;

ALTER TABLE `site_exploration_site`
  ADD COLUMN `overall_score_available` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '最新综合评分是否可用：0不可用 1可用' AFTER `overall_score`;
