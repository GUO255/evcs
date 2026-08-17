ALTER TABLE `site_exploration_site`
  ADD COLUMN `analysis_snapshot_updated_at` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '分析任务输入快照对应的站点更新时间（Unix 时间戳），0表示尚未生成任务' AFTER `analysis_updated_at`,
  DROP INDEX `idx_site_exploration_status_updated`,
  ADD KEY `idx_site_exploration_status_updated` (`status`, `updated_at`, `id`, `analysis_snapshot_updated_at`);

UPDATE `site_exploration_site` AS `site`
LEFT JOIN (
  SELECT
    `task`.`exploration_site_id`,
    MAX(
      CASE
        WHEN JSON_VALID(`task`.`input_snapshot_json`) THEN COALESCE(
          CAST(JSON_UNQUOTE(JSON_EXTRACT(`task`.`input_snapshot_json`, '$.sourceUpdatedAt')) AS UNSIGNED),
          `task`.`created_at`
        )
        ELSE `task`.`created_at`
      END
    ) AS `snapshot_updated_at`
  FROM `site_analysis_task` AS `task`
  GROUP BY `task`.`exploration_site_id`
) AS `latest_task`
  ON `latest_task`.`exploration_site_id` = `site`.`id`
SET `site`.`analysis_snapshot_updated_at` = CASE
  WHEN `latest_task`.`snapshot_updated_at` IS NULL THEN 0
  ELSE LEAST(`site`.`updated_at`, `latest_task`.`snapshot_updated_at`)
END;
