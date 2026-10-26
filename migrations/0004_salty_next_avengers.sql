CREATE TABLE "coach_conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"license_key_hash" text NOT NULL,
	"device_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_usage" (
	"license_key_hash" text NOT NULL,
	"day" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "coach_usage_license_key_hash_day_pk" PRIMARY KEY("license_key_hash","day")
);
--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "plan" text DEFAULT 'basic' NOT NULL;--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN "stripe_price_id" text;