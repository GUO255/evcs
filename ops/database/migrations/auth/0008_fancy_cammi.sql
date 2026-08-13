CREATE TABLE `auth_platform_owner` (
	`singleton` tinyint unsigned NOT NULL,
	`auth_user_id` varchar(36) NOT NULL,
	`created_at` timestamp(3) NOT NULL,
	CONSTRAINT `auth_platform_owner_singleton` PRIMARY KEY(`singleton`),
	CONSTRAINT `uk_platform_owner_user` UNIQUE(`auth_user_id`),
	CONSTRAINT `chk_platform_owner_singleton` CHECK(`auth_platform_owner`.`singleton` = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `auth_platform_owner` ADD CONSTRAINT `fk_platform_owner_user` FOREIGN KEY (`auth_user_id`) REFERENCES `auth_platform_user`(`id`) ON DELETE no action ON UPDATE no action;
