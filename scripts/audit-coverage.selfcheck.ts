/**
 * Static coverage: every admin mutation path must call writeAudit (or live in auth).
 * Run: npx tsx scripts/audit-coverage.selfcheck.ts
 */
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()

function src(rel: string) {
  return readFileSync(join(root, rel), "utf8")
}

function mustHave(rel: string, needles: string[]) {
  const body = src(rel)
  for (const needle of needles) {
    // withAdminAction() (lib/admin-action.ts) writes the audit entry internally,
    // so it satisfies the «writeAudit» requirement.
    if (needle === "writeAudit" && /withAdminAction\s*(<[^>]*>)?\s*\(/.test(body)) continue
    assert.ok(body.includes(needle), `${rel} missing «${needle}»`)
  }
}

// --- Already covered (sanity) ---
mustHave("lib/auth.ts", ["writeAudit", "login_fail", '"login"', "logout"])
mustHave("app/admin/actions.ts", ["tour_create", "tour_update", "tour_archive", "tour_restore", "tour_purge", "tour_move", "tour_reorder"])
mustHave("app/admin/cms-actions.ts", ["settings_update", "block_create", "block_update", "block_delete", "page_faqs_update", "memo_tab_create", "memo_tab_delete", "memo_tab_move", "memo_tab_reorder", "dictionary_tab_create", "dictionary_tab_delete", "dictionary_tab_move", "dictionary_tab_reorder"])
mustHave("app/admin/user-actions.ts", ["user_create", "user_update", "user_delete"])

// --- Gaps that must be closed ---
mustHave("app/admin/actions.ts", [
  "tour_dates_update",
  "bus_create",
  "bus_update",
  "bus_move",
  "bus_archive",
  "bus_restore",
  "bus_purge",
  "transfer_create",
  "transfer_update",
  "transfer_archive",
  "transfer_restore",
  "transfer_purge",
  "transfer_schedules_update",
  "review_create",
  "review_update",
  "review_archive",
  "review_restore",
  "review_purge",
  "review_approve",
  "review_show_on",
  "article_create",
  "article_update",
  "article_archive",
  "article_restore",
  "article_purge",
  "lead_status_update",
  "lead_archive",
  "lead_restore",
  "lead_purge",
])

mustHave("app/admin/cms-actions.ts", ["block_toggle", "block_move"])

mustHave("app/admin/city-actions.ts", [
  "writeAudit",
  "city_create",
  "city_update",
  "city_archive",
  "city_restore",
  "city_purge",
  "city_move",
])

mustHave("app/admin/country-actions.ts", [
  "writeAudit",
  "country_create",
  "country_update",
  "country_archive",
  "country_restore",
  "country_purge",
  "country_move",
])

mustHave("app/admin/currency-actions.ts", ["writeAudit", "currency_create", "currency_update", "currency_delete"])
mustHave("app/admin/staff-actions.ts", [
  "writeAudit",
  "staff_create",
  "staff_update",
  "staff_archive",
  "staff_restore",
  "staff_purge",
])
mustHave("app/admin/bus-tour-type-actions.ts", [
  "writeAudit",
  "bus_tour_type_create",
  "bus_tour_type_update",
  "bus_tour_type_delete",
])
mustHave("app/admin/cert-actions.ts", [
  "writeAudit",
  "cert_section_create",
  "cert_section_update",
  "cert_section_delete",
  "certificate_create",
  "certificate_update",
  "certificate_delete",
])
mustHave("app/admin/shortcode-actions.ts", ["writeAudit", "shortcode_create", "shortcode_update", "shortcode_delete"])

mustHave("app/api/media/upload/route.ts", ["writeAudit", "media_upload"])
mustHave("app/api/media/[id]/route.ts", ["writeAudit", "media_update", "media_delete"])
mustHave("app/api/media/folders/route.ts", ["writeAudit", "media_folder_create"])
mustHave("app/api/media/folders/[id]/route.ts", ["writeAudit", "media_folder_delete"])

mustHave("app/api/admin/parse-holiday-reviews/route.ts", ["writeAudit", "review_import"])

mustHave("app/admin/audit-actions.ts", ["writeAudit", "audit_retention_update", "audit_purge"])

// Policy rule (editor-local, not tracked in git) — validate only when present
// so CI/fresh clones without .cursor/ don't fail the preflight.
if (existsSync(join(root, ".cursor/rules/admin-audit.mdc"))) {
  mustHave(".cursor/rules/admin-audit.mdc", ["writeAudit", "admin_audit_log", "alwaysApply"])
} else {
  console.log("audit coverage selfcheck: .cursor/rules/admin-audit.mdc not found, skipping (editor-local file)")
}

console.log("audit coverage selfcheck passed")
