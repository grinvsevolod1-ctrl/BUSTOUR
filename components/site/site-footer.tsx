import Image from "next/image"
import Link from "next/link"
import { Phone, Info } from "lucide-react"
import { SiteCookieSettingsLink } from "@/components/cookie-settings-link"
import type { ContentBlock, SiteSettings } from "@/lib/types"
import { getDisplayPhones } from "@/lib/contact-settings"
import { socialsForFooter } from "@/lib/social-links"
import { SocialIconGlyph, socialCircleWrapperClass } from "@/components/site/social-icon"
import { legalPages } from "@/lib/legal-pages"

const policyLinks = [
  { label: legalPages.offer.title, href: legalPages.offer.path },
  { label: legalPages.privacy.title, href: legalPages.privacy.path },
  { label: legalPages.video.title, href: legalPages.video.path },
  { label: legalPages.cookies.title, href: legalPages.cookies.path },
]

export function SiteFooter({
  settings,
  directions,
}: {
  settings: SiteSettings
  directions: ContentBlock[]
}) {
  const phones = getDisplayPhones(settings)
  const socials = socialsForFooter(settings)

  return (
    <footer className="mt-12 border-t-4 border-brand bg-white text-ink">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-2 px-4 py-4 md:gap-4 md:px-6 md:py-4 xl:gap-6 xl:p-6">
        {/*
          Mobile: logo → phones → links → socials
          Tablet (md): row1 logo|socials, row2 links|phones
          Desktop (xl): logo | phones | links | socials
        */}
        <div className="flex flex-col gap-2 md:grid md:grid-cols-2 md:items-center md:gap-x-6 md:gap-y-4 xl:flex xl:flex-row xl:items-center xl:justify-between xl:gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 md:col-start-1 md:row-start-1 md:gap-2.5"
            aria-label={settings["site.brand"]}
          >
            <Image
              src="/figma/logomark.svg"
              alt=""
              width={50}
              height={50}
              className="h-9 w-9 md:h-12 md:w-12"
            />
            <span className="flex flex-col leading-none">
              <span className="text-base font-normal uppercase text-ink md:text-[25px] md:leading-7">
                {settings["site.brand"]}
              </span>
              <span className="text-[8px] uppercase leading-3 text-ink md:text-[13px] md:leading-4">
                {settings["site.brandNote"]}
              </span>
            </span>
          </Link>

          {phones.length ? (
            <div className="flex items-center gap-2 md:col-start-2 md:row-start-2 md:justify-self-end">
              <Phone className="h-8 w-8 shrink-0 text-brand" strokeWidth={1.5} aria-hidden />
              <ul className="flex flex-col">
                {phones.map((phone) => (
                  <li key={phone.label}>
                    <a
                      href={phone.href}
                      className="whitespace-nowrap text-sm text-ink hover:text-cyan-accent md:text-base md:leading-6"
                    >
                      {phone.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex items-start gap-2 md:col-start-1 md:row-start-2">
            <Info className="mt-0.5 h-8 w-8 shrink-0 text-brand" strokeWidth={1.5} aria-hidden />
            <ul className="flex flex-col gap-1 md:gap-0">
              {policyLinks.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    className="text-sm leading-5 text-cyan-accent underline underline-offset-3 hover:text-cyan-dark md:text-base md:leading-6"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {socials.length ? (
            <div className="flex flex-col gap-2 md:col-start-2 md:row-start-1 md:justify-self-end">
              <p className="text-xs leading-4 text-ink md:text-sm md:leading-6">Мы в соцсетях:</p>
              <div className="flex items-center gap-2 md:gap-4">
                {socials.map((social) => (
                  <a
                    key={social.id}
                    href={social.url}
                    aria-label={social.name}
                    className={socialCircleWrapperClass(social.icon, "sm")}
                  >
                    <SocialIconGlyph icon={social.icon} className="" />
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {directions.length ? (
          <nav aria-label="Направления" className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-4">
            {directions.map((d) => (
              <Link
                key={d.id}
                href={d.href || "/tours/all"}
                className="text-sm text-ink-muted hover:text-cyan-accent"
              >
                {d.title}
              </Link>
            ))}
          </nav>
        ) : null}

        <div className="flex flex-col gap-1 text-xs leading-4 text-ink md:text-sm md:leading-6">
          <p>
            {settings["site.copyright"] ||
              `© ${settings["site.brand"]}, 2013 - ${new Date().getFullYear()} Копирование материалов с сайта запрещено.`}
          </p>
          <SiteCookieSettingsLink className="w-fit text-ink underline underline-offset-2 hover:text-brand-dark" />
        </div>
      </div>
    </footer>
  )
}
