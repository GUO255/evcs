ALTER TABLE `site_exploration_site`
  ADD COLUMN `site_boundary_snapshot` VARCHAR(2048) NOT NULL DEFAULT '' COMMENT '场站边界测绘截图元数据JSON'
  AFTER `site_boundary_geo_json`;
