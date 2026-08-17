ALTER TABLE site_inventory_station
  ADD COLUMN status_description VARCHAR(1000) NOT NULL DEFAULT '' COMMENT '建设状态说明原文' AFTER status,
  MODIFY COLUMN status TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '建设状态：0待确认 1已签约 2已开工 3已完工',
  DROP INDEX uk_sequence_number,
  ADD UNIQUE KEY uk_sequence_number_station_name (sequence_number, station_name);
