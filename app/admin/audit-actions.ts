"use server"

import { revalidatePath } from "next/cache"
import { requireCapability } from "@/lib/auth"
import {
  AUDIT_RETENTION_SETTING_KEY,
  DEFAULT_AUDIT_RETENTION_DAYS,
  resolveAuditRetentionDays,
  writeAudit,
  maybePurgeExpiredAuditLogs,
  purgeExpiredAuditLogs,
} from "@/lib/admin-audit"
import { getSettings, saveSettings } from "@/lib/cms"

export async function saveAuditRetentionAction(formData: FormData) {
  const admin = await requireCapability("view_audit")
  const days = resolveAuditRetentionDays(String(formData.get("days") || ""))
  const before = await getSettings()
  const prev = resolveAuditRetentionDays(before[AUDIT_RETENTION_SETTING_KEY])
  await saveSettings({ [AUDIT_RETENTION_SETTING_KEY]: String(days) })
  await writeAudit({
    admin,
    action: "audit_retention_update",
    entityType: "settings",
    entityId: "audit",
    summary: `Срок хранения журнала: ${prev} → ${days} дн.`,
    before: { days: prev },
    after: { days },
  })
  // Apply new window immediately (bypass daily throttle via direct purge).
  await purgeExpiredAuditLogs(days)
  revalidatePath("/admin/audit")
}

export async function runAuditPurgeAction() {
  const admin = await requireCapability("view_audit")
  // Reset throttle marker so maybePurge runs; also force purge.
  const deleted = await purgeExpiredAuditLogs()
  await writeAudit({
    admin,
    action: "audit_purge",
    entityType: "settings",
    entityId: "audit",
    summary: `Очистка журнала: удалено ${deleted} записей старше срока хранения`,
    meta: { deleted, defaultDays: DEFAULT_AUDIT_RETENTION_DAYS },
  })
  void maybePurgeExpiredAuditLogs()
  revalidatePath("/admin/audit")
}
