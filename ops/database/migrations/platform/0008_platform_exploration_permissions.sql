INSERT INTO `platform_role_permission` (`role_id`, `permission_code`, `created_at`)
SELECT `legacy`.`role_id`, 'site-planning.exploration.use', MIN(`legacy`.`created_at`)
FROM `platform_role_permission` AS `legacy`
WHERE `legacy`.`permission_code` IN (
  'site-planning.exploration-sites.manage',
  'site-planning.inventory-stations.manage',
  'site-planning.map.manage'
)
GROUP BY `legacy`.`role_id`;

INSERT INTO `platform_role_permission` (`role_id`, `permission_code`, `created_at`)
SELECT `legacy`.`role_id`, 'site-planning.exploration.manage', MIN(`legacy`.`created_at`)
FROM `platform_role_permission` AS `legacy`
WHERE `legacy`.`permission_code` IN (
  'site-planning.exploration-teams.manage',
  'site-planning.exploration-administrators.manage'
)
GROUP BY `legacy`.`role_id`;

DELETE FROM `platform_role_permission`
WHERE `permission_code` IN (
  'site-planning.exploration-sites.manage',
  'site-planning.inventory-stations.manage',
  'site-planning.map.manage',
  'site-planning.exploration-teams.manage',
  'site-planning.exploration-administrators.manage'
);
