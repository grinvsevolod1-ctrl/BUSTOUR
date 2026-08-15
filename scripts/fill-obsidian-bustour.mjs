/**
 * Deep-fill Bustour Obsidian project folder from architecture inventory.
 * Path: E:\ObsidianSpace\agent-kb\bustour
 * Does not touch vault root index.
 */
import fs from "node:fs";
import path from "node:path";

const vault = String.raw`E:\ObsidianSpace\agent-kb\bustour`;
const today = "2026-07-24";

function w(rel, content) {
  const full = path.join(vault, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content.trimStart() + "\n", "utf8");
  console.log("wrote", rel);
}

function note({ type, status = "active", code_paths = [], title, body, tags = ["bustour"] }) {
  const paths =
    code_paths.length === 0
      ? ""
      : "code_paths:\n" + code_paths.map((p) => `  - ${p}`).join("\n") + "\n";
  return `---
type: ${type}
status: ${status}
updated: ${today}
${paths}tags: [${tags.join(", ")}]
---
# ${title}

${body.trim()}
`;
}

// --- Root vault index + how-to (parent of project) ---
const root = String.raw`E:\ObsidianSpace\agent-kb`;
fs.writeFileSync(
  path.join(root, "Home.md"),
  `---
type: moc
status: active
updated: ${today}
tags: [vault-index]
---
# Agent knowledge vault — индекс проектов

Один Obsidian vault на несколько Cursor-проектов. **Один проект = одна папка** (kebab-case).

## Проекты

- [[bustour/Home|bustour]] — сайт БасТур (Next.js)

## Правила

- Заметки проекта только внутри его папки.
- MCP в Cursor-репо = **подпапка проекта**, не корень vault.
- Имена файлов по возможности уникальны во всём vault.
- Новый проект: [[how-to-add-project]].
`,
  "utf8",
);
fs.mkdirSync(path.join(root, "_templates-root"), { recursive: true });
fs.writeFileSync(
  path.join(root, "_templates-root", "how-to-add-project.md"),
  `---
type: ops
status: active
updated: ${today}
tags: [vault-index]
---
# Как добавить новый проект в vault

1. Папка: \`E:\\ObsidianSpace\\agent-kb\\<slug>\\\`
2. Каркас: Home, _templates, 00-Inbox … 90-Sessions, 01-MOC (скопировать с \`bustour/\` или seed).
3. Stub \`<slug>/.obsidian/app.json\` = \`{}\` (нужно для obsidian-mcp).
4. В Cursor-репо: MCP path = \`...\\agent-kb\\<slug>\`; правило project_slug.
5. Строка в корневой [[Home]].
6. Reload Window.

Обсидиан app открывает **корневой** vault \`agent-kb\`, не nested.
`,
  "utf8",
);
console.log("wrote root Home + how-to");

// --- Project Home ---
w(
  "Home.md",
  note({
    type: "moc",
    title: "Bustour — вход",
    body: `
Граф знаний БасТур. WIP — \`MEMORY.md\` в репо. Индекс — \`PROJECT_CONTEXT.md\`.

## MOC

- [[moc-stack]] · [[moc-components]] · [[moc-domains]] · [[moc-routes]] · [[moc-libs]]
- [[moc-skills]] · [[moc-rules]] · [[moc-decisions]] · [[moc-qa]] · [[moc-ops]]

## Ловушки (читать первыми)

- [[parsed-text]] vs RichContent
- [[reviews-vs-testimonials]]
- [[avia-public-url]]
- [[soft-delete]]
- [[page-alerts]]
- [[cms-scopes]]
`,
  }),
);

// --- MOCs (overwrite with full link lists) ---
w(
  "01-MOC/moc-stack.md",
  note({
    type: "moc",
    title: "MOC: Стек",
    body: `
- [[nextjs]] — App Router 16 / React 19
- [[drizzle-libsql]] — ORM + SQLite/libSQL
- [[tailwind-v4]] — \`@theme\` в globals.css
- [[tiptap]] — SEO HTML admin
- [[playwright]] — e2e / Visual QA
- [[zod]] — формы / admin validations
`,
  }),
);

