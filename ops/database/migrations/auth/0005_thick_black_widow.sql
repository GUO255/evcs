DROP INDEX `idx_request_id` ON `auth_platform_audit_event`;
ALTER TABLE `auth_platform_audit_event` ADD `operation_id` char(36) DEFAULT '' NOT NULL COMMENT '服务端生成的操作关联标识';
CREATE TEMPORARY TABLE `auth_platform_audit_operation_map` (
  `requested_id` bigint unsigned NOT NULL,
  `terminal_id` bigint unsigned NOT NULL,
  `operation_id` char(36) NOT NULL,
  PRIMARY KEY (`requested_id`), UNIQUE KEY `uk_audit_operation_map_terminal` (`terminal_id`)
) ENGINE=InnoDB;
UPDATE `auth_platform_audit_event` SET `operation_id` = `event_id`;
INSERT INTO `auth_platform_audit_operation_map`
  (`requested_id`, `terminal_id`, `operation_id`)
SELECT `id`, `next_id`, LOWER(UUID()) FROM (
  SELECT `id`, `result`,
    LAG(`result`) OVER stream AS `previous_result`,
    LEAD(`id`) OVER stream AS `next_id`,
    LEAD(`result`) OVER stream AS `next_result`,
    LEAD(`result`, 2) OVER stream AS `after_terminal_result`
  FROM `auth_platform_audit_event`
  WINDOW stream AS (PARTITION BY `request_id`, `action`, `target_type`, `target_id` ORDER BY `id`)
) ordered
WHERE `result` = 'requested'
  AND (`previous_result` IS NULL OR `previous_result` <> 'requested')
  AND `next_result` IN ('succeeded', 'failed')
  AND (`after_terminal_result` IS NULL OR `after_terminal_result` = 'requested');
UPDATE `auth_platform_audit_event` event
INNER JOIN `auth_platform_audit_operation_map` mapping
  ON event.`id` IN (mapping.`requested_id`, mapping.`terminal_id`)
SET event.`operation_id` = mapping.`operation_id`
;
DROP TEMPORARY TABLE `auth_platform_audit_operation_map`;
CREATE INDEX `idx_operation_id` ON `auth_platform_audit_event` (`operation_id`);
