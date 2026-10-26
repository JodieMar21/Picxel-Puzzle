ALTER TABLE "licenses" ADD COLUMN IF NOT EXISTS "plan" text DEFAULT 'basic' NOT NULL;
ALTER TABLE "licenses" ADD COLUMN IF NOT EXISTS "stripe_price_id" text;

CREATE TABLE IF NOT EXISTS "coach_conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"license_key_hash" text NOT NULL,
	"device_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "coach_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "coach_usage" (
	"license_key_hash" text NOT NULL,
	"day" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "coach_usage_license_key_hash_day_pk" PRIMARY KEY("license_key_hash","day")
);
