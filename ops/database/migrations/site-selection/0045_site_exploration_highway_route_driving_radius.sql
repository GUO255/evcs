CREATE TEMPORARY TABLE `tmp_site_exploration_highway_route_driving_radius` (
  `site_id` BIGINT UNSIGNED NOT NULL PRIMARY KEY
) ENGINE = InnoDB;

INSERT INTO `tmp_site_exploration_highway_route_driving_radius` (`site_id`)
SELECT `id`
FROM `site_exploration_site`
WHERE CAST(JSON_UNQUOTE(JSON_EXTRACT(`highway_routes`, '$[0].drivingDistanceMeters')) AS UNSIGNED) > 5000
  OR CAST(JSON_UNQUOTE(JSON_EXTRACT(`highway_routes`, '$[1].drivingDistanceMeters')) AS UNSIGNED) > 5000
  OR CAST(JSON_UNQUOTE(JSON_EXTRACT(`highway_routes`, '$[2].drivingDistanceMeters')) AS UNSIGNED) > 5000;

UPDATE `site_exploration_site` AS `site`
INNER JOIN `tmp_site_exploration_highway_route_driving_radius` AS `affected`
  ON `affected`.`site_id` = `site`.`id`
SET `highway_routes` = JSON_MERGE_PRESERVE(
  CASE
    WHEN JSON_LENGTH(`highway_routes`) >= 1
      AND CAST(JSON_UNQUOTE(JSON_EXTRACT(`highway_routes`, '$[0].drivingDistanceMeters')) AS UNSIGNED) <= 5000
    THEN JSON_ARRAY(JSON_EXTRACT(`highway_routes`, '$[0]'))
    ELSE JSON_ARRAY()
  END,
  CASE
    WHEN JSON_LENGTH(`highway_routes`) >= 2
      AND CAST(JSON_UNQUOTE(JSON_EXTRACT(`highway_routes`, '$[1].drivingDistanceMeters')) AS UNSIGNED) <= 5000
    THEN JSON_ARRAY(JSON_EXTRACT(`highway_routes`, '$[1]'))
    ELSE JSON_ARRAY()
  END,
  CASE
    WHEN JSON_LENGTH(`highway_routes`) >= 3
      AND CAST(JSON_UNQUOTE(JSON_EXTRACT(`highway_routes`, '$[2].drivingDistanceMeters')) AS UNSIGNED) <= 5000
    THEN JSON_ARRAY(JSON_EXTRACT(`highway_routes`, '$[2]'))
    ELSE JSON_ARRAY()
  END
);

UPDATE `site_exploration_site` AS `site`
INNER JOIN `tmp_site_exploration_highway_route_driving_radius` AS `affected`
  ON `affected`.`site_id` = `site`.`id`
SET
  `highway_distance_meters` = CASE
    WHEN JSON_LENGTH(`highway_routes`) = 0 THEN 5001
    ELSE CAST(JSON_UNQUOTE(JSON_EXTRACT(`highway_routes`, '$[0].drivingDistanceMeters')) AS UNSIGNED)
  END,
  `highway_distance_geo_json` = CASE
    WHEN JSON_LENGTH(`highway_routes`) = 0 THEN ''
    ELSE JSON_UNQUOTE(JSON_EXTRACT(`highway_routes`, '$[0].geoJson'))
  END,
  `highway_distance_snapshot` = CASE
    WHEN JSON_LENGTH(`highway_routes`) = 0 THEN ''
    ELSE `highway_distance_snapshot`
  END,
  `highway_entrance` = CASE
    WHEN JSON_LENGTH(`highway_routes`) = 0 THEN JSON_OBJECT()
    ELSE JSON_OBJECT(
      'poiId', JSON_UNQUOTE(JSON_EXTRACT(`highway_routes`, '$[0].poiId')),
      'name', JSON_UNQUOTE(JSON_EXTRACT(`highway_routes`, '$[0].name')),
      'address', JSON_UNQUOTE(JSON_EXTRACT(`highway_routes`, '$[0].address')),
      'longitude', CAST(JSON_UNQUOTE(JSON_EXTRACT(`highway_routes`, '$[0].longitude')) AS DECIMAL(10, 6)),
      'latitude', CAST(JSON_UNQUOTE(JSON_EXTRACT(`highway_routes`, '$[0].latitude')) AS DECIMAL(10, 6))
    )
  END
;

DROP TEMPORARY TABLE `tmp_site_exploration_highway_route_driving_radius`;
