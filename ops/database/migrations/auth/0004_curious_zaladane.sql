CREATE TABLE `auth_platform_sms_outbox` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL COMMENT '主键',
	`message_id` char(36) NOT NULL DEFAULT '' COMMENT '消息唯一标识',
	`payload_nonce` varchar(32) NOT NULL DEFAULT '' COMMENT 'AES-GCM 随机数（Base64URL）',
	`payload_ciphertext` varchar(256) NOT NULL DEFAULT '' COMMENT '加密短信载荷（Base64URL）',
	`payload_auth_tag` varchar(32) NOT NULL DEFAULT '' COMMENT 'AES-GCM 认证标签（Base64URL）',
	`status` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '状态：0待投递 1处理中 2成功 3终止失败 4已被新挑战取代 5投递结果未知待人工核对',
	`attempts` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '投递失败次数',
	`available_at` int unsigned NOT NULL DEFAULT 0 COMMENT '下次可投递时间（Unix 时间戳）',
	`expires_at` int unsigned NOT NULL DEFAULT 0 COMMENT '短信失效时间（Unix 时间戳）',
	`lease_expires_at` int unsigned NOT NULL DEFAULT 0 COMMENT '处理租约过期时间（Unix 时间戳）',
	`lock_token` char(36) NOT NULL DEFAULT '' COMMENT '处理实例租约标识',
	`delivered_at` int unsigned NOT NULL DEFAULT 0 COMMENT '投递成功时间（Unix 时间戳）',
	`last_error_code` varchar(64) NOT NULL DEFAULT '' COMMENT '最近一次脱敏错误类型',
	`created_at` int unsigned NOT NULL DEFAULT 0 COMMENT '创建时间（Unix 时间戳）',
	`updated_at` int unsigned NOT NULL DEFAULT 0 COMMENT '更新时间（Unix 时间戳）',
	CONSTRAINT `auth_platform_sms_outbox_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_sms_outbox_message_id` UNIQUE(`message_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Platform 短信事务发件箱';

CREATE INDEX `idx_sms_outbox_delivery` ON `auth_platform_sms_outbox` (`status`,`available_at`,`lease_expires_at`);
CREATE INDEX `idx_sms_outbox_retention` ON `auth_platform_sms_outbox` (`status`,`updated_at`);
