UPDATE `site_exploration_site` AS `site`
INNER JOIN (
  SELECT `site_id`
  FROM `site_exploration_attachment`
  WHERE `category` IN (1, 2, 3)
  GROUP BY `site_id`
  HAVING COUNT(DISTINCT `category`) = 3
) AS `completed_contract` ON `completed_contract`.`site_id` = `site`.`id`
SET `site`.`status` = 4
WHERE `site`.`status` = 3;
