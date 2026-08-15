import { ok, match } from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const schemaSrc = readFileSync(join(root, "lib/db/schema.ts"), "utf8")
const migrationSrc = readFileSync(join(root, "drizzle/0000_talented_psylocke.sql"), "utf8")

// ============================================================
// BLOCK 3b: FOREIGN KEY + CHECK constraints (Drizzle schema + init.ts migrations)
// ============================================================

// -- Drizzle schema-level definition (TS types + new DB creation) ------------
ok(
  schemaSrc.includes(".references(() => tours.id"),
  "schema.ts: tour_dates.tourId must .references tours.id",
)
match(
  schemaSrc,
  /tourId.*references\s*\(\s*\(\)\s*=>\s*tours\.id[\s\S]{0,100}onDelete:\s*['"]cascade['"]/i,
  "schema.ts: tour_dates.tourId FK must have onDelete: cascade",
)
ok(
  schemaSrc.includes(".references(() => transfers.id"),
  "schema.ts: transfer_schedules.transferId must .references transfers.id",
)
match(
  schemaSrc,
  /transferId.*references\s*\(\s*\(\)\s*=>\s*transfers\.id[\s\S]{0,100}onDelete:\s*['"]cascade['"]/i,
  "schema.ts: transfer_schedules.transferId FK must have onDelete: cascade",
)
match(
  schemaSrc,
  /check\s*\(\s*(["']tours_price_amount_nonneg["']\s*,\s*sql`\s*\$\{table\.priceAmount\}\s*>=\s*0|["'][^"']*price[^"']*["']\s*,\s*sql[\s\S]{0,120}priceAmount\s*>=\s*0|priceAmountNonNeg:?\s*check\s*\([\s\S]{0,120}priceAmount\s*>=\s*0)/i,
  "schema.ts: tours must have CHECK priceAmount >= 0",
)
match(
  schemaSrc,
  /reviewsRatingRange|check\s*\(\s*["']reviews_rating_range/i,
  "schema.ts: reviews must have CHECK rating 1..5",
)
match(
  schemaSrc,
  /tour_dates_end_after_start|end_after_start[\s\S]{0,300}>=/i,
  "schema.ts: tour_dates must have CHECK endDate >= startDate",
)

// -- Versioned PostgreSQL baseline migration -------------------------------
match(migrationSrc, /tour_dates_tourId_tours_id_fk[\s\S]*REFERENCES[\s\S]*tours[\s\S]*ON DELETE cascade/i,
  "baseline migration: tour_dates FK cascades")
match(migrationSrc, /transfer_schedules_transferId_transfers_id_fk[\s\S]*REFERENCES[\s\S]*transfers[\s\S]*ON DELETE cascade/i,
  "baseline migration: transfer_schedules FK cascades")
match(migrationSrc, /tours_price_amount_nonneg[\s\S]*priceAmount[\s\S]*>= 0/i,
  "baseline migration: non-negative tour price")
match(migrationSrc, /reviews_rating_range[\s\S]*rating[\s\S]*>= 1[\s\S]*rating[\s\S]*<= 5/i,
  "baseline migration: review rating range")
match(migrationSrc, /tour_dates_end_after_start[\s\S]*endDate[\s\S]*>= [\s\S]*startDate/i,
  "baseline migration: ordered tour dates")
console.log("db-fk-check-constraints checks passed")
