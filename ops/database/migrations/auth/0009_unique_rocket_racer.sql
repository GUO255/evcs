CREATE INDEX `idx_oauth_refresh_auth_time_created_at` ON `auth_platform_oauth_refresh_token` (`auth_time`,`created_at`);
UPDATE `auth_platform_oauth_client`
SET `grant_types` = '["authorization_code","refresh_token"]',
    `scopes` = '["openid","profile","email","platform:read","offline_access"]'
WHERE `client_id` = 'platform-web';
UPDATE `auth_platform_session`
SET `expires_at` = LEAST(`expires_at`, TIMESTAMPADD(SECOND, 2592000, `created_at`))
WHERE `expires_at` > TIMESTAMPADD(SECOND, 2592000, `created_at`);
