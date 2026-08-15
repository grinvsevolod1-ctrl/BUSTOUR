# AGENTS.md — паспорт проекта БасТур

Этот файл — вводная для AI-агента (и нового разработчика), начинающего работу
с проектом в новом чате. Прочитай его целиком перед любыми изменениями.

## Что это за проект

**БасТур** — сайт туристической компании из Беларуси: автобусные туры,
авиатуры, горящие туры, трансферы и аренда автобусов. Язык сайта — русский.
Проект состоит из публичного сайта и полноценной админ-панели (`/admin`)
с ролями, аудитом и CMS-настройками почти каждого текста на сайте.

- **Прод:** https://testnetnext.top (временный домен; боевой будет `bus-tour.by` —
  смена домена = поменять `NEXT_PUBLIC_SITE_URL` в `.env` и передеплоить)
- **Репозиторий:** github.com/grinvsevolod1-ctrl/BUSTOUR, рабочая ветка `main`
- **Хостинг:** собственный VPS (Ubuntu), nginx → pm2 → Next.js standalone на
  порту 3000, PostgreSQL 18 на той же машине. НЕ Vercel-хостинг.

## Стек

- **Next.js 16** (App Router, сборка `next build --webpack` — НЕ turbopack,
  т.к. кастомный webpack-конфиг), React 19, TypeScript strict
- **Tailwind CSS v4** (`@theme` в `app/globals.css`, БЕЗ tailwind.config)
- **Drizzle ORM + node-postgres (pg)** — схема в `lib/db/schema.ts`,
  миграции в `drizzle/`, генерация `npm run db:generate`
- **Кастомная auth** (`lib/auth.ts`, `lib/admin-session.ts`) — сессии в куки,
  пароли через scrypt. НЕ Better Auth / NextAuth / Supabase
- TipTap (rich-text в админке), Zod (валидация), sharp (обработка картинок),
  exceljs (импорт/экспорт цен), motion, sonner (тосты), consentium (cookie-баннер)
- **Тесты:** vitest (`tests/`, `npm test`) + большой набор selfcheck-скриптов
  (`scripts/*.selfcheck.ts`, `npm run test:smart`) + Playwright e2e

## Структура

```
app/
  (site)/          # публичный сайт: aviatory, avtobusnye-tury, hot, tour,
                   # bus-rental, company, contacts, info, legal, testimonials
  admin/           # админка: login + (protected)/ со всеми разделами
  api/             # route handlers (health, формы, revalidate и пр.)
  uploads/         # раздача загруженных файлов
  sitemap.ts       # динамический sitemap из БД
  robots.ts        # robots с запретом /admin, /api
components/
  admin/           # UI админки; admin-nav-tree.ts — ДАННЫЕ дерева навигации,
                   # admin-sections.ts — единый реестр разделов (поиск+права),
                   # admin-search.tsx — поиск по Ctrl+K (портал в body!)
  site/            # UI публичного сайта
  ui/              # базовые примитивы
lib/
  db/              # drizzle: schema, клиент
  queries/         # запросы по доменам; move.ts — ЕДИНАЯ утилита перестановок
  admin-config.ts  # типы полей и статические группы настроек страниц
  admin-page-configs.ts  # фабрики конфигов /admin/pages/* (вынесены из admin-config)
  seo-metadata.ts  # buildMetadata для страниц; fallback OG = /images/og-default.png
  canonical-origin.ts    # единый источник canonical URL (NEXT_PUBLIC_SITE_URL)
  proxy-origin.ts  # INTERNAL_ORIGIN (loopback) и publicOrigin за nginx
  avia-slug.ts     # переименовываемый слаг раздела авиатуров (/aviatury и т.п.)
middleware.ts      # rewrite авиа-слага, редиректы; см. «Грабли» ниже
scripts/           # preflight, миграции, seed, десятки selfcheck-тестов
tests/             # vitest-тесты (move, avia-slug, proxy-origin)
ops/auto-deploy/   # systemd-таймер автодеплоя на сервере
deploy.sh          # главный скрипт деплоя на VPS (см. «Деплой»)
ecosystem.config.cjs  # pm2: процессы bastur-app + bastur-cron
```

## Ключевые соглашения

1. **Никакого localStorage для данных** — всё в PostgreSQL через Drizzle.
2. **Все тексты сайта редактируются из админки** — настройки хранятся в БД
   (site_settings и др.), не хардкодь строки, которые уже есть в CMS.
   Конфиги форм настроек — `lib/admin-config.ts` + `lib/admin-page-configs.ts`.
3. **Перестановки (up/down) любых сущностей** — только через
   `lib/queries/move.ts` (`computeSwapUpdates`/`moveSortable`). Не пиши свою.
4. **Разделы админки** (навигация, поиск, права) — единый реестр
   `components/admin/admin-sections.ts` + дерево `admin-nav-tree.ts`.
   Новый раздел добавляй в ОБА.
5. **Soft-delete/архив** вместо удаления для основных сущностей
   (`archived`-флаг, `lib/archive-slug.ts`).
