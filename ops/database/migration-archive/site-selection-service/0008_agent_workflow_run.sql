CREATE TABLE agent_workflow_run (
  id            BIGINT UNSIGNED  NOT NULL AUTO_INCREMENT COMMENT '主键',
  task_id       BIGINT UNSIGNED  NOT NULL DEFAULT 0      COMMENT '单站分析任务 ID',
  status        TINYINT UNSIGNED NOT NULL DEFAULT 1      COMMENT '运行状态：1执行中 2已完成 3失败 4中断 5取消',
  current_node  VARCHAR(64)      NOT NULL DEFAULT ''     COMMENT '当前 LangGraph 节点',
  started_at    INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '运行开始时间（Unix 时间戳）',
  ended_at      INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '运行结束时间（Unix 时间戳）',
  error_code    VARCHAR(64)      NOT NULL DEFAULT ''     COMMENT '运行错误码',
  error_message TEXT             NOT NULL DEFAULT ('')   COMMENT '运行错误信息',
  created_at    INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '创建时间（Unix 时间戳）',
  updated_at    INT UNSIGNED     NOT NULL DEFAULT 0      COMMENT '更新时间（Unix 时间戳）',
  PRIMARY KEY (id),
  KEY idx_task_created (task_id, created_at),
  KEY idx_status_updated (status, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Agent 工作流运行记录表';
