import { ExternalLink } from "lucide-react"
import { getReviews, getBusTours } from "@/lib/queries"
import { getSettings, getFaqBlocksForPage } from "@/lib/cms"
import { pageSettingsGroups, type PageSection } from "@/lib/admin-config"
import { ReviewForm } from "@/components/admin/review-form"
import { HolidayImportButton } from "@/components/admin/holiday-import-button"
import { ReviewsListPanel } from "@/components/admin/reviews-list-panel"
import { buildFaqSlots } from "@/components/admin/build-faq-slots"
import { PageSettingsForm } from "@/components/admin/page-settings-form"
import { PageSectionsManager } from "@/components/admin/page-sections-manager"
import { EditorWorkspaceGroup } from "@/components/admin/editor-workspace"
import { FormSection } from "@/components/admin/ui"
import { SectionFieldsForm } from "@/components/admin/section-fields-form"
import { buildSectionTitles } from "@/lib/section-titles"
import { resolveInitialOrder } from "@/lib/section-order"
import { buildFaqFormIds } from "@/lib/faq-slots"
import { PageHeader, Card } from "@/components/admin/ui"
import {
  REVIEWS_PAGE_CMS_KEY,
  REVIEWS_PAGE_DEFAULT_SECTION_ORDER,
  REVIEWS_PAGE_LEGACY_CMS_KEY,
} from "@/lib/reviews-page-cms"
import { resolveAdminReviewPhone } from "@/lib/review-contact"

export default async function AdminReviewsPage() {
  const pageKey = REVIEWS_PAGE_CMS_KEY
  const [reviews, settings, pageFaqs, legacyFaqs, tours] = await Promise.all([
    getReviews(),
    getSettings(),
    getFaqBlocksForPage(pageKey),
    getFaqBlocksForPage(REVIEWS_PAGE_LEGACY_CMS_KEY),
    getBusTours(),
  ])
  // Prefer canonical FAQ storage; show legacy `testimonials` blocks if reviews empty.
  // Remap page so buildFaqSlots/`reviews` forms see them; next save migrates to `reviews`.
  const effectiveFaqs = pageFaqs.length
    ? pageFaqs
    : legacyFaqs.map((b) => ({
        ...b,
        page: b.page === REVIEWS_PAGE_LEGACY_CMS_KEY
          ? pageKey
          : b.page.startsWith(`${REVIEWS_PAGE_LEGACY_CMS_KEY}::`)
            ? `${pageKey}${b.page.slice(REVIEWS_PAGE_LEGACY_CMS_KEY.length)}`
            : b.page,
      }))
  const tourTitles = tours.map((t) => t.title)
  const reviewsForAdmin = reviews.map((r) => ({
    ...r,
    contactPhone: resolveAdminReviewPhone(r) ?? undefined,
    // ciphertext not needed in client props after resolve
    sourceId: r.source === "holiday_by" ? r.sourceId : "",
  }))
  const pendingCount = reviews.filter((r) => !r.approved).length
  const holidayCount = reviews.filter((r) => r.source === "holiday_by").length
  const sections: PageSection[] = [
    { key: `${pageKey}.section.faq`, label: "Частые вопросы" },
    { key: `${pageKey}.section.callus`, label: "Перезвоните нам" },
  ]
  const defaultOrder = [...REVIEWS_PAGE_DEFAULT_SECTION_ORDER]
  const sectionKeys = sections.map((section) => section.key.split(".section.")[1]!)
  const savedOrder =
    settings[`${pageKey}.sections.order`] ||
    settings[`${REVIEWS_PAGE_LEGACY_CMS_KEY}.sections.order`]
  const initialOrder = resolveInitialOrder(savedOrder, defaultOrder, sectionKeys, ["faq", "callus"])
  const sectionTitles = buildSectionTitles(pageKey, settings, [], initialOrder, effectiveFaqs)
  const faqSlots = buildFaqSlots(pageKey, initialOrder, effectiveFaqs)
  const faqFormIds = buildFaqFormIds(pageKey, initialOrder)
  const toggleKeys = sections.map((section) => section.key).join(",")
  const fields = pageSettingsGroups.reviews.groups.flatMap((group) => group.fields)
  const workspaceGroups: EditorWorkspaceGroup[] = [
    { id: "main", label: "Основное", badge: fields.some((field) => Boolean(settings[field.key]?.trim())), anchorIds: ["reviews-settings"] },
    { id: "list", label: "Список", badge: reviews.length > 0, anchorIds: ["reviews-list"] },
    { id: "add", label: "Добавить отзыв", badge: false, anchorIds: ["reviews-add"] },
    { id: "import", label: "Импорт (Holiday.by)", badge: holidayCount > 0, anchorIds: ["reviews-import"] },
    { id: "content", label: "Контент", badge: effectiveFaqs.length > 0, anchorIds: ["sec-faq"] },
    { id: "order", label: "Порядок секций", badge: initialOrder.length > 0, anchorIds: ["sec-order"] },
  ]

  return (
    <PageSettingsForm
      title="Отзывы"
      description={`Всего: ${reviews.length} · На проверке: ${pendingCount}`}
      pageHref="/testimonials"
      workspaceGroups={workspaceGroups}
      workspaceBeforeForm={
        <div className="space-y-6">
          <PageHeader
            title="Отзывы"
            description={`Всего: ${reviews.length} · На проверке: ${pendingCount}`}
          />
          <FormSection id="reviews-settings" title="Настройки страницы" collapsible={false}>
            {pageSettingsGroups.reviews.groups.map((group) => (
              <div key={group.heading}>
                <h2 className="mb-2 text-sm font-medium text-admin-fg">{group.heading}</h2>
                <SectionFieldsForm fields={group.fields} settings={settings} />
              </div>
            ))}
          </FormSection>
        </div>
      }
      workspaceMidPanels={[
        <div id="reviews-list" key="list" className="scroll-mt-4">
          <ReviewsListPanel reviews={reviewsForAdmin} />
        </div>,
        <div id="reviews-add" key="add" className="scroll-mt-4">
          <ReviewForm tourTitles={tourTitles} />
        </div>,
        <div id="reviews-import" key="import" className="scroll-mt-4">
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-medium text-admin-fg">Импорт с Holiday.by</div>
                <div className="mt-0.5 text-sm text-admin-fg-subtle">
                  Загружает все отзывы со страницы{" "}
                  <a
                    href="https://www.holiday.by/agencies/bustour/opinions"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand underline-offset-2 hover:underline inline-flex items-center gap-1"
                  >
                    holiday.by <ExternalLink className="h-3 w-3" />
                  </a>
                  . Дубликаты пропускаются. Новые отзывы добавляются со статусом «На проверке».
                </div>
                {holidayCount > 0 && (
                  <div className="mt-1 text-xs text-admin-fg-muted">
                    Уже импортировано: {holidayCount}
                  </div>
                )}
              </div>
              <HolidayImportButton />
            </div>
          </Card>
        </div>,
      ]}
      workspaceAfterForm={
        <div id="sec-order" className="scroll-mt-4">
          <PageSectionsManager pageKey={pageKey} sections={sections} initialOrder={initialOrder} settings={settings} toggleKeys={toggleKeys} sectionTitles={sectionTitles} view="order" />
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
          ...faqSlots,
          callus: (
            <p className="text-sm text-admin-fg-muted">
              Баннер «Перезвоните нам» отображается внизу страницы. Текст и кнопку можно изменить в{" "}
              <a href="/admin/settings" className="underline hover:text-admin-fg">Настройках</a>.
            </p>
          ),
        }}
      />
    </PageSettingsForm>
  )
}
