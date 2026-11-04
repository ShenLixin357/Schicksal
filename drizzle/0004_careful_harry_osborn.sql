CREATE TABLE `committee_club_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`citizen_id` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`sticker` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `committee_club_messages_created_at_idx` ON `committee_club_messages` (`created_at`);--> statement-breakpoint
CREATE INDEX `committee_club_messages_citizen_idx` ON `committee_club_messages` (`citizen_id`);--> statement-breakpoint
CREATE TABLE `committee_club_profiles` (
	`citizen_id` text PRIMARY KEY NOT NULL,
	`mask_name` text DEFAULT '' NOT NULL,
	`avatar` text DEFAULT 'sigil' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `committee_club_profiles_updated_at_idx` ON `committee_club_profiles` (`updated_at`);--> statement-breakpoint
CREATE TABLE `committee_club_room` (
	`id` text PRIMARY KEY NOT NULL,
	`vase_selection` text DEFAULT 'autumn' NOT NULL,
	`updated_by_citizen_id` text DEFAULT '' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `committee_club_room_updated_at_idx` ON `committee_club_room` (`updated_at`);
--> statement-breakpoint
PRAGMA optimize;
