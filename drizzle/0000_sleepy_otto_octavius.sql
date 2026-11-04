CREATE TABLE `archive_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`original_name` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`era` text DEFAULT '' NOT NULL,
	`captured_at` text DEFAULT '' NOT NULL,
	`subjects_json` text NOT NULL,
	`subject_key` text NOT NULL,
	`uploader_citizen_id` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `archive_photos_object_key_unique` ON `archive_photos` (`object_key`);--> statement-breakpoint
CREATE INDEX `archive_photos_subject_key_idx` ON `archive_photos` (`subject_key`);--> statement-breakpoint
CREATE INDEX `archive_photos_created_at_idx` ON `archive_photos` (`created_at`);