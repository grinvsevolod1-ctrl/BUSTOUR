import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { getSettings, getBlocks, getFaqBlocksForPage } from "@/lib/cms"
import { pageSettingsGroups } from "@/lib/admin-config"
import { SettingsForm } from "@/components/admin/settings-form"
import { buildFaqSlots } from "@/components/admin/build-faq-slots"
import { PageFaqForm } from "@/components/admin/page-faq-form"
import { PageHeader } from "@/components/admin/ui"
import { getCountry } from "@/lib/countries"
import { PageSettingsForm } from "@/components/admin/page-settings-form"
import { PageSectionsManager } from "@/components/admin/page-sections-manager"
import { EditorWorkspaceGroup } from "@/components/admin/editor-workspace"
import { FormSection } from "@/components/admin/ui"
import { SectionFieldsForm } from "@/components/admin/section-fields-form"
import { buildSectionTitles } from "@/lib/section-titles"
import { resolveInitialOrder } from "@/lib/section-order"
import { buildFaqFormIds } from "@/lib/faq-slots"
import type { PageSection } from "@/lib/admin-config"

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const page = pageSettingsGroups[slug]
  if (page) return { title: `${page.heading} — Админ` }
  if (slug.startsWith("aviatory-")) return { title: `Авиатуры — Админ` }
  return { title: "Страница — Админ" }
}

export default async function AdminPageSlug({ params }: Props) {
  const { slug } = await params

  // Dual editor: texts/FAQ/order for /testimonials live on /admin/reviews (CMS key `reviews`).
  if (slug === "testimonials") {
    redirect("/admin/reviews")
  }

  // Static pages from pageSettingsGroups
  const staticPage = pageSettingsGroups[slug]
  if (staticPage) {
    const [settings, pageFaqs] = await Promise.all([
      getSettings(),
      getFaqBlocksForPage(slug),
    ])
    if (slug === "transfers") {
      const sections: PageSection[] = [
        { key: `${slug}.section.faq`, label: "Частые вопросы" },
        { key: `${slug}.section.callus`, label: "Перезвоните нам" },
      ]
      const defaultOrder = ["faq", "callus"]
      const sectionKeys = sections.map((section) => section.key.split(".section.")[1]!)
      const initialOrder = resolveInitialOrder(
        settings[`${slug}.sections.order`],
        defaultOrder,
        sectionKeys,
        ["faq", "callus"],
      )
      const sectionTitles = buildSectionTitles(slug, settings, [], initialOrder, pageFaqs)
      const faqSlots = buildFaqSlots(slug, initialOrder, pageFaqs)
      const faqFormIds = buildFaqFormIds(slug, initialOrder)
      const toggleKeys = sections.map((section) => section.key).join(",")
      const fields = staticPage.groups.flatMap((group) => group.fields)
      const workspaceGroups: EditorWorkspaceGroup[] = [
        {
          id: "main",
          label: "Основное",
          badge: fields.some((field) => Boolean(settings[field.key]?.trim())),
          anchorIds: ["page-settings"],
        },
        { id: "content", label: "Контент", badge: pageFaqs.length > 0, anchorIds: ["sec-faq"] },
        { id: "order", label: "Порядок секций", badge: initialOrder.length > 0, anchorIds: ["sec-order"] },
      ]
      return (
        <PageSettingsForm
          title={staticPage.heading}
          description={`URL: ${staticPage.url}`}
          pageHref={staticPage.url}
          workspaceGroups={workspaceGroups}
          workspaceBeforeForm={
            <FormSection id="page-settings" title="Основные данные" collapsible={false}>
              {staticPage.groups.map((group) => (
                <div key={group.heading}>
                  <h2 className="mb-2 text-sm font-medium text-admin-fg">{group.heading}</h2>
                  <SectionFieldsForm fields={group.fields} settings={settings} />
                </div>
              ))}
            </FormSection>
          }
          workspaceAfterForm={
            <div id="sec-order" className="scroll-mt-4">
              <PageSectionsManager
                pageKey={slug}
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
            pageKey={slug}
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
    return (
      <div className="space-y-6">
        <PageHeader title={staticPage.heading} description={`URL: ${staticPage.url}`}>
          <Link
            href={staticPage.url}
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-md border border-admin-border px-3 py-1.5 text-sm text-admin-fg-muted transition-colors hover:bg-admin-muted hover:text-admin-fg"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Открыть страницу
          </Link>
        </PageHeader>
        {staticPage.groups.length > 0 && (
          <SettingsForm settings={settings} groups={staticPage.groups} hideToggles />
        )}
        <PageFaqForm pageKey={slug} faqs={pageFaqs} />
      </div>
    )
  }

  // Avia country pages are edited from /admin/countries/[id].
  // Redirect legacy /admin/pages/aviatory-{slug} bookmarks there.
  if (slug.startsWith("aviatory-")) {
    const countrySlug = slug.replace("aviatory-", "")
    const country = await getCountry(countrySlug, "avia")
    if (!country) notFound()
    redirect(`/admin/countries/${country.id}`)
  }

  notFound()
}
