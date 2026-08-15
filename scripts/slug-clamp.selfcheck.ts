import assert from "node:assert/strict"
import { MAX_SLUG_LENGTH, slugify } from "../lib/slug"
import { slugSchema } from "../lib/validations/admin"

const longTitle = `${"Очень длинный заголовок ".repeat(12)}финал`
const slug = slugify(longTitle)

assert.equal(MAX_SLUG_LENGTH, 120)
assert.ok(slug.length <= MAX_SLUG_LENGTH)
assert.match(slug, /^[a-z0-9_]+(?:[-_][a-z0-9_]+)*$/)
assert.ok(!slug.endsWith("-") && !slug.endsWith("_"))
assert.ok(!slug.endsWith("-zagalovo"))
assert.equal(slugify("word ".repeat(40)), "word-".repeat(24).slice(0, -1))
assert.match(slugify(" !@#$%^&*() "), /^item_[a-f0-9]{12}$/)
assert.equal(slugSchema.safeParse("hello_world-2024").success, true)
assert.equal(slugSchema.safeParse("hello-world_test").success, true)
assert.equal(slugSchema.safeParse("a".repeat(MAX_SLUG_LENGTH)).success, true)
assert.equal(slugSchema.safeParse("a".repeat(MAX_SLUG_LENGTH + 1)).success, false)

console.log("slug-clamp.selfcheck ok")
