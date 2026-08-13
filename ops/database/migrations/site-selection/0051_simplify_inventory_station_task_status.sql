UPDATE site_inventory_station
SET status = CASE WHEN status = 0 THEN 0 ELSE 1 END;

ALTER TABLE site_inventory_station
  MODIFY COLUMN status TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '任务状态：0未完成 1已完成',
  ADD CONSTRAINT chk_site_inventory_station_task_status CHECK (status IN (0, 1));
