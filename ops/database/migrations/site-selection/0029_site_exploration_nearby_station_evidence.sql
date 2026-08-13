ALTER TABLE `site_exploration_site`
  ADD COLUMN `nearby_truck_charging_stations` JSON NOT NULL DEFAULT (JSON_ARRAY()) COMMENT '五公里内重卡充电站序号与名称JSON数组'
  AFTER `nearby_truck_charging_station_description`,
  ADD COLUMN `nearby_truck_charging_station_snapshot` MEDIUMTEXT NOT NULL DEFAULT ('') COMMENT '五公里内重卡充电站地图截图元数据JSON'
  AFTER `nearby_truck_charging_stations`;
