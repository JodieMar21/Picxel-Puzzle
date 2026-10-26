CREATE TABLE "license_activations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"license_key_hash" text NOT NULL,
	"device_id" text NOT NULL,
	"device_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_validated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "license_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"license_key_hash" text NOT NULL,
	"device_id" text,
	"event_type" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "licenses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"license_key" text NOT NULL,
	"license_key_hash" text NOT NULL,
	"stripe_session_id" text NOT NULL,
	"customer_email" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"max_devices" integer DEFAULT 2 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "licenses_license_key_unique" UNIQUE("license_key"),
	CONSTRAINT "licenses_license_key_hash_unique" UNIQUE("license_key_hash"),
	CONSTRAINT "licenses_stripe_session_id_unique" UNIQUE("stripe_session_id")
);
