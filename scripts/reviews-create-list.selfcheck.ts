/**
 * #40: after TEXT create, review must appear under default admin list filters.
 * Also guards the ReviewForm refresh contract (useActionToast → router.refresh).
 * Run: npx tsx scripts/reviews-create-list.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {import { hasSelfcheckPostgres, skipRuntimeMessage } from "./lib/selfcheck-db"

  DEFAULT_REVIEW_LIST_FILTERS,
  filterAndSortReviews,
} from "../lib/review-admin"

const formSrc = fs.readFileSync(path.join(process.cwd(), "components/admin/review-form.tsx"), "utf8")
assert.match(formSrc, /useActionToast/)
assert.match(formSrc, /reviews-list/)

async function main() {
  const dbFile = path.join(os.tmpdir(), `bustour-reviews-create-${Date.now()}.db`)

  const { ensureDb } = await import("../lib/db/init")
  const { createReview, getReviews, purgeReview } = await import("../lib/queries")
  await ensureDb()

  const stamp = `selfcheck-40-${Date.now()}`
  let id = 0
  try {
    await createReview({
      type: "TEXT",
      name: stamp,
      tour: "",
      text: "selfcheck create→list",
      rating: 5,
    })
    const all = await getReviews()
    const created = all.find((r) => r.name === stamp)
    assert.ok(created, "created TEXT review missing from getReviews()")
    id = created.id
    assert.equal(created.approved, false)

    const visible = filterAndSortReviews(all, DEFAULT_REVIEW_LIST_FILTERS)
    assert.ok(
      visible.some((r) => r.id === created.id),
      "new unapproved TEXT review must show with default list filters",
    )
  } finally {
    if (id) await purgeReview(id)
    try {
      fs.unlinkSync(dbFile)
    } catch {
      /* ignore */
    }
  }

  console.log("reviews-create-list.selfcheck: ok")
}

if (!hasSelfcheckPostgres()) {
  console.log(skipRuntimeMessage("reviews-create-list.selfcheck.ts"))
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
