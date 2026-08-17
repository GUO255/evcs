CREATE TABLE site_traffic_grid_cell (
  cell_x                   INT UNSIGNED NOT NULL COMMENT '车流网格X索引（0.1度网格，原点东经110.5）',
  cell_y                   INT UNSIGNED NOT NULL COMMENT '车流网格Y索引（0.1度网格，原点北纬31.0）',
  average_vehicle_count    INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '日均断面交通量（辆）',
  new_energy_count         INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '日均新能源车辆数（辆）',
  created_at               INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '创建时间（Unix 时间戳）',
  updated_at               INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '更新时间（Unix 时间戳）',
  PRIMARY KEY (cell_x, cell_y)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='本地车流网格数据（替代云端 ClickHouse）';

CREATE TABLE site_traffic_road_segment (
  id                              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  route_key                       VARCHAR(64)  NOT NULL DEFAULT '' COMMENT '路线稳定标识',
  road_level                      VARCHAR(32)  NOT NULL DEFAULT '' COMMENT '道路等级：expressway/national/provincial',
  ref                             VARCHAR(32)  NOT NULL DEFAULT '' COMMENT '路线编号，如 G107',
  name                            VARCHAR(128) NOT NULL DEFAULT '' COMMENT '路段名称',
  segment_id                      VARCHAR(128) NOT NULL DEFAULT '' COMMENT '路段稳定标识',
  chain_index                     INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '桩号链索引',
  segment_index                   INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '链内路段索引',
  start_km                        DECIMAL(10,3) UNSIGNED NOT NULL DEFAULT 0 COMMENT '路段起点桩号（公里）',
  end_km                          DECIMAL(10,3) UNSIGNED NOT NULL DEFAULT 0 COMMENT '路段终点桩号（公里）',
  geo_json                        MEDIUMTEXT NOT NULL COMMENT '路段 GeoJSON LineString Feature',
  forward_visit_count             INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '正向断面车流',
  reverse_visit_count             INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '反向断面车流',
  unknown_direction_visit_count   INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '未知方向断面车流',
  visit_count                     INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '断面总车流',
  unique_vehicle_count            INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '去重车辆数',
  new_energy_visit_count          INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '新能源车流',
  new_energy_unique_vehicle_count INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '新能源去重车辆数',
  created_at                      INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '创建时间（Unix 时间戳）',
  updated_at                      INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '更新时间（Unix 时间戳）',
  PRIMARY KEY (id),
  UNIQUE KEY uk_site_traffic_road_segment_id (segment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='本地路段车流数据（替代云端 ClickHouse）';

CREATE TABLE site_upload_ticket (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  ticket        CHAR(36)        NOT NULL COMMENT '上传会话票据',
  site_id       BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '勘探站点主键',
  kind          VARCHAR(16)     NOT NULL DEFAULT '' COMMENT '上传类型：image/attachment',
  field         VARCHAR(64)     NOT NULL DEFAULT '' COMMENT '上传字段',
  object_key    VARCHAR(512)    NOT NULL DEFAULT '' COMMENT '本地对象存储键',
  original_name VARCHAR(255)    NOT NULL DEFAULT '' COMMENT '原始文件名',
  content_type  VARCHAR(128)    NOT NULL DEFAULT '' COMMENT '内容类型',
  file_size     BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '文件字节数',
  status        VARCHAR(16)     NOT NULL DEFAULT 'pending' COMMENT '状态：pending/stored/completed',
  updated_at    INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '更新时间（Unix 时间戳）',
  expires_at    INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '过期时间（Unix 时间戳）',
  created_at    INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '创建时间（Unix 时间戳）',
  PRIMARY KEY (id),
  UNIQUE KEY uk_site_upload_ticket (ticket),
  KEY idx_site_upload_ticket_status (status, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='本地文件上传会话（替代云端 OSS STS 票据）';
