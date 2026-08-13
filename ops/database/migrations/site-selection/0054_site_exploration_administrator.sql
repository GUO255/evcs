CREATE TABLE `site_exploration_administrator` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `platform_member_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '平台成员主键',
  `created_by_member_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '添加操作平台成员主键',
  `created_at` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '创建时间（Unix 时间戳）',
  `updated_at` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '更新时间（Unix 时间戳）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_site_exploration_administrator_member` (`platform_member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='勘探管理员关系';
