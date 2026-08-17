ALTER TABLE `site_exploration_site`
  ADD COLUMN `highway_distance_geo_json` MEDIUMTEXT NOT NULL DEFAULT ('') COMMENT '高速口测距路线GeoJSON LineString Feature数据'
  AFTER `highway_distance_meters`,
  ADD COLUMN `highway_distance_snapshot` VARCHAR(2048) NOT NULL DEFAULT '' COMMENT '高速口测距截图元数据JSON'
  AFTER `highway_distance_geo_json`,
  ADD COLUMN `arterial_road_distance_geo_json` MEDIUMTEXT NOT NULL DEFAULT ('') COMMENT '国省主干道测距路线GeoJSON LineString Feature数据'
  AFTER `arterial_road_distance_meters`,
  ADD COLUMN `arterial_road_distance_snapshot` VARCHAR(2048) NOT NULL DEFAULT '' COMMENT '国省主干道测距截图元数据JSON'
  AFTER `arterial_road_distance_geo_json`;
