UPDATE `site_exploration_site`
SET `status` = CASE
  WHEN `status` IN (5, 6, 7) THEN `status`
  WHEN `contract_date` <> '' THEN 4
  WHEN `site_boundary_geo_json` <> ''
    AND (
      (TRIM(`location_address`) <> '' AND `location_snapshot` <> '')
      + (TRIM(`project_name`) <> '')
      + (`site_boundary_snapshot` <> '' AND `site_area_square_meters` > 0)
      + ((`highway_distance_geo_json` <> '' AND `highway_distance_snapshot` <> '' AND `highway_distance_meters` > 0)
        OR (`highway_distance_meters` = 5001 AND `highway_distance_geo_json` = '' AND `highway_distance_snapshot` = ''))
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
    ) = 17 THEN 3
  ELSE 1
END
WHERE `status` IN (1, 3, 4);
