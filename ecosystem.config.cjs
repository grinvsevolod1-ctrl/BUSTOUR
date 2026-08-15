/**
 * pm2 ecosystem — БасТур на VPS (без Docker).
 *
 * Приложения:
 *  - bastur-app          Next.js production server (порт 3000, за nginx)
 *  - bastur-media-worker фоновая обработка загруженных фото/видео
 *
 * Env: конфиг сам читает .env и .env.local из корня проекта (без зависимостей),
 * поэтому media-worker получает DATABASE_URL и остальные переменные так же,
 * как их получал docker-compose через env_file. `next start` дополнительно
 * загружает .env-файлы сам — двойная загрузка безвредна (значения совпадают).
 */
const fs = require("node:fs")
const path = require("node:path")

function parseEnvFile(file) {
  const abs = path.join(__dirname, file)
  if (!fs.existsSync(abs)) return {}
  const out = {}
  for (const rawLine of fs.readFileSync(abs, "utf8").split("\n")) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

// .env.local (машинные значения, не в git) перекрывает .env (общая конфигурация).
const fileEnv = { ...parseEnvFile(".env"), ...parseEnvFile(".env.local") }

const sharedEnv = {
  NODE_ENV: "production",
  ...fileEnv,
}

module.exports = {
  apps: [
    {
      name: "bastur-app",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      // Bind to localhost only — nginx is the public entrypoint and sets X-Real-IP.
      args: `start -p ${fileEnv.PORT || 3000} -H 127.0.0.1`,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "1200M",
      kill_timeout: 10_000,
      env: sharedEnv,
      out_file: "logs/app.out.log",
      error_file: "logs/app.err.log",
      merge_logs: true,
      time: true,
    },
    {
      name: "bastur-media-worker",
      cwd: __dirname,
      script: "node_modules/tsx/dist/cli.mjs",
      args: "scripts/media-worker.ts",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "800M",
      kill_timeout: 15_000,
      env: sharedEnv,
      out_file: "logs/media-worker.out.log",
      error_file: "logs/media-worker.err.log",
      merge_logs: true,
      time: true,
    },
  ],
}
