ALTER TABLE "licenses" ADD COLUMN IF NOT EXISTS "totp_secret_enc" text;--> statement-breakpoint
ALTER TABLE "licenses" ADD COLUMN IF NOT EXISTS "totp_enabled" boolean DEFAULT false NOT NULL;