CREATE TABLE "projects" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"original_image_url" text NOT NULL,
	"pixelated_image_url" text,
	"board_count" integer NOT NULL,
	"board_layout" text NOT NULL,
	"color_data" jsonb,
	"construction_guide_url" text,
	"pixelation_result" jsonb,
	"status" text DEFAULT 'processing' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
