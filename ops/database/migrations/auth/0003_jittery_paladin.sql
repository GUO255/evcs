CREATE TABLE `auth_platform_otp_challenge` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL COMMENT '主键',
	`phone_key` char(64) NOT NULL DEFAULT '' COMMENT '手机号 HMAC 摘要',
	`code_hash` char(64) NOT NULL DEFAULT '' COMMENT '一次性验证码 HMAC 摘要',
	`attempts` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '失败验证次数',
	`expires_at` int unsigned NOT NULL DEFAULT 0 COMMENT '过期时间（Unix 时间戳）',
	`created_at` int unsigned NOT NULL DEFAULT 0 COMMENT '创建时间（Unix 时间戳）',
	`updated_at` int unsigned NOT NULL DEFAULT 0 COMMENT '更新时间（Unix 时间戳）',
	CONSTRAINT `auth_platform_otp_challenge_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_otp_challenge_phone_key` UNIQUE(`phone_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Platform 手机验证码挑战';

CREATE INDEX `idx_otp_challenge_expires_at` ON `auth_platform_otp_challenge` (`expires_at`);
