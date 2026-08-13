ALTER TABLE `platform_role`
  DROP INDEX `uk_platform_role_name`,
  CHANGE COLUMN `name` `display_name` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '角色显示名称',
  ADD COLUMN `system_key` VARCHAR(64) NULL COMMENT '系统内置角色稳定标识；普通角色为空' AFTER `id`,
  ADD UNIQUE KEY `uk_platform_role_system_key` (`system_key`),
  ADD UNIQUE KEY `uk_platform_role_display_name` (`display_name`);

UPDATE `platform_role`
SET `system_key` = 'platform-super-admin',
    `display_name` = '平台超级管理员'
WHERE `display_name` = 'platform-super-admin'
  AND `built_in` = 1;
