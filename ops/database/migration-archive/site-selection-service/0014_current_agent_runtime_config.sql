DELETE stale
FROM agent_runtime_config AS stale
INNER JOIN agent_runtime_config AS current
  ON current.workflow_code = stale.workflow_code
  AND current.step_order = stale.step_order
  AND (
    current.updated_at > stale.updated_at
    OR (current.updated_at = stale.updated_at AND current.id > stale.id)
  );

UPDATE agent_runtime_config
SET status = 1;

ALTER TABLE agent_runtime_config
  DROP INDEX uk_runtime_workflow_step_version,
  ADD UNIQUE KEY uk_runtime_workflow_step (workflow_code, step_order);
