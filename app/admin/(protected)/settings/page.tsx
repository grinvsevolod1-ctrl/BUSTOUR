import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { getSettings } from "@/lib/cms"
import { SettingsForm } from "@/components/admin/settings-form"
import { requireCapability } from "@/lib/auth"
import { getBustourDeployEnv } from "@/lib/deploy-env"
import { getCaptchaWiringStatus } from "@/lib/recaptcha"

export const metadata: Metadata = { title: "Настройки — Админ-панель" }

export default async function SettingsPage() {
  try {
    await requireCapability("manage_settings")
  } catch {
    redirect("/admin?error=forbidden")
  }
  const settings = await getSettings()
  const showCaptchaStatusSetting = getBustourDeployEnv() !== "production"
  const captchaWiring = showCaptchaStatusSetting ? getCaptchaWiringStatus() : undefined

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-admin-fg">Настройки сайта</h1>
        <p className="mt-1 text-sm text-admin-fg-muted">
          Соцсети, карта, баннер «Есть вопросы?». Контакты — в «Страницы → Контакты».
        </p>
      </header>
      <SettingsForm
        settings={settings}
        showCaptchaStatusSetting={showCaptchaStatusSetting}
        captchaWiring={captchaWiring}
      />
    </div>
  )
}
