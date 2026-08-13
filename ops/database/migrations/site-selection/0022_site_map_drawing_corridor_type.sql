ALTER TABLE `site_map_drawing`
  ADD COLUMN `corridor_type` TINYINT UNSIGNED NOT NULL DEFAULT 0
    COMMENT '线路类型：0历史未分类 1主通道 2次通道 3支线通道'
    AFTER `geo_json`;
