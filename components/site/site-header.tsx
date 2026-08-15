"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Clock, Phone, Flame, Menu, X } from "lucide-react"
import { Logo } from "./logo"
import { SocialIconGlyph, socialCircleWrapperClass } from "./social-icon"
import { useCallbackModal } from "./callback-modal"
import { navItems } from "@/lib/data"
import { cn } from "@/lib/utils"
import type { SiteSettings } from "@/lib/types"
import { getPrimaryPhone } from "@/lib/contact-settings"
import { socialsForHeader } from "@/lib/social-links"

export function SiteHeader({ settings }: { settings: SiteSettings }) {
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)
  const lastY = useRef(0)
  const pathname = usePathname()
  const { open: openCallback } = useCallbackModal()
  const primaryPhone = getPrimaryPhone(settings)
  const headerSocials = socialsForHeader(settings)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      if (open || y < 64) {
        setHidden(false)
      } else if (y > lastY.current + 8) {
        setHidden(true)
      } else if (y < lastY.current - 8) {
        setHidden(false)
      }
      lastY.current = y
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [open])

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-line bg-background/95 backdrop-blur transition-transform duration-300",
        hidden ? "-translate-y-full" : "translate-y-0",
      )}
    >
      <div className="mx-auto w-full max-w-[1440px] px-4 md:px-6">
        <div className="flex items-center justify-between gap-2 py-3 md:gap-4 md:py-4 lg:py-6">
          <div className="min-w-0 shrink">
            <Logo />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3 md:gap-4 lg:gap-6">
            <div className="hidden items-center gap-2 lg:flex">
              <Clock className="h-8 w-8 text-brand" strokeWidth={1.5} aria-hidden />
              <div className="flex flex-col leading-tight">
                <span className="text-base text-ink-muted md:text-lg">{settings["site.hours"]}</span>
                <span className="text-xs text-ink md:text-sm">{settings["site.hoursNote"]}</span>
              </div>
            </div>

            {headerSocials.length ? (
              <div className="hidden min-[355px]:flex items-center gap-1 sm:gap-2">
                {headerSocials.map((social) => (
                  <a
                    key={social.id}
                    href={social.url}
                    aria-label={social.name}
                    className={socialCircleWrapperClass(social.icon, "md")}
                  >
                    <SocialIconGlyph icon={social.icon} className="" />
                  </a>
                ))}
              </div>
            ) : null}

            {/* mobile/tablet: phone icon → callback modal */}
            <button
              type="button"
              onClick={openCallback}
              aria-label="Заказать звонок"
              className="grid h-10 w-10 shrink-0 place-items-center rounded text-brand transition-opacity hover:opacity-80 lg:hidden"
            >
              <Phone className="h-6 w-6" strokeWidth={1.5} />
            </button>

            {/* desktop: number + text CTA */}
            <div className="hidden min-w-0 items-center gap-2 lg:flex">
              <div className="flex min-w-0 flex-col items-end leading-tight">
                {primaryPhone ? (
                  <a href={primaryPhone.href} className="text-lg text-ink-muted">
                    {primaryPhone.label}
                  </a>
                ) : null}
                <button
                  type="button"
                  onClick={openCallback}
                  className="text-sm text-cyan-accent hover:underline"
                >
                  Заказать звонок
                </button>
              </div>
            </div>

            <button
              type="button"
              className="grid h-10 w-10 shrink-0 place-items-center rounded bg-brand text-brand-foreground sm:h-11 sm:w-11 lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Меню"
              aria-expanded={open}
            >
              {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        <nav
          className={cn(
            "mb-4 rounded-3xl bg-brand lg:flex lg:items-center lg:rounded-3xl",
            open ? "block" : "hidden lg:block",
          )}
          aria-label="Основное меню"
        >
          <ul className="flex flex-col gap-1 p-2 lg:flex-row lg:flex-wrap lg:items-center lg:gap-0 lg:p-0">
            {navItems.map((item) => {
              const normalizedHref = item.href.replace(/\/$/, "")
              const active = pathname === normalizedHref || pathname.startsWith(normalizedHref + "/")

              if (item.children) {
                return (
                  <li key={item.href} className="group relative">
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-1 rounded-3xl px-3 py-2 text-base text-brand-foreground transition-colors hover:bg-brand-dark",
                        active && "bg-brand-dark font-semibold",
                      )}
                    >
                      {item.label}
                    </Link>
                    <ul className="absolute left-0 top-full z-50 hidden min-w-[220px] overflow-hidden rounded-b-xl bg-brand shadow-lg group-hover:block lg:block lg:invisible lg:group-hover:visible">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            onClick={() => setOpen(false)}
                            className="block px-5 py-3 text-base text-brand-foreground transition-colors hover:bg-brand-dark"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <ul className="flex flex-col lg:hidden">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            onClick={() => setOpen(false)}
                            className="block py-2 pl-6 pr-3 text-sm text-brand-foreground/80 transition-colors hover:bg-brand-dark"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                )
              }

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-1 rounded-3xl px-3 py-2 text-base text-brand-foreground transition-colors hover:bg-brand-dark",
                      active && "bg-brand-dark font-semibold",
                    )}
                  >
                    {item.icon === "fire" && (
                      <Flame className="h-5 w-5" strokeWidth={2} aria-hidden />
                    )}
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </header>
  )
}
