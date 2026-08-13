ALTER TABLE `site_exploration_site`
  ADD COLUMN `contract_date` CHAR(10) NOT NULL DEFAULT '' COMMENT '签约业务日期，格式YYYY-MM-DD'
  AFTER `important_notes`;
