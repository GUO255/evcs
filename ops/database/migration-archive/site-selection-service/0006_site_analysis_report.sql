CREATE TABLE site_analysis_report (
  id                  BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT COMMENT '主键',
  task_id             BIGINT UNSIGNED  NOT NULL DEFAULT 0      COMMENT '单站分析任务 ID',
  report_title        VARCHAR(255)     NOT NULL DEFAULT ''     COMMENT '报告标题',
  recommendation_type TINYINT UNSIGNED NOT NULL DEFAULT 0      COMMENT '推荐等级：1优先踏勘 2条件建设 3储备观察',
  report_status       TINYINT UNSIGNED NOT NULL DEFAULT 1      COMMENT '报告状态：1草稿 2已生成 3生成失败',
  report_summary      TEXT             NOT NULL DEFAULT ('')   COMMENT '报告摘要',
  report_json         MEDIUMTEXT       NOT NULL DEFAULT ('{}') COMMENT '报告结构化内容 JSON',
  generated_at        INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '报告生成时间（Unix 时间戳）',
  created_at          INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '创建时间（Unix 时间戳）',
  updated_at          INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '更新时间（Unix 时间戳）',
  PRIMARY KEY (id),
  UNIQUE KEY uk_task_id (task_id),
  KEY idx_status_generated (report_status, generated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='单站选址分析报告表';
