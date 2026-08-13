UPDATE `site_exploration_site`
SET `status` = 5
WHERE `status` = 6;

ALTER TABLE `site_exploration_site`
  MODIFY COLUMN `status` TINYINT UNSIGNED NOT NULL DEFAULT 1
  COMMENT '状态：1待勘探 3勘探完成 4签约完成 5建设中 7运营中';
