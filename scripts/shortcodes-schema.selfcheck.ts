/**
 * Shortcodes: name validation + schema table present.
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { shortcodeNameSchema, shortcodeSaveSchema } from "../lib/validations/admin"

assert.equal(shortcodeNameSchema.safeParse("Y").success, true)
assert.equal(shortcodeNameSchema.safeParse("year2026").success, true)
assert.equal(shortcodeNameSchema.safeParse("[Y]").success, false)
assert.equal(shortcodeNameSchema.safeParse("year 2026").success, false)
assert.equal(
  shortcodeNameSchema.safeParse("[Y]").error?.issues[0]?.message,
  "Имя шорткода может содержать только буквы и цифры, без пробелов и скобок",
)
assert.equal(shortcodeSaveSchema.safeParse({ name: "Y", value: "2026" }).success, true)
assert.equal(shortcodeSaveSchema.safeParse({ name: "Y", value: "" }).success, false)

const schema = readFileSync(join(process.cwd(), "lib/db/schema.ts"), "utf8")
assert.match(schema, /export const shortcodes = pgTable\("shortcodes"/)

const migration = readFileSync(join(process.cwd(), "drizzle/0000_talented_psylocke.sql"), "utf8")
assert.match(migration, /CREATE TABLE "shortcodes"/)

console.log("shortcodes-schema.selfcheck: ok")
