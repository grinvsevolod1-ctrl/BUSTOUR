import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getSettings } from "@/lib/cms"
import type { SettingField } from "@/lib/admin-config"
import { PageHeader, ButtonLink, Card, CardBody } from "@/components/admin/ui"
import { SectionFieldsForm } from "@/components/admin/section-fields-form"
import {
  DICTIONARY_PAGE_CMS_KEY,
  dictionarySettingKeys,
  hydrateDictionarySlotSettings,
  isDictionarySectionKey,
} from "@/lib/dictionary-page-cms"

export const metadata: Metadata = { title: "Раздел словаря — Админ-панель" }

function entryFields(shortKey: string): SettingField[] {
  const keys = dictionarySettingKeys(DICTIONARY_PAGE_CMS_KEY, shortKey)
  return [
    { key: keys.label, label: "Название в списке", type: "shortcode-input" },
    { key: keys.heading, label: "Заголовок аккордеона", type: "shortcode-input" },
    {
      key: keys.body,
      label: "Текст (абзацы разделяются переводом строки)",
      type: "shortcode-textarea-multiline",
      rows: 12,
    },
  ]
}

export default async function DictionaryTabEditPage({
  params,
}: {
  params: Promise<{ slot: string }>
}) {
  const { slot } = await params
  if (!isDictionarySectionKey(slot)) notFound()

  const raw = await getSettings()
  const settings = hydrateDictionarySlotSettings(raw, slot)
  const keys = dictionarySettingKeys(DICTIONARY_PAGE_CMS_KEY, slot)
  const title =
    settings[keys.label]?.trim() || settings[keys.heading]?.trim() || slot

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={`Раздел «${slot}» · /info/dictionary`}
      >
        <ButtonLink href="/admin/pages/dictionary#dictionary-list" variant="secondary">
          К списку разделов
        </ButtonLink>
      </PageHeader>

      <Card>
        <CardBody>
          <SectionFieldsForm fields={entryFields(slot)} settings={settings} />
        </CardBody>
      </Card>
    </div>
  )
}
