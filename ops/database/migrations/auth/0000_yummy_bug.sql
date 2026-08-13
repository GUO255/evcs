CREATE TABLE `auth_platform_abuse_counter` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL COMMENT '主键',
	`counter_key` char(64) NOT NULL DEFAULT '' COMMENT '限流维度键（HMAC摘要）',
	`window_started_at` int unsigned NOT NULL DEFAULT 0 COMMENT '窗口开始时间（Unix 时间戳）',
	`window_seconds` int unsigned NOT NULL DEFAULT 0 COMMENT '窗口长度（秒）',
	`request_count` int unsigned NOT NULL DEFAULT 0 COMMENT '窗口内请求数',
	`expires_at` int unsigned NOT NULL DEFAULT 0 COMMENT '过期时间（Unix 时间戳）',
	`created_at` int unsigned NOT NULL DEFAULT 0 COMMENT '创建时间（Unix 时间戳）',
	`updated_at` int unsigned NOT NULL DEFAULT 0 COMMENT '更新时间（Unix 时间戳）',
	CONSTRAINT `auth_platform_abuse_counter_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_counter_window` UNIQUE(`counter_key`,`window_started_at`,`window_seconds`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Platform authentication abuse counter';

CREATE TABLE `auth_platform_account` (
	`id` varchar(36) NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` timestamp(3),
	`refresh_token_expires_at` timestamp(3),
	`scope` text,
	`password` text,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `auth_platform_account_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Better Auth Platform account';

CREATE TABLE `auth_platform_audit_event` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL COMMENT '主键',
	`event_id` char(36) NOT NULL DEFAULT '' COMMENT '审计事件唯一标识',
	`domain` varchar(32) NOT NULL DEFAULT 'platform' COMMENT '认证域',
	`actor_type` varchar(32) NOT NULL DEFAULT '' COMMENT '操作者类型',
	`actor_id` varchar(128) NOT NULL DEFAULT '' COMMENT '操作者标识',
	`action` varchar(64) NOT NULL DEFAULT '' COMMENT '审计动作',
	`target_type` varchar(32) NOT NULL DEFAULT '' COMMENT '目标类型',
	`target_id` varchar(128) NOT NULL DEFAULT '' COMMENT '目标标识',
	`result` varchar(32) NOT NULL DEFAULT '' COMMENT '动作结果',
	`request_id` char(36) NOT NULL DEFAULT '' COMMENT '请求唯一标识',
	`metadata_json` varchar(2048) NOT NULL DEFAULT '{}' COMMENT '非敏感元数据JSON',
	`occurred_at` int unsigned NOT NULL DEFAULT 0 COMMENT '事件发生时间（Unix 时间戳）',
	`created_at` int unsigned NOT NULL DEFAULT 0 COMMENT '创建时间（Unix 时间戳）',
	`updated_at` int unsigned NOT NULL DEFAULT 0 COMMENT '更新时间（Unix 时间戳，追加后不变）',
	CONSTRAINT `auth_platform_audit_event_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_event_id` UNIQUE(`event_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Append-only Platform authentication audit event';

CREATE TABLE `auth_platform_jwks` (
	`id` varchar(36) NOT NULL,
	`public_key` text NOT NULL,
	`private_key` text NOT NULL,
	`created_at` timestamp(3) NOT NULL,
	`expires_at` timestamp(3),
	CONSTRAINT `auth_platform_jwks_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Better Auth encrypted Platform signing keys';

CREATE TABLE `auth_platform_oauth_access_token` (
	`id` varchar(36) NOT NULL,
	`token` varchar(255) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`session_id` varchar(36),
	`user_id` varchar(36),
	`reference_id` text,
	`refresh_id` varchar(36),
	`expires_at` timestamp(3) NOT NULL,
	`created_at` timestamp(3) NOT NULL,
	`scopes` text NOT NULL,
	CONSTRAINT `auth_platform_oauth_access_token_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_platform_oauth_access_token_token_unique` UNIQUE(`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Better Auth Platform OAuth access token';

CREATE TABLE `auth_platform_oauth_client` (
	`id` varchar(36) NOT NULL,
	`client_id` varchar(255) NOT NULL,
	`client_secret` text,
	`disabled` boolean DEFAULT false,
	`skip_consent` boolean,
	`enable_end_session` boolean,
	`subject_type` text,
	`scopes` text,
	`user_id` varchar(36),
	`created_at` timestamp(3),
	`updated_at` timestamp(3),
	`name` text,
	`uri` text,
	`icon` text,
	`contacts` text,
	`tos` text,
	`policy` text,
	`software_id` text,
	`software_version` text,
	`software_statement` text,
	`redirect_uris` text NOT NULL,
	`post_logout_redirect_uris` text,
	`token_endpoint_auth_method` text,
	`grant_types` text,
	`response_types` text,
	`public` boolean,
	`type` text,
	`require_pkce` boolean,
	`reference_id` text,
	`metadata` json,
	CONSTRAINT `auth_platform_oauth_client_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_platform_oauth_client_client_id_unique` UNIQUE(`client_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Better Auth Platform OAuth client';

CREATE TABLE `auth_platform_oauth_consent` (
	`id` varchar(36) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`user_id` varchar(36),
	`reference_id` text,
	`scopes` text NOT NULL,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `auth_platform_oauth_consent_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Better Auth Platform OAuth consent';

CREATE TABLE `auth_platform_oauth_refresh_token` (
	`id` varchar(36) NOT NULL,
	`token` varchar(255) NOT NULL,
	`client_id` varchar(36) NOT NULL,
	`session_id` varchar(36),
	`user_id` varchar(36) NOT NULL,
	`reference_id` text,
	`expires_at` timestamp(3) NOT NULL,
	`created_at` timestamp(3) NOT NULL,
	`revoked` timestamp(3),
	`auth_time` timestamp(3),
	`scopes` text NOT NULL,
	CONSTRAINT `auth_platform_oauth_refresh_token_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_platform_oauth_refresh_token_token_unique` UNIQUE(`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Better Auth Platform OAuth refresh token';

CREATE TABLE `auth_platform_provisioning_request` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL COMMENT '主键',
	`idempotency_key` char(64) NOT NULL DEFAULT '' COMMENT '幂等键（HMAC摘要）',
	`request_fingerprint` char(64) NOT NULL DEFAULT '' COMMENT '请求指纹（HMAC摘要）',
	`account_key` char(64) NOT NULL DEFAULT '' COMMENT '账户并发键（HMAC摘要）',
	`state` tinyint unsigned NOT NULL DEFAULT 0 COMMENT '状态：0处理中 1已完成 2失败',
	`auth_user_id` varchar(36) NOT NULL DEFAULT '' COMMENT 'Better Auth用户标识',
	`result_code` varchar(64) NOT NULL DEFAULT '' COMMENT '处理结果码',
	`error_code` varchar(64) NOT NULL DEFAULT '' COMMENT '错误码',
	`processing_expires_at` int unsigned NOT NULL DEFAULT 0 COMMENT '处理租约过期时间（Unix 时间戳）',
	`completed_at` int unsigned NOT NULL DEFAULT 0 COMMENT '完成时间（Unix 时间戳）',
	`created_at` int unsigned NOT NULL DEFAULT 0 COMMENT '创建时间（Unix 时间戳）',
	`updated_at` int unsigned NOT NULL DEFAULT 0 COMMENT '更新时间（Unix 时间戳）',
	CONSTRAINT `auth_platform_provisioning_request_id` PRIMARY KEY(`id`),
	CONSTRAINT `uk_idempotency_key` UNIQUE(`idempotency_key`),
	CONSTRAINT `uk_account_key` UNIQUE(`account_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Idempotent Platform account provisioning request';

CREATE TABLE `auth_platform_session` (
	`id` varchar(36) NOT NULL,
	`expires_at` timestamp(3) NOT NULL,
	`token` varchar(255) NOT NULL,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` varchar(36) NOT NULL,
	`impersonated_by` text,
	CONSTRAINT `auth_platform_session_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_platform_session_token_unique` UNIQUE(`token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Better Auth Platform session';

CREATE TABLE `auth_platform_user` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`image` text,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	`phone_number` varchar(255),
	`phone_number_verified` boolean,
	`role` text,
	`banned` boolean DEFAULT false,
	`ban_reason` text,
	`ban_expires` timestamp(3),
	CONSTRAINT `auth_platform_user_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_platform_user_email_unique` UNIQUE(`email`),
	CONSTRAINT `auth_platform_user_phone_number_unique` UNIQUE(`phone_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Better Auth Platform user';

CREATE TABLE `auth_platform_verification` (
	`id` varchar(36) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`expires_at` timestamp(3) NOT NULL,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `auth_platform_verification_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Better Auth Platform verification value';

CREATE INDEX `idx_expires_at` ON `auth_platform_abuse_counter` (`expires_at`);
CREATE INDEX `auth_platform_account_userId_idx` ON `auth_platform_account` (`user_id`);
CREATE INDEX `idx_domain_occurred_at` ON `auth_platform_audit_event` (`domain`,`occurred_at`);
CREATE INDEX `idx_target_occurred_at` ON `auth_platform_audit_event` (`target_type`,`target_id`,`occurred_at`);
CREATE INDEX `idx_request_id` ON `auth_platform_audit_event` (`request_id`);
CREATE INDEX `auth_platform_oauth_access_token_clientId_idx` ON `auth_platform_oauth_access_token` (`client_id`);
CREATE INDEX `auth_platform_oauth_access_token_sessionId_idx` ON `auth_platform_oauth_access_token` (`session_id`);
CREATE INDEX `auth_platform_oauth_access_token_userId_idx` ON `auth_platform_oauth_access_token` (`user_id`);
CREATE INDEX `auth_platform_oauth_access_token_refreshId_idx` ON `auth_platform_oauth_access_token` (`refresh_id`);
CREATE INDEX `auth_platform_oauth_client_userId_idx` ON `auth_platform_oauth_client` (`user_id`);
CREATE INDEX `auth_platform_oauth_consent_clientId_idx` ON `auth_platform_oauth_consent` (`client_id`);
CREATE INDEX `auth_platform_oauth_consent_userId_idx` ON `auth_platform_oauth_consent` (`user_id`);
CREATE INDEX `auth_platform_oauth_refresh_token_clientId_idx` ON `auth_platform_oauth_refresh_token` (`client_id`);
CREATE INDEX `auth_platform_oauth_refresh_token_sessionId_idx` ON `auth_platform_oauth_refresh_token` (`session_id`);
CREATE INDEX `auth_platform_oauth_refresh_token_userId_idx` ON `auth_platform_oauth_refresh_token` (`user_id`);
CREATE INDEX `idx_state_processing_expires_at` ON `auth_platform_provisioning_request` (`state`,`processing_expires_at`);
CREATE INDEX `auth_platform_session_userId_idx` ON `auth_platform_session` (`user_id`);
CREATE INDEX `auth_platform_verification_identifier_idx` ON `auth_platform_verification` (`identifier`);
