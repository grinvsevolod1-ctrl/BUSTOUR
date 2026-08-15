/**
 * DB smoke: insert old audit row, purge with 60-day retention, assert gone.
 * Run: npx tsx scripts/audit-retention-db.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { eq } from "drizzle-orm"
import { ensureDb } from "@/lib/db/init"
import { db } from "@/lib/db"
import { adminAuditLog } from "@/lib/db/schema"
import {
  DEFAULT_AUDIT_RETENTION_DAYS,
  purgeExpiredAuditLogs,
  resolveAuditRetentionDays,
} from "@/lib/admin-audit"

function loadEnv() {
  try {
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const t = line.trim()
      if (!t || t.startsWith("#")) continue
      const i = t.indexOf("=")
      if (i < 0) continue
      let k = t.slice(0, i)
      let v = t.slice(i + 1)
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      process.env[k] = v
    }
  } catch {
    /* optional */
  }
}

async function main() {
  loadEnv()
  await ensureDb()
  assert.equal(resolveAuditRetentionDays(null), DEFAULT_AUDIT_RETENTION_DAYS)

  const marker = `retention-selfcheck-${Date.now()}`
  const oldTs = Date.now() - (DEFAULT_AUDIT_RETENTION_DAYS + 5) * 86_400_000

  const [inserted] = await db
    .insert(adminAuditLog)
    .values({
      adminId: null,
      username: "selfcheck",
      action: "retention_selfcheck",
      entityType: "test",
      entityId: marker,
      summary: "old row for purge",
      beforeJson: "",
      afterJson: "",
      metaJson: "",
      createdAt: oldTs,
    })
    .returning({ id: adminAuditLog.id })

  assert.ok(inserted?.id)

  const deleted = await purgeExpiredAuditLogs(DEFAULT_AUDIT_RETENTION_DAYS)
  assert.ok(deleted >= 1)

  const [still] = await db
    .select()
    .from(adminAuditLog)
    .where(eq(adminAuditLog.entityId, marker))
    .limit(1)
  assert.equal(still, undefined)

  console.log("audit retention db checks passed")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
