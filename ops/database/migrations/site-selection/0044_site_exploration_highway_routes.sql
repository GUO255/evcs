ALTER TABLE `site_exploration_site`
  ADD COLUMN `highway_routes` JSON NOT NULL DEFAULT (JSON_ARRAY()) COMMENT '按直线距离稳定排序的高速出入口驾车路线，最多3条'
  AFTER `highway_entrance`;
