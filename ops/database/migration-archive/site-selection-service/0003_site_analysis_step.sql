CREATE TABLE site_analysis_step (
  id              BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT COMMENT '主键',
  task_id         BIGINT UNSIGNED  NOT NULL DEFAULT 0      COMMENT '单站分析任务 ID',
  step_code       TINYINT UNSIGNED NOT NULL DEFAULT 0      COMMENT '步骤编码：1至7',
  step_name       VARCHAR(64)      NOT NULL DEFAULT ''     COMMENT '步骤名称',
  status          TINYINT UNSIGNED NOT NULL DEFAULT 1      COMMENT '步骤状态：1待执行 2执行中 3已完成 4失败',
  execution_count INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '业务步骤执行轮次，包括人工重试',
  started_at      INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '步骤开始时间（Unix 时间戳）',
  completed_at    INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '步骤完成时间（Unix 时间戳）',
  error_code      VARCHAR(64)      NOT NULL DEFAULT ''     COMMENT '步骤错误码',
  error_message   TEXT             NOT NULL DEFAULT ('')   COMMENT '步骤错误信息',
  created_at      INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '创建时间（Unix 时间戳）',
  updated_at      INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '更新时间（Unix 时间戳）',
  PRIMARY KEY (id),
  UNIQUE KEY uk_task_step_code (task_id, step_code),
  KEY idx_status_updated (status, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='单站分析步骤表';
