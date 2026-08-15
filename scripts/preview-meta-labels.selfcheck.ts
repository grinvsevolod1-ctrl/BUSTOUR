import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"

const root = path.join(import.meta.dirname, "..")
const adminConfig = fs.readFileSync(path.join(root, "lib/admin-config.ts"), "utf8")
const tourForm = fs.readFileSync(path.join(root, "components/admin/tour-form.tsx"), "utf8")
const articleForm = fs.readFileSync(path.join(root, "components/admin/article-form.tsx"), "utf8")
const seo = fs.readFileSync(path.join(root, "lib/seo-metadata.ts"), "utf8")
const settingMedia = fs.readFileSync(path.join(root, "components/admin/setting-media-field.tsx"), "utf8")

for (const [name, src] of [
  ["admin-config", adminConfig],
  ["tour-form", tourForm],
  ["article-form", articleForm],
] as const) {
  assert.equal(src.includes("OG-изображение"), false, `${name}: leftover OG-изображение`)
  assert.equal(src.includes("Alt OG"), false, `${name}: leftover Alt OG`)
  assert.equal(/\bmetaImageAlt\b/.test(src), false, `${name}: leftover metaImageAlt field`)
  assert.ok(src.includes("Превью изображение"), `${name}: missing Превью изображение`)
  assert.ok(
    src.includes("Превью описание") || src.includes("SEO_META_SHORT_DESC_LABEL"),
    `${name}: missing Превью описание`,
  )
}

assert.ok(seo.includes("getAltTextByUrl"), "seo-metadata must resolve alt from media")
assert.equal(seo.includes("metaImageAlt"), false, "seo-metadata must not read metaImageAlt settings")
assert.ok(settingMedia.includes('altMode="library"'), "SettingMediaField must use library alt")

console.log("preview-meta-labels.selfcheck: ok")
