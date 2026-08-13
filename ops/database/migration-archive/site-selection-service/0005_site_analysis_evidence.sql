CREATE TABLE site_analysis_evidence (
  id            BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT COMMENT '主键',
  task_id       BIGINT UNSIGNED  NOT NULL DEFAULT 0      COMMENT '单站分析任务 ID',
  step_code     TINYINT UNSIGNED NOT NULL DEFAULT 0      COMMENT '步骤编码：1至7',
  result_id     BIGINT UNSIGNED  NOT NULL DEFAULT 0      COMMENT '步骤结果 ID',
  evidence_type TINYINT UNSIGNED NOT NULL DEFAULT 10     COMMENT '证据类型：1问卷 2POI 3GPS 4车流 5地图 6图片 7Wiki 8政策 9模型推断 10其他',
  source        TEXT             NOT NULL DEFAULT ('')   COMMENT '证据来源',
  content       TEXT             NOT NULL DEFAULT ('')   COMMENT '证据内容摘要',
  url           TEXT             NOT NULL DEFAULT ('')   COMMENT '证据链接或附件地址',
  created_at    INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '创建时间（Unix 时间戳）',
  updated_at    INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '更新时间（Unix 时间戳）',
  PRIMARY KEY (id),
  KEY idx_task_step (task_id, step_code),
  KEY idx_result_id (result_id),
  KEY idx_evidence_type (evidence_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='单站分析步骤证据表';
