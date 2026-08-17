CREATE TABLE source_scan_cursor (
  id          BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT COMMENT '主键',
  source_type TINYINT UNSIGNED NOT NULL DEFAULT 1      COMMENT '来源类型：1问卷 2外部表 3API',
  source_name VARCHAR(64)      NOT NULL DEFAULT ''     COMMENT '来源名称，如 field_survey',
  cursor_time INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '来源更新时间游标（Unix 时间戳）',
  cursor_id   BIGINT UNSIGNED  NOT NULL DEFAULT 0      COMMENT '同一游标时间下的来源记录 ID',
  scanned_at  INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '最近扫描时间（Unix 时间戳）',
  created_at  INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '创建时间（Unix 时间戳）',
  updated_at  INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '更新时间（Unix 时间戳）',
  PRIMARY KEY (id),
  UNIQUE KEY uk_source_type_name (source_type, source_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='数据来源扫描游标表';
