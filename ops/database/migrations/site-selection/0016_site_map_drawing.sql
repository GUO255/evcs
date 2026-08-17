CREATE TABLE site_map_drawing (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  name       VARCHAR(128)    NOT NULL DEFAULT '' COMMENT '绘制对象名称',
  geo_json   MEDIUMTEXT      NOT NULL DEFAULT ('') COMMENT 'GeoJSON Feature 数据',
  remark     VARCHAR(1000)   NOT NULL DEFAULT '' COMMENT '备注',
  created_at INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '创建时间（Unix 时间戳）',
  updated_at INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '更新时间（Unix 时间戳）',
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='选址地图绘制数据表';
