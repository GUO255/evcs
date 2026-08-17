ALTER TABLE site_inventory_station
  ADD COLUMN longitude DECIMAL(10, 7) NOT NULL DEFAULT 0 COMMENT '站点经度（WGS84，0表示待定位）' AFTER status_description,
  ADD COLUMN latitude DECIMAL(9, 7) NOT NULL DEFAULT 0 COMMENT '站点纬度（WGS84，0表示待定位）' AFTER longitude;
