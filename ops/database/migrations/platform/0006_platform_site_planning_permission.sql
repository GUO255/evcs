INSERT INTO `platform_role_permission` (`role_id`, `permission_code`, `created_at`)
SELECT `role`.`id`, 'site-planning.manage', 0
FROM `platform_role` AS `role`
WHERE `role`.`system_key` = 'platform-super-admin'
  AND `role`.`built_in` = 1;
