# Деплой БасТур на VPS (pm2, без Docker)

## Архитектура

```
Интернет → nginx :80/:443 → Next.js (pm2 "bastur-app", 127.0.0.1:3000)
                                └─ media-worker (pm2 "bastur-media-worker")
PostgreSQL — нативно на VPS (127.0.0.1:5432)
Файлы: public/uploads/ (раздаются приложением с Range-стримингом)
```

## Первый запуск на чистом VPS

```bash
# 1. Node.js 20+ (если нет)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git

# 2. Клонировать проект
git clone git@github.com:grinvsevolod1-ctrl/BUSTOUR.git /opt/bastur
cd /opt/bastur

# 3. Настроить env
cp .env.example .env
nano .env   # заполнить DATABASE_URL, AUTH_SECRET, ADMIN_*, reCAPTCHA и т.д.

# 4. Всё остальное сделает скрипт (pm2, PostgreSQL, nginx, БД, сборка, запуск)
chmod +x deploy.sh
./deploy.sh --setup

# 5. Автозапуск pm2 после перезагрузки VPS
pm2 startup   # выполнить команду, которую он выведет
pm2 save
```

## Обычный деплой (одна команда)

```bash
cd /opt/bastur && ./deploy.sh
```

Скрипт делает: `git pull` → `npm ci` → `next build` → миграции БД → `pm2 reload` → health-check.
Если health-check не проходит — деплой завершается ошибкой, смотрите `pm2 logs bastur-app`.

## Переезд на bus-tour.by

Домен объявлен глобально в `.env`:

```bash
NEXT_PUBLIC_SITE_URL=https://testnetnext.top   # сейчас
# NEXT_PUBLIC_SITE_URL=https://bus-tour.by     # после переезда — просто поменять и ./deploy.sh --no-pull
```

`ops/nginx/bastur.conf` уже содержит оба домена в `server_name` — при переезде ничего менять не нужно, только выпустить сертификат.

## TLS (HTTPS)

После наведения DNS на VPS:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d testnetnext.top -d www.testnetnext.top
# после переезда:
sudo certbot --nginx -d bus-tour.by -d www.bus-tour.by
```

После включения HTTPS убедитесь, что `NEXT_PUBLIC_SITE_URL` начинается с `https://` — админ-кука станет `Secure` автоматически (протокол берётся из этой переменной).

## Производительность (nginx)

`ops/nginx/bastur.conf` включает:

- **gzip** для HTML/CSS/JS/JSON/SVG;
- **микрокеш HTML на 5 секунд** для анонимных посетителей — публичные страницы
  рендерятся динамически (каждый запрос идёт в PostgreSQL), микрокеш снимает
  нагрузку при всплесках трафика. Залогиненный админ (кука `bastur_admin`)
  и раздел `/admin` кеш обходят полностью, свежесть контента после правок
  в админке — максимум 5 секунд;
- заголовок `X-Cache-Status` (HIT/MISS/BYPASS) для диагностики.

Проверка: `curl -sI https://testnetnext.top/ | grep -i x-cache-status`

## Полезные команды

```bash
pm2 ls                          # статус процессов
pm2 logs bastur-app             # логи приложения
pm2 logs bastur-media-worker    # логи обработки медиа
pm2 monit                       # монитор CPU/RAM
node scripts/migrate.mjs        # миграции вручную (нужен DATABASE_URL в окружении)
```

## Бэкапы (настоятельно рекомендуется)

```bash
# Добавить в crontab -e (ежедневно в 03:30):
30 3 * * * pg_dump "$(grep ^DATABASE_URL /opt/bastur/.env | cut -d= -f2-)" | gzip > /var/backups/bastur-$(date +\%F).sql.gz
40 3 * * * tar czf /var/backups/bastur-uploads-$(date +\%F).tar.gz -C /opt/bastur/public uploads
# и периодически копировать /var/backups наружу (rclone / scp)
```

## Ключевые env-переменные

| Переменная | Назначение |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Канонический домен (глобально: robots, sitemap, canonical, OG) |
| `BASTUR_DEPLOY_ENV` | `production` на VPS — включает строгую проверку reCAPTCHA |
| `DATABASE_URL` | PostgreSQL: `postgresql://user:pass@127.0.0.1:5432/bastur` |
| `AUTH_SECRET` | HMAC-подпись админ-сессий (openssl rand -base64 32) |
| `PORT` | Порт приложения (по умолчанию 3000, слушает только 127.0.0.1) |

Полный список — в `.env.example`.
