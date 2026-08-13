CREATE TABLE `site_exploration_construction` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `site_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '勘探站点ID',
  `construction_status` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '建设状态：0未设置 1未开工 2建设中 3建设完成',
  `construction_entity` VARCHAR(128) NOT NULL DEFAULT '' COMMENT '建设主体',
  `station_type` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '建站类型',
  `driver_home_provision` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '司机之家配套状态：0未设置 1否 2是',
  `charging_equipment_capacity_kva` DECIMAL(12,2) UNSIGNED NOT NULL DEFAULT 0 COMMENT '充电设备电容量（KVA）',
  `battery_swap_equipment_capacity_kva` DECIMAL(12,2) UNSIGNED NOT NULL DEFAULT 0 COMMENT '换电设备电容量（KVA）',
  `photovoltaic_capacity_kw` DECIMAL(12,2) UNSIGNED NOT NULL DEFAULT 0 COMMENT '光伏规模（KW）',
  `energy_storage_capacity_kwh` DECIMAL(12,2) UNSIGNED NOT NULL DEFAULT 0 COMMENT '储能规模（kWh）',
  `created_at` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '创建时间（Unix 时间戳）',
  `updated_at` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '更新时间（Unix 时间戳）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_site_id` (`site_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='勘探站点建设阶段信息';
