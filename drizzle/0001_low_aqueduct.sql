CREATE TABLE `parliament_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`citizen_id` text NOT NULL,
	`comment_type` text DEFAULT 'comment' NOT NULL,
	`body` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `parliament_comments_item_idx` ON `parliament_comments` (`item_id`);--> statement-breakpoint
CREATE INDEX `parliament_comments_created_at_idx` ON `parliament_comments` (`created_at`);--> statement-breakpoint
CREATE TABLE `parliament_items` (
	`id` text PRIMARY KEY NOT NULL,
	`serial_code` text NOT NULL,
	`kind` text DEFAULT 'proposal' NOT NULL,
	`title` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`stage` text DEFAULT 'proposal' NOT NULL,
	`outcome` text DEFAULT 'pending' NOT NULL,
	`created_by_citizen_id` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `parliament_items_serial_code_unique` ON `parliament_items` (`serial_code`);--> statement-breakpoint
CREATE INDEX `parliament_items_stage_idx` ON `parliament_items` (`stage`);--> statement-breakpoint
CREATE INDEX `parliament_items_updated_at_idx` ON `parliament_items` (`updated_at`);--> statement-breakpoint
CREATE TABLE `parliament_votes` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`citizen_id` text NOT NULL,
	`choice` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `parliament_votes_item_citizen_unique` ON `parliament_votes` (`item_id`,`citizen_id`);--> statement-breakpoint
CREATE INDEX `parliament_votes_item_idx` ON `parliament_votes` (`item_id`);