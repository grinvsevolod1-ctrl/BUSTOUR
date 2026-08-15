import type { Metadata } from "next"
import { getSettings } from "@/lib/cms"
import { legalPages, LEGAL_SLUGS, legalSettingKeys } from "@/lib/legal-pages"
import { PageSettingsForm } from "@/components/admin/page-settings-form"
import { SectionFieldsForm } from "@/components/admin/section-fields-form"
import { FormSection } from "@/components/admin/ui"
import type { EditorWorkspaceGroup } from "@/components/admin/editor-workspace"
import type { SettingField } from "@/lib/admin-config"
import { seoPreviewDescriptionFields } from "@/lib/admin-config"

export const metadata: Metadata = { title: "Юридические документы — Админ-панель" }

function fieldsFor(prefix: string, titlePlaceholder: string): SettingField[] {
  const keys = legalSettingKeys(prefix)
  return [
    { key: keys.metaTitle, label: "Title (SEO)", type: "shortcode-input", placeholder: titlePlaceholder },
    ...seoPreviewDescriptionFields(prefix),
    { key: keys.title, label: "Заголовок H1", type: "shortcode-input" },
    { key: keys.body, label: "Текст документа", type: "richtext" },
  ]
}

export default async function AdminLegalPages() {
  const settings = await getSettings()
  const groups = LEGAL_SLUGS.map((slug) => {
    const page = legalPages[slug]
    return {
      id: slug,
      heading: page.adminLabel,
      url: page.path,
      fields: fieldsFor(page.settingsPrefix, `${page.title} — БасТур`),
    }
  })

  const workspaceGroups: EditorWorkspaceGroup[] = groups.map((g) => ({
    id: g.id,
    label: g.heading,
    badge: g.fields.some((f) => Boolean(settings[f.key]?.trim())),
    anchorIds: [`legal-${g.id}`],
  }))

  return (
    <PageSettingsForm
      title="Юридические документы"
      description="Тексты страниц из футера: оферта, конфиденциальность, видеонаблюдение, cookie."
      pageHref="/legal/privacy"
      workspaceGroups={workspaceGroups}
      workspaceBeforeForm={
        <div className="space-y-6">
          {groups.map((g) => (
            <FormSection key={g.id} id={`legal-${g.id}`} title={g.heading} collapsible={false}>
              <p className="mb-3 text-sm text-admin-fg-muted">
                Публичный URL:{" "}
                <a href={g.url} target="_blank" rel="noreferrer" className="underline hover:text-admin-fg">
                  {g.url}
                </a>
              </p>
              <SectionFieldsForm fields={g.fields} settings={settings} />
            </FormSection>
          ))}
        </div>
      }
    >
      {null}
    </PageSettingsForm>
  )
}
