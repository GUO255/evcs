UPDATE site_inventory_station
SET site_type = 1
WHERE site_type <> 1;

ALTER TABLE site_inventory_station
  DROP CHECK chk_site_inventory_station_site_type,
  MODIFY COLUMN site_type TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '站点类型：1规划点位',
  ADD CONSTRAINT chk_site_inventory_station_site_type CHECK (site_type = 1);
