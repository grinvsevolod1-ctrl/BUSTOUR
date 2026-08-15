import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { Breadcrumb } from "@/components/site/breadcrumb"
import { TitleUnderline } from "@/components/site/title-underline"
import { PageExtras } from "@/components/site/page-extras"
import { getPublicSettings } from "@/lib/cms"
import { getTransfers } from "@/lib/queries"
import { metadataFromSettings } from "@/lib/seo-metadata"
import { ParsedText } from "@/components/site/parsed-text"

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings()
  return metadataFromSettings(settings, "transfers", "Трансферы в аэропорт — БасТур", "Комфортный и надёжный трансфер в аэропорты Москвы из Минска. Шереметьево, Внуково, Домодедово и другие направления.", {
    path: "/info/transfers",
  })
}

function DestCard({
  title,
  image,
  href,
}: {
  title: string
  image: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="group relative flex h-[280px] flex-col justify-between overflow-hidden rounded p-6 no-underline"
    >
      {/* Background image */}
      <Image
        src={image}
        alt={title}
        fill
        className="object-cover transition-transform duration-300 group-hover:scale-105"
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      />
      {/* Gradient overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(0deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.12) 100%)",
        }}
        aria-hidden
      />
      {/* Title top */}
      <h3 className="relative z-10 m-0 text-2xl font-semibold text-white text-balance">
        {title}
      </h3>
      {/* Button bottom */}
      <span className="relative z-10 self-start rounded bg-brand px-6 py-3 text-base font-semibold text-brand-foreground transition-opacity group-hover:opacity-90">
        Подробнее
      </span>
    </Link>
  )
}

export default async function TransfersPage() {
  const [settings, transfers] = await Promise.all([getPublicSettings(), getTransfers()])
  const visibleTransfers = transfers.filter((transfer) => settings[`transfer:${transfer.slug}.visible`] !== "0")
  const airportTransfers = visibleTransfers.filter((transfer) => transfer.category === "airport")
  const individualTransfers = visibleTransfers.filter((transfer) => transfer.category === "individual")

  return (
    <>
      <main className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-6">
        {/* Breadcrumbs */}
        <Breadcrumb
          items={[
            { label: "Главная", href: "/" },
            { label: "Полезная информация", href: "/info" },
            { label: "Трансферы в аэропорт" },
          ]}
        />

        <div className="space-y-10">
        {/* Intro section */}
        <section className="space-y-6">
          <TitleUnderline as="h1">
            <ParsedText text={settings["transfers.title"] || "Трансферы в аэропорт"} />
          </TitleUnderline>

          <div className="space-y-4 text-base leading-relaxed text-ink">
            {(settings["transfers.intro"] || "Если вы хотя бы раз в жизни летали на самолете из другого города, а то и страны, то вы, наверняка, столкнулись с проблемой трансфера в аэропорт и обратно.")
              .split("\n")
              .map((line: string, i: number) => (
                <p key={i}>
                  <ParsedText text={line} />
                </p>
              ))}
          </div>

        </section>

        {/* Moscow airports grid */}
        {airportTransfers.length ? <section className="space-y-5">
          <TitleUnderline as="h2">
            <ParsedText
              text={settings["transfers.airportsTitle"] || "Трансфер в аэропорты Москвы из Минска"}
            />
          </TitleUnderline>
          {airportTransfers.length ? <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {airportTransfers.map((transfer) => (
              <DestCard key={transfer.id} title={transfer.title} image={transfer.image || "/images/transfers/sheremetyevo.png"} href={`/info/transfers/${transfer.slug}`} />
            ))}
          </div> : null}
        </section> : null}
        {/* Individual transfers */}
        {individualTransfers.length ? <section className="space-y-5">
          <TitleUnderline as="h2">
            <ParsedText
              text={
                settings["transfers.individualTitle"] ||
                "Индивидуальный трансфер в аэропорты Беларуси, России, Украины"
              }
            />
          </TitleUnderline>
          {individualTransfers.length ? <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {individualTransfers.map((transfer) => (
              <DestCard key={transfer.id} title={transfer.title} image={transfer.image || "/images/transfers/individual.png"} href={`/info/transfers/${transfer.slug}`} />
            ))}
          </div> : null}
        </section> : null}

        {/* Bottom text block */}
        <section className="space-y-4 text-base leading-relaxed text-ink">
          {(settings["transfers.outro"] || "Мы предлагаем удобный и надежный трансфер в аэропорт.\nОт назначенного места вас забирает комфортабельный автобус.")
            .split("\n")
            .map((line: string, i: number) => (
              <p key={i}>
                <ParsedText text={line} />
              </p>
            ))}
        </section>
        </div>
      </main>

      <PageExtras pageKey="transfers" faqScope="transfers" sectionPrefix="transfers" />
    </>
  )
}
