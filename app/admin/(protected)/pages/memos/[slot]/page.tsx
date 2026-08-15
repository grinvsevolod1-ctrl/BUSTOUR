import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getSettings } from "@/lib/cms"
import type { SettingField } from "@/lib/admin-config"
import { PageHeader, ButtonLink, Card, CardBody } from "@/components/admin/ui"
import { SectionFieldsForm } from "@/components/admin/section-fields-form"
import {
  MEMOS_PAGE_CMS_KEY,
  isMemoSectionKey,
  memoSettingKeys,
} from "@/lib/memos-page-cms"

export const metadata: Metadata = { title: "Вкладка памятки — Админ-панель" }

function memoFields(shortKey: string): SettingField[] {
  const keys = memoSettingKeys(MEMOS_PAGE_CMS_KEY, shortKey)
  return [
    { key: keys.label, label: "Название вкладки", type: "shortcode-input" },
    { key: keys.heading, label: "Заголовок раздела (H2)", type: "shortcode-input" },
    {
      key: keys.body,
      label: "Текст",
      type: "richtext",
      hint: "Расширенный текст памятки.",
    },
    {
      key: keys.fileTitle,
      label: "Подпись файла",
      type: "shortcode-input",
      hint: "Текст рядом со ссылкой «Скачать».",
    },
    {
      key: keys.file,
      label: "Прикреплённый файл",
      type: "media",
      mediaAccept: ["document"],
      hint: "Один файл на вкладку (PDF и др. из медиагалереи).",
    },
  ]
}

export default async function MemoTabEditPage({
  params,
}: {
  params: Promise<{ slot: string }>
}) {
  const { slot } = await params
  if (!isMemoSectionKey(slot)) notFound()

  const settings = await getSettings()
  const keys = memoSettingKeys(MEMOS_PAGE_CMS_KEY, slot)
  const title =
    settings[keys.label]?.trim() || settings[keys.heading]?.trim() || slot

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={`Вкладка «${slot}» · /info/memos`}
      >
        <ButtonLink href="/admin/pages/memos#memos-list" variant="secondary">
          К списку вкладок
        </ButtonLink>
      </PageHeader>

      <Card>
        <CardBody>
          <SectionFieldsForm fields={memoFields(slot)} settings={settings} />
        </CardBody>
      </Card>
    </div>
  )
}