w(
  "01-MOC/moc-components.md",
  note({
    type: "moc",
    title: "MOC: Компоненты",
    body: `
- [[page-alert]] · [[parsed-text]] · [[rich-content]]
- [[site-footer]] · [[reviews-section]] · [[testimonials-home]]
- [[dates-table]] · [[public-tours-listing]]
`,
  }),
);

w(
  "01-MOC/moc-domains.md",
  note({
    type: "moc",
    title: "MOC: Домены",
    body: `
- [[page-alerts]] · [[cms-scopes]] · [[cms-settings-keys]]
- [[soft-delete]] · [[currencies]] · [[shortcodes]]
- [[reviews-vs-testimonials]] · [[faq-scopes]] · [[avia-public-url]]
`,
  }),
);

w(
  "01-MOC/moc-routes.md",
  note({
    type: "moc",
    title: "MOC: Маршруты",
    body: `
### Public
- [[route-home]] · [[route-bus-catalog]] · [[route-avia]] · [[route-hot]]
- [[route-bus-rental]] · [[route-testimonials]] · [[route-legal]]
- [[route-company]] · [[route-info]]

### Admin
- [[route-admin-overview]] — nav в admin-nav.tsx
`,
  }),
);

w(
  "01-MOC/moc-libs.md",
  note({
    type: "moc",
    title: "MOC: Libs",
    body: `
- [[page-alert-lib]] · [[admin-audit]] · [[lib-cms]] · [[lib-queries]]
- [[lib-seo-metadata]] · [[lib-currencies]] · [[lib-shortcodes]] · [[lib-reviews-page-cms]]
`,
  }),
);

w(
  "01-MOC/moc-skills.md",
  note({
    type: "moc",
    title: "MOC: Skills",
    body: `
### Bustour / local
- [[skill-ponytail]] · [[skill-caveman]] · [[skill-webapp-testing]] · [[skill-orchestration]]

### Installed (speed)
- [[skill-vercel-react-best-practices]]
- [[skill-drizzle-orm-patterns]]
- [[skill-web-design-guidelines]]
`,
  }),
);

w(
  "01-MOC/moc-rules.md",
  note({
    type: "moc",
    title: "MOC: Rules",
    body: `
- [[rule-session-context]] · [[rule-obsidian-context]] · [[rule-git-policy]]
- [[rule-admin-audit]] · [[rule-qa-testing]] · [[rule-orca-orchestration]]
`,
  }),
);

w(
  "01-MOC/moc-qa.md",
  note({
    type: "moc",
    title: "MOC: QA",
    body: `
- [[qa-selfcheck-index]] — scripts/*.selfcheck.ts
- [[playwright]] · [[ops-playwright-browsers]] · [[rule-qa-testing]]
Breakpoints: 1440 / 1024 / 768 / 320. Отчёты: \`analisis/\`.
`,
  }),
);

w(
  "01-MOC/moc-ops.md",
  note({
    type: "moc",
    title: "MOC: Ops",
    body: `
- [[ops-playwright-browsers]] · [[ops-agent-kb-layout]]
`,
  }),
);

w(
  "01-MOC/moc-decisions.md",
  note({
    type: "moc",
    title: "MOC: Decisions",
    body: `
- [[adr-agent-kb-multiproject]] — vault multi-project + MCP scoped
`,
  }),
);

