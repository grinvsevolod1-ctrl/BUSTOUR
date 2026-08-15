import assert from "node:assert/strict"
import fs from "node:fs"

const deploy = fs.readFileSync("deploy.ps1", "utf8")
assert.match(deploy, /docker compose up -d --remove-orphans bastur-app bastur-media-worker/, "DEV deploy must start the app and media worker")
console.log("deploy-media-worker.selfcheck: ok")
