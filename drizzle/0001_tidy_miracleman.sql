ALTER TABLE "media_files" ADD COLUMN "status" text DEFAULT 'ready' NOT NULL;--> statement-breakpoint
ALTER TABLE "media_files" ADD COLUMN "processing_stage" text DEFAULT 'ready' NOT NULL;--> statement-breakpoint
ALTER TABLE "media_files" ADD COLUMN "error_message" text;--> statement-breakpoint
ALTER TABLE "media_files" ADD COLUMN "mime_type" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "media_files" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "media_files" ADD COLUMN "lease_until" bigint;--> statement-breakpoint
ALTER TABLE "media_files" ADD COLUMN "updated_at" bigint;--> statement-breakpoint
ALTER TABLE "media_files" ADD COLUMN "processed_at" bigint;--> statement-breakpoint
UPDATE "media_files"
SET "updated_at" = COALESCE("created_at", (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint)
WHERE "updated_at" IS NULL;--> statement-breakpoint
ALTER TABLE "media_files" ALTER COLUMN "updated_at" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "media_files_status_idx" ON "media_files" USING btree ("status");--> statement-breakpoint
CREATE INDEX "media_files_lease_until_idx" ON "media_files" USING btree ("lease_until");
