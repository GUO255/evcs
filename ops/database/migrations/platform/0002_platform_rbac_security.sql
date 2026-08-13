ALTER TABLE `platform_member`
  ADD COLUMN `credentials_valid_after` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '此前签发的访问令牌失效（Unix 秒，停用时设为当前秒+1）' AFTER `protected_member`;

ALTER TABLE `platform_role`
  ADD COLUMN `member_count` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '当前角色分配成员数' AFTER `built_in`;

UPDATE `platform_role` AS `role`
LEFT JOIN (
  SELECT `role_id`, COUNT(*) AS `assignment_count`
  FROM `platform_member_role`
  GROUP BY `role_id`
) AS `assignment` ON `assignment`.`role_id` = `role`.`id`
SET `role`.`member_count` = COALESCE(`assignment`.`assignment_count`, 0);
