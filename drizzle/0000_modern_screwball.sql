CREATE TABLE `poker_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`payload` text NOT NULL
);
