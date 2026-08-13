CREATE TABLE `site_exploration_attachment` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主键',
  `site_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '勘探站点主键',
  `category` TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '附件类别：1土地权属证明 2租赁协议 3测绘勘定报告',
  `object_key` VARCHAR(512) NOT NULL DEFAULT '' COMMENT '对象存储键',
  `stored_url` VARCHAR(1000) NOT NULL DEFAULT '' COMMENT '对象存储持久访问地址',
  `original_name` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '原始文件名',
  `content_type` VARCHAR(128) NOT NULL DEFAULT '' COMMENT '文件MIME类型',
  `file_size` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '文件大小，单位字节',
  `created_by_member_id` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '创建平台成员主键',
  `created_at` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '创建时间（Unix 时间戳）',
  `updated_at` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '更新时间（Unix 时间戳）',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_object_key` (`object_key`),
  KEY `idx_site_category_id` (`site_id`, `category`, `id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='勘探站点阶段附件';
