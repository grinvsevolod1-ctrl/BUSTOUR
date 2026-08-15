import assert from "node:assert/strict"
import fs from "node:fs"

/**
 * The deploy pipeline must always start (or reload) the media worker
 * alongside the app — otherwise uploaded photos/videos are never processed.
 * Deployment is pm2-based: ecosystem.config.cjs defines both processes and
 * scripts/auto-deploy.sh reloads the whole ecosystem.
 */
const ecosystem = fs.readFileSync("ecosystem.config.cjs", "utf8")
assert.match(ecosystem, /name:\s*"bastur-app"/, "ecosystem must define the app process")
assert.match(ecosystem, /name:\s*"bastur-media-worker"/, "ecosystem must define the media worker process")
assert.match(ecosystem, /media-worker\.ts/, "media worker must run scripts/media-worker.ts")

const autoDeploy = fs.readFileSync("scripts/auto-deploy.sh", "utf8")
assert.match(
  autoDeploy,
  /pm2 startOrReload ecosystem\.config\.cjs/,
  "auto-deploy must reload the full pm2 ecosystem (app + media worker)",
)

console.log("deploy-media-worker.selfcheck: ok")
