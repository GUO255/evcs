ALTER TABLE agent_runtime_config
  DROP INDEX uk_agent_provider_model_prompt,
  DROP COLUMN provider,
  DROP COLUMN model,
  ADD COLUMN workflow_code VARCHAR(64) NOT NULL DEFAULT 'site_assessment_mvp' COMMENT '工作流编码' AFTER id,
  ADD COLUMN step_order TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '步骤顺序：1至11' AFTER agent_role,
  ADD COLUMN system_prompt MEDIUMTEXT NOT NULL DEFAULT ('') COMMENT '实际运行的 System Prompt' AFTER prompt_version,
  ADD COLUMN input_description TEXT NOT NULL DEFAULT ('') COMMENT '输入说明，供界面展示' AFTER system_prompt,
  ADD COLUMN output_description TEXT NOT NULL DEFAULT ('') COMMENT '输出说明，供界面展示' AFTER input_description;

DELETE FROM agent_runtime_config;

ALTER TABLE agent_runtime_config
  ADD UNIQUE KEY uk_runtime_workflow_step_version (workflow_code, step_order, prompt_version),
  ADD KEY idx_runtime_latest_enabled (workflow_code, step_order, status, updated_at, id);

ALTER TABLE site_analysis_task
  MODIFY COLUMN current_step_code TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '当前步骤编码：1至11';

ALTER TABLE site_analysis_step
  MODIFY COLUMN step_code TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '步骤编码：1至11';

ALTER TABLE site_analysis_step_result
  MODIFY COLUMN step_code TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '步骤编码：1至11';

ALTER TABLE site_analysis_evidence
  MODIFY COLUMN step_code TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '步骤编码：1至11';

ALTER TABLE agent_execution_log
  MODIFY COLUMN step_code TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '步骤编码：1至11';
