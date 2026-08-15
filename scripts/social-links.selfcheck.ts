import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { parseSocialLinks, socialsForFooter, socialsForHeader } from "../lib/social-links"

const root = process.cwd()
const editor = readFileSync(join(root, "components/admin/social-links-editor.tsx"), "utf8")
const footer = readFileSync(join(root, "components/site/site-footer.tsx"), "utf8")
const header = readFileSync(join(root, "components/site/site-header.tsx"), "utf8")
const settings = readFileSync(join(root, "components/admin/settings-form.tsx"), "utf8")
const config = readFileSync(join(root, "lib/admin-config.ts"), "utf8")

for (const text of [
  "Добавить соцсеть",
  "Удалить",
  "Поднять",
  "Опустить",
  "social.links",
  "Показывать в хедере",
  "Показывать в футере",
  "Иконка",
]) {
  assert.match(editor, new RegExp(text))
}
assert.match(settings, /<SocialLinksEditor settings=/)
assert.match(footer, /socialsForFooter/)
assert.match(header, /socialsForHeader/)
assert.doesNotMatch(config, /heading:\s*"Соцсети"/, "old fixed Соцсети group must be gone")
assert.match(header, /SocialIconGlyph|socialCircleWrapperClass/)
assert.match(footer, /SocialIconGlyph|socialCircleWrapperClass/)
assert.doesNotMatch(header, /SocialHeaderIcon\b/)
assert.doesNotMatch(footer, /SocialFooterGlyph\b/)

// Legacy migration: old keys → one list with header/footer flags
const legacy = parseSocialLinks({
  "social.instagram": "https://instagram.com/bastur",
  "social.youtube": "https://youtube.com/@bastur",
  "social.telegram": "https://t.me/bastur",
  "social.viber": "viber://chat?number=375",
})
assert.equal(legacy.length, 4)
assert.deepEqual(
  legacy.map((s) => ({ icon: s.icon, showInHeader: s.showInHeader, showInFooter: s.showInFooter })),
  [
    { icon: "instagram", showInHeader: false, showInFooter: true },
    { icon: "youtube", showInHeader: false, showInFooter: true },
    { icon: "telegram", showInHeader: true, showInFooter: true },
    { icon: "viber", showInHeader: true, showInFooter: false },
  ],
)

const unified = {
  "social.links": JSON.stringify([
    {
      id: "1",
      name: "TG",
      url: "https://t.me/x",
      icon: "telegram",
      showInHeader: true,
      showInFooter: false,
    },
    {
      id: "2",
      name: "IG",
      url: "https://instagram.com/x",
      icon: "instagram",
      showInHeader: false,
      showInFooter: true,
    },
  ]),
  "social.telegram": "https://t.me/ignored",
}
assert.equal(socialsForHeader(unified).length, 1)
assert.equal(socialsForHeader(unified)[0]!.name, "TG")
assert.equal(socialsForFooter(unified).length, 1)
assert.equal(socialsForFooter(unified)[0]!.name, "IG")

console.log("social links checks passed")