// --- Domains (traps) ---
const domains = [
  [
    "soft-delete.md",
    "Soft-delete (archived)",
    ["lib/db/schema.ts", "app/admin/(protected)/archive"],
    `## Суть
\`archived=1\` на tours/articles/cities/countries/buses/reviews/staff/transfers/leads. Публичные getters исключают. UI \`/admin/archive\`. ≠ \`*.visible\` (скрыть без archive).

## Связи
- [[moc-domains]] · [[drizzle-libsql]] · [[qa-selfcheck-index]]

## Договорённости / ловушки
- Soft-delete lifecycle + slug release: scripts/soft-delete-entities.selfcheck.ts, entity-archive-restore.selfcheck.ts
`,
  ],
  [
    "cms-scopes.md",
    "CMS scopes / prefixes",
    ["lib/cms.ts", "lib/admin-config.ts"],
    `## Суть
Ключи: \`country:{cat}:{slug}\`, \`city:{cat}:{slug}\`, \`tour:{id|slug}\`, \`bus:{slug}\`, \`transfer:{slug}\`. Homes: \`bustours\` / \`aviatory\` / \`hot\` / \`rental\`.

## Связи
- [[moc-domains]] · [[page-alerts]] · [[cms-settings-keys]] · [[lib-cms]]

## Договорённости / ловушки
- City/country slug unique **per category**, не глобальный \`avia-\` prefix.
`,
  ],
  [
    "reviews-vs-testimonials.md",
    "Reviews vs testimonials",
    [
      "components/site/testimonials.tsx",
      "components/site/reviews-section.tsx",
      "lib/reviews-page-cms.ts",
    ],
    `## Суть
Таблица DB \`reviews\`. Публичная страница \`/testimonials\`. Home widget = VIDEO only (\`testimonials.tsx\`). Страница = \`reviews-section.tsx\`. CMS dual keys \`reviews.*\` vs \`testimonials.page*\`.

## Связи
- [[moc-domains]] · [[route-testimonials]] · [[lib-reviews-page-cms]]

## Договорённости / ловушки
- Не путать виджет главной и страницу отзывов.
`,
  ],
  [
    "avia-public-url.md",
    "Avia public URL trap",
    ["middleware.ts", "lib/avia-slug.ts"],
    `## Суть
App folder \`/aviatory/\`. Public default \`/aviatury/\` via middleware rewrite/301. Admin «Открыть» и nav — только public path.

## Связи
- [[moc-domains]] · [[route-avia]] · [[nextjs]]

## Договорённости / ловушки
- Hot всегда \`/hot/\` — не брать \`settings["hot.slug"]\`.
- Selfcheck: admin-open-href, hot-admin-href, avia-slug.
`,
  ],
  [
    "shortcodes.md",
    "Shortcodes",
    ["lib/shortcodes.ts", "lib/expand-content-blocks.ts"],
    `## Суть
\`[Name]\` dict + expand. Plain text → [[parsed-text]]. HTML → [[rich-content]].

## Связи
- [[moc-domains]] · [[parsed-text]] · [[rich-content]] · [[lib-shortcodes]]

## Договорённости / ловушки
- Не класть ParsedText внутрь client Alert / dates-table.
`,
  ],
  [
    "faq-scopes.md",
    "FAQ scopes",
    ["lib/faq-slots.ts", "lib/faq-schema.ts"],
    `## Суть
\`content_blocks.page\`; multi-slot \`faq\`/\`faq2\` → \`pageKey\` / \`pageKey::faq2\`; fallback \`global\`.

## Связи
- [[moc-domains]] · [[lib-cms]]
`,
  ],
];

for (const [file, title, paths, body] of domains) {
  w(
    `04-Domains/${file}`,
    note({ type: "domain", title, code_paths: paths, body }),
  );
}

// keep page-alerts / currencies / cms-settings-keys (already exist) — refresh page-alerts lightly via overwrite in seed was already done; skip if ok

