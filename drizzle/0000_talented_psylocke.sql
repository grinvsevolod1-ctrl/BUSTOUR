CREATE TABLE "admin_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"adminId" integer,
	"username" text DEFAULT '' NOT NULL,
	"action" text NOT NULL,
	"entityType" text DEFAULT '' NOT NULL,
	"entityId" text DEFAULT '' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"beforeJson" text DEFAULT '' NOT NULL,
	"afterJson" text DEFAULT '' NOT NULL,
	"metaJson" text DEFAULT '' NOT NULL,
	"createdAt" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_roles" (
	"slug" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"isSystem" boolean DEFAULT false NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"createdAt" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"passwordHash" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"createdAt" bigint NOT NULL,
	CONSTRAINT "admins_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"category" text DEFAULT 'news' NOT NULL,
	"excerpt" text NOT NULL,
	"image" text NOT NULL,
	"date" text DEFAULT '' NOT NULL,
	"content" text DEFAULT '[]' NOT NULL,
	"contentHtml" text DEFAULT '' NOT NULL,
	"metaTitle" text DEFAULT '' NOT NULL,
	"metaDescription" text DEFAULT '' NOT NULL,
	"metaShortDesc" text DEFAULT '' NOT NULL,
	"metaImage" text DEFAULT '' NOT NULL,
	"metaImageAlt" text DEFAULT '' NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"createdAt" bigint NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "bus_tour_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" bigint NOT NULL,
	CONSTRAINT "bus_tour_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "buses" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"gallery" text DEFAULT '[]' NOT NULL,
	"year" text DEFAULT '' NOT NULL,
	"seats" text DEFAULT '' NOT NULL,
	"busClass" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"documents" text DEFAULT '[]' NOT NULL,
	"seating" text DEFAULT '[]' NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"createdAt" bigint NOT NULL,
	CONSTRAINT "buses_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "cert_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" serial PRIMARY KEY NOT NULL,
	"sectionId" integer DEFAULT 0 NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "city_destinations" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'bus' NOT NULL,
	"country" text NOT NULL,
	"countryId" integer NOT NULL,
	"intro" text DEFAULT '' NOT NULL,
	"sections" text DEFAULT '[]' NOT NULL,
	"seoHtml" text DEFAULT '' NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"createdAt" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_blocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"collection" text NOT NULL,
	"page" text DEFAULT 'global' NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"icon" text DEFAULT '' NOT NULL,
	"href" text DEFAULT '' NOT NULL,
	"extra" text DEFAULT '{}' NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"visible" boolean DEFAULT true NOT NULL,
	"createdAt" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'bus' NOT NULL,
	"intro" text DEFAULT '' NOT NULL,
	"seoHtml" text DEFAULT '' NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"createdAt" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"symbol" text DEFAULT '' NOT NULL,
	"rate" real DEFAULT 1 NOT NULL,
	"isBase" boolean DEFAULT false NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" bigint NOT NULL,
	CONSTRAINT "currencies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"message" text,
	"type" text DEFAULT 'contact' NOT NULL,
	"tour" text,
	"status" text DEFAULT 'new' NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"createdAt" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_files" (
	"id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"name" text NOT NULL,
	"size" text NOT NULL,
	"type" text NOT NULL,
	"checksum" text DEFAULT '' NOT NULL,
	"alt_text" text,
	"folder_id" text,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_folders" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "media_folders_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text DEFAULT 'TEXT' NOT NULL,
	"name" text NOT NULL,
	"tour" text DEFAULT '' NOT NULL,
	"text" text NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"sourceId" text DEFAULT '' NOT NULL,
	"sourceDate" text DEFAULT '' NOT NULL,
	"approved" boolean DEFAULT false NOT NULL,
	"showOn" text DEFAULT '[]' NOT NULL,
	"videoUrl" text DEFAULT '' NOT NULL,
	"thumbnailUrl" text DEFAULT '' NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"createdAt" bigint NOT NULL,
	CONSTRAINT "reviews_rating_range" CHECK ("reviews"."rating" >= 1 AND "reviews"."rating" <= 5)
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shortcodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"value" text DEFAULT '' NOT NULL,
	"description" text,
	CONSTRAINT "shortcodes_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"position" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"photo" text DEFAULT '' NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"createdAt" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tour_date_rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"dateId" integer NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"price" real DEFAULT 0 NOT NULL,
	"discount" integer DEFAULT 0 NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tour_date_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"dateId" integer NOT NULL,
	"icon" text DEFAULT 'flag' NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tour_dates" (
	"id" serial PRIMARY KEY NOT NULL,
	"tourId" integer NOT NULL,
	"startDate" text DEFAULT '' NOT NULL,
	"endDate" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"extraPriceAmount" real DEFAULT 0 NOT NULL,
	"extraPriceCurrency" text DEFAULT '' NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" bigint NOT NULL,
	CONSTRAINT "tour_dates_end_after_start" CHECK ("tour_dates"."endDate" >= "tour_dates"."startDate")
);
--> statement-breakpoint
CREATE TABLE "tours" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"price" text NOT NULL,
	"priceAmount" real DEFAULT 0 NOT NULL,
	"extraPriceAmount" real DEFAULT 0 NOT NULL,
	"extraPriceCurrency" text DEFAULT '' NOT NULL,
	"image" text NOT NULL,
	"category" text DEFAULT 'bus' NOT NULL,
	"tourType" text DEFAULT '' NOT NULL,
	"duration" text DEFAULT '' NOT NULL,
	"departure" text DEFAULT 'Минск' NOT NULL,
	"country" text DEFAULT '' NOT NULL,
	"countryId" integer DEFAULT 0 NOT NULL,
	"arrivalCityId" integer NOT NULL,
	"nights" integer DEFAULT 0 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"program" text DEFAULT '[]' NOT NULL,
	"included" text DEFAULT '[]' NOT NULL,
	"excluded" text DEFAULT '[]' NOT NULL,
	"whatIncluded" text DEFAULT '[]' NOT NULL,
	"seoHtml" text DEFAULT '' NOT NULL,
	"seoTitle" text DEFAULT '' NOT NULL,
	"alertText" text DEFAULT '' NOT NULL,
	"alertType" text DEFAULT 'info' NOT NULL,
	"gallery" text DEFAULT '[]' NOT NULL,
	"datesTable" text DEFAULT '{}' NOT NULL,
	"datesNote" text DEFAULT '' NOT NULL,
	"datesNoteType" text DEFAULT 'info' NOT NULL,
	"datesCurrency" text DEFAULT 'BYN' NOT NULL,
	"datesFootnotes" text,
	"documents" text DEFAULT '[]' NOT NULL,
	"layout" text DEFAULT '[]' NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" bigint NOT NULL,
	CONSTRAINT "tours_slug_unique" UNIQUE("slug"),
	CONSTRAINT "tours_price_amount_nonneg" CHECK ("tours"."priceAmount" >= 0)
);
--> statement-breakpoint
CREATE TABLE "transfer_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"transferId" integer NOT NULL,
	"direction" text DEFAULT 'outbound' NOT NULL,
	"departureTime" text DEFAULT '' NOT NULL,
	"arrival" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"bookingHref" text DEFAULT '' NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transfers" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"category" text DEFAULT 'airport' NOT NULL,
	"title" text NOT NULL,
	"intro" text DEFAULT '' NOT NULL,
	"priceRoundTrip" real DEFAULT 0 NOT NULL,
	"priceOneWay" real DEFAULT 0 NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"createdAt" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "city_destinations" ADD CONSTRAINT "city_destinations_countryId_countries_id_fk" FOREIGN KEY ("countryId") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tour_dates" ADD CONSTRAINT "tour_dates_tourId_tours_id_fk" FOREIGN KEY ("tourId") REFERENCES "public"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_schedules" ADD CONSTRAINT "transfer_schedules_transferId_transfers_id_fk" FOREIGN KEY ("transferId") REFERENCES "public"."transfers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_log_admin_created_idx" ON "admin_audit_log" USING btree ("adminId","createdAt");--> statement-breakpoint
