CREATE TABLE `parliament_floor_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`citizen_id` text NOT NULL,
	`request_type` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`decided_at` text DEFAULT '' NOT NULL,
	`decided_by_citizen_id` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `parliament_floor_request_item_idx` ON `parliament_floor_requests` (`item_id`);--> statement-breakpoint
CREATE INDEX `parliament_floor_request_status_idx` ON `parliament_floor_requests` (`status`);--> statement-breakpoint
CREATE TABLE `parliament_meeting_sessions` (
	`item_id` text PRIMARY KEY NOT NULL,
	`speaker_election_deadline` text DEFAULT '' NOT NULL,
	`speaker_status` text DEFAULT 'not_configured' NOT NULL,
	`speaker_citizen_id` text DEFAULT '' NOT NULL,
	`speaker_decided_by_citizen_id` text DEFAULT '' NOT NULL,
	`tied_candidate_ids_json` text DEFAULT '[]' NOT NULL,
	`current_floor_citizen_id` text DEFAULT '' NOT NULL,
	`debate_started_at` text DEFAULT '' NOT NULL,
	`seats_locked` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `parliament_meeting_status_idx` ON `parliament_meeting_sessions` (`speaker_status`);--> statement-breakpoint
CREATE TABLE `parliament_result_reactions` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`citizen_id` text NOT NULL,
	`reaction` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `parliament_result_reaction_unique` ON `parliament_result_reactions` (`item_id`,`citizen_id`);--> statement-breakpoint
CREATE INDEX `parliament_result_reaction_item_idx` ON `parliament_result_reactions` (`item_id`);--> statement-breakpoint
CREATE TABLE `parliament_seats` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`citizen_id` text NOT NULL,
	`side` text NOT NULL,
	`seat_index` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `parliament_seat_citizen_unique` ON `parliament_seats` (`item_id`,`citizen_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `parliament_seat_slot_unique` ON `parliament_seats` (`item_id`,`side`,`seat_index`);--> statement-breakpoint
CREATE INDEX `parliament_seat_item_idx` ON `parliament_seats` (`item_id`);--> statement-breakpoint
CREATE TABLE `parliament_speaker_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`citizen_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `parliament_speaker_candidate_unique` ON `parliament_speaker_candidates` (`item_id`,`citizen_id`);--> statement-breakpoint
CREATE INDEX `parliament_speaker_candidate_item_idx` ON `parliament_speaker_candidates` (`item_id`);--> statement-breakpoint
CREATE TABLE `parliament_speaker_votes` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`voter_citizen_id` text NOT NULL,
	`candidate_citizen_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `parliament_speaker_vote_unique` ON `parliament_speaker_votes` (`item_id`,`voter_citizen_id`);--> statement-breakpoint
CREATE INDEX `parliament_speaker_vote_item_idx` ON `parliament_speaker_votes` (`item_id`);