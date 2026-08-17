ALTER TABLE `site_exploration_site`
  ADD COLUMN `location_snapshot` VARCHAR(2048) NOT NULL DEFAULT '' COMMENT '项目地理位置地图截图元数据JSON'
  AFTER `latitude`;
