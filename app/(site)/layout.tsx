import { SiteHeader } from "@/components/site/site-header"
import { SiteFooter } from "@/components/site/site-footer"
import { CallbackProvider } from "@/components/site/callback-modal"
import { getBlocks, getPublicSettings } from "@/lib/cms"
import { getPrimaryEmail, getPrimaryPhone } from "@/lib/contact-settings"
import { buildTravelAgencyJsonLd, serializeJsonLd } from "@/lib/site-schema"
import { getBustourDeployEnv } from "@/lib/deploy-env"
import { AnalyticsWhenConsented } from "@/components/analytics-when-consented"
import { AnnouncementPopup } from "@/components/site/announcement-popup"
import { getActiveAnnouncement } from "@/lib/announcement"

export const dynamic = "force-dynamic"

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, directions] = await Promise.all([
    getPublicSettings(),
    getBlocks("direction", { onlyVisible: true }),
  ])
  const announcement = getActiveAnnouncement(settings)
  const primaryPhone = getPrimaryPhone(settings)
  const orgSchema = buildTravelAgencyJsonLd(settings, {
    phone: primaryPhone?.href.replace(/^tel:/, "") || settings["site.phone"],
    email: getPrimaryEmail(settings) || undefined,
  })
  const captchaStatusAllowed = getBustourDeployEnv() === "dev"

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(orgSchema) }}
      />
      <CallbackProvider settings={settings} captchaStatusAllowed={captchaStatusAllowed}>
        <div className="flex min-h-screen flex-col">
          <SiteHeader settings={settings} />
          <div className="flex-1">{children}</div>
          <SiteFooter settings={settings} directions={directions} />
        </div>
      </CallbackProvider>
      {announcement ? (
        <AnnouncementPopup title={announcement.title} text={announcement.text} type={announcement.type} />
      ) : null}
      <AnalyticsWhenConsented settings={settings} />
    </>
  )
}
