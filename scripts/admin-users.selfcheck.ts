/**
 * Admin users: cannot change own role; soft-delete hides + disables login.
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const page = readFileSync(join(process.cwd(), "app/admin/(protected)/users/page.tsx"), "utf8")
const actions = readFileSync(join(process.cwd(), "app/admin/user-actions.ts"), "utf8")
const lib = readFileSync(join(process.cwd(), "lib/admins.ts"), "utf8")

assert.match(actions, /actor\.id\s*===\s*id|id\s*===\s*actor\.id/, "block self role change server-side")
assert.match(actions, /canAssignRole/, "tier: cannot assign above self")
assert.match(actions, /canManageTargetRole/, "tier: cannot edit higher/equal target")
assert.match(actions, /deleteAdminUserAction|softDelete|deactivateAdmin/, "delete action exists")
assert.match(lib, /onlyActive|eq\(admins\.active/, "list hides inactive by default")
assert.match(page, /const isSelf|isSelf =/, "UI knows current user")
assert.match(page, /isSelf \? \(/, "self branch without role select")
assert.match(page, /Удалить/, "delete control in UI")
assert.match(actions, /deleteAdminUserAction/, "delete action exists")
assert.match(lib, /softDeleteAdminUser/, "soft delete helper")
assert.match(lib, /includeInactive|eq\(admins\.active/, "list hides inactive by default")

const roles = readFileSync(join(process.cwd(), "lib/admin-roles.ts"), "utf8")
assert.match(roles, /function roleTier/)
assert.match(roles, /function canAssignRole/)
assert.match(roles, /function canManageTargetRole/)

console.log("admin-users.selfcheck: ok")
