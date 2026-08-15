/**
 * #55: saveReviewAction must not swallow Next.js redirect() inside try/catch
 * (false "failed to save" toast while the row was written).
 * Run: npx tsx scripts/review-save-toast.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { isRedirectError } from "../lib/admin-redirect"

assert.equal(isRedirectError({ digest: "NEXT_REDIRECT;replace;/admin/reviews;307;" }), true)
assert.equal(isRedirectError(new Error("db down")), false)

const src = fs.readFileSync(path.join(process.cwd(), "app/admin/actions.ts"), "utf8")
const m = src.match(/export async function saveReviewAction[\s\S]*?(?=\nexport async function )/)
assert.ok(m, "saveReviewAction not found")
const body = m[0]
const catchIdx = body.indexOf("} catch (err)")
assert.ok(catchIdx > 0, "expected try/catch in saveReviewAction")
const tryBlock = body.slice(0, catchIdx)
const afterCatch = body.slice(catchIdx)
assert.doesNotMatch(tryBlock, /\bredirect\s*\(/, "redirect() must not be inside try (#55)")
assert.match(afterCatch, /\bredirect\s*\(/, "edit path must redirect after successful save")
assert.match(afterCatch, /notice=/, "edit redirect should flash success notice")

const bus = src.match(/export async function saveBusAction[\s\S]*?(?=\nexport async function )/)
assert.ok(bus, "saveBusAction not found")
const busBody = bus[0]
const busCatch = busBody.indexOf("} catch")
assert.ok(busCatch > 0, "expected try/catch in saveBusAction")
assert.doesNotMatch(busBody.slice(0, busCatch), /\bredirect\s*\(/, "saveBusAction: redirect() must not be inside try")
assert.match(busBody.slice(busCatch), /\bredirect\s*\(/, "saveBusAction: create path must redirect after try")
assert.match(busBody, /isRedirectError/, "saveBusAction must rethrow redirect errors")

console.log("ok")