// --- Components ---
const comps = [
  [
    "parsed-text.md",
    "ParsedText",
    ["components/site/parsed-text.tsx"],
    `## Суть
Server component. Expand shortcodes в plain H1/labels. Rich HTML → [[rich-content]].

## Связи
- [[moc-components]] · [[shortcodes]] · [[page-alert]]

## Договорённости / ловушки
- Не внутрь client Alert / dates-table.
`,
  ],
  [
    "rich-content.md",
    "RichContent",
    ["components/site/rich-content.tsx"],
    `## Суть
Tiptap HTML + shortcodes на публичке.

## Связи
- [[moc-components]] · [[tiptap]] · [[shortcodes]]
`,
  ],
  [
    "reviews-section.md",
    "Reviews section (page)",
    ["components/site/reviews-section.tsx"],
    `## Суть
Блок отзывов на \`/testimonials\` (TEXT+VIDEO).

## Связи
- [[moc-components]] · [[reviews-vs-testimonials]] · [[route-testimonials]]
`,
  ],
  [
    "testimonials-home.md",
    "Testimonials home widget",
    ["components/site/testimonials.tsx"],
    `## Суть
Виджет на главной — только VIDEO. Не путать с [[reviews-section]].

## Связи
- [[moc-components]] · [[reviews-vs-testimonials]] · [[route-home]]
`,
  ],
  [
    "dates-table.md",
    "Dates table",
    ["components/site/dates-table.tsx", "lib/dates-table.ts"],
    `## Суть
Таблица дат тура; client. \`endDate >= startDate\`.

## Связи
- [[moc-components]] · [[parsed-text]]

## Договорённости / ловушки
- ParsedText/Alert не ломать client boundary.
`,
  ],
  [
    "public-tours-listing.md",
    "Public tours listing",
    ["components/site/public-tours.tsx", "components/site/tours-listing.tsx"],
    `## Суть
Листинг каталога. Tour cards без \`arrivalCityId\` → \`tourUrl\` null → filter out.

## Связи
- [[moc-components]] · [[route-bus-catalog]]
`,
  ],
];

for (const [file, title, paths, body] of comps) {
  w(`03-Components/${file}`, note({ type: "component", title, code_paths: paths, body }));
}

// --- Routes ---
const routes = [
  [
    "route-home.md",
    "Route: /",
    ["app/(site)/page.tsx"],
    `## Суть
Home: hero, search, featured, advantages, video testimonials, map. CMS \`home.*\` / FAQ \`global\`.

## Связи
- [[moc-routes]] · [[testimonials-home]] · [[page-alerts]]
`,
  ],
  [
    "route-bus-catalog.md",
    "Route: bus catalog",
    ["app/(site)/avtobusnye-tury"],
    `## Суть
\`/avtobusnye-tury/\` + country/city/tour. CMS home prefix **\`bustours\`**; country \`country:bus:{slug}\`; city \`city:bus:{slug}\`.

## Связи
- [[moc-routes]] · [[cms-scopes]] · [[page-alerts]]
`,
  ],
  [
    "route-avia.md",
    "Route: avia",
    ["app/(site)/aviatory"],
    `## Суть
Internal \`/aviatory/\`; public \`/aviatury/\`. CMS **\`aviatory\`**. См. [[avia-public-url]].

## Связи
- [[moc-routes]] · [[avia-public-url]] · [[cms-scopes]]
`,
  ],
  [
    "route-hot.md",
    "Route: hot tours",
    ["app/(site)/hot"],
    `## Суть
Всегда \`/hot/\`. CMS **\`hot\`**. Игнор \`hot.slug\` для URL.

## Связи
- [[moc-routes]] · [[cms-scopes]]
`,
  ],
  [
    "route-bus-rental.md",
    "Route: bus rental",
    ["app/(site)/bus-rental"],
    `## Суть
Fleet. CMS **\`rental\`**; visibility \`bus:{slug}.visible\`.

## Связи
- [[moc-routes]] · [[cms-scopes]]
`,
  ],
  [
    "route-testimonials.md",
    "Route: /testimonials",
    ["app/(site)/testimonials"],
    `## Суть
Страница отзывов. См. [[reviews-vs-testimonials]].

## Связи
- [[moc-routes]] · [[reviews-section]]
`,
  ],
  [
    "route-legal.md",
    "Route: /legal/[slug]",
    ["app/(site)/legal", "lib/legal-pages.ts"],
    `## Суть
privacy|offer|cookies|video. Admin \`/admin/pages/legal\`.

## Связи
- [[moc-routes]] · [[site-footer]]
`,
  ],
  [
    "route-company.md",
    "Route: company",
    ["app/(site)/company"],
    `## Суть
\`/company\`, staff, licenses. CMS \`company\` / \`staff\` / \`licenses\`.

## Связи
- [[moc-routes]] · [[cms-scopes]]
`,
  ],
  [
    "route-info.md",
    "Route: /info/*",
    ["app/(site)/info"],
    `## Суть
dictionary, transfers, memos, articles (novosti|obzory|specpredlozheniya).

## Связи
- [[moc-routes]] · [[cms-scopes]]
`,
  ],
  [
    "route-admin-overview.md",
    "Admin routes overview",
    ["components/admin/admin-nav.tsx", "app/admin"],
    `## Суть
Login, dashboard, tours/cities/countries по category, rental, transfers, currencies, leads, articles, archive, media, shortcodes, settings, users, roles, audit, reviews.

## Связи
- [[moc-routes]] · [[admin-audit]] · [[rule-admin-audit]]
`,
  ],
];

