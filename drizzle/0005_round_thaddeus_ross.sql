CREATE TABLE `committee_lounge_seats` (
	`seat_index` integer PRIMARY KEY NOT NULL,
	`citizen_id` text NOT NULL,
	`seated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `committee_lounge_seats_citizen_unique` ON `committee_lounge_seats` (`citizen_id`);--> statement-breakpoint
CREATE INDEX `committee_lounge_seats_seated_at_idx` ON `committee_lounge_seats` (`seated_at`);