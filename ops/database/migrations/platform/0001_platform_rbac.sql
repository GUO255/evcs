CREATE TABLE `platform_role` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `name` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '角色名称',
  `description` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '角色说明',
  `built_in` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '是否为受保护内置角色：1是 0否',
  `created_at` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '创建时间（Unix 时间戳）',
  `updated_at` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '更新时间（Unix 时间戳）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_platform_role_name` (`name`),
  KEY `idx_platform_role_built_in_id` (`built_in`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='平台业务角色';

CREATE TABLE `platform_member` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `auth_user_id` VARCHAR(36) NOT NULL DEFAULT '' COMMENT '认证域用户唯一标识',
  `real_name` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '真实姓名',
  `phone_number` VARCHAR(32) NOT NULL DEFAULT '' COMMENT '归一化手机号',
  `email` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '电子邮箱',
  `status` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '成员状态：1启用 0停用',
  `protected_member` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '是否为受保护成员：1是 0否',
  `created_at` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '创建时间（Unix 时间戳）',
  `updated_at` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '更新时间（Unix 时间戳）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_platform_member_auth_user` (`auth_user_id`),
  UNIQUE KEY `uk_platform_member_phone` (`phone_number`),
  UNIQUE KEY `uk_platform_member_email` (`email`),
  KEY `idx_platform_member_status_id` (`status`, `id`),
  KEY `idx_platform_member_real_name_id` (`real_name`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='平台业务成员';

CREATE TABLE `platform_role_permission` (
  `role_id` BIGINT UNSIGNED NOT NULL COMMENT '角色主键',
  `permission_code` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '固定权限代码',
  `created_at` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '创建时间（Unix 时间戳）',
  PRIMARY KEY (`role_id`, `permission_code`),
  KEY `idx_platform_permission_role` (`permission_code`, `role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='平台角色权限映射';

CREATE TABLE `platform_member_role` (
  `member_id` BIGINT UNSIGNED NOT NULL COMMENT '成员主键',
  `role_id` BIGINT UNSIGNED NOT NULL COMMENT '角色主键',
  `member_status` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '成员状态冗余索引值：1启用 0停用',
  `created_at` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '创建时间（Unix 时间戳）',
  PRIMARY KEY (`member_id`, `role_id`),
  KEY `idx_platform_role_member` (`role_id`, `member_id`),
  KEY `idx_platform_role_status_member` (`role_id`, `member_status`, `member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='平台成员角色映射';

CREATE TABLE `platform_authorization_audit_event` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `event_id` CHAR(36) NOT NULL DEFAULT '' COMMENT '审计事件唯一标识',
  `actor_auth_user_id` VARCHAR(36) NOT NULL DEFAULT '' COMMENT '操作者认证域用户唯一标识',
  `action` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '授权动作',
  `target_type` VARCHAR(32) NOT NULL DEFAULT '' COMMENT '目标类型',
  `target_id` VARCHAR(128) NOT NULL DEFAULT '' COMMENT '目标标识',
  `result` VARCHAR(32) NOT NULL DEFAULT '' COMMENT '动作结果',
  `metadata_json` VARCHAR(2048) NOT NULL DEFAULT '{}' COMMENT '非敏感有界元数据JSON',
  `request_id` CHAR(36) NOT NULL DEFAULT '' COMMENT '请求唯一标识',
  `occurred_at` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '事件发生时间（Unix 时间戳）',
  `created_at` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '创建时间（Unix 时间戳）',
  `updated_at` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '更新时间（Unix 时间戳，追加后不变）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_platform_authorization_event_id` (`event_id`),
  KEY `idx_platform_authorization_actor_occurred_id` (`actor_auth_user_id`, `occurred_at`, `id`),
  KEY `idx_platform_authorization_target_occurred_id` (`target_type`, `target_id`, `occurred_at`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='平台业务授权追加式审计事件';

INSERT INTO `platform_role` (`id`, `name`, `description`, `built_in`, `created_at`, `updated_at`) VALUES
  (1, 'platform-super-admin', '拥有平台全部业务权限', 1, 0, 0),
  (2, '运营', '负责用户、场站、活动和投诉建议运营', 0, 0, 0),
  (3, '运维', '负责视频监控、设备告警和维修工单', 0, 0, 0),
  (4, '财务', '负责财务数据查看、审核和商户结算', 0, 0, 0);

INSERT INTO `platform_role_permission` (`role_id`, `permission_code`, `created_at`) VALUES
  (1, 'merchants.view', 0),
  (1, 'merchants.manage', 0),
  (1, 'customers.view', 0),
  (1, 'customers.manage', 0),
  (1, 'members.view', 0),
  (1, 'members.manage', 0),
  (1, 'stations.view', 0),
  (1, 'stations.manage', 0),
  (1, 'campaigns.manage', 0),
  (1, 'feedback.manage', 0),
  (1, 'monitoring.view', 0),
  (1, 'maintenance.manage', 0),
  (1, 'finance.view', 0),
  (1, 'finance.manage', 0),
  (1, 'platform-users.manage', 0),
  (1, 'roles.manage', 0),
  (2, 'merchants.view', 0),
  (2, 'customers.view', 0),
  (2, 'members.view', 0),
  (2, 'members.manage', 0),
  (2, 'stations.view', 0),
  (2, 'campaigns.manage', 0),
  (2, 'feedback.manage', 0),
  (3, 'stations.view', 0),
  (3, 'monitoring.view', 0),
  (3, 'maintenance.manage', 0),
  (4, 'finance.view', 0),
  (4, 'finance.manage', 0),
  (4, 'customers.view', 0),
  (4, 'merchants.view', 0);

INSERT INTO `platform_member`
  (`auth_user_id`, `real_name`, `phone_number`, `email`, `status`, `protected_member`, `created_at`, `updated_at`)
SELECT
  `owner`.`auth_user_id`,
  LEFT(`user`.`name`, 64),
  COALESCE(`user`.`phone_number`, ''),
  `user`.`email`,
  1,
  1,
  UNIX_TIMESTAMP(`user`.`created_at`),
  UNIX_TIMESTAMP(`user`.`updated_at`)
FROM `auth_platform_owner` AS `owner`
INNER JOIN `auth_platform_user` AS `user` ON `user`.`id` = `owner`.`auth_user_id`
WHERE `owner`.`singleton` = 1;

INSERT INTO `platform_member_role` (`member_id`, `role_id`, `member_status`, `created_at`)
SELECT `id`, 1, `status`, `created_at`
FROM `platform_member`
WHERE `protected_member` = 1;
