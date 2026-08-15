import type { Metadata } from "next"
import { Breadcrumb } from "@/components/site/breadcrumb"
import { PageExtras } from "@/components/site/page-extras"
import { OfficeMapBlock } from "@/components/site/office-map"
import { ClickToPlayVideo } from "@/components/site/click-to-play-video"
import { TitleUnderline } from "@/components/site/title-underline"
import { getPublicSettings } from "@/lib/cms"
import { getDisplayEmails, getDisplayPhones, getEmergencyPhone, splitContactValues } from "@/lib/contact-settings"
import { metadataFromSettings } from "@/lib/seo-metadata"

const CONTACTS_META_FALLBACK_DESC =
  "Контакты туристической компании БасТур: адрес, телефон, e-mail и режим работы."

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings()
  return metadataFromSettings(settings, "contacts", "Контакты — БасТур", CONTACTS_META_FALLBACK_DESC, {
    path: "/contacts",
  })
}

export default async function ContactsPage() {
  const s = await getPublicSettings()
  const phones = getDisplayPhones(s)
  const emergencyPhone = getEmergencyPhone(s)
  const emails = getDisplayEmails(s)
  const hours = splitContactValues(s["site.hoursFull"] || [s["site.hours"], s["site.hoursNote"]].filter(Boolean).join("\n"))

  return (
    <>
    <main className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-6">
      <Breadcrumb items={[{ label: "Главная", href: "/" }, { label: "Контакты" }]} />
      <div className="space-y-6 py-6">
        <TitleUnderline as="h1">Контакты</TitleUnderline>
        <div className={s["site.routeVideo"] ? "grid items-center gap-6 lg:grid-cols-2" : ""}>
          <dl className="overflow-hidden rounded-sm">
            <div className="grid gap-1 px-2 py-3 sm:grid-cols-[212px_1fr] sm:gap-6">
              <dt>Адрес:</dt>
              <dd className="whitespace-pre-line">{s["site.address"]}</dd>
            </div>
            <div className="grid gap-1 bg-cream px-2 py-3 sm:grid-cols-[212px_1fr] sm:gap-6">
              <dt>Телефоны:</dt>
              <dd className="space-y-1">
                {phones.map((phone) => <a key={phone.label} href={phone.href} className="block underline-offset-2 hover:text-cyan-accent hover:underline">{phone.label}</a>)}
              </dd>
            </div>
            {emergencyPhone ? (
              <div className="grid gap-1 px-2 py-3 sm:grid-cols-[212px_1fr] sm:gap-6">
                <dt>Телефон для экстренной связи в нерабочее время:</dt>
                <dd><a href={emergencyPhone.href} className="underline-offset-2 hover:text-cyan-accent hover:underline">{emergencyPhone.label}</a></dd>
              </div>
            ) : null}
            <div className="grid gap-1 bg-cream px-2 py-3 sm:grid-cols-[212px_1fr] sm:gap-6">
              <dt>Эл. почта:</dt>
              <dd className="space-y-1">
                {emails.map((email) => <a key={email} href={`mailto:${email}`} className="block underline hover:text-cyan-accent">{email}</a>)}
              </dd>
            </div>
            <div className="grid gap-1 px-2 py-3 sm:grid-cols-[212px_1fr] sm:gap-6">
              <dt>Режим работы:</dt>
              <dd className="whitespace-pre-line">{hours.join("\n")}</dd>
            </div>
          </dl>
          {s["site.routeVideo"] ? (
            <ClickToPlayVideo
              src={s["site.routeVideo"]}
              poster={s["site.routeVideoPoster"] || undefined}
              label="Видео маршрута до офиса"
            />
          ) : null}
        </div>
        <OfficeMapBlock src={s["site.mapEmbedUrl"]} />
      </div>
    </main>
    <PageExtras pageKey="contacts" faqScope="contacts" sectionPrefix="contacts" />
    </>
  )
}