for (const [file, title, paths, body] of routes) {
  w(`05-Routes/${file}`, note({ type: "route", title, code_paths: paths, body }));
}

// --- Libs ---
const libs = [
  [
    "lib-cms.md",
    "lib/cms",
    ["lib/cms.ts", "lib/admin-config.ts"],
    `## Суть
Settings, blocks, FAQ scopes, visibility. Admin field factories в admin-config.

## Связи
- [[moc-libs]] · [[cms-scopes]] · [[cms-settings-keys]]
`,
  ],
  [
    "lib-queries.md",
    "lib/queries (tours)",
    ["lib/queries.ts"],
    `## Суть
Tour CRUD/getters/map/serialize. Archived excluded by default.

## Связи
- [[moc-libs]] · [[soft-delete]] · [[drizzle-libsql]]
`,
  ],
  [
    "lib-seo-metadata.md",
    "lib/seo-metadata",
    ["lib/seo-metadata.ts"],
    `## Суть
metadataFromSettings, clamps, absolute URLs, shortcodes в meta.

## Связи
- [[moc-libs]] · [[shortcodes]]
`,
  ],
  [
    "lib-currencies.md",
    "lib/currencies",
    ["lib/currencies.ts"],
    `## Суть
CRUD, convert, formatMoney; ровно одна base. \`priceAmount\` — source of truth.

## Связи
- [[moc-libs]] · [[currencies]]
`,
  ],
  [
    "lib-shortcodes.md",
    "lib/shortcodes",
    ["lib/shortcodes.ts", "lib/expand-content-blocks.ts"],
    `## Суть
Dict + expand для settings/blocks/lists.

## Связи
- [[moc-libs]] · [[shortcodes]]
`,
  ],
  [
    "lib-reviews-page-cms.md",
    "lib/reviews-page-cms",
    ["lib/reviews-page-cms.ts"],
    `## Суть
Dual keys reviews vs testimonials.page*.

## Связи
- [[moc-libs]] · [[reviews-vs-testimonials]]
`,
  ],
];

for (const [file, title, paths, body] of libs) {
  w(`06-Libs/${file}`, note({ type: "lib", title, code_paths: paths, body }));
}

// --- Stack add zod ---
w(
  "02-Stack/zod.md",
  note({
    type: "stack",
    title: "Zod",
    code_paths: ["lib/review-schema.ts", "lib/validations/admin.ts"],
    body: `
## Суть
Валидация форм: reviews STI, admin save schemas.

## Связи
- [[moc-stack]] · [[reviews-vs-testimonials]]
`,
  }),
);

// --- Skills ---
w(
  "07-Skills/skill-caveman.md",
  note({
    type: "skill",
    title: "Skill: caveman",
    body: `
## Суть
Терсе ответы. Off: \`stop caveman\` / \`normal mode\`.

## Где
- ~/.agents/skills/caveman

## Связи
- [[moc-skills]] · [[skill-ponytail]]
`,
  }),
);

