#!/usr/bin/env bash
# =============================================================================
# БасТур — автономный деплой с ветки main.
#
# Делает: fetch → (есть ли новые коммиты?) → npm ci → миграции → build →
#         pm2 reload → health-check → при провале автоматический откат.
#
# Режимы:
#   ./scripts/auto-deploy.sh            # деплой безусловно (ручной запуск)
#   ./scripts/auto-deploy.sh --poll     # деплой только если origin/main ушёл вперёд
#                                       # (для cron/systemd-timer — полная автономность)
#
# Настройка автономного режима на сервере (вариант A — cron, каждые 2 минуты):
#   crontab -e
#   */2 * * * * /var/www/bastur/scripts/auto-deploy.sh --poll >> /var/www/bastur/logs/auto-deploy.log 2>&1
#
# Вариант B — GitHub Actions push-деплой: см. .github/workflows/deploy.yml
# (мгновенная реакция на push; требует SSH-секретов в репозитории).
# Оба варианта совместимы: lock-файл не даст им пересечься.
# =============================================================================
set -euo pipefail

BRANCH="${DEPLOY_BRANCH:-main}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK_FILE="$APP_DIR/.deploy.lock"
HEALTH_URL="${DEPLOY_HEALTH_URL:-http://127.0.0.1:3000/api/health}"
HEALTH_RETRIES="${DEPLOY_HEALTH_RETRIES:-15}"
HEALTH_INTERVAL="${DEPLOY_HEALTH_INTERVAL:-4}"
PM2_APPS=("bastur-app" "bastur-media-worker")

cd "$APP_DIR"

log() { echo "[deploy $(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# --- Одновременные запуски исключены (cron + Actions не пересекутся) --------
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "Другой деплой уже идёт — выходим."
  exit 0
fi

# --- Получаем свежие ссылки ---------------------------------------------------
git fetch origin "$BRANCH" --quiet

LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse "origin/$BRANCH")"

if [[ "${1:-}" == "--poll" && "$LOCAL_SHA" == "$REMOTE_SHA" ]]; then
  exit 0 # нет новых коммитов — тихо выходим (лог не засоряем)
fi

log "Деплой $LOCAL_SHA -> $REMOTE_SHA (ветка $BRANCH)"

rollback() {
  log "ОТКАТ на $LOCAL_SHA после ошибки."
  git reset --hard "$LOCAL_SHA"
  npm ci --no-audit --no-fund || npm install --no-audit --no-fund
  npm run build
  for app in "${PM2_APPS[@]}"; do pm2 restart "$app" --update-env || true; done
  log "Откат завершён. Проверьте logs/auto-deploy.log и почините main."
}

# --- Обновление кода ---------------------------------------------------------
git reset --hard "origin/$BRANCH"

# --- Зависимости, миграции, сборка. Любая ошибка => откат. -------------------
if ! (
  set -e
  npm ci --no-audit --no-fund || npm install --no-audit --no-fund
  # Схема управляется деплоем, не рантаймом (BASTUR_SKIP_RUNTIME_MIGRATIONS=1 в .env)
  npm run db:migrate:prod
  npm run build
); then
  rollback
  exit 1
fi

# --- Перезапуск процессов ------------------------------------------------------
pm2 startOrReload ecosystem.config.cjs --update-env

# --- Health-check с ретраями ---------------------------------------------------
healthy=""
for i in $(seq 1 "$HEALTH_RETRIES"); do
  sleep "$HEALTH_INTERVAL"
  if curl -fsS --max-time 5 "$HEALTH_URL" | grep -q '"ok":true'; then
    healthy=1
    break
  fi
  log "health-check $i/$HEALTH_RETRIES не прошёл, ждём..."
done

if [[ -z "$healthy" ]]; then
  log "Приложение не поднялось после деплоя."
  rollback
  # После отката тоже убеждаемся, что живы
  sleep "$HEALTH_INTERVAL"
  curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null || log "ВНИМАНИЕ: откат тоже не прошёл health-check!"
  exit 1
fi

log "Деплой $REMOTE_SHA успешен, health-check OK."
