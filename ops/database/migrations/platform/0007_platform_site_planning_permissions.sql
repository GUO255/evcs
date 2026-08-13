INSERT INTO `platform_role_permission` (`role_id`, `permission_code`, `created_at`)
SELECT `broad_permission`.`role_id`, `split_permission`.`permission_code`, `broad_permission`.`created_at`
FROM (
  SELECT `role_id`, `created_at`
  FROM `platform_role_permission`
  WHERE `permission_code` = 'site-planning.manage'
) AS `broad_permission`
CROSS JOIN (
  SELECT 'site-planning.exploration-sites.manage' AS `permission_code`
  UNION ALL SELECT 'site-planning.inventory-stations.manage'
  UNION ALL SELECT 'site-planning.map.manage'
  UNION ALL SELECT 'site-planning.exploration-teams.manage'
  UNION ALL SELECT 'site-planning.exploration-administrators.manage'
) AS `split_permission`;

DELETE FROM `platform_role_permission`
WHERE `permission_code` = 'site-planning.manage';
