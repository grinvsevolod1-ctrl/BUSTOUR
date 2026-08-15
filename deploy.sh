#!/usr/bin/env bash
# =============================================================================
# БасТур — деплой одной командой на VPS (pm2, без Docker).
#
# Использование (на VPS, из корня проекта):
#   ./deploy.sh              обычный деплой: git pull → deps → build → migrate → pm2 reload
#   ./deploy.sh --setup      первый запуск: установит pm2/PostgreSQL/nginx при необходимости
#   ./deploy.sh --no-pull    задеплоить текущий код без git pull
#
# Требования: Node.js 20+, git. Остальное поставит --setup.
# =============================================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

BRANCH="${DEPLOY_BRANCH:-main}"
DO_PULL=1
DO_SETUP=0

for arg in "$@"; do
  case "$arg" in
    --no-pull) DO_PULL=0 ;;
    --setup) DO_SETUP=1 ;;
    *) echo "Неизвестный аргумент: $arg"; exit 1 ;;
  esac
done

log()  { printf "\n\033[1;36m[deploy]\033[0m %s\n" "$*"; }
fail() { printf "\n\033[1;31m[deploy] ОШИБКА:\033[0m %s\n" "$*"; exit 1; }

# --- 0. Проверки окружения --------------------------------------------------
command -v node >/dev/null 2>&1 || fail "Node.js не найден. Установите Node 20+ (https://nodejs.org)"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 20 ] || fail "Нужен Node.js 20+, найден $(node -v)"

[ -f .env ] || fail ".env не найден. Скопируйте .env.example в .env и заполните значения."

# Загружаем env для migrate-шага (pm2 сам читает .env через ecosystem.config.cjs)
set -a; . ./.env; [ -f .env.local ] && . ./.env.local; set +a
[ -n "${DATABASE_URL:-}" ] || fail "DATABASE_URL не задан в .env"

# --- 1. Первичная настройка (--setup) ----------------------------------------
if [ "$DO_SETUP" -eq 1 ]; then
  log "Первичная настройка VPS"

  if ! command -v pm2 >/dev/null 2>&1; then
    log "Устанавливаю pm2 глобально"
    npm install -g pm2
  fi

  if ! command -v psql >/dev/null 2>&1; then
    log "Устанавливаю PostgreSQL (apt)"
    sudo apt-get update -qq
    sudo apt-get install -y -qq postgresql postgresql-contrib
    sudo systemctl enable --now postgresql
  fi

  # Создаём БД/пользователя из DATABASE_URL, если ещё нет
  DB_USER="$(node -p 'new URL(process.env.DATABASE_URL).username' 2>/dev/null || true)"
  DB_PASS="$(node -p 'decodeURIComponent(new URL(process.env.DATABASE_URL).password)' 2>/dev/null || true)"
  DB_NAME="$(node -p 'new URL(process.env.DATABASE_URL).pathname.slice(1)' 2>/dev/null || true)"
  if [ -n "$DB_USER" ] && [ -n "$DB_NAME" ]; then
    log "Проверяю БД '$DB_NAME' и пользователя '$DB_USER'"
    sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 \
      || sudo -u postgres psql -c "CREATE ROLE \"$DB_USER\" LOGIN PASSWORD '$DB_PASS'"
    sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 \
      || sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
  fi

  if ! command -v nginx >/dev/null 2>&1; then
    log "Устанавливаю nginx"
    sudo apt-get install -y -qq nginx
  fi
  if [ ! -f /etc/nginx/sites-available/bastur.conf ]; then
    log "Ставлю nginx-конфиг (ops/nginx/bastur.conf)"
    sudo cp ops/nginx/bastur.conf /etc/nginx/sites-available/bastur.conf
    sudo ln -sf /etc/nginx/sites-available/bastur.conf /etc/nginx/sites-enabled/bastur.conf
    sudo rm -f /etc/nginx/sites-enabled/default
    # Директория для proxy_cache_path из конфига — без неё nginx -t падает
    sudo mkdir -p /var/cache/nginx/bastur
    sudo chown -R www-data:www-data /var/cache/nginx
    sudo nginx -t && sudo systemctl reload nginx
  fi

  mkdir -p logs
fi

command -v pm2 >/dev/null 2>&1 || fail "pm2 не найден. Запустите: ./deploy.sh --setup"

# --- Ротация логов pm2 (идемпотентно) ------------------------------------------
# Без ротации логи pm2 со временем съедают диск. Модуль ставится один раз,
# настройки повторно применять безопасно.
if ! pm2 ls 2>/dev/null | grep -q pm2-logrotate; then
  log "Ставлю pm2-logrotate (ротация логов)"
  pm2 install pm2-logrotate
  pm2 set pm2-logrotate:max_size 20M
  pm2 set pm2-logrotate:retain 14
  pm2 set pm2-logrotate:compress true
  pm2 set pm2-logrotate:rotateInterval '0 3 * * *'
fi

# --- 2. Код -------------------------------------------------------------------
if [ "$DO_PULL" -eq 1 ]; then
  log "git pull origin $BRANCH"
  git fetch origin "$BRANCH"
  git reset --hard "origin/$BRANCH"
fi

# --- 3. Зависимости -----------------------------------------------------------
# --include=dev обязателен: при NODE_ENV=production npm ci иначе пропускает
# dev-зависимости (tsx, typescript), которые нужны для сборки.
log "npm ci"
npm ci --include=dev --no-audit --no-fund

# --- 3b. sharp: пересборка из исходников при несовместимом CPU -----------------
# Prebuilt-бинарники sharp требуют x86-64-v2; на старых CPU падают с
# "Prebuilt binaries for linux-x64 require v2 microarchitecture".
# В этом случае пересобираем sharp из исходников против системного libvips
# (нужны: build-essential python3 pkg-config libvips-dev node-addon-api node-gyp).
if ! node -e "require('sharp')" >/dev/null 2>&1; then
  log "sharp: prebuilt-бинарник не загрузился — пересборка из исходников"
  npm rebuild sharp --build-from-source
  node -e "const s=require('sharp'); console.log('sharp OK:', JSON.stringify(s.versions))"
fi

# --- 4. Сборка ----------------------------------------------------------------
log "next build"
npm run build

# --- 5. Миграции --------------------------------------------------------------
log "Применяю миграции БД"
node scripts/migrate.mjs

# --- 6. pm2 -------------------------------------------------------------------
mkdir -p logs
log "pm2 startOrReload"
pm2 startOrReload ecosystem.config.cjs
pm2 save

# Ротация логов pm2 — без неё логи со временем съедают диск.
# Идемпотентно: повторная установка/set безвредны.
if ! pm2 ls | grep -q pm2-logrotate; then
  log "Устанавливаю pm2-logrotate (ротация логов)"
  pm2 install pm2-logrotate
  pm2 set pm2-logrotate:max_size 20M
  pm2 set pm2-logrotate:retain 14
  pm2 set pm2-logrotate:compress true
  pm2 set pm2-logrotate:rotateInterval '0 3 * * *'
fi

# --- 7. Health-check ----------------------------------------------------------
log "Проверяю /api/health"
sleep 3
for i in 1 2 3 4 5; do
  if curl -fsS "http://127.0.0.1:${PORT:-3000}/api/health" >/dev/null 2>&1; then
    log "Деплой успешен. pm2 status:"
    pm2 ls
    exit 0
  fi
  sleep 3
done

fail "Приложение не отвечает на /api/health. Логи: pm2 logs bastur-app --lines 100"
