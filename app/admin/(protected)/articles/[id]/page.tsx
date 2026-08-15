import { notFound } from "next/navigation"
import { getArticleById } from "@/lib/queries"
import { getBlocks, getSettings, getFaqBlocksForPage } from "@/lib/cms"
import { buildFaqSlots } from "@/components/admin/build-faq-slots"
import { EditorWorkspaceGroup } from "@/components/admin/editor-workspace"
import { FormSection } from "@/components/admin/ui"
import { PageSectionsManager } from "@/components/admin/page-sections-manager"
import { PageSettingsForm } from "@/components/admin/page-settings-form"
import { SectionFieldsForm } from "@/components/admin/section-fields-form"
import { ArticleForm } from "@/components/admin/article-form"
import { buildSectionTitles } from "@/lib/section-titles"
import { resolveInitialOrder } from "@/lib/section-order"
import { buildFaqFormIds } from "@/lib/faq-slots"
import { articleUrl } from "@/lib/article-url"

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const article = await getArticleById(Number(id))
  if (!article) notFound()
  const pageKey = `article:${article.id}`
  const [settings, faqBlocks] = await Promise.all([
    getSettings(),
    getFaqBlocksForPage(pageKey),
  ])
  const sections = [
    { key: `${pageKey}.section.seo`, label: "Расширенный текст" },
    { key: `${pageKey}.section.faq`, label: "Часто задаваемые вопросы" },
    { key: `${pageKey}.section.callus`, label: "Перезвоните нам" },
  ]
  const resolvedOrder = resolveInitialOrder(
    settings[`${pageKey}.sections.order`],
    ["seo", "faq", "callus"],
    ["seo", "faq", "callus"],
    ["seo", "faq", "callus"],
  )
  // callus is a newly added section: surface it on articles saved before it existed.
  const initialOrder = resolvedOrder.includes("callus")
    ? resolvedOrder
    : [...resolvedOrder, "callus"]
  const sectionTitles = buildSectionTitles(pageKey, settings, [], initialOrder, faqBlocks)
  const faqSlots = buildFaqSlots(pageKey, initialOrder, faqBlocks)
  const faqFormIds = buildFaqFormIds(pageKey, initialOrder)
  const toggleKeys = sections.map((section) => section.key).join(",")
  const seoSlots: Record<string, React.ReactNode> = {}
  const seoKeysInOrder = initialOrder.filter((key) => key === "seo" || /^seo\d+$/.test(key))
  const maxSeoN = seoKeysInOrder.reduce((max, key) => {
    const n = key === "seo" ? 1 : parseInt(key.replace("seo", ""), 10)
    return Math.max(max, n)
  }, 1)
  for (let n = 1; n <= maxSeoN + 3; n++) {
    const shortKey = n === 1 ? "seo" : `seo${n}`
    const suffix = n === 1 ? "" : `${n}`
    seoSlots[shortKey] = (
      <SectionFieldsForm
        fields={[
          {
            key: `${pageKey}.seoTitle${suffix}`,
            label: "Заголовок",
            placeholder: "Заголовок расширенного текста",
          },
          {
            key: `${pageKey}.seoHtml${suffix}`,
            label: "Расширенный текст",
            type: "richtext",
            hint: "Форматирование, заголовки, списки, ссылки.",
          },
        ]}
        settings={settings}
        hideSubmit
      />
    )
  }
  const workspaceGroups: EditorWorkspaceGroup[] = [
    { id: "main", label: "Основное", badge: true, anchorIds: ["s-article-base"] },
    {
      id: "content",
      label: "Контент",
      badge: Boolean(settings[`${pageKey}.seoHtml`] || faqBlocks.length),
      anchorIds: ["sec-seo", "sec-faq"],
    },
    { id: "order", label: "Порядок секций", badge: initialOrder.length > 0, anchorIds: ["sec-order"] },
  ]

  return (
    <div className="space-y-6">
      <PageSettingsForm
        title={`Редактирование: ${article.title}`}
        description="Основные данные, расширенный текст и FAQ."
        pageHref={articleUrl(article)}
        workspaceGroups={workspaceGroups}
        workspaceBeforeForm={
          <FormSection id="s-article-base" title="Основные данные" collapsible={false}>
            <ArticleForm article={article} />
          </FormSection>
        }
        workspaceAfterForm={
          <div id="sec-order" className="scroll-mt-4">
            <PageSectionsManager
              pageKey={pageKey}
              sections={sections}
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
          sections={sections}
          initialOrder={initialOrder}
          settings={settings}
          toggleKeys={toggleKeys}
          hideSidebar
          sectionSlots={{
            ...seoSlots,
            ...faqSlots,
            callus: (
              <p className="text-sm text-admin-fg-muted">
                Баннер «Перезвоните нам» отображается внизу страницы. Текст и кнопку можно изменить в{" "}
                <a href="/admin/settings" className="underline hover:text-admin-fg">
                  Настройках
                </a>
                .
              </p>
            ),
          }}
        />
      </PageSettingsForm>
    </div>
  )
}
