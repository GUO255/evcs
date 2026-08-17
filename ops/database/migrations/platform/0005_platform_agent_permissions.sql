INSERT INTO `platform_role_permission` (`role_id`, `permission_code`, `created_at`)
SELECT `role`.`id`, `permission`.`permission_code`, 0
FROM `platform_role` AS `role`
INNER JOIN (
  SELECT 'agents.inspection.use' AS `permission_code`
  UNION ALL SELECT 'agents.user-operations.use'
  UNION ALL SELECT 'agents.site-selection.use'
  UNION ALL SELECT 'agents.rate-strategy.use'
  UNION ALL SELECT 'agents.business-analysis.use'
  UNION ALL SELECT 'agents.campaign-operations.use'
  UNION ALL SELECT 'agents.refund-analysis.use'
) AS `permission`
WHERE `role`.`system_key` = 'platform-super-admin'
  AND `role`.`built_in` = 1;
