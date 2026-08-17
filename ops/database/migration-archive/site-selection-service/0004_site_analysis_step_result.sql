CREATE TABLE site_analysis_step_result (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  task_id     BIGINT UNSIGNED NOT NULL DEFAULT 0      COMMENT '单站分析任务 ID',
  step_code   TINYINT UNSIGNED NOT NULL DEFAULT 0     COMMENT '步骤编码：1至7',
  summary     TEXT            NOT NULL DEFAULT ('')   COMMENT '步骤分析摘要',
  score       INT UNSIGNED    NOT NULL DEFAULT 0      COMMENT '步骤评分：0至100',
  result_json MEDIUMTEXT      NOT NULL DEFAULT ('{}') COMMENT '步骤结构化分析结果 JSON',
  created_at  INT UNSIGNED    NOT NULL DEFAULT 0      COMMENT '创建时间（Unix 时间戳）',
  updated_at  INT UNSIGNED    NOT NULL DEFAULT 0      COMMENT '更新时间（Unix 时间戳）',
  PRIMARY KEY (id),
  UNIQUE KEY uk_task_step_code (task_id, step_code),
  KEY idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='单站分析步骤结果表';
