CREATE TABLE agent_runtime_config (
  id             BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT COMMENT '主键',
  agent_code     VARCHAR(64)      NOT NULL DEFAULT ''     COMMENT 'Agent 唯一编码',
  agent_name     VARCHAR(128)     NOT NULL DEFAULT ''     COMMENT 'Agent 名称',
  agent_role     TEXT             NOT NULL DEFAULT ('')   COMMENT 'Agent 职责说明',
  provider       VARCHAR(64)      NOT NULL DEFAULT ''     COMMENT '模型供应商编码',
  model          VARCHAR(128)     NOT NULL DEFAULT ''     COMMENT '模型名称',
  prompt_version VARCHAR(64)      NOT NULL DEFAULT ''     COMMENT 'Prompt 版本',
  status         TINYINT UNSIGNED NOT NULL DEFAULT 1      COMMENT '状态：1启用 2停用',
  created_at     INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '创建时间（Unix 时间戳）',
  updated_at     INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '更新时间（Unix 时间戳）',
  PRIMARY KEY (id),
  UNIQUE KEY uk_agent_provider_model_prompt (agent_code, provider, model, prompt_version),
  KEY idx_status_updated (status, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Agent 运行配置表';
