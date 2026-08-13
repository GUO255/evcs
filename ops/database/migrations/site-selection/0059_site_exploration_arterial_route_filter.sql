ALTER TABLE `site_exploration_site`
  ADD COLUMN `arterial_road_route_ref` VARCHAR(32)
    GENERATED ALWAYS AS (
      CASE
        WHEN JSON_VALID(`arterial_road_traffic_geo_json`)
        THEN NULLIF(JSON_UNQUOTE(JSON_EXTRACT(`arterial_road_traffic_geo_json`, '$.properties.ref')), '')
        ELSE NULL
      END
    ) STORED
    COMMENT '最近国省主干道路线编号，用于列表筛选'
    AFTER `arterial_road_traffic_geo_json`,
  ADD INDEX `idx_site_exploration_route_date_id` (`arterial_road_route_ref`, `exploration_date`, `id`);
