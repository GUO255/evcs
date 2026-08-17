ALTER TABLE `site_exploration_site`
  ADD COLUMN `competitors` JSON NOT NULL DEFAULT (JSON_ARRAY()) COMMENT '周边竞争对手调研列表';

UPDATE `site_exploration_site`
SET `competitors` = CASE
  WHEN TRIM(`competitor_two_scale`) <> ''
    OR TRIM(`competitor_two_model_quantity`) <> ''
    OR TRIM(`competitor_two_utilization_rate`) <> ''
    OR TRIM(`competitor_two_electricity_price`) <> ''
  THEN JSON_ARRAY(
    JSON_OBJECT(
      'scale', `competitor_one_scale`,
      'modelQuantity', `competitor_one_model_quantity`,
      'utilizationRate', `competitor_one_utilization_rate`,
      'electricityPrice', `competitor_one_electricity_price`
    ),
    JSON_OBJECT(
      'scale', `competitor_two_scale`,
      'modelQuantity', `competitor_two_model_quantity`,
      'utilizationRate', `competitor_two_utilization_rate`,
      'electricityPrice', `competitor_two_electricity_price`
    )
  )
  ELSE JSON_ARRAY(JSON_OBJECT(
    'scale', `competitor_one_scale`,
    'modelQuantity', `competitor_one_model_quantity`,
    'utilizationRate', `competitor_one_utilization_rate`,
    'electricityPrice', `competitor_one_electricity_price`
  ))
END;

ALTER TABLE `site_exploration_site`
  DROP COLUMN `competitor_one_scale`,
  DROP COLUMN `competitor_one_model_quantity`,
  DROP COLUMN `competitor_one_utilization_rate`,
  DROP COLUMN `competitor_one_electricity_price`,
  DROP COLUMN `competitor_two_scale`,
  DROP COLUMN `competitor_two_model_quantity`,
  DROP COLUMN `competitor_two_utilization_rate`,
  DROP COLUMN `competitor_two_electricity_price`;
