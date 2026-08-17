UPDATE `site_exploration_site`
SET `status` = 3
WHERE `status` = 4
  AND `contract_date` = '';
