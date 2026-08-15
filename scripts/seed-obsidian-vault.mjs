import fs from "node:fs";
import path from "node:path";

const vault = String.raw`E:\ObsidianSpace\agent-kb\bustour`;

function w(rel, content) {
  const full = path.join(vault, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content.trimStart() + "\n", "utf8");
  console.log("wrote", rel);
}

const types = [
  "stack",
  "component",
  "domain",
  "route",
  "lib",
  "skill",
  "rule",
  "decision",
  "qa",
  "ops",
];

for (const t of types) {
  w(
    `_templates/tpl-${t}.md`,
    `---
type: ${t}
status: stub
updated: YYYY-MM-DD
code_paths: []
aliases: []
tags: [bustour]
---
# Заголовок по-русски

## Суть

1–3 предложения.

## Где в коде

- пути / роуты

## Связи

- [[related-note]]

## Договорённости / ловушки

-

## См. также

- PROJECT_CONTEXT.md / MEMORY.md (не копипастить WIP)
`,
  );
}

// ensure missing MOCs
w(
  "01-MOC/moc-skills.md",
  `---
type: moc
status: active
updated: 2026-07-24
tags: [bustour, moc]
---
# MOC: Skills

- [[skill-ponytail]] — CSS/UI точечные правки
- [[skill-webapp-testing]] — Playwright / browser QA
- [[skill-orchestration]] — Orca multi-agent
`,
);

w(
  "01-MOC/moc-routes.md",
  `---
type: moc
status: active
updated: 2026-07-24
tags: [bustour, moc]
---
# MOC: Маршруты

Пока stubs редки — смотри PROJECT_CONTEXT.md (публичная часть / админка).
Пополнять при работе над конкретным URL: файл в 05-Routes/, ссылка сюда.
`,
);

