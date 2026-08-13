ALTER TABLE site_inventory_station
  ADD COLUMN reference_station_id BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '参考任务站点ID，0表示未匹配' AFTER latitude,
  ADD COLUMN reference_station_distance DECIMAL(12, 2) UNSIGNED NOT NULL DEFAULT 0 COMMENT '距参考任务站点的直线距离（米）' AFTER reference_station_id;
