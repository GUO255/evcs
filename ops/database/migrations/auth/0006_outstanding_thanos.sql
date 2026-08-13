CREATE INDEX `idx_sms_outbox_expiry` ON `auth_platform_sms_outbox` (`status`,`expires_at`);
