ALTER TABLE `site_exploration_site`
  ADD COLUMN `nearby_task_stations` JSON NOT NULL DEFAULT (JSON_ARRAY()) COMMENT '五公里内任务站点业务快照JSON数组'
  AFTER `nearby_truck_charging_station_snapshot`,
  ADD COLUMN `nearby_task_station_snapshot` MEDIUMTEXT NOT NULL DEFAULT ('') COMMENT '五公里内任务站点地图截图元数据JSON'
  AFTER `nearby_task_stations`;
