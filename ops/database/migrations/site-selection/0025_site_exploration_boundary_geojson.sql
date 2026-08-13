ALTER TABLE `site_exploration_site`
  ADD COLUMN `site_boundary_geo_json` MEDIUMTEXT NOT NULL DEFAULT ('') COMMENT '场站边界GeoJSON Polygon Feature数据'
  AFTER `site_area_square_meters`;
