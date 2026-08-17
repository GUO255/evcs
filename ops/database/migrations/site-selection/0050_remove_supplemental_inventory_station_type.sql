ALTER TABLE site_inventory_station
  MODIFY COLUMN site_type TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '站点类型：1规划点位 2原规划调整点位',
  ADD CONSTRAINT chk_site_inventory_station_site_type CHECK (site_type IN (1, 2));
