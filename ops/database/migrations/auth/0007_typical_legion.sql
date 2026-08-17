ALTER TABLE `auth_platform_otp_challenge` ADD `challenge_id` char(36) DEFAULT '' NOT NULL COMMENT '当前验证码挑战唯一标识';
ALTER TABLE `auth_platform_sms_outbox` ADD `recipient_key` char(64) DEFAULT '' NOT NULL COMMENT '收件人 HMAC 摘要';
ALTER TABLE `auth_platform_sms_outbox` ADD `challenge_id` char(36) DEFAULT '' NOT NULL COMMENT '关联验证码挑战标识';
CREATE INDEX `idx_audit_result_id` ON `auth_platform_audit_event` (`result`,`id`);
CREATE INDEX `idx_sms_outbox_recipient` ON `auth_platform_sms_outbox` (`recipient_key`,`status`);

CREATE TEMPORARY TABLE `auth_platform_audit_operation_repair` (
  `requested_id` bigint unsigned NOT NULL,
  `terminal_id` bigint unsigned NOT NULL,
  `operation_id` char(36) NOT NULL,
  PRIMARY KEY (`requested_id`), UNIQUE KEY `uk_audit_operation_repair_terminal` (`terminal_id`)
) ENGINE=InnoDB;
INSERT INTO `auth_platform_audit_operation_repair`
  (`requested_id`, `terminal_id`, `operation_id`)
SELECT `id`, `next_id`, LOWER(UUID()) FROM (
  SELECT `id`, `result`, `operation_id`, `request_id`,
    LAG(`result`) OVER stream AS `previous_result`,
    LEAD(`id`) OVER stream AS `next_id`,
    LEAD(`result`) OVER stream AS `next_result`,
    LEAD(`result`, 2) OVER stream AS `after_terminal_result`
  FROM `auth_platform_audit_event`
  WINDOW stream AS (PARTITION BY `request_id`, `action`, `target_type`, `target_id` ORDER BY `id`)
) ordered
WHERE `result` = 'requested' AND `operation_id` = `request_id`
  AND (`previous_result` IS NULL OR `previous_result` <> 'requested')
  AND `next_result` IN ('succeeded', 'failed')
  AND (`after_terminal_result` IS NULL OR `after_terminal_result` = 'requested');
UPDATE `auth_platform_audit_event` SET `operation_id` = `event_id` WHERE `operation_id` = `request_id`;
UPDATE `auth_platform_audit_event` event
INNER JOIN `auth_platform_audit_operation_repair` repair
  ON event.`id` IN (repair.`requested_id`, repair.`terminal_id`)
SET event.`operation_id` = repair.`operation_id`
;
DROP TEMPORARY TABLE `auth_platform_audit_operation_repair`;