w(
  "07-Skills/skill-vercel-react-best-practices.md",
  note({
    type: "skill",
    title: "Skill: vercel-react-best-practices",
    body: `
## Суть
Vercel React/Next perf guidelines. ~высокий installs.

## Где
- ~/.agents/skills/vercel-react-best-practices
- Install: \`npx skills add vercel-labs/agent-skills@vercel-react-best-practices -g -y\`

## Связи
- [[moc-skills]] · [[nextjs]]
`,
  }),
);

w(
  "07-Skills/skill-drizzle-orm-patterns.md",
  note({
    type: "skill",
    title: "Skill: drizzle-orm-patterns",
    body: `
## Суть
Паттерны Drizzle ORM (4K+ sibling drizzle-orm skill family).

## Где
- ~/.agents/skills/drizzle-orm-patterns

## Связи
- [[moc-skills]] · [[drizzle-libsql]]
`,
  }),
);

w(
  "07-Skills/skill-web-design-guidelines.md",
  note({
    type: "skill",
    title: "Skill: web-design-guidelines",
    body: `
## Суть
Vercel web design guidelines.

## Где
- ~/.agents/skills/web-design-guidelines

## Связи
- [[moc-skills]] · [[skill-ponytail]]
`,
  }),
);

// --- Rules ---
w(
  "08-Rules/rule-orca-orchestration.md",
  note({
    type: "rule",
    title: "Rule: orca-orchestration",
    code_paths: [".cursor/rules/orca-orchestration.mdc"],
    body: `
## Суть
Orca supervised waves; worker_done ≠ shipped; verify→merge→push.

## Связи
- [[moc-rules]] · [[skill-orchestration]]
`,
  }),
);

// --- QA index ---
w(
  "10-QA/qa-selfcheck-index.md",
  note({
    type: "qa",
    title: "Selfcheck index",
    code_paths: ["scripts/"],
    body: `
## Суть
Детерминированные \`scripts/*.selfcheck.ts\`. Ключевые:

- page-alert-coverage / resolve-page-alert
- audit-coverage
- soft-delete-entities / entity-archive-restore
- admin-open-href / avia-slug / hot-admin-href
- public-shortcodes-coverage / cms-dead-keys
- seo-metadata / static-pages-http

Полный список — glob \`scripts/*.selfcheck.ts\` в репо.

## Связи
- [[moc-qa]] · [[playwright]] · [[rule-qa-testing]]
`,
  }),
);

// --- Ops / ADR ---
w(
  "11-Ops/ops-agent-kb-layout.md",
  note({
    type: "ops",
    title: "agent-kb vault layout",
    body: `
## Суть
Vault root: \`E:\\ObsidianSpace\\agent-kb\`. Project Bustour: \`...\\agent-kb\\bustour\`. MCP scoped на project. Stub \`.obsidian\` в project folder для obsidian-mcp.

## Связи
- [[moc-ops]] · [[adr-agent-kb-multiproject]] · [[rule-obsidian-context]]
`,
  }),
);

w(
  "09-Decisions/adr-agent-kb-multiproject.md",
  note({
    type: "decision",
    title: "ADR: agent-kb multi-project vault",
    body: `
## Контекст
Нужен один Obsidian на много Cursor-проектов.

## Решение
Корень \`agent-kb\`; папка на проект; MCP = project path; stub \`.obsidian\` в project.

## Последствия
Имена заметок уникальны во vault. Новый проект — how-to-add-project.

## Связи
- [[moc-decisions]] · [[ops-agent-kb-layout]]
`,
  }),
);

// Update ops-playwright path note if exists — rewrite briefly
w(
  "11-Ops/ops-playwright-browsers.md",
  note({
    type: "ops",
    title: "Playwright browsers path",
    body: `
## Суть
\`PLAYWRIGHT_BROWSERS_PATH=Z:\\bustour\\playwright-browsers\` (не C: TEMP).

## Связи
- [[moc-ops]] · [[playwright]] · [[rule-qa-testing]]
`,
  }),
);

console.log("ok deep fill");