6. **Аудит** — все admin-мутации логируются (`lib/admin-audit.ts`,
   обёртка `lib/admin-action.ts`). Новые server actions оборачивай так же.
7. **Роли и права** — `lib/admin-roles.ts` (capability-модель). Проверяй
   capability и в UI (реестр разделов), и в server action.
8. **SQL только параметризованный** (Drizzle это делает сам).
9. Комментарии в коде — по-русски, объясняют «почему», а не «что».

## Деплой и сервер

- **Автодеплой уже настроен:** systemd-таймер на сервере раз в минуту
  проверяет `origin/main` и при новых коммитах запускает `deploy.sh`.
  **Пуш в main = деплой на прод.** Логи: `journalctl -u bastur-auto-deploy -f`.
- `deploy.sh` (на сервере, в `/var/www/bustour`): git pull → npm ci →
  preflight → build → миграции (`db:migrate:prod`) → pm2 startOrReload →
  health-check. Флаги: `--setup` (первичная установка), `--no-pull`.
- pm2-процессы: `bastur-app` (web) и `bastur-cron`. Логи:
  `pm2 logs bastur-app --lines 50 --nostream`. Ротация — pm2-logrotate
  (ставится deploy.sh автоматически).
- HTTPS: nginx + certbot с автопродлением.
- Перед коммитом локально прогоняй: `npx tsc --noEmit`, `npm test`,
  при больших изменениях `npm run build`.

## Окружение (.env на сервере, шаблон .env.example)

- `NEXT_PUBLIC_SITE_URL` — ГЛАВНЫЙ переключатель домена (canonical, OG,
  sitemap, Secure-куки).
- `BASTUR_DEPLOY_ENV` — production | dev | local. В production капча
  ОБЯЗАТЕЛЬНА: без `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`/`RECAPTCHA_SECRET_KEY`
  формы (заявки/отзывы) не отправятся. Это известный незакрытый пункт —
  ключи ждут владельца (reCAPTCHA v3).
- `DATABASE_URL` — локальный PostgreSQL на VPS.
- `AUTH_SECRET` — секрет сессий (openssl rand -hex 32).
- В песочнице v0 dev-сервер запускается `BUSTOUR_SKIP_PREFLIGHT=1 npm run dev`
  с локальным PostgreSQL (`pg_ctl -D /tmp/pgdata`).

## Известные грабли (не наступать повторно)

1. **Прокси-петля за nginx:** `request.nextUrl.origin` за прокси становится
   `https://localhost:3000`; fetch/rewrite на него = EPROTO/500. Используй
   `INTERNAL_ORIGIN` (loopback http) из `lib/proxy-origin.ts` для внутренних
   запросов и `publicOrigin()` для Location-заголовков. В middleware у
   rewrite стоит заголовок-маркер против петли — не убирай.
2. **Sticky-сайдбар админки создаёт stacking context:** любые модалки внутри
   него «запираются» по z-index и перекрываются шапками контента. Все
   оверлеи админки рендерь через портал в `document.body` (z-[100]),
   как admin-search и остальные диалоги.
3. **CSP в production** разрешает `unsafe-eval` (нужен tourvisor-виджету)
   и фреймы yandex.ru/yandex.by. Ужесточая CSP — проверь виджеты.
4. **sharp** на сервере собран из исходников под CPU хоста; `npm ci` в
   deploy.sh это учитывает — не меняй установку sharp бездумно.
5. **`next build --webpack`** — переход на turbopack сломает кастомный
   webpack-конфиг. Не менять без проверки.
6. **Cookie-баннер (consentium)** отключён на `/admin`-маршрутах в
   `components/site-consent.tsx` — не возвращай его в админку.
7. **OG-изображения — только PNG** (`/images/og-default.png`): мессенджеры
   не рендерят SVG в превью ссылок.
8. **Миграции схемы** — только через drizzle-миграции и `db:migrate:prod`
   в деплое. На старте web-процесса миграции пропускаются
   (`BASTUR_SKIP_RUNTIME_MIGRATIONS`), не запускай их из кода приложения.

## Тестирование

- `npm test` — vitest-юниты (tests/).
- `npm run test:smart` — умный прогон selfcheck-скриптов по затронутым файлам.
- `npm run test:e2e` — Playwright (нужен `npm run playwright:install`).
- Selfcheck `test:security` включает rate-limit, пароли, avia-slug.
- Предупреждение «recaptcha selfcheck failed» в preflight на проде —
  ожидаемое (тест dev-байпаса капчи), деплой не блокирует.

## Что просил владелец проекта (стиль работы)

- Общение на русском; краткие итоги, таблицы статусов после деплоя.
- После изменений — пуш в `main` (автодеплой подхватит сам), затем короткая
  инструкция, что проверить в браузере (Ctrl+Shift+R).
- Диагностика прода: присылает вывод `deploy.sh`, `pm2 logs`, консоль
  браузера — отвечать по сути, чинить, пушить.
