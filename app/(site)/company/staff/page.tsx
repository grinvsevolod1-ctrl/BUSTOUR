import Image from "next/image"
import type { Metadata } from "next"
import { UserCircle2 } from "lucide-react"
import { Breadcrumb } from "@/components/site/breadcrumb"
import { PageExtras } from "@/components/site/page-extras"
import { getStaff } from "@/lib/queries"
import { getPublicSettings } from "@/lib/cms"
import { metadataFromSettings } from "@/lib/seo-metadata"

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings()
  return metadataFromSettings(settings, "staff", "Сотрудники — БасТур", "Познакомьтесь с командой туристической компании БасТур.", {
    path: "/company/staff",
  })
}

export default async function StaffPage() {
  const [members, settings] = await Promise.all([getStaff(), getPublicSettings()])

  return (
    <>
      <main className="mx-auto w-full max-w-[1440px] px-4 py-8 md:px-6">
        <Breadcrumb
          items={[
            { label: "Главная", href: "/" },
            { label: "Компания", href: "/company" },
            { label: "Сотрудники" },
          ]}
        />

        <div className="space-y-12">
        <section className="space-y-6">
          <div className="space-y-2 border-b-2 border-brand pb-2">
            <h1 className="text-2xl font-semibold text-ink md:text-3xl text-balance">
              {settings["staff.title"] || "Сотрудники"}
            </h1>
          </div>
          {settings["staff.intro"] && (
            <p className="w-full text-base leading-relaxed text-ink-muted text-pretty break-words">
              {settings["staff.intro"]}
            </p>
          )}

          {members.length === 0 ? (
            <p className="text-base text-ink-muted">Информация о сотрудниках скоро появится.</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {members.map((member) => (
                <article key={member.id} className="flex flex-col gap-2">
                  <div className="relative aspect-[290/470] w-full overflow-hidden rounded bg-muted">
                    {member.photo ? (
                      <Image
                        src={member.photo}
                        alt={member.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover"
                      />
                    ) : (
                      <UserCircle2
                        className="h-full w-full p-10 text-ink-muted/30"
                        strokeWidth={1}
                        aria-hidden
                      />
                    )}
                  </div>

                  <h2 className="text-lg font-semibold text-ink">{member.name}</h2>

                  <div className="space-y-0.5 text-base leading-relaxed text-ink">
                    {member.position && <span className="block">{member.position}</span>}
                    {member.email && (
                      <span className="block">
                        E-mail:{" "}
                        <a
                          href={`mailto:${member.email}`}
                          className="transition-colors hover:text-brand"
                        >
                          {member.email}
                        </a>
                      </span>
                    )}
                    {member.phone && (
                      <span className="block">
                        Тел.:{" "}
                        <a
                          href={`tel:${member.phone.replace(/\s/g, "")}`}
                          className="transition-colors hover:text-brand"
                        >
                          {member.phone}
                        </a>
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        </div>
      </main>
      <PageExtras pageKey="staff" faqScope="staff" sectionPrefix="staff" />
    </>
  )
}
