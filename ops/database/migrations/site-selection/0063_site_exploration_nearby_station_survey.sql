UPDATE `site_exploration_site`
SET `nearby_truck_charging_stations` = JSON_SET(
  `nearby_truck_charging_stations`,
  '$[0].surveyScale', '',
  '$[0].surveyModelQuantity', '',
  '$[0].surveyUtilizationRate', '',
  '$[0].surveyElectricityPrice', ''
)
WHERE JSON_LENGTH(`nearby_truck_charging_stations`) > 0;

UPDATE `site_exploration_site`
SET `nearby_truck_charging_stations` = JSON_SET(
  `nearby_truck_charging_stations`,
  '$[1].surveyScale', '',
  '$[1].surveyModelQuantity', '',
  '$[1].surveyUtilizationRate', '',
  '$[1].surveyElectricityPrice', ''
)
WHERE JSON_LENGTH(`nearby_truck_charging_stations`) > 1;

UPDATE `site_exploration_site`
SET `nearby_truck_charging_stations` = JSON_SET(
  `nearby_truck_charging_stations`,
  '$[2].surveyScale', '',
  '$[2].surveyModelQuantity', '',
  '$[2].surveyUtilizationRate', '',
  '$[2].surveyElectricityPrice', ''
)
WHERE JSON_LENGTH(`nearby_truck_charging_stations`) > 2;

UPDATE `site_exploration_site`
SET `nearby_truck_charging_stations` = JSON_SET(
  `nearby_truck_charging_stations`,
  '$[3].surveyScale', '',
  '$[3].surveyModelQuantity', '',
  '$[3].surveyUtilizationRate', '',
  '$[3].surveyElectricityPrice', ''
)
WHERE JSON_LENGTH(`nearby_truck_charging_stations`) > 3;

UPDATE `site_exploration_site`
SET `nearby_truck_charging_stations` = JSON_SET(
  `nearby_truck_charging_stations`,
  '$[4].surveyScale', '',
  '$[4].surveyModelQuantity', '',
  '$[4].surveyUtilizationRate', '',
  '$[4].surveyElectricityPrice', ''
)
WHERE JSON_LENGTH(`nearby_truck_charging_stations`) > 4;

UPDATE `site_exploration_site`
SET `nearby_truck_charging_stations` = JSON_SET(
  `nearby_truck_charging_stations`,
  '$[5].surveyScale', '',
  '$[5].surveyModelQuantity', '',
  '$[5].surveyUtilizationRate', '',
  '$[5].surveyElectricityPrice', ''
)
WHERE JSON_LENGTH(`nearby_truck_charging_stations`) > 5;

UPDATE `site_exploration_site`
SET `nearby_truck_charging_stations` = JSON_SET(
  `nearby_truck_charging_stations`,
  '$[6].surveyScale', '',
  '$[6].surveyModelQuantity', '',
  '$[6].surveyUtilizationRate', '',
  '$[6].surveyElectricityPrice', ''
)
WHERE JSON_LENGTH(`nearby_truck_charging_stations`) > 6;

UPDATE `site_exploration_site`
SET `nearby_truck_charging_stations` = JSON_SET(
  `nearby_truck_charging_stations`,
  '$[7].surveyScale', '',
  '$[7].surveyModelQuantity', '',
  '$[7].surveyUtilizationRate', '',
  '$[7].surveyElectricityPrice', ''
)
WHERE JSON_LENGTH(`nearby_truck_charging_stations`) > 7;

UPDATE `site_exploration_site`
SET `nearby_truck_charging_stations` = JSON_SET(
  `nearby_truck_charging_stations`,
  '$[8].surveyScale', '',
  '$[8].surveyModelQuantity', '',
  '$[8].surveyUtilizationRate', '',
  '$[8].surveyElectricityPrice', ''
)
WHERE JSON_LENGTH(`nearby_truck_charging_stations`) > 8;

UPDATE `site_exploration_site`
SET `nearby_truck_charging_stations` = JSON_SET(
  `nearby_truck_charging_stations`,
  '$[9].surveyScale', '',
  '$[9].surveyModelQuantity', '',
  '$[9].surveyUtilizationRate', '',
  '$[9].surveyElectricityPrice', ''
)
WHERE JSON_LENGTH(`nearby_truck_charging_stations`) > 9;

