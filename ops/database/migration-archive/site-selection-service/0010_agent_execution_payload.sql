CREATE TABLE agent_execution_payload (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  execution_log_id BIGINT UNSIGNED NOT NULL DEFAULT 0      COMMENT 'Agent 模型调用日志 ID',
  request_json     MEDIUMTEXT      NOT NULL DEFAULT ('{}') COMMENT '模型请求 JSON',
  response_json    MEDIUMTEXT      NOT NULL DEFAULT ('{}') COMMENT '模型响应 JSON',
  redacted         TINYINT(1)      NOT NULL DEFAULT 0      COMMENT '是否已脱敏：1是 0否',
  request_size     INT UNSIGNED    NOT NULL DEFAULT 0      COMMENT '请求 JSON 字节数',
  response_size    INT UNSIGNED    NOT NULL DEFAULT 0      COMMENT '响应 JSON 字节数',
  created_at       INT UNSIGNED    NOT NULL DEFAULT 0      COMMENT '创建时间（Unix 时间戳）',
  updated_at       INT UNSIGNED    NOT NULL DEFAULT 0      COMMENT '更新时间（Unix 时间戳）',
  PRIMARY KEY (id),
  UNIQUE KEY uk_execution_log_id (execution_log_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Agent 模型调用载荷表';
