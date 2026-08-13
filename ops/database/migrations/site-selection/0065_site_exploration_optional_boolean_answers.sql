UPDATE `site_exploration_site`
SET `land_qualified` = CASE WHEN `land_qualified` = 0 THEN 2 ELSE `land_qualified` END,
    `has_land_proof` = CASE WHEN `has_land_proof` = 0 THEN 2 ELSE `has_land_proof` END,
    `has_lease_agreement` = CASE WHEN `has_lease_agreement` = 0 THEN 2 ELSE `has_lease_agreement` END,
    `has_other_structures` = CASE WHEN `has_other_structures` = 0 THEN 2 ELSE `has_other_structures` END
WHERE `land_qualified` = 0
   OR `has_land_proof` = 0
   OR `has_lease_agreement` = 0
   OR `has_other_structures` = 0;

ALTER TABLE `site_exploration_site`
  MODIFY COLUMN `land_qualified` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '土地性质是否满足建设要求：0未选择 1是 2否',
  MODIFY COLUMN `has_land_proof` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '是否有土地证明材料：0未选择 1是 2否',
  MODIFY COLUMN `has_lease_agreement` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '是否有土地租赁协议：0未选择 1是 2否',
  MODIFY COLUMN `has_other_structures` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '是否有其他附属物：0未选择 1是 2否';
