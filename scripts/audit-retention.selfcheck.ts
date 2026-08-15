import assert from "node:assert/strict"
import {
  DEFAULT_AUDIT_RETENTION_DAYS,
  resolveAuditRetentionDays,
  auditRetentionCutoffMs,
} from "../lib/admin-audit"

assert.equal(DEFAULT_AUDIT_RETENTION_DAYS, 60)
assert.equal(resolveAuditRetentionDays(null), 60)
assert.equal(resolveAuditRetentionDays(""), 60)
assert.equal(resolveAuditRetentionDays("0"), 60)
assert.equal(resolveAuditRetentionDays("-5"), 60)
assert.equal(resolveAuditRetentionDays("90"), 90)
assert.equal(resolveAuditRetentionDays("99999"), 3650)

const now = 1_700_000_000_000
assert.equal(auditRetentionCutoffMs(60, now), now - 60 * 86_400_000)

console.log("audit retention checks passed")
