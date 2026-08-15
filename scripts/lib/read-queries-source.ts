import fs from "node:fs"
import path from "node:path"

/**
 * lib/queries.ts is a barrel over lib/queries/*.ts. Selfchecks that inspect
 * "the queries source" must see the barrel AND every domain module, otherwise
 * string assertions break whenever code moves between modules.
 */
export function readQueriesSource(root = process.cwd()): string {
  const parts: string[] = [fs.readFileSync(path.join(root, "lib", "queries.ts"), "utf8")]
  const dir = path.join(root, "lib", "queries")
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir).sort()) {
      if (file.endsWith(".ts")) {
        parts.push(fs.readFileSync(path.join(dir, file), "utf8"))
      }
    }
  }
  return parts.join("\n")
}
