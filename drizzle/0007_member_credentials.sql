CREATE TABLE `member_credentials` (
	`citizen_id` text PRIMARY KEY NOT NULL,
	`password_hash` text NOT NULL,
	`password_salt` text NOT NULL,
	`updated_at` integer NOT NULL,
	`updated_by` text NOT NULL
);
