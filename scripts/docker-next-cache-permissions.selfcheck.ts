import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const dockerfile = fs.readFileSync(path.join(process.cwd(), "Dockerfile"), "utf8")

assert.match(
  dockerfile,
  /COPY\s+--from=builder\s+--chown=nextjs:nodejs\s+\/app\/\.next\s+\.\/\.next/,
  "Next runtime cache must be owned by the nextjs user so revalidatePath can update it",
)

console.log("docker-next-cache-permissions.selfcheck: ok")
