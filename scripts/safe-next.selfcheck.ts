import assert from "node:assert/strict"
import { safeInternalNext } from "@/lib/safe-next"

assert.equal(safeInternalNext("/avtobusnye-tury/x?preview=y"), "/avtobusnye-tury/x?preview=y")
assert.equal(safeInternalNext(null), null)
assert.equal(safeInternalNext(""), null)
assert.equal(safeInternalNext("https://evil.com"), null)
assert.equal(safeInternalNext("//evil.com"), null)
assert.equal(safeInternalNext("/admin"), "/admin")

console.log("safe-next.selfcheck: ok")
