"use client"

import { useState } from "react"
import { TitleUnderline } from "@/components/site/title-underline"
import { sanitizeCmsHtml } from "@/lib/sanitize-html"

/** Shared chip tabs + panel — /info/memos, /info/dictionary (and clones). */
export type InfoTab = {
  id: string
  label: string
  heading: string
  bodyHtml: string
  fileTitle?: string
  fileHref?: string
  fileSize?: string
}

function PdfIcon() {
  return (
    <svg
      width="50"
      height="60"
      viewBox="0 0 50 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-hidden
    >
      <g opacity="0.3">
        <path
          opacity="0.3"
          d="M34.9175 12.312C33.5507 12.3107 32.2403 11.7671 31.2738 10.8007C30.3074 9.83427 29.7638 8.5239 29.7625 7.15717V0H6.72749C4.94325 0 3.23209 0.708778 1.97044 1.97038C0.708793 3.23198 0 4.94303 0 6.7272V47.2805C0.00264959 49.0629 0.712605 50.7715 1.97397 52.0309C3.23533 53.2903 4.94498 53.9977 6.72749 53.9977H34.38C36.1625 53.9977 37.8722 53.2903 39.1335 52.0309C40.3949 50.7715 41.1048 49.0629 41.1075 47.2805V12.312H34.9175Z"
          fill="#E84242"
        />
      </g>
      <path
        d="M41.1067 12.312H34.9167C33.5499 12.3107 32.2395 11.7671 31.273 10.8007C30.3066 9.83427 29.763 8.5239 29.7617 7.15717V0L41.1067 12.312Z"
        fill="#E84242"
      />
      <path
        d="M45.9859 42.6509H14.7259C12.5085 42.6509 10.7109 44.4484 10.7109 46.6657V55.9853C10.7109 58.2027 12.5085 60.0002 14.7259 60.0002H45.9859C48.2034 60.0002 50.0009 58.2027 50.0009 55.9853V46.6657C50.0009 44.4484 48.2034 42.6509 45.9859 42.6509Z"
        fill="#E84242"
      />
      <path
        d="M23.7316 52.5229V55.1602H21.9141V47.6431H24.8591C25.7516 47.6431 26.4341 47.8655 26.9016 48.308C27.3843 48.7745 27.6257 49.3707 27.6257 50.0004C27.6257 50.6301 27.3843 51.2263 26.9016 51.6929C26.4341 52.1354 25.7516 52.3578 24.8591 52.3578H23.7316V52.5229ZM23.7316 50.8579H24.6566C25.3866 50.8579 25.7516 50.5387 25.7516 49.9004C25.7516 49.2338 25.3866 48.9005 24.6566 48.9005H23.7316V50.8579Z"
        fill="white"
      />
      <path
        d="M28.4961 47.643H31.3336C32.4611 47.643 33.3661 47.9855 34.0486 48.6705C34.7311 49.3555 35.0724 50.2438 35.0724 51.3353C35.0724 52.4268 34.7311 53.3151 34.0486 54.0001C33.3661 54.6851 32.4611 55.0277 31.3336 55.0277H28.4961V47.643ZM30.3136 53.4127H31.1761C31.8069 53.4127 32.3009 53.2226 32.6581 52.8426C33.0154 52.4625 33.194 51.9601 33.194 51.3353C33.194 50.7105 33.0154 50.2081 32.6581 49.828C32.3009 49.448 31.8069 49.2579 31.1761 49.2579H30.3136V53.4127Z"
        fill="white"
      />
      <path
        d="M41.1916 47.6431V49.0905H38.1091V50.7379H40.4891V52.1204H38.1091V55.1602H36.2891V47.6431H41.1916Z"
        fill="white"
      />
    </svg>
  )
}

export function InfoTabsContent({ tabs }: { tabs: InfoTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "")
  const tab = tabs.find((t) => t.id === active) ?? tabs[0]

  if (!tab) return null

  return (
    <div className="space-y-8">
      <div className="relative">
        <div className="scrollbar-none flex gap-3 overflow-x-auto pb-1" role="tablist">
          {tabs.map((t) => {
            const isActive = t.id === active
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActive(t.id)}
                className={`shrink-0 rounded-xl px-5 py-2 text-base font-semibold transition-colors ${
                  isActive
                    ? "bg-brand text-brand-foreground"
                    : "border border-line bg-white text-ink hover:border-brand"
                }`}
              >
                {t.label}
              </button>
            )
          })}
        </div>
        <div
          className="pointer-events-none absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-white to-transparent"
          aria-hidden
        />
      </div>

      <section className="space-y-6" role="tabpanel">
        <TitleUnderline as="h2">{tab.heading}</TitleUnderline>
        {tab.bodyHtml ? (
          <div
            className="prose-content text-base leading-relaxed text-ink"
            dangerouslySetInnerHTML={{ __html: sanitizeCmsHtml(tab.bodyHtml) }}
          />
        ) : null}

        {tab.fileHref ? (
          <a href={tab.fileHref} download className="group flex items-center gap-6 no-underline">
            <PdfIcon />
            <span className="flex flex-1 flex-col">
              <span className="text-base leading-6 text-ink">{tab.fileTitle}</span>
              <span className="text-xs leading-4 text-cyan-accent group-hover:text-cyan-dark">
                Скачать: {tab.fileSize}
              </span>
            </span>
          </a>
        ) : null}
      </section>
    </div>
  )
}
