CREATE TABLE `lounge_game_bests` (
	`game_id` text NOT NULL,
	`board_id` text NOT NULL,
	`citizen_id` text NOT NULL,
	`run_id` text NOT NULL,
	`score` integer NOT NULL,
	`moves` integer NOT NULL,
	`duration_ms` integer NOT NULL,
	`rounds` integer NOT NULL,
	`max_tier` integer NOT NULL,
	`rank_primary` integer NOT NULL,
	`rank_secondary` integer NOT NULL,
	`achieved_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lounge_game_best_member_unique` ON `lounge_game_bests` (`game_id`,`board_id`,`citizen_id`);--> statement-breakpoint
CREATE INDEX `lounge_game_best_board_idx` ON `lounge_game_bests` (`game_id`,`board_id`,`rank_primary`,`rank_secondary`);--> statement-breakpoint
CREATE TABLE `member_login_windows` (
	`window_key` text PRIMARY KEY NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `member_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`citizen_id` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `member_sessions_expiry_idx` ON `member_sessions` (`expires_at`);