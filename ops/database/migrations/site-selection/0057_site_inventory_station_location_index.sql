ALTER TABLE site_inventory_station
  DROP INDEX idx_county_district,
  ADD KEY idx_latitude_longitude (latitude, longitude);
