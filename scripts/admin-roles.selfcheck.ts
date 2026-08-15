/**
 * Self-check: admin roles + capability matrix + tier guards.
 * Run: npx tsx scripts/admin-roles.selfcheck.ts
 */
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import {
  assignableRolesFor,
  canAssignRole,
  canManageTargetRole,
  isAdminRole,
  isPrivilegedAdminRole,
  parseAdminRole,
  roleHasCapability,
  roleLabel,
  roleTier,
} from "@/lib/admin-roles"

assert.equal(isAdminRole("admin"), true)
assert.equal(isAdminRole("manager"), true)
assert.equal(isAdminRole("superadmin"), true)
assert.equal(isAdminRole("god"), false)
assert.equal(parseAdminRole("manager"), "manager")
assert.equal(parseAdminRole("superadmin"), "superadmin")
assert.equal(parseAdminRole(""), "admin")
assert.equal(parseAdminRole(null), "admin")

assert.equal(roleTier("superadmin"), 3)
assert.equal(roleTier("admin"), 2)
assert.equal(roleTier("manager"), 1)

assert.equal(canAssignRole("superadmin", "superadmin"), true)
assert.equal(canAssignRole("superadmin", "manager"), true)
assert.equal(canAssignRole("admin", "superadmin"), false)
assert.equal(canAssignRole("admin", "admin"), true)
assert.equal(canAssignRole("admin", "manager"), true)
assert.equal(canAssignRole("manager", "admin"), false)
assert.equal(canAssignRole("manager", "manager"), true)

assert.equal(canManageTargetRole("superadmin", "superadmin"), true)
assert.equal(canManageTargetRole("admin", "superadmin"), false)
assert.equal(canManageTargetRole("admin", "admin"), false)
assert.equal(canManageTargetRole("admin", "manager"), true)
assert.equal(canManageTargetRole("manager", "manager"), false)

assert.equal(roleHasCapability("superadmin", "manage_roles"), true)
assert.equal(roleHasCapability("superadmin", "manage_users"), true)
assert.equal(roleHasCapability("superadmin", "purge"), true)
assert.equal(roleHasCapability("admin", "manage_users"), true)
assert.equal(roleHasCapability("admin", "manage_roles"), false)
assert.equal(roleHasCapability("admin", "purge"), true)
assert.equal(roleHasCapability("admin", "view_audit"), true)
assert.equal(roleHasCapability("manager", "manage_users"), false)
assert.equal(roleHasCapability("manager", "manage_roles"), false)
assert.equal(roleHasCapability("manager", "manage_settings"), false)
assert.equal(roleHasCapability("manager", "manage_currencies"), false)
assert.equal(roleHasCapability("manager", "manage_content"), false)
assert.equal(roleHasCapability("manager", "purge"), false)
assert.equal(roleHasCapability("manager", "view_audit"), false)

assert.equal(roleLabel("superadmin"), "Суперадмин")
assert.equal(roleLabel("admin"), "Админ")
assert.equal(roleLabel("manager"), "Менеджер")
assert.equal(isPrivilegedAdminRole("superadmin"), true)
assert.equal(isPrivilegedAdminRole("admin"), true)
assert.equal(isPrivilegedAdminRole("manager"), false)
assert.deepEqual(assignableRolesFor("superadmin"), ["superadmin", "admin", "manager"])
assert.deepEqual(assignableRolesFor("admin"), ["admin", "manager"])
assert.deepEqual(assignableRolesFor("manager"), ["manager"])

const root = path.join(import.meta.dirname, "..")
// e2e/ specs are not tracked in git (local-only Playwright suite) — warn, don't fail.
if (!fs.existsSync(path.join(root, "e2e/admin-roles-audit.spec.ts"))) {
  console.warn("admin-roles.selfcheck: warn — e2e/admin-roles-audit.spec.ts not present (local-only suite)")
}
assert.ok(fs.existsSync(path.join(root, "app/admin/(protected)/roles/page.tsx")), "roles page")
assert.ok(fs.existsSync(path.join(root, "lib/admin-role-catalog.ts")), "role catalog")

const catalog = fs.readFileSync(path.join(root, "lib/admin-role-catalog.ts"), "utf8")
assert.ok(catalog.includes("hideAdminRole"), "hide")
assert.ok(catalog.includes("restoreAdminRole"), "restore")
assert.ok(catalog.includes("purgeAdminRole"), "purge")

const nav = fs.readFileSync(path.join(root, "components/admin/admin-nav.tsx"), "utf8")
assert.ok(nav.includes("/admin/roles"), "nav roles link")
assert.ok(nav.includes("manage_roles"), "nav capability")

const usersActions = fs.readFileSync(path.join(root, "app/admin/user-actions.ts"), "utf8")
assert.ok(usersActions.includes("canAssignRole"), "tier assign guard")
assert.ok(usersActions.includes("canManageTargetRole"), "tier target guard")
assert.ok(usersActions.includes("Нельзя менять свою роль"), "self role lock")

const actions = fs.readFileSync(path.join(root, "app/admin/actions.ts"), "utf8")
assert.ok(actions.includes("tour_update"), "tour save audits")
assert.ok(actions.includes("tour_archive"), "tour archive audits")
assert.ok(actions.includes("tour_restore"), "tour restore audits")
assert.ok(actions.includes("tour_purge"), "tour purge audits")

const cms = fs.readFileSync(path.join(root, "app/admin/cms-actions.ts"), "utf8")
assert.ok(cms.includes("manage_settings"), "site settings gated")
assert.ok(cms.includes("settings_update"), "page/settings save audits")

const init = fs.readFileSync(path.join(root, "lib/db/init.ts"), "utf8")
assert.match(init, /username:\s*"admin2"[\s\S]*?role:\s*"superadmin"/)

console.log("admin-roles.selfcheck: ok")
