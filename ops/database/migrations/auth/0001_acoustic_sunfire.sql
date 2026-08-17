DROP INDEX `auth_platform_oauth_access_token_sessionId_idx` ON `auth_platform_oauth_access_token`;
ALTER TABLE `auth_platform_oauth_access_token` MODIFY COLUMN `client_id` varchar(255) NOT NULL;
ALTER TABLE `auth_platform_oauth_consent` MODIFY COLUMN `client_id` varchar(255) NOT NULL;
ALTER TABLE `auth_platform_oauth_refresh_token` MODIFY COLUMN `client_id` varchar(255) NOT NULL;
CREATE INDEX `idx_jwks_expires_at` ON `auth_platform_jwks` (`expires_at`);
CREATE INDEX `idx_oauth_access_expires_at` ON `auth_platform_oauth_access_token` (`expires_at`);
CREATE INDEX `idx_oauth_refresh_expires_at` ON `auth_platform_oauth_refresh_token` (`expires_at`);
CREATE INDEX `idx_session_expires_at` ON `auth_platform_session` (`expires_at`);