import assert from "node:assert/strict"
import { signPreviewToken, verifyPreviewToken } from "@/lib/preview-token"

const token = signPreviewToken({ type: "tour", id: 42 }, 3600)
const ok = verifyPreviewToken(token)
assert.ok(ok)
assert.equal(ok.type, "tour")
assert.equal(ok.id, 42)
assert.ok(ok.exp > Math.floor(Date.now() / 1000))

assert.equal(verifyPreviewToken(null), null)
assert.equal(verifyPreviewToken(""), null)
assert.equal(verifyPreviewToken("1.2.bad"), null)
assert.equal(verifyPreviewToken("tour.x.1." + "a".repeat(64)), null)

const expired = signPreviewToken({ type: "bus", id: 7 }, -10)
assert.equal(verifyPreviewToken(expired), null)

const tampered = token.slice(0, -4) + "dead"
assert.equal(verifyPreviewToken(tampered), null)

console.log("preview-token.selfcheck: ok")