UPDATE `site_exploration_site`
SET `nearby_truck_charging_stations` = JSON_SET(
  `nearby_truck_charging_stations`,
  '$[10].surveyScale', '',
  '$[10].surveyModelQuantity', '',
  '$[10].surveyUtilizationRate', '',
  '$[10].surveyElectricityPrice', ''
)
WHERE JSON_LENGTH(`nearby_truck_charging_stations`) > 10;

UPDATE `site_exploration_site`
SET `nearby_truck_charging_stations` = JSON_SET(
  `nearby_truck_charging_stations`,
  '$[11].surveyScale', '',
  '$[11].surveyModelQuantity', '',
  '$[11].surveyUtilizationRate', '',
  '$[11].surveyElectricityPrice', ''
)
WHERE JSON_LENGTH(`nearby_truck_charging_stations`) > 11;

UPDATE `site_exploration_site`
SET `nearby_truck_charging_stations` = JSON_SET(
  `nearby_truck_charging_stations`,
  '$[12].surveyScale', '',
  '$[12].surveyModelQuantity', '',
  '$[12].surveyUtilizationRate', '',
  '$[12].surveyElectricityPrice', ''
)
WHERE JSON_LENGTH(`nearby_truck_charging_stations`) > 12;

UPDATE `site_exploration_site`
SET `nearby_truck_charging_stations` = JSON_SET(
  `nearby_truck_charging_stations`,
  '$[13].surveyScale', '',
  '$[13].surveyModelQuantity', '',
  '$[13].surveyUtilizationRate', '',
  '$[13].surveyElectricityPrice', ''
)
WHERE JSON_LENGTH(`nearby_truck_charging_stations`) > 13;

UPDATE `site_exploration_site`
SET `nearby_truck_charging_stations` = JSON_SET(
  `nearby_truck_charging_stations`,
  '$[14].surveyScale', '',
  '$[14].surveyModelQuantity', '',
  '$[14].surveyUtilizationRate', '',
  '$[14].surveyElectricityPrice', ''
)
WHERE JSON_LENGTH(`nearby_truck_charging_stations`) > 14;

UPDATE `site_exploration_site`
SET `nearby_truck_charging_stations` = JSON_SET(
  `nearby_truck_charging_stations`,
  '$[15].surveyScale', '',
  '$[15].surveyModelQuantity', '',
  '$[15].surveyUtilizationRate', '',
  '$[15].surveyElectricityPrice', ''
)
WHERE JSON_LENGTH(`nearby_truck_charging_stations`) > 15;

UPDATE `site_exploration_site`
SET `nearby_truck_charging_stations` = JSON_SET(
  `nearby_truck_charging_stations`,
  '$[16].surveyScale', '',
  '$[16].surveyModelQuantity', '',
  '$[16].surveyUtilizationRate', '',
  '$[16].surveyElectricityPrice', ''
)
WHERE JSON_LENGTH(`nearby_truck_charging_stations`) > 16;

UPDATE `site_exploration_site`
SET `nearby_truck_charging_stations` = JSON_SET(
  `nearby_truck_charging_stations`,
  '$[17].surveyScale', '',
  '$[17].surveyModelQuantity', '',
  '$[17].surveyUtilizationRate', '',
  '$[17].surveyElectricityPrice', ''
)
WHERE JSON_LENGTH(`nearby_truck_charging_stations`) > 17;

UPDATE `site_exploration_site`
SET `nearby_truck_charging_stations` = JSON_SET(
  `nearby_truck_charging_stations`,
  '$[18].surveyScale', '',
  '$[18].surveyModelQuantity', '',
  '$[18].surveyUtilizationRate', '',
  '$[18].surveyElectricityPrice', ''
)
WHERE JSON_LENGTH(`nearby_truck_charging_stations`) > 18;

UPDATE `site_exploration_site`
SET `nearby_truck_charging_stations` = JSON_SET(
  `nearby_truck_charging_stations`,
  '$[19].surveyScale', '',
  '$[19].surveyModelQuantity', '',
  '$[19].surveyUtilizationRate', '',
  '$[19].surveyElectricityPrice', ''
)
WHERE JSON_LENGTH(`nearby_truck_charging_stations`) > 19;
