-- Destructive manual cleanup for the legacy Site Selection analysis subsystem.
-- Back up the database and stop the legacy Site Selection API and the legacy analysis Worker before continuing.
-- Run this script manually before applying Site Selection migration 0030.
-- This operation permanently deletes legacy analysis history; it does not migrate old data.

DELIMITER //

CREATE PROCEDURE `cleanup_legacy_site_analysis_tables`()
BEGIN
  DECLARE lock_acquired INT DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    IF lock_acquired = 1 THEN
      DO RELEASE_LOCK('evcs_schema_migrations');
    END IF;
    RESIGNAL;
  END;

  SELECT GET_LOCK('evcs_schema_migrations', 0) INTO lock_acquired;
  IF lock_acquired IS NULL OR lock_acquired <> 1 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Could not acquire evcs_schema_migrations lock; cleanup aborted';
  END IF;

  DROP TABLE IF EXISTS `agent_execution_payload`;
  DROP TABLE IF EXISTS `agent_execution_log`;
  DROP TABLE IF EXISTS `agent_workflow_run`;
  DROP TABLE IF EXISTS `agent_runtime_config`;
  DROP TABLE IF EXISTS `site_analysis_report`;
  DROP TABLE IF EXISTS `site_analysis_evidence`;
  DROP TABLE IF EXISTS `site_analysis_step_result`;
  DROP TABLE IF EXISTS `site_analysis_step`;
  DROP TABLE IF EXISTS `site_analysis_task`;
  DROP TABLE IF EXISTS `source_scan_cursor`;

  DO RELEASE_LOCK('evcs_schema_migrations');
  SET lock_acquired = 0;
END//

DELIMITER ;

CALL `cleanup_legacy_site_analysis_tables`();
DROP PROCEDURE IF EXISTS `cleanup_legacy_site_analysis_tables`;
