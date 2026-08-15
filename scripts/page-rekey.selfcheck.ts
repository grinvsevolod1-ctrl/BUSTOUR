/**
 * When country/city/tour/bus slug changes, CMS keys + content_blocks.page must move.
 * Run: npx tsx scripts/page-rekey.selfcheck.ts
 */
import assert from "node:assert/strict"
import { eq, like, or } from "drizzle-orm"
import { remapPageScopedSettingKey, rekeyPageScopedContent } from "../lib/page-rekey"
import { ensureDb } from "../lib/db/init"
import { db } from "../lib/db"
import { settings, contentBlocks } from "../lib/db/schema"

assert.equal(
  remapPageScopedSettingKey("country:avia:old.h1", "country:avia:old", "country:avia:new"),
  "country:avia:new.h1",
)
assert.equal(
  remapPageScopedSettingKey("country:avia:old.section.faq", "country:avia:old", "country:avia:new"),
  "country:avia:new.section.faq",
)
assert.equal(
  remapPageScopedSettingKey("country:avia:other.h1", "country:avia:old", "country:avia:new"),
  null,
)
assert.equal(
  remapPageScopedSettingKey("country:avia:old", "country:avia:old", "country:avia:new"),
  "country:avia:new",
)
assert.equal(
  remapPageScopedSettingKey("country:avia:old-extra.h1", "country:avia:old", "country:avia:new"),
  null,
)
assert.equal(remapPageScopedSettingKey("x", "a", "a"), null)

async function dbCheck() {
  await ensureDb()
  const oldK = "country:avia:__rekey_test_old"
  const newK = "country:avia:__rekey_test_new"
  const sibling = "country:avia:__rekey_test_old-extra.h1"

  await db.delete(settings).where(
    or(
      eq(settings.key, oldK),
      like(settings.key, `${oldK}.%`),
      eq(settings.key, newK),
      like(settings.key, `${newK}.%`),
      eq(settings.key, sibling),
    ),
  )
  await db.delete(contentBlocks).where(or(eq(contentBlocks.page, oldK), eq(contentBlocks.page, newK)))

  await db.insert(settings).values([
    { key: `${oldK}.h1`, value: "Hello" },
    { key: `${oldK}.intro`, value: "World" },
    { key: sibling, value: "keep-me" },
    { key: `${newK}.h1`, value: "stale" },
  ])
  await db.insert(contentBlocks).values({
    collection: "faq",
    page: oldK,
    title: "Q?",
    subtitle: "",
    body: "A",
    image: "",
    icon: "",
    href: "",
    extra: "{}",
    sortOrder: 0,
    visible: true,
    createdAt: Date.now(),
  })

  await rekeyPageScopedContent(oldK, newK)

  const rows = await db.select().from(settings)
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]))
  assert.equal(map[`${newK}.h1`], "Hello")
  assert.equal(map[`${newK}.intro`], "World")
  assert.equal(map[`${oldK}.h1`], undefined)
  assert.equal(map[sibling], "keep-me")

  const blocks = await db.select().from(contentBlocks).where(eq(contentBlocks.page, newK))
  assert.equal(blocks.length, 1)
  assert.equal(blocks[0]!.title, "Q?")
  const oldBlocks = await db.select().from(contentBlocks).where(eq(contentBlocks.page, oldK))
  assert.equal(oldBlocks.length, 0)

  await db.delete(settings).where(
    or(
      like(settings.key, `${oldK}.%`),
      like(settings.key, `${newK}.%`),
      eq(settings.key, sibling),
    ),
  )
  await db.delete(contentBlocks).where(or(eq(contentBlocks.page, oldK), eq(contentBlocks.page, newK)))
}

dbCheck()
  .then(() => console.log("page-rekey.selfcheck ok"))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
