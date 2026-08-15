import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")

const manager = read("components/admin/page-sections-manager.tsx")
assert.match(manager, /baselineOrder/)
assert.match(manager, /orderDirty/)
assert.match(manager, /сохраняются по кнопке «Сохранить»/)
assert.match(manager, /savePageSectionsOrderAction/)

const action = read("app/admin/cms-actions.ts")
assert.match(action, /savePageSectionsOrderAction[\s\S]*?writeAudit/)

const config = read("lib/admin-config.ts")
assert.match(config, /export const contactsSettingsGroup/)
for (const key of [
  "site.emergencyPhone",
  "site.emails",
  "site.hoursFull",
  "site.routeVideo",
  "site.routeVideoPoster",
]) {
  assert.ok(config.includes(key), `missing contacts setting ${key}`)
}
assert.match(config, /site\.routeVideo[\s\S]*?mediaAccept: \["video"\]/)
assert.match(config, /site\.routeVideoPoster[\s\S]*?mediaAccept: \["image"\]/)

const contactsAdmin = read("app/admin/(protected)/pages/contacts/page.tsx")
assert.match(contactsAdmin, /requireCapability\("manage_settings"\)/)
assert.match(contactsAdmin, /contactsSeoSettingsGroup/)
assert.match(contactsAdmin, /contactsSettingsGroup/)
assert.match(config, /export const contactsSeoSettingsGroup/)
assert.match(config, /contacts\.metaTitle/)
assert.match(config, /seoPreviewDescriptionFields\(["']contacts["']\)/)
assert.match(config, /contacts\.metaImage/)
assert.match(read("components/admin/admin-nav.tsx"), /\/admin\/pages\/contacts/)
assert.match(read("app/admin/(protected)/settings/page.tsx"), /Страницы → Контакты/)
const settingsGroupsBlock = config.slice(config.indexOf("export const settingsGroups"))
assert.doesNotMatch(settingsGroupsBlock, /heading:\s*"Контакты"/)

const contactsPage = read("app/(site)/contacts/page.tsx")
const player = read("components/site/click-to-play-video.tsx")
assert.doesNotMatch(contactsPage, /ContactForm|Напишите нам/)
assert.match(contactsPage, /TitleUnderline as="h1"/)
assert.match(contactsPage, /ClickToPlayVideo/)
assert.match(contactsPage, /site\.routeVideoPoster/)
assert.match(player, /poster/)
assert.match(player, /Воспроизвести/)
assert.ok(contactsPage.indexOf("site.routeVideo") < contactsPage.lastIndexOf("OfficeMap"), "map must follow contact video")

assert.match(config, /callusBannerSettingsGroup/)
assert.match(config, /Баннер заказа звонка/)
assert.match(config, /callus\.title/)
assert.ok(
  config.slice(config.indexOf("export const settingsGroups")).includes("callusBannerSettingsGroup"),
  "callus banner must be in settingsGroups",
)
assert.doesNotMatch(
  config.slice(config.indexOf("pageSettingsGroups"), config.indexOf("export const contactsSettingsGroup")),
  /callus\.title/,
)
assert.doesNotMatch(config, /callus\.background|callus\.image/)

console.log("admin-order-contacts.selfcheck: ok")