const notes = {
  "02-Stack/nextjs.md": `---
type: stack
status: active
updated: 2026-07-24
code_paths:
  - app/
tags: [bustour, stack]
---
# Next.js 16

## Суть

App Router, Turbopack, React 19. Публичное — app/(site), админка — app/admin.

## Где в коде

- app/(site)/**
- app/admin/**

## Связи

- [[moc-stack]]
- [[tailwind-v4]]
- [[tiptap]]

## Договорённости / ловушки

- Пакетный менеджер — pnpm
- RSC по умолчанию; client components только где нужна интерактивность

## См. также

- PROJECT_CONTEXT.md § Стек
`,

  "02-Stack/drizzle-libsql.md": `---
type: stack
status: active
updated: 2026-07-24
code_paths:
  - lib/db/index.ts
  - lib/db/schema.ts
  - lib/db/init.ts
tags: [bustour, stack]
---
# Drizzle + libSQL

## Суть

ORM Drizzle + @libsql/client (SQLite/libSQL). Схема, migrate в try/catch, seed при пустых таблицах.

## Где в коде

- lib/db/schema.ts, lib/db/init.ts, lib/db/seed-data.ts, lib/db/cms-seed.ts

## Связи

- [[moc-stack]]
- [[soft-delete-tours]]
- [[currencies]]

## Договорённости / ловушки

- Новые колонки — в migrate() через ALTER ADD COLUMN в try/catch
- Не ломать существующие локальные БД чистым recreate

## См. также

- PROJECT_CONTEXT.md § База данных
`,

  "02-Stack/tailwind-v4.md": `---
type: stack
status: active
updated: 2026-07-24
code_paths:
  - app/globals.css
tags: [bustour, stack]
---
# Tailwind CSS v4

## Суть

Без tailwind.config.js. Тема через @theme в app/globals.css.

## Где в коде

- app/globals.css
- components/**

## Связи

- [[moc-stack]]
- [[nextjs]]
- [[skill-ponytail]]

## Договорённости / ловушки

- Не добавлять классический tailwind.config.js без явного решения

## См. также

- PROJECT_CONTEXT.md § Стек
`,

  "02-Stack/tiptap.md": `---
type: stack
status: active
updated: 2026-07-24
code_paths: []
tags: [bustour, stack]
---
# TipTap

## Суть

WYSIWYG для SEO HTML в админке (seoHtml и CMS-поля).

## Где в коде

- @tiptap/* зависимости; редакторы в admin UI

## Связи

- [[moc-stack]]
- [[cms-settings-keys]]

## Договорённости / ловушки

- При правках редактора — skill tiptap (~/.agents/skills/tiptap)

## См. также

- PROJECT_CONTEXT.md § Стек / SEO
`,

  "02-Stack/playwright.md": `---
type: stack
status: active
updated: 2026-07-24
code_paths:
  - e2e/
  - .cursor/mcp.json
tags: [bustour, stack]
---
# Playwright

## Суть

E2E и Visual QA. MCP @playwright/mcp. Браузеры на Z:, не в TEMP на C:.

## Где в коде

- npm run test:e2e, scripts/smoke-*.ts, MCP playwright

## Связи

- [[moc-stack]]
- [[moc-qa]]
- [[ops-playwright-browsers]]
- [[rule-qa-testing]]
- [[skill-webapp-testing]]

## Договорённости / ловушки

- Breakpoints: 1440 / 1024 / 768 / 320
- Selfcheck ≠ e2e

## См. также

- .cursor/rules/qa-testing.mdc
`,

  "03-Components/page-alert.md": `---
type: component
status: active
updated: 2026-07-24
code_paths:
  - components/site/alert.tsx
tags: [bustour, component]
---
# PageAlert

## Суть

Клиентский баннер алерта на CMS-страницах. Читает {prefix}.alertText / alertType; опциональный fallbackPrefix (legacy Egypt).

## Где в коде

- components/site/alert.tsx
- Роуты catalog: aviatory, avtobusnye-tury, hot, …

## Связи

- [[moc-components]]
- [[page-alerts]]
- [[page-alert-lib]]

## Договорённости / ловушки

- Не класть ParsedText внутрь Alert (ломает client dates-table)
- Admin сохраняет поля через pageAlertFields(prefix)

## См. также

- scripts/page-alert-coverage.selfcheck.ts
`,

  "03-Components/site-footer.md": `---
type: component
status: stub
updated: 2026-07-24
code_paths:
  - components/site/site-footer.tsx
tags: [bustour, component]
---
# Site footer

## Суть

Футер публичного сайта, ссылки на legal и разделы.

## Где в коде

- components/site/site-footer.tsx

## Связи

- [[moc-components]]
- [[nextjs]]

## Договорённости / ловушки

- Legal URL: /legal/privacy|offer|cookies|video

## См. также

- PROJECT_CONTEXT.md § Юридические документы
`,

  "04-Domains/page-alerts.md": `---
type: domain
status: active
updated: 2026-07-24
code_paths:
  - lib/page-alert.ts
  - components/site/alert.tsx
tags: [bustour, domain]
---
# Page alerts (домен)

## Суть

Алерты каталога: ключи CMS {prefix}.alertText / {prefix}.alertType. Покрытие публичных роутов — PageAlert + selfcheck.

## Где в коде

- lib/page-alert.ts
- components/site/alert.tsx
- npm run test:page-alert

## Связи

- [[moc-domains]]
- [[page-alert]]
- [[page-alert-lib]]
- [[cms-settings-keys]]

## Договорённости / ловушки

- Legacy Egypt: public country:avia:egipet + fallback egipet.*
- Shortcodes дат — не в Alert; expand на call site

## См. также

- MEMORY.md (WIP линии alerts)
`,

  "04-Domains/cms-settings-keys.md": `---
type: domain
status: stub
updated: 2026-07-24
code_paths:
  - lib/db/cms-seed.ts
tags: [bustour, domain]
---
# CMS settings keys

## Суть

Статические страницы и блоки управляются ключами настроек в CMS (prefix.*).

## Где в коде

- lib/db/cms-seed.ts
- admin pages editors

## Связи

- [[moc-domains]]
- [[page-alerts]]
- [[tiptap]]

## Договорённости / ловушки

- Новая статическая страница — чеклист в PROJECT_CONTEXT.md

## См. также

- PROJECT_CONTEXT.md § Статические страницы
`,

  "04-Domains/soft-delete-tours.md": `---
type: domain
status: stub
updated: 2026-07-24
code_paths:
  - lib/db/schema.ts
tags: [bustour, domain]
---
# Soft-delete туров

## Суть

tours.archived — soft-delete; публичные getters и default lists исключают archived=true.

## Где в коде

- lib/db/schema.ts (archived)
- getters туров в lib/

## Связи

- [[moc-domains]]
- [[drizzle-libsql]]

## Договорённости / ловушки

- Не показывать archived в публичном каталоге

## См. также

- PROJECT_CONTEXT.md § tours
`,

  "04-Domains/currencies.md": `---
type: domain
status: stub
updated: 2026-07-24
code_paths:
  - lib/db/schema.ts
tags: [bustour, domain]
---
# Currencies

## Суть

Таблица currencies; priceAmount — источник истины в базовой валюте; ровно одна isBase.

## Где в коде

- currencies table, ensureOneBase

## Связи

- [[moc-domains]]
- [[drizzle-libsql]]

## Договорённости / ловушки

- Форматированная price — производная; не править только строку цены в обход amount

## См. также

- PROJECT_CONTEXT.md § Валюты / цены
`,

  "06-Libs/page-alert-lib.md": `---
type: lib
status: active
updated: 2026-07-24
code_paths:
  - lib/page-alert.ts
tags: [bustour, lib]
---
# lib/page-alert

## Суть

Хелперы резолва alert-полей CMS и pageAlertFields для админки.

## Где в коде

- lib/page-alert.ts

## Связи

- [[moc-libs]]
- [[page-alerts]]
- [[page-alert]]

## Договорённости / ловушки

- Selfcheck: scripts/page-alert-coverage.selfcheck.ts, resolve-page-alert.selfcheck.ts

## См. также

- components/site/alert.tsx
`,

  "06-Libs/admin-audit.md": `---
type: lib
status: active
updated: 2026-07-24
code_paths:
  - lib/admin-audit.ts
tags: [bustour, lib]
---
# Admin audit (writeAudit)

## Суть

Любая мутация через админку/защищённые API после успешной записи вызывает writeAudit.

## Где в коде

- lib/admin-audit.ts
- scripts/audit-coverage.selfcheck.ts

## Связи

- [[moc-libs]]
- [[rule-admin-audit]]

## Договорённости / ловушки

- action: entity_verb snake_case
- Ошибки writeAudit глотаются; мутация не падает из-за аудита
- Публичный POST /api/lead не обязан писать admin-журнал

## См. также

- .cursor/rules/admin-audit.mdc
`,

  "07-Skills/skill-ponytail.md": `---
type: skill
status: active
updated: 2026-07-24
code_paths: []
tags: [bustour, skill]
---
# Skill: ponytail

## Суть

Точечные CSS/UI правки в существующем design system.

## Где в коде

- .agents/skills/ponytail (репо)
- ~/.agents/skills/ponytail

## Связи

- [[moc-skills]]
- [[tailwind-v4]]

## Договорённости / ловушки

- Читать SKILL.md перед UI-правками

## См. также

- frontend-design skill при новых визуальных поверхностях
`,

  "07-Skills/skill-webapp-testing.md": `---
type: skill
status: active
updated: 2026-07-24
code_paths: []
tags: [bustour, skill]
---
# Skill: webapp-testing

## Суть

Playwright / browser automation для QA публичных страниц.

## Где в коде

- ~/.agents/skills/webapp-testing
- MCP playwright

## Связи

- [[moc-skills]]
- [[playwright]]
- [[ops-playwright-browsers]]
- [[rule-qa-testing]]

## Договорённости / ловушки

- PLAYWRIGHT_BROWSERS_PATH = Z:\\bustour\\playwright-browsers

## См. также

- .cursor/rules/qa-testing.mdc
`,

  "07-Skills/skill-orchestration.md": `---
type: skill
status: active
updated: 2026-07-24
code_paths: []
tags: [bustour, skill]
---
# Skill: orchestration (Orca)

## Суть

Supervised multi-agent через Orca CLI: task-create → dispatch → check --wait.

## Где в коде

- ~/.agents/skills/orchestration
- ~/.agents/skills/orca-cli
- .cursor/rules/orca-orchestration.mdc

## Связи

- [[moc-skills]]
- [[moc-ops]]

## Договорённости / ловушки

- worker_done ≠ shipped; coordinator verify → merge → push
- Repo id Bustour: a8877f69-96a2-4be4-9d1e-31018c635d05

## См. также

- .cursor/rules/orca-orchestration.mdc
`,

  "08-Rules/rule-session-context.md": `---
type: rule
status: active
updated: 2026-07-24
code_paths:
  - .cursor/rules/session-context.mdc
tags: [bustour, rule]
---
# Rule: session-context

## Суть

Старт чата: MEMORY.md → PROJECT_CONTEXT.md; глубина — Obsidian.

## Где в коде

- .cursor/rules/session-context.mdc

## Связи

- [[moc-rules]]
- [[rule-obsidian-context]]

## Договорённости / ловушки

- Не отвечать из устаревшей chat-памяти

## См. также

- Home.md
`,

  "08-Rules/rule-obsidian-context.md": `---
type: rule
status: active
updated: 2026-07-24
code_paths:
  - .cursor/rules/obsidian-context.mdc
tags: [bustour, rule]
---
# Rule: obsidian-context

## Суть

Как читать/писать этот vault через MCP obsidian.

## Где в коде

- .cursor/rules/obsidian-context.mdc
- .cursor/mcp.json

## Связи

- [[moc-rules]]
- [[Home]]

## Договорённости / ловушки

- Не дублировать MEMORY; не писать секреты; NotebookLM выключен

## См. также

- Home.md
`,

  "08-Rules/rule-git-policy.md": `---
type: rule
status: active
updated: 2026-07-24
code_paths:
  - .cursor/rules/git-policy.mdc
tags: [bustour, rule]
---
# Rule: git-policy

## Суть

После логического шага — commit Conventional + push. Vault Obsidian вне git.

## Где в коде

- .cursor/rules/git-policy.mdc

## Связи

- [[moc-rules]]

## Договорённости / ловушки

- Не force push main; не коммитить .env

## См. также

- PROJECT_CONTEXT / MEMORY обновлять в репо
`,

  "08-Rules/rule-admin-audit.md": `---
type: rule
status: active
updated: 2026-07-24
code_paths:
  - .cursor/rules/admin-audit.mdc
tags: [bustour, rule]
---
# Rule: admin-audit

## Суть

Мутации админки → writeAudit. Покрытие — audit-coverage.selfcheck.

## Где в коде

- .cursor/rules/admin-audit.mdc

## Связи

- [[moc-rules]]
- [[admin-audit]]

## Договорённости / ловушки

- См. заметку [[admin-audit]]

## См. также

- lib/admin-audit.ts
`,

  "08-Rules/rule-qa-testing.md": `---
type: rule
status: active
updated: 2026-07-24
code_paths:
  - .cursor/rules/qa-testing.mdc
tags: [bustour, rule]
---
# Rule: qa-testing

## Суть

Playwright MCP для Visual QA; breakpoints 1440/1024/768/320; browsers на Z:.

## Где в коде

- .cursor/rules/qa-testing.mdc

## Связи

- [[moc-rules]]
- [[playwright]]
- [[ops-playwright-browsers]]

## Договорённости / ловушки

- Admin UI нет в Figma Design — QA по коду /admin

## См. также

- analisis/ reports
`,

  "11-Ops/ops-playwright-browsers.md": `---
type: ops
status: active
updated: 2026-07-24
code_paths: []
tags: [bustour, ops]
---
# Playwright browsers path

## Суть

Бинарники Chromium не на C: TEMP (ENOSPC). Путь: Z:\\bustour\\playwright-browsers.

## Где в коде

- env PLAYWRIGHT_BROWSERS_PATH
- npm run playwright:install

## Связи

- [[moc-ops]]
- [[playwright]]
- [[rule-qa-testing]]

## Договорённости / ловушки

- Перед test:e2e в агент-шелле выставлять тот же env

## См. также

- .cursor/rules/qa-testing.mdc
`,

  "Добро пожаловать.md": `---
type: moc
status: deprecated
updated: 2026-07-24
tags: [bustour]
---
# Добро пожаловать

Стартовая заметка Obsidian. Актуальный вход в граф Bustour: [[Home]].
`,
};

for (const [rel, body] of Object.entries(notes)) {
  w(rel, body);
}

console.log("ok all");
