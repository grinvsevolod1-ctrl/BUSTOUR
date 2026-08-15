#!/usr/bin/env bash
# Авто-деплой: сравнивает локальный HEAD с origin/main и деплоит при расхождении.
# Запускается systemd-таймером (см. auto-deploy.timer) раз в минуту.
# Установка: bash ops/auto-deploy/install.sh
set -euo pipefail

APP_DIR="/var/www/bustour"
LOCK_FILE="/tmp/bastur-auto-deploy.lock"
LOG_TAG="bastur-auto-deploy"

cd "$APP_DIR"

# flock защищает от параллельных запусков (деплой дольше минуты)
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[$LOG_TAG] предыдущий деплой ещё идёт — пропускаю"
  exit 0
fi

git fetch origin main --quiet

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
  # Нет новых коммитов — тихо выходим
  exit 0
fi

echo "[$LOG_TAG] новый коммит в main: $LOCAL -> $REMOTE, запускаю деплой"
git reset --hard origin/main
chmod +x deploy.sh
./deploy.sh --no-pull
echo "[$LOG_TAG] деплой завершён: $(git rev-parse --short HEAD)"
