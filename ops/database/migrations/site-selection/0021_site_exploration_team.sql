CREATE TABLE `site_exploration_team` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `name` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '勘探小组名称',
  `description` VARCHAR(500) NOT NULL DEFAULT '' COMMENT '勘探小组说明',
  `status` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '状态：1启用 2停用',
  `created_by_member_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '创建平台成员主键',
  `updated_by_member_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '最后更新平台成员主键',
  `created_at` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '创建时间（Unix 时间戳）',
  `updated_at` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '更新时间（Unix 时间戳）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_site_exploration_team_name` (`name`),
  KEY `idx_site_exploration_team_updated` (`updated_at`, `id`),
  KEY `idx_site_exploration_team_status_updated` (`status`, `updated_at`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='勘探小组';

CREATE TABLE `site_exploration_team_member` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `team_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '勘探小组主键',
  `platform_member_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '平台成员主键',
  `created_by_member_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '添加操作平台成员主键',
  `created_at` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '加入时间（Unix 时间戳）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_site_exploration_team_member` (`team_id`, `platform_member_id`),
  KEY `idx_site_exploration_team_member_page` (`team_id`, `id`),
  KEY `idx_site_exploration_member_team` (`platform_member_id`, `team_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='勘探小组成员关系';

ALTER TABLE `site_exploration_site`
  ADD COLUMN `exploration_team_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '勘探小组主键，0表示未关联' AFTER `exploration_team`,
  ADD KEY `idx_site_exploration_team_site_updated` (`exploration_team_id`, `updated_at`, `id`);
