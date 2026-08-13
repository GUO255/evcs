UPDATE `site_exploration_site`
SET `status` = 1
WHERE `status` = 2;

ALTER TABLE `site_exploration_site`
  MODIFY COLUMN `status` TINYINT UNSIGNED NOT NULL DEFAULT 1
  COMMENT '状态：1待勘探 3勘探完成 4签约完成 5建设中 6建设完成 7运营中';
