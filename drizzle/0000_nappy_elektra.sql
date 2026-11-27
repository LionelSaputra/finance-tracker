CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`opening_balance` integer DEFAULT 0 NOT NULL,
	`target_amount` integer,
	`target_date` text,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ai_insights` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`month` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`model` text NOT NULL,
	`summary_json` text NOT NULL,
	`result_json` text NOT NULL,
	`input_tokens` integer NOT NULL,
	`output_tokens` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`category_group` text,
	`monthly_budget` integer,
	`archived` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_kind` ON `categories` (`name`,`kind`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`emergency_months` integer DEFAULT 6 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`occurred_on` text NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`account_id` integer NOT NULL,
	`to_account_id` integer,
	`category_id` integer,
	`note` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`external_id` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "amount_positive" CHECK("transactions"."amount" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_external_id_unique` ON `transactions` (`external_id`);--> statement-breakpoint
CREATE INDEX `transactions_occurred_on` ON `transactions` (`occurred_on`);