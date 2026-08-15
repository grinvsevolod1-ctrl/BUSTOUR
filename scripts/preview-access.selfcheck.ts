import assert from "node:assert/strict"
import { signPreviewToken } from "@/lib/preview-token"
import { gatePreviewAccess } from "@/lib/preview-access"

const token = signPreviewToken({ type: "tour", id: 4 }, 3600)

assert.equal(
  gatePreviewAccess({ token, type: "tour", id: 4, hasAdminSession: true }),
  "allow",
)
assert.equal(
  gatePreviewAccess({ token, type: "tour", id: 4, hasAdminSession: false }),
  "unauthorized",
)
assert.equal(
  gatePreviewAccess({ token, type: "tour", id: 99, hasAdminSession: true }),
  "forbidden",
)
assert.equal(
  gatePreviewAccess({ token: "tour.4.1.deadbeef", type: "tour", id: 4, hasAdminSession: true }),
  "forbidden",
)
assert.equal(
  gatePreviewAccess({ token: null, type: "tour", id: 4, hasAdminSession: true }),
  "forbidden",
)

const expired = signPreviewToken({ type: "tour", id: 4 }, -5)
assert.equal(
  gatePreviewAccess({ token: expired, type: "tour", id: 4, hasAdminSession: true }),
  "forbidden",
)

console.log("preview-access.selfcheck: ok")
