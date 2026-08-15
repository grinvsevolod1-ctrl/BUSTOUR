import { execFileSync } from "node:child_process"

if (process.env.BASTUR_DEPLOY_ENV !== "dev") {
  throw new Error("[db:reset:dev] Refusing reset: BASTUR_DEPLOY_ENV must equal dev")
}
if (process.env.CONFIRM_DEV_DB_RESET !== "RESET_BASTUR_DEV_DB") {
  throw new Error("[db:reset:dev] Refusing reset: set CONFIRM_DEV_DB_RESET=RESET_BASTUR_DEV_DB")
}

const compose = ["compose", "down", "--volumes"]
console.warn("[db:reset:dev] Removing DEV compose containers and PostgreSQL volume")
execFileSync("docker", compose, { stdio: "inherit", shell: process.platform === "win32" })
console.log("[db:reset:dev] DEV PostgreSQL volume removed; run docker compose up deliberately")
