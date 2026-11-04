CREATE TABLE `parliament_amendments` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`citizen_id` text NOT NULL,
	`target_quote` text NOT NULL,
	`proposed_text` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`decided_at` text DEFAULT '' NOT NULL,
	`decided_by_citizen_id` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `parliament_amendments_item_idx` ON `parliament_amendments` (`item_id`);--> statement-breakpoint
CREATE INDEX `parliament_amendments_status_idx` ON `parliament_amendments` (`status`);--> statement-breakpoint
CREATE TABLE `parliament_audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`actor_citizen_id` text NOT NULL,
	`event_type` text NOT NULL,
	`description` text NOT NULL,
	`metadata_json` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `parliament_audit_item_idx` ON `parliament_audit_events` (`item_id`);--> statement-breakpoint
CREATE INDEX `parliament_audit_created_at_idx` ON `parliament_audit_events` (`created_at`);--> statement-breakpoint
ALTER TABLE `parliament_comments` ADD `quote_text` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `parliament_comments` ADD `parent_id` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `parliament_items` ADD `classification` text DEFAULT 'pending_review' NOT NULL;--> statement-breakpoint
ALTER TABLE `parliament_items` ADD `routing` text DEFAULT 'pending_review' NOT NULL;--> statement-breakpoint
ALTER TABLE `parliament_items` ADD `proposer_age_band` text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE `parliament_items` ADD `recusal_requested` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `parliament_items` ADD `stage_reason` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `parliament_items` ADD `voting_version` integer;--> statement-breakpoint
ALTER TABLE `parliament_items` ADD `deadline` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `parliament_votes` ADD `document_version` integer DEFAULT 1 NOT NULL;