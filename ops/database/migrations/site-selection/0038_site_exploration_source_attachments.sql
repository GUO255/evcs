ALTER TABLE `site_exploration_attachment`
  MODIFY COLUMN `category` TINYINT UNSIGNED NOT NULL DEFAULT 0
    COMMENT '附件类别：1土地权属证明 2租赁协议 3测绘勘定报告 4来源卫星附件 5来源进出便利附件 6来源土地现场附件 7来源其他附属物附件';
