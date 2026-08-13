ALTER TABLE `site_exploration_site`
  ADD COLUMN `highway_entrance` JSON NOT NULL DEFAULT (JSON_OBJECT()) COMMENT '高速出入口信息，包含高德POI标识、名称、地址及WGS84经纬度'
  AFTER `highway_distance_snapshot`;
