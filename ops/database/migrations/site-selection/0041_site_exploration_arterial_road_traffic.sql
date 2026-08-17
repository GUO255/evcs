ALTER TABLE `site_exploration_site`
  ADD COLUMN `arterial_road_traffic_geo_json` MEDIUMTEXT NOT NULL DEFAULT ('') COMMENT '命中国省主干道路段及车流统计GeoJSON'
  AFTER `arterial_road_distance_snapshot`;
