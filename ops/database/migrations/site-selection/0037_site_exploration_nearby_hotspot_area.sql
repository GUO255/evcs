ALTER TABLE `site_exploration_site`
  ADD COLUMN `nearby_hotspot_areas` JSON NOT NULL DEFAULT (JSON_ARRAY()) COMMENT '十公里内热点区域序号名称及类型JSON数组'
  AFTER `nearby_truck_charging_station_snapshot`,
  ADD COLUMN `nearby_hotspot_area_snapshot` MEDIUMTEXT NOT NULL DEFAULT ('') COMMENT '十公里内热点区域地图截图元数据JSON'
  AFTER `nearby_hotspot_areas`;

UPDATE `site_exploration_site`
SET `status` = CASE
  WHEN `status` IN (5, 6, 7) THEN `status`
  WHEN `site_boundary_geo_json` = '' THEN 1
  WHEN (
    (TRIM(`location_address`) <> '' AND `location_snapshot` <> '')
    + (TRIM(`project_name`) <> '')
    + (TRIM(`contact_name`) <> '' AND `contact_phone_encrypted` <> '')
    + (`site_boundary_snapshot` <> '' AND `site_area_square_meters` > 0)
    + (`highway_distance_geo_json` <> '' AND `highway_distance_snapshot` <> '' AND `highway_distance_meters` > 0)
    + (`arterial_road_distance_geo_json` <> '' AND `arterial_road_distance_snapshot` <> '' AND `arterial_road_distance_meters` > 0)
    + (TRIM(`transport_capacity_description`) <> '')
    + (`access_convenience` <> 0)
    + (`land_qualified` = 0 OR (`land_type` <> 0 AND (`land_type` <> 4 OR TRIM(`land_type_description`) <> '')))
    + (JSON_LENGTH(`land_scene_images`) > 0)
    + 1
    + (`ground_hardening` <> 0)
    + (`terrain_condition` <> 0)
    + (TRIM(`capacity_description`) <> '')
    + (`nearby_truck_charging_station_snapshot` <> '')
    + (`nearby_hotspot_area_snapshot` <> '')
    + (`cooperation_mode` <> 0 AND TRIM(`cooperation_terms`) <> '')
    + (`site_maturity` <> 0)
    + (TRIM(`important_notes`) <> '')
  ) = 19 THEN CASE WHEN `status` = 4 THEN 4 ELSE 3 END
  ELSE 1
END;
