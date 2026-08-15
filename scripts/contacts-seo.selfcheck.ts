/**
 * #94: /contacts SEO via metadataFromSettings("contacts") + admin SEO fields + OG image.
 * Run: npx tsx scripts/contacts-seo.selfcheck.ts
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { defaultSettings } from "../lib/db/cms-seed"
import { absoluteUrl, metadataFromSettings } from "../lib/seo-metadata"

async function main() {
  assert.equal(defaultSettings["contacts.metaTitle"], "Контакты — БасТур")
  assert.ok((defaultSettings["contacts.metaShortDesc"] ?? "").length >= 12)
  assert.ok((defaultSettings["contacts.metaDescription"] ?? "").length >= 12)

  const image = "https://cdn.example/contacts-og.jpg"
  const meta = await metadataFromSettings(
    {
      "contacts.metaTitle": "Контакты — БасТур",
      "contacts.metaDescription": "Длинное описание контактов",
      "contacts.metaShortDesc": "Превью контактов",
      "contacts.metaImage": image,
    },
    "contacts",
    "Fallback",
    "Fallback desc",
    { path: "/contacts", imageAlt: "OG контакты" },
  )
  assert.equal(meta.title, "Контакты — БасТур")
  assert.equal(meta.description, "Превью контактов")
  assert.deepEqual(meta.alternates, { canonical: absoluteUrl("/contacts") })
  const og = meta.openGraph as { url?: string; images?: Array<{ url: string; alt?: string }> }
  assert.equal(og.url, absoluteUrl("/contacts"))
  assert.deepEqual(og.images, [{ url: image, alt: "OG контакты" }])
  assert.equal(meta.twitter?.card, "summary_large_image")
  assert.deepEqual(meta.twitter?.images, [image])

  const page = readFileSync(join(process.cwd(), "app/(site)/contacts/page.tsx"), "utf8")
  assert.match(page, /export async function generateMetadata/)
  assert.match(page, /metadataFromSettings\([\s\S]*["']contacts["']/)
  assert.match(page, /path:\s*["']\/contacts["']/)
  assert.doesNotMatch(page, /export const metadata:\s*Metadata\s*=/)

  const config = readFileSync(join(process.cwd(), "lib/admin-config.ts"), "utf8")
  assert.match(config, /export const contactsSeoSettingsGroup/)
  assert.match(config, /contacts\.metaTitle/)
  assert.match(config, /seoPreviewDescriptionFields\(["']contacts["']\)/)
  assert.match(config, /contacts\.metaImage/)

  const admin = readFileSync(join(process.cwd(), "app/admin/(protected)/pages/contacts/page.tsx"), "utf8")
  assert.match(admin, /contactsSeoSettingsGroup/)
  assert.match(admin, /contactsSettingsGroup/)
  assert.match(admin, /PageSettingsForm/)
  assert.match(admin, /PageSectionsManager/)

  console.log("contacts-seo.selfcheck: ok")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
