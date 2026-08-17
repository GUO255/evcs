UPDATE `site_analysis_step`
SET `score_available` = 1
WHERE `status` = 3;

UPDATE `site_analysis_task`
SET `overall_score_available` = 1
WHERE `status` = 3;

UPDATE `site_exploration_site` AS `site`
JOIN `site_analysis_task` AS `task` ON `task`.`id` = `site`.`latest_analysis_task_id`
SET `site`.`overall_score_available` = 1
WHERE `task`.`status` = 3;