CREATE INDEX "admin_audit_log_entity_idx" ON "admin_audit_log" USING btree ("entityType","entityId");--> statement-breakpoint
CREATE INDEX "articles_archived_idx" ON "articles" USING btree ("archived");--> statement-breakpoint
CREATE INDEX "buses_archived_idx" ON "buses" USING btree ("archived");--> statement-breakpoint
CREATE INDEX "certificates_section_id_idx" ON "certificates" USING btree ("sectionId");--> statement-breakpoint
CREATE UNIQUE INDEX "city_destinations_category_slug" ON "city_destinations" USING btree ("category","slug");--> statement-breakpoint
CREATE INDEX "city_destinations_archived_idx" ON "city_destinations" USING btree ("archived");--> statement-breakpoint
CREATE INDEX "city_destinations_category_archived_idx" ON "city_destinations" USING btree ("category","archived");--> statement-breakpoint
CREATE INDEX "content_blocks_collection_page_idx" ON "content_blocks" USING btree ("collection","page");--> statement-breakpoint
CREATE UNIQUE INDEX "countries_category_slug" ON "countries" USING btree ("category","slug");--> statement-breakpoint
CREATE INDEX "countries_archived_idx" ON "countries" USING btree ("archived");--> statement-breakpoint
CREATE INDEX "leads_archived_idx" ON "leads" USING btree ("archived");--> statement-breakpoint
CREATE INDEX "media_files_checksum_idx" ON "media_files" USING btree ("checksum");--> statement-breakpoint
CREATE INDEX "media_files_folder_id_idx" ON "media_files" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "reviews_archived_idx" ON "reviews" USING btree ("archived");--> statement-breakpoint
CREATE INDEX "reviews_archived_approved_idx" ON "reviews" USING btree ("archived","approved");--> statement-breakpoint
CREATE INDEX "staff_archived_idx" ON "staff" USING btree ("archived");--> statement-breakpoint
CREATE INDEX "tour_date_rooms_date_id_idx" ON "tour_date_rooms" USING btree ("dateId");--> statement-breakpoint
CREATE INDEX "tour_date_tags_date_id_idx" ON "tour_date_tags" USING btree ("dateId");--> statement-breakpoint
CREATE INDEX "tour_dates_tour_id_idx" ON "tour_dates" USING btree ("tourId");--> statement-breakpoint
CREATE INDEX "tours_archived_idx" ON "tours" USING btree ("archived");--> statement-breakpoint
CREATE INDEX "tours_archived_category_idx" ON "tours" USING btree ("archived","category");--> statement-breakpoint
CREATE INDEX "tours_archived_featured_idx" ON "tours" USING btree ("archived","featured");--> statement-breakpoint
CREATE INDEX "tours_country_id_idx" ON "tours" USING btree ("countryId");--> statement-breakpoint
CREATE INDEX "tours_arrival_city_id_idx" ON "tours" USING btree ("arrivalCityId");--> statement-breakpoint
CREATE INDEX "tours_sort_order_idx" ON "tours" USING btree ("sortOrder");--> statement-breakpoint
CREATE INDEX "transfer_schedules_transfer_id_idx" ON "transfer_schedules" USING btree ("transferId");--> statement-breakpoint
CREATE UNIQUE INDEX "transfers_category_slug" ON "transfers" USING btree ("category","slug");