import type { Metadata } from "next"
import { Plus } from "lucide-react"
import { getSettings, getBlocks, getFaqBlocksForPage } from "@/lib/cms"
import { pageSettingsGroups, getCollection, type PageSection } from "@/lib/admin-config"
import { buildFaqSlots } from "@/components/admin/build-faq-slots"
import { buildFaqFormIds } from "@/lib/faq-slots"
import { PageSettingsForm } from "@/components/admin/page-settings-form"
import { PageSectionsManager } from "@/components/admin/page-sections-manager"
import { SectionFieldsForm } from "@/components/admin/section-fields-form"
import { EditorWorkspaceGroup } from "@/components/admin/editor-workspace"
import { FormSection, ButtonLink, Card, EmptyState } from "@/components/admin/ui"
import { BlockRow } from "@/components/admin/block-row"
import { buildSectionTitles } from "@/lib/section-titles"
import { resolveInitialOrder } from "@/lib/section-order"

export const metadata: Metadata = { title: "Главная страница — Админ-панель" }

const HOME_SECTIONS: PageSection[] = [
  { key: "section.search", label: "Поиск туров" },
  { key: "section.featured", label: "Лучшие предложения" },
  { key: "section.advantages", label: "Преимущества" },
  { key: "section.testimonials", label: "Отзывы" },
  { key: "section.placement", label: "Наше расположение" },
  { key: "section.faq", label: "Частые вопросы" },
  { key: "section.callus", label: "Перезвоните нам" },
]

const HOME_DEFAULT_ORDER = ["search", "featured", "advantages", "testimonials", "placement", "faq", "callus"]

function sectionNote(text: string) {
  return <p className="text-sm text-admin-fg-muted">{text}</p>
}

export default async function AdminHomePageSettings() {
  const pageKey = "home"
  const page = pageSettingsGroups.home
  const heroMeta = getCollection("hero")!
  const [settings, pageFaqs, heroSlides] = await Promise.all([
    getSettings(),
    getFaqBlocksForPage(pageKey),
    getBlocks("hero"),
  ])

  const groups = page.groups.filter((g) => g.fields.length > 0)
  const sectionKeys = HOME_SECTIONS.map((section) => section.key.replace(/^section\./, ""))
  const initialOrder = resolveInitialOrder(
    settings[`${pageKey}.sections.order`],
    HOME_DEFAULT_ORDER,
    sectionKeys,
    ["faq", "callus"],
  )
  const sectionTitles = buildSectionTitles(pageKey, settings, [], initialOrder, pageFaqs)
  const faqSlots = buildFaqSlots(pageKey, initialOrder, pageFaqs)
  const faqFormIds = buildFaqFormIds(pageKey, initialOrder)
  const toggleKeys = HOME_SECTIONS.map((section) => section.key).join(",")
  const workspaceGroups: EditorWorkspaceGroup[] = [
    {
      id: "main",
      label: "Основное",
      badge: groups.some((group) => group.fields.some((field) => Boolean(settings[field.key]?.trim()))),
      anchorIds: ["general-settings"],
    },
    { id: "hero", label: "Слайды героя", badge: heroSlides.length > 0, anchorIds: ["sec-hero"] },
    {
      id: "content",
      label: "Контент",
      badge: pageFaqs.length > 0 || initialOrder.length > 0,
      anchorIds: initialOrder.map((key) => `sec-${key}`),
    },
    { id: "order", label: "Порядок секций", badge: initialOrder.length > 0, anchorIds: ["sec-order"] },
  ]

  return (
    <PageSettingsForm
      title={page.heading}
      description="Заголовки секций. Текст баннера «Есть вопросы?» — в Настройках. Видимость и порядок — на вкладке «Порядок секций»."
      pageHref="/"
      toggleKeys={toggleKeys}
      workspaceGroups={workspaceGroups}
      workspaceBeforeForm={
        <FormSection id="general-settings" title="Основные настройки" collapsible={false}>
          {groups.map((group) => (
            <div key={group.heading}>
              <h2 className="mb-2 text-sm font-medium text-admin-fg">{group.heading}</h2>
              <SectionFieldsForm fields={group.fields} settings={settings} />
            </div>
          ))}
        </FormSection>
      }
      workspaceMidPanels={[
        <FormSection key="sec-hero" id="sec-hero" title="Слайды героя" collapsible={false}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-admin-fg-muted">{heroMeta.description}</p>
            <ButtonLink href="/admin/content/hero/new" size="sm">
              <Plus className="h-4 w-4" /> Добавить слайд
            </ButtonLink>
          </div>
          {heroSlides.length === 0 ? (
            <EmptyState title="Слайдов пока нет" description="Добавьте первый слайд для баннера на главной." />
          ) : (
            <Card className="overflow-hidden">
              <ul className="divide-y divide-admin-border">
                {heroSlides.map((block, i) => (
                  <BlockRow
                    key={block.id}
                    block={block}
                    meta={heroMeta}
                    isFirst={i === 0}
                    isLast={i === heroSlides.length - 1}
                  />
                ))}
              </ul>
            </Card>
          )}
        </FormSection>,
      ]}
      workspaceAfterForm={
        <div id="sec-order" className="scroll-mt-4">
          <PageSectionsManager
            pageKey={pageKey}
            settingsPrefix=""
            sections={HOME_SECTIONS}
            initialOrder={initialOrder}
            settings={settings}
            toggleKeys={toggleKeys}
            sectionTitles={sectionTitles}
            view="order"
          />
        </div>
      }
    >
      <PageSectionsManager
        pageKey={pageKey}
        settingsPrefix=""
        sections={HOME_SECTIONS}
        initialOrder={initialOrder}
        settings={settings}
        toggleKeys={toggleKeys}
        hideSidebar
        sectionSlots={{
          search: sectionNote("Заголовок — на вкладке «Основное»."),
          featured: sectionNote("Заголовок — на вкладке «Основное». Карточки — рекомендуемые туры из каталога."),
          advantages: sectionNote("Заголовок — на вкладке «Основное»."),
          testimonials: sectionNote("Заголовок — на вкладке «Основное». Отзывы — в разделе «Отзывы»."),
          placement: sectionNote("Заголовок — на вкладке «Основное». Карта — в Настройках сайта (URL iframe)."),
          ...faqSlots,
          callus: sectionNote(
            "Текст и кнопку — в Настройках сайта (раздел «Баннер заказа звонка»).",
          ),
        }}
      />
    </PageSettingsForm>
  )
}
