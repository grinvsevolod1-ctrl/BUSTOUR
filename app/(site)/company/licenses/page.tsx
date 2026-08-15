import type { Metadata } from "next"
import { FileText } from "lucide-react"
import { Breadcrumb } from "@/components/site/breadcrumb"
import { ImageLightbox } from "@/components/site/image-lightbox"
import { PageExtras } from "@/components/site/page-extras"
import { getCertSectionsWithItems } from "@/lib/queries"
import { getPublicSettings } from "@/lib/cms"
import { metadataFromSettings } from "@/lib/seo-metadata"

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings()
  return metadataFromSettings(
    settings,
    "licenses",
    "Лицензии и сертификаты — БасТур",
    "Документы, подтверждающие легальность и профессиональный статус туристической компании БасТур: лицензии, сертификаты и членство в организациях.",
    { path: "/company/licenses" },
  )
}

export default async function LicensesPage() {
  const [sections, settings] = await Promise.all([getCertSectionsWithItems(), getPublicSettings()])

  return (
    <>
      <main className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-6">
        <Breadcrumb
          items={[
            { label: "Главная", href: "/" },
            { label: "Компания", href: "/company" },
            { label: "Лицензии и сертификаты" },
          ]}
        />

        <div className="space-y-12">
        {/* Intro */}
        <section className="space-y-4">
          <h1 className="border-b-2 border-brand pb-2 text-2xl font-semibold text-ink md:text-3xl text-balance">
            {settings["licenses.title"] || "Лицензии и сертификаты"}
          </h1>
          {settings["licenses.intro"] && (
            <div className="space-y-4 whitespace-pre-line text-base leading-relaxed text-ink text-pretty">
              {settings["licenses.intro"]}
            </div>
          )}
        </section>

        {sections.length === 0 ? (
          <p className="text-base text-ink-muted">Информация скоро появится.</p>
        ) : (
          <div className="space-y-12">
            {sections.map((section) => (
              <section key={section.id} className="space-y-8">
                <h2 className="border-b-2 border-brand pb-2 text-xl font-semibold text-ink">
                  {section.title}
                </h2>

                {section.items.length === 0 ? (
                  <p className="text-sm text-ink-muted">Документы в этом разделе пока не добавлены.</p>
                ) : (
                  <ul className="flex flex-col gap-8" role="list">
                    {section.items.map((cert) => (
                      <li
                        key={cert.id}
                        className="flex flex-col gap-6 sm:flex-row sm:items-start"
                      >
                        <div className="group relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded bg-line sm:w-[330px]">
                          {cert.image ? (
                            <ImageLightbox
                              src={cert.image}
                              alt={cert.name}
                              sizes="(max-width:640px) 100vw, 330px"
                              className="object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <FileText
                                className="h-16 w-16 text-ink-muted/40"
                                strokeWidth={1}
                                aria-hidden
                              />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 space-y-3">
                          <h3 className="text-base font-bold leading-snug text-ink text-balance">
                            {cert.name}
                          </h3>
                          {cert.description && (
                            <p className="whitespace-pre-line text-base leading-relaxed text-ink text-pretty">
                              {cert.description}
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
        </div>
      </main>
      <PageExtras pageKey="licenses" faqScope="licenses" sectionPrefix="licenses" />
    </>
  )
}
