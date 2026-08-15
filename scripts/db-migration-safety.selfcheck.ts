import { doesNotMatch, match, ok } from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const root = process.cwd()
const init = readFileSync(join(root, "lib/db/init.ts"), "utf8")
const schema = readFileSync(join(root, "lib/db/schema.ts"), "utf8")
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { scripts?: Record<string, string> }
const migrationPaths = [
  "drizzle/0000_talented_psylocke.sql",
  "drizzle/0001_tidy_miracleman.sql",
  "drizzle/0002_safe_nullable_foreign_keys.sql",
].map((path) => path.trim())
for (const migrationPath of migrationPaths) {
  const bytes = readFileSync(join(root, migrationPath))
  ok(!(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf), `${migrationPath} must not start with UTF-8 BOM`)
}
const migrations = [
  readFileSync(join(root, "drizzle/0000_talented_psylocke.sql"), "utf8"),
  readFileSync(join(root, "drizzle/0001_tidy_miracleman.sql"), "utf8"),
  readFileSync(join(root, "drizzle/0002_safe_nullable_foreign_keys.sql"), "utf8"),
].join("\n")

doesNotMatch(init, /DELETE\s+FROM|DROP\s+(?:TABLE|DATABASE|SCHEMA)|TRUNCATE\s+/i, "ensureDb/startup code must contain no destructive SQL")
doesNotMatch(init, /_sqliteOnlyMigrationScripts|PRAGMA\s+foreign_keys|selfcheck contract only|purely so .*regex/i, "runtime initialization must not contain regex-only dead migration code")
doesNotMatch(init, /catch\s*\{\s*(?:\/\*[\s\S]*?\*\/|\/\/[^\n]*)?\s*\}/, "migration and connection DDL failures must not be swallowed")
doesNotMatch(init, /ALTER\s+TABLE[\s\S]*?ALTER\s+COLUMN[\s\S]*?TYPE\s+(?:jsonb|numeric)/i, "startup must not perform unversioned type conversions")
doesNotMatch(schema, /countryId:[\s\S]{0,100}default\(0\)/, "tours.countryId must not use sentinel FK default 0")
doesNotMatch(schema, /sectionId:[\s\S]{0,100}default\(0\)/, "certificates.sectionId must not use sentinel FK default 0")
match(readFileSync(join(root, "drizzle/0002_safe_nullable_foreign_keys.sql"), "utf8"), /ALTER COLUMN "countryId" DROP DEFAULT[\s\S]*ALTER COLUMN "sectionId" DROP DEFAULT/i, "latest migration must remove sentinel FK defaults")
match(init, /migratePg\([\s\S]*migrationsFolder/, "ensureDb must use versioned Drizzle migrations")
ok(pkg.scripts?.["db:reset:dev"], "package.json must expose an explicit db:reset:dev command")

console.log("db migration safety checks passed")


