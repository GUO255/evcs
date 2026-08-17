ALTER TABLE `site_map_drawing`
  ADD COLUMN `show_name` TINYINT UNSIGNED NOT NULL DEFAULT 1
    COMMENT '地图是否显示名称：0不显示 1显示'
    AFTER `corridor_type`;